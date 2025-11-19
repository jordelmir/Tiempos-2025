
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
  USERS: 'tiempospro_db_users_v4', // Version Bump for AdminID
  TRANSACTIONS: 'tiempospro_db_transactions_v2',
  SESSION_ID: 'tiempospro_session_id_v2'
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
  const [historyResults, setHistoryResults] = useState<HistoryResult[]>([]);
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

  // --- EFFECT: DATA FETCHING ---

  useEffect(() => {
    const loadData = async () => {
        setIsSyncing(true);
        try {
            const data = await fetchOfficialData();
            setDailyResults(data.today);
            setHistoryResults(data.history);
            setNextDrawTime(data.nextDraw);
        } catch (e) {
            console.error("Error fetching data", e);
        } finally {
            setIsSyncing(false);
        }
    };
    loadData();
    const interval = setInterval(loadData, 60000); 
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

  // Register User (Public or via Admin)
  const handleRegister = (userData: Partial<User>, role: 'admin' | 'client', creatingAdminId?: string) => {
    const safeName = Sanitizer.cleanString(userData.name || '');
    const safeEmail = Sanitizer.cleanString(userData.email || '');
    const safePhone = Sanitizer.cleanString(userData.phone || '');
    // If registered by Admin, pass can be "123456" by default or provided one
    const safePassword = userData.password ? hashPasswordSync(userData.password) : hashPasswordSync('123456');

    if (!Sanitizer.validateEmail(safeEmail)) {
        alert("Formato de correo inválido.");
        return;
    }
    if (users.some(u => u.email.toLowerCase() === safeEmail.toLowerCase())) {
        alert("El correo ya está registrado.");
        return;
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: safeName,
      email: safeEmail,
      password: safePassword,
      phone: safePhone,
      balance: 0,
      role: role,
      // If created by an admin, link it. If public registration, no adminId (or handle logic elsewhere)
      adminId: creatingAdminId, 
      tickets: []
    };
    
    setUsers(prev => [...prev, newUser]);
    
    // If self-registration, log them in
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
          // Generate 4-digit code
          const code = Math.floor(1000 + Math.random() * 9000).toString();
          setRecoveryCode({ email: cleanEmail, code });
          
          // SIMULATE EMAIL SEND
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

  // --- ADMIN SUPER POWER: FORCE RESET ---
  const handleAdminForceReset = (userId: string) => {
      const tempPass = '123456';
      const newHash = hashPasswordSync(tempPass);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newHash } : u));
      alert(`Contraseña restablecida a: ${tempPass}`);
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
                transactions={transactions}
                onRecharge={handleRecharge} 
                onWithdraw={handleWithdraw}
                onUpdateResult={handleManualResultUpdate}
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
