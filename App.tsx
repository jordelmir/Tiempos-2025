
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { User, Ticket, DailyResult, DrawType, BallColor, HistoryResult, Transaction } from './types';
import { mockUsers, mockTransactions } from './mockData';
import { fetchOfficialData } from './utils/jpsAgent';
import { SecureStorage, RateLimiter, Sanitizer, hashPasswordSync } from './utils/security.ts';
import AdminPanel from './components/AdminPanel';
import ClientPanel from './components/ClientPanel';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import Footer from './components/Footer';
import SecurityModal from './components/SecurityModal';

type View = 'admin' | 'client';

// --- PERSISTENCE HELPERS WITH SECURITY ---

const STORAGE_KEYS = {
  USERS: 'tiempospro_db_users_v4', 
  TRANSACTIONS: 'tiempospro_db_transactions_v2',
  SESSION_ID: 'tiempospro_session_id_v2',
  HISTORY: 'tiempospro_db_history_real_v1' // New Key for Real History
};

// Helper to restore Date objects from JSON strings
const dateTimeReviver = (key: string, value: any) => {
    const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
    if (typeof value === "string" && dateFormat.test(value)) {
        return new Date(value);
    }
    return value;
};

const safeLoad = <T,>(key: string, fallback: T): T => {
    try {
        // Decrypt data before parsing
        const stored = localStorage.getItem(key);
        const decrypted = SecureStorage.decrypt<T>(stored, fallback);
        
        // If it's a string (encryption failed or empty), return fallback
        if (!decrypted) return fallback;

        // If it's an array or object, we need to revive dates manually since 
        // our decryptor does standard JSON.parse
        return JSON.parse(JSON.stringify(decrypted), dateTimeReviver);
    } catch (error) {
        console.error(`Error loading ${key} from storage`, error);
        return fallback;
    }
};

const App: React.FC = () => {
  // --- STATE INITIALIZATION ---

  // Load Users & Transactions
  const [users, setUsers] = useState<User[]>(() => safeLoad(STORAGE_KEYS.USERS, mockUsers));
  const [transactions, setTransactions] = useState<Transaction[]>(() => safeLoad(STORAGE_KEYS.TRANSACTIONS, mockTransactions));

  // Session State
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
      return SecureStorage.decrypt(stored, null);
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!currentUserId);
  
  // Security & 2FA State
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<{email: string, code: string} | null>(null);

  // View State
  const [view, setView] = useState<View>(() => {
      const savedId = SecureStorage.decrypt(localStorage.getItem(STORAGE_KEYS.SESSION_ID), null);
      if (savedId) {
          const user = safeLoad<User[]>(STORAGE_KEYS.USERS, mockUsers).find(u => u.id === savedId);
          return user ? user.role : 'client';
      }
      return 'client';
  });

  // Game Data State
  const [dailyResults, setDailyResults] = useState<DailyResult[]>([]);
  // Initialize History from Storage
  const [historyResults, setHistoryResults] = useState<HistoryResult[]>(() => safeLoad(STORAGE_KEYS.HISTORY, []));
  
  const [nextDrawTime, setNextDrawTime] = useState<string>('Cargando...');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const currentUser = useMemo(() => users.find(u => u.id === currentUserId), [users, currentUserId]);

  // Filter Users for Admin View (Hierarchy: Only show my clients)
  const adminMyUsers = useMemo(() => {
      if (!currentUser || currentUser.role !== 'admin') return [];
      // Admins see themselves and clients linked to them
      return users.filter(u => u.id === currentUser.id || u.adminId === currentUser.id);
  }, [users, currentUser]);

  // --- EFFECT: PERSISTENCE ---

  useEffect(() => {
      const encrypted = SecureStorage.encrypt(users);
      localStorage.setItem(STORAGE_KEYS.USERS, encrypted);
  }, [users]);

  useEffect(() => {
      const encrypted = SecureStorage.encrypt(transactions);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, encrypted);
  }, [transactions]);

  // Persistence for Real History
  useEffect(() => {
      if (historyResults.length > 0) {
          const encrypted = SecureStorage.encrypt(historyResults);
          localStorage.setItem(STORAGE_KEYS.HISTORY, encrypted);
      }
  }, [historyResults]);

  // --- EFFECT: IDLE TIMER ---
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const IDLE_LIMIT = 15 * 60 * 1000; // 15 Minutes

    const resetTimer = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            alert("Por su seguridad, la sesión ha expirado por inactividad.");
            handleLogout();
        }, IDLE_LIMIT);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    resetTimer();

    return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('mousemove', resetTimer);
        window.removeEventListener('keydown', resetTimer);
        window.removeEventListener('click', resetTimer);
        window.removeEventListener('touchstart', resetTimer);
    };
  }, [isAuthenticated]);

  // --- EFFECT: DATA FETCHING & HISTORY BUILDING ---

  useEffect(() => {
    const loadData = async () => {
        setIsSyncing(true);
        try {
            // This now fetches REAL data from JPS via Agent
            const data = await fetchOfficialData();
            setDailyResults(data.today);
            setNextDrawTime(data.nextDraw);
            
            // INTELLIGENT HISTORY MERGE
            setHistoryResults(prevHistory => {
                // 1. Create a map of current persistent history to lookup existing entries
                const currentHistoryMap = new Map<string, HistoryResult>(prevHistory.map(h => [h.date, h]));
                
                // 2. Create a map of fetched history
                // Note: fetchOfficialData returns array.
                const fetchedHistory = data.history;

                // 3. Merge Strategy:
                // - If entry exists in 'manual' mode in our storage, KEEP IT. Do not overwrite with scrape.
                // - If entry doesn't exist, add it.
                // - If entry exists as 'api', update it with new scrape (in case results were pending and now are final).
                
                fetchedHistory.forEach(scrapedItem => {
                    const existingItem = currentHistoryMap.get(scrapedItem.date);
                    
                    if (!existingItem) {
                        // New data found
                        currentHistoryMap.set(scrapedItem.date, scrapedItem);
                    } else {
                        // Existing data found. Check source.
                        if (existingItem.source !== 'manual') {
                            // Safe to update because admin hasn't touched it
                            currentHistoryMap.set(scrapedItem.date, scrapedItem);
                        }
                        // If source IS manual, we do nothing, preserving the admin edit.
                    }
                });

                // 4. Convert back to array and sort (Newest first)
                // Need to parse the date strings for correct sorting.
                // Dates are stored as locale string, which is tricky to sort directly if format varies.
                // We assume consistency based on normalization in jpsAgent.
                return Array.from(currentHistoryMap.values()).sort((a, b) => {
                    // Convert DD/MM/YYYY or similar to timestamp
                    const parseDate = (dateStr: string) => {
                        const parts = dateStr.split('/');
                        if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0])).getTime();
                        return new Date(dateStr).getTime();
                    };
                    const dateA = parseDate(a.date);
                    const dateB = parseDate(b.date);
                    return isNaN(dateA) ? 0 : dateB - dateA;
                });
            });

        } catch (e) {
            console.error("Error fetching data", e);
        } finally {
            setIsSyncing(false);
        }
    };
    
    loadData();
    // Refresh every 5 minutes to avoid slamming proxy
    const interval = setInterval(loadData, 300000); 
    return () => clearInterval(interval);
  }, []);

  // --- AUTH HANDLERS ---

  const handleLogin = (email: string, passwordInput: string, requestedRole: 'admin' | 'client') => {
    const securityCheck = RateLimiter.check();
    if (!securityCheck.allowed) {
        alert(`Demasiados intentos fallidos. Sistema bloqueado por ${securityCheck.waitTime} segundos.`);
        return;
    }

    const cleanEmail = Sanitizer.cleanString(email).toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    const inputHash = hashPasswordSync(passwordInput);
    
    if (user && user.password === inputHash) {
      if (requestedRole === 'admin' && user.role !== 'admin') {
        RateLimiter.recordAttempt(false);
        alert('Acceso denegado. Este usuario no tiene permisos de administrador.');
        return;
      }
      RateLimiter.recordAttempt(true);
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, SecureStorage.encrypt(user.id));
      setCurrentUserId(user.id);
      setIsAuthenticated(true);
      setView(requestedRole);
    } else {
      RateLimiter.recordAttempt(false);
      alert('Credenciales incorrectas.');
    }
  };

  const handleRegister = (userData: Partial<User>, role: 'admin' | 'client', creatingAdminId?: string) => {
    const safeName = Sanitizer.cleanString(userData.name || '');
    const safeEmail = Sanitizer.cleanString(userData.email || '');
    const safePhone = Sanitizer.cleanString(userData.phone || '');
    const safeCedula = Sanitizer.cleanString(userData.cedula || ''); // New Field Sanitization
    const safePassword = userData.password ? hashPasswordSync(userData.password) : hashPasswordSync('123456');

    if (!Sanitizer.validateEmail(safeEmail)) {
        alert("Formato de correo inválido.");
        return;
    }
    if (users.some(u => u.email.toLowerCase() === safeEmail.toLowerCase())) {
        alert("El correo ya está registrado.");
        return;
    }
    // Note: Cedula uniqueness check is done in AdminPanel for new clients, 
    // but strictly we could check here too for general registration.

    const newUser: User = {
      id: `usr_${Date.now()}`,
      cedula: safeCedula, // Persist Cedula
      name: safeName,
      email: safeEmail,
      password: safePassword,
      phone: safePhone,
      balance: 0,
      role: role,
      adminId: creatingAdminId, 
      tickets: []
    };
    
    setUsers(prev => [...prev, newUser]);
    
    if (!creatingAdminId) {
        localStorage.setItem(STORAGE_KEYS.SESSION_ID, SecureStorage.encrypt(newUser.id));
        setCurrentUserId(newUser.id);
        setIsAuthenticated(true);
        setView(role);
    } else {
        alert(`Cliente ${safeName} registrado exitosamente.`);
    }
  };

  // --- 2FA RECOVERY HANDLERS ---

  const handleVerifyIdentity = (email: string, phone: string): boolean => {
      const cleanEmail = Sanitizer.cleanString(email).toLowerCase();
      const cleanPhone = Sanitizer.cleanString(phone);
      const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.phone === cleanPhone);
      
      if (user) {
          const code = Math.floor(1000 + Math.random() * 9000).toString();
          setRecoveryCode({ email: cleanEmail, code });
          setTimeout(() => {
            alert(`[SISTEMA DE SEGURIDAD]\n\nSe ha enviado un código de verificación a ${cleanEmail}.\n\nSU CÓDIGO ES: ${code}`);
          }, 500);
          return true;
      }
      return false;
  };

  const handleVerifyCode = (code: string): boolean => {
      if (recoveryCode && recoveryCode.code === code) {
          return true;
      }
      return false;
  };

  const handleResetPassword = (email: string, newPassword: string) => {
      const cleanEmail = Sanitizer.cleanString(email).toLowerCase();
      const newHash = hashPasswordSync(newPassword);
      setUsers(prev => prev.map(u => u.email.toLowerCase() === cleanEmail ? { ...u, password: newHash } : u));
      setRecoveryCode(null);
      alert("Contraseña actualizada exitosamente.");
  };

  const handleAdminForceReset = (userId: string) => {
      const tempPass = 'Ganador2025$$';
      const newHash = hashPasswordSync(tempPass);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newHash } : u));
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    setIsAuthenticated(false);
    setCurrentUserId(null);
    setView('client');
  };

  // --- FINANCE HANDLERS ---

  const handleRecharge = useCallback((userId: string, amount: number) => {
    setUsers(prev => prev.map(u => {
        if (u.id === userId) {
            const newTx: Transaction = {
                id: `tx_${Date.now()}`,
                userId: u.id,
                userName: u.name,
                type: 'deposit',
                amount: amount,
                date: new Date(),
                details: 'Recarga manual Admin'
            };
            setTransactions(t => [newTx, ...t]);
            return { ...u, balance: u.balance + amount };
        }
        return u;
    }));
  }, []);

  const handleWithdraw = useCallback((userId: string, amount: number) => {
    setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          if (u.balance < amount) return u;
          const newTx: Transaction = {
            id: `tx_${Date.now()}`,
            userId: u.id,
            userName: u.name,
            type: 'withdraw',
            amount: amount,
            date: new Date(),
            details: 'Retiro de fondos'
          };
          setTransactions(t => [newTx, ...t]);
          return { ...u, balance: u.balance - amount };
        }
        return u;
    }));
  }, []);

  const handlePurchase = useCallback((userId: string, newTickets: Omit<Ticket, 'id' | 'purchaseDate'>[]) => {
    setUsers(prev => {
      const user = prev.find(u => u.id === userId);
      if (!user) return prev;
      
      const totalCost = newTickets.reduce((sum, t) => sum + t.amount + (t.reventadosAmount || 0), 0);
      if (user.balance < totalCost) {
        alert('Saldo insuficiente.');
        return prev;
      }

      const ticketsWithIds: Ticket[] = newTickets.map(t => ({
        ...t,
        id: `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        purchaseDate: new Date(),
      }));

      const newTx: Transaction = {
        id: `tx_purch_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        type: 'purchase',
        amount: totalCost,
        date: new Date(),
        details: `Compra: ${newTickets.length} jugada(s)`
      };
      setTransactions(t => [newTx, ...t]);

      return prev.map(u => u.id === userId ? { ...u, balance: u.balance - totalCost, tickets: [...u.tickets, ...ticketsWithIds] } : u);
    });
  }, []);

  const handleManualResultUpdate = useCallback((draw: DrawType, number: string | null, ballColor: BallColor | null, reventadosNumber: string | null) => {
      setDailyResults(prev => prev.map(item => item.draw === draw ? { ...item, number, ballColor, reventadosNumber } : item));
  }, []);

  // New Handler for HISTORY Modification
  const handleHistoryUpdate = useCallback((dateStr: string, updatedData: HistoryResult['results']) => {
      setHistoryResults(prev => {
          const newHistory = [...prev];
          const index = newHistory.findIndex(h => h.date === dateStr);
          
          const newItem: HistoryResult = {
              date: dateStr,
              results: updatedData,
              source: 'manual' // Flag as manual to prevent overwrite
          };

          if (index >= 0) {
              newHistory[index] = newItem;
          } else {
              newHistory.unshift(newItem);
              // Sort
              newHistory.sort((a, b) => {
                  // Simple parsing assuming normalized format
                  const tA = new Date(a.date.split('/').reverse().join('-')).getTime() || new Date(a.date).getTime();
                  const tB = new Date(b.date.split('/').reverse().join('-')).getTime() || new Date(b.date).getTime();
                  return tB - tA;
              });
          }
          return newHistory;
      });
      
      // If date is today, also update dailyResults
      const todayStr = new Date().toLocaleDateString();
      if (dateStr === todayStr) {
          setDailyResults([
              { date: todayStr, draw: 'mediodia', number: updatedData.mediodia.number || null, reventadosNumber: updatedData.mediodia.reventadosNumber || null, ballColor: updatedData.mediodia.ball },
              { date: todayStr, draw: 'tarde', number: updatedData.tarde.number || null, reventadosNumber: updatedData.tarde.reventadosNumber || null, ballColor: updatedData.tarde.ball },
              { date: todayStr, draw: 'noche', number: updatedData.noche.number || null, reventadosNumber: updatedData.noche.reventadosNumber || null, ballColor: updatedData.noche.ball }
          ]);
      }

      alert(`Historial actualizado para el día ${dateStr}. Los datos están bloqueados contra cambios automáticos.`);
  }, []);

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-brand-primary text-brand-text-primary flex flex-col">
      <SecurityModal isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} />

      {!isAuthenticated || !currentUser ? (
        <AuthScreen 
            onLogin={handleLogin} 
            onRegister={(data, role) => handleRegister(data, role)}
            onVerifyIdentity={handleVerifyIdentity}
            onVerifyCode={handleVerifyCode}
            onResetPassword={handleResetPassword}
            onOpenSecurity={() => setIsSecurityModalOpen(true)}
        />
      ) : (
        <>
          <Header view={view} setView={setView} currentUser={currentUser} onLogout={handleLogout} />
          <main className="flex-grow container mx-auto p-4 md:p-8">
            {view === 'admin' ? (
              <AdminPanel 
                currentUser={currentUser}
                users={adminMyUsers} 
                dailyResults={dailyResults}
                historyResults={historyResults}
                transactions={transactions}
                onRecharge={handleRecharge} 
                onWithdraw={handleWithdraw}
                onUpdateResult={handleManualResultUpdate}
                onUpdateHistory={handleHistoryUpdate}
                onRegisterClient={(data) => handleRegister(data, 'client', currentUser.id)}
                onForceResetPassword={handleAdminForceReset}
              />
            ) : (
              <ClientPanel 
                user={currentUser} 
                onPurchase={handlePurchase} 
                dailyResults={dailyResults}
                historyResults={historyResults}
                nextDrawTime={nextDrawTime}
                isSyncing={isSyncing}
              />
            )}
          </main>
          <div className="container mx-auto px-4 py-2 text-center">
               <button onClick={() => setIsSecurityModalOpen(true)} className="text-[10px] text-brand-text-secondary/50 hover:text-brand-accent uppercase font-bold tracking-widest transition-colors">
                 🔒 Sistema Protegido por TiemposPRO Shield™
               </button>
          </div>
          <Footer />
        </>
      )}
    </div>
  );
};

export default App;
