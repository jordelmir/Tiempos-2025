import React, { useState, useMemo, useEffect } from 'react';
import type { User, Ticket, DailyResult, DrawType, BallColor, HistoryResult } from './types';
import { fetchOfficialData } from './utils/jpsAgent';
import AdminPanel from './components/AdminPanel';
import ClientPanel from './components/ClientPanel';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import Footer from './components/Footer';
import SecurityModal from './components/SecurityModal';
import { supabase } from './lib/supabase';
import { useSupabaseData } from './hooks/useSupabaseData';
import { CheckCircleIcon, CpuIcon, ShieldCheckIcon } from './components/icons/Icons';

type View = 'admin' | 'client';

// --- ENGINE: ROBUST TIME SYSTEM ---
const getSmartLocalISO = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset);
    return localDate.toISOString().split('T')[0];
};

// --- LOGIN ANIMATION COMPONENT ---
const LoginSequence = ({ onComplete }: { onComplete: () => void }) => {
    const [step, setStep] = useState(0);
    const [text, setText] = useState('INICIANDO PROTOCOLO DE SEGURIDAD...');

    useEffect(() => {
        const steps = [
            { t: 500, text: 'ENCRIPTANDO CONEXIÓN...' },
            { t: 1200, text: 'VERIFICANDO CREDENCIALES...' },
            { t: 2000, text: 'SINCRONIZANDO BASE DE DATOS...' },
            { t: 2800, text: 'ACCESO CONCEDIDO' }
        ];

        const timers = steps.map((s, i) => 
            setTimeout(() => {
                setStep(i + 1);
                setText(s.text);
            }, s.t)
        );

        const finish = setTimeout(onComplete, 3500);

        return () => {
            timers.forEach(clearTimeout);
            clearTimeout(finish);
        }
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[9999] bg-brand-primary flex items-center justify-center text-white overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="relative z-10 text-center p-8">
                 <div className="relative w-32 h-32 mx-auto mb-8">
                     <div className="absolute inset-0 rounded-full border-4 border-brand-accent/30 animate-ping"></div>
                     <div className={`absolute inset-0 rounded-full border-4 border-t-brand-accent border-r-transparent border-b-brand-accent border-l-transparent animate-spin duration-700 ${step === 4 ? 'border-green-500' : ''}`}></div>
                     <div className="absolute inset-4 rounded-full bg-brand-secondary flex items-center justify-center border border-white/10">
                         {step === 4 ? (
                             <CheckCircleIcon className="h-12 w-12 text-green-500 animate-bounce-in" />
                         ) : (
                             <CpuIcon className="h-12 w-12 text-brand-accent animate-pulse" />
                         )}
                     </div>
                 </div>
                 
                 <h2 className="text-2xl font-black font-mono tracking-widest uppercase mb-2 animate-glitch">
                     {text}
                 </h2>
                 
                 <div className="w-64 h-1 bg-brand-secondary rounded-full mx-auto overflow-hidden mt-4 border border-white/10">
                     <div 
                        className="h-full bg-gradient-to-r from-brand-accent to-purple-500 transition-all duration-500 ease-out"
                        style={{ width: `${(step / 4) * 100}%` }}
                     ></div>
                 </div>
                 
                 <div className="mt-8 font-mono text-[10px] text-brand-text-secondary opacity-60">
                     TIEMPOS PRO SECURITY LAYER v4.2.1
                 </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  // --- SYSTEM CLOCK & AUTO-RENEWAL ---
  const [todayISO, setTodayISO] = useState(getSmartLocalISO());

  useEffect(() => {
      const timer = setInterval(() => {
          const current = getSmartLocalISO();
          if (current !== todayISO) {
              console.log(`[SYSTEM] Day change detected: ${todayISO} -> ${current}. Renewing dashboard.`);
              setTodayISO(current);
          }
      }, 60000); 
      return () => clearInterval(timer);
  }, [todayISO]);

  // --- SUPABASE AUTH ---
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginAnim, setShowLoginAnim] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- DATA HOOK ---
  const { users, transactions, dbDailyResults, loading: dataLoading, refresh, optimisticUpdateResult } = useSupabaseData(session?.user?.id || null);

  // Derived State
  const currentUserId = session?.user?.id;
  const currentUser = useMemo(() => users.find(u => u.id === currentUserId), [users, currentUserId]);
  
  const [view, setView] = useState<View>('client');
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // Game State
  const [jpsResults, setJpsResults] = useState<DailyResult[]>([]); 
  const [historyResults, setHistoryResults] = useState<HistoryResult[]>([]);
  const [nextDrawTime, setNextDrawTime] = useState<string>('Calculando...');
  const [isSyncing, setIsSyncing] = useState(false);

  // --- HYBRID DATA MERGE (THE SOURCE OF TRUTH) ---
  const effectiveDailyResults = useMemo(() => {
      const draws: DrawType[] = ['mediodia', 'tarde', 'noche'];

      return draws.map(drawType => {
          // 1. Check Database (Admin Override) - STRICT MATCH on Date & Draw
          // Fixed: Compare normalized date strings to handle timestamps correctly
          const adminEntry = dbDailyResults.find(
              r => r.date.startsWith(todayISO) && r.draw === drawType
          );

          if (adminEntry) {
              return { ...adminEntry, source: 'admin' }; 
          }

          // 2. Check JPS Agent (Fallback)
          const agentEntry = jpsResults.find(r => r.draw === drawType);
          if (agentEntry && agentEntry.number) {
              return { ...agentEntry, date: todayISO, source: 'agent' };
          }

          // 3. Return Empty/Pending State (Default)
          return {
              date: todayISO,
              draw: drawType,
              number: null,
              reventadosNumber: null,
              ballColor: null
          };
      });
  }, [jpsResults, dbDailyResults, todayISO]);


  // Set View based on Role
  useEffect(() => {
    if (currentUser) {
      setView(currentUser.role === 'admin' ? 'admin' : 'client');
    }
  }, [currentUser]);

  // JPS Data Fetching (Poller)
  useEffect(() => {
    const loadJPSData = async () => {
        setIsSyncing(true);
        try {
            const data = await fetchOfficialData();
            setJpsResults(data.today);
            setNextDrawTime(data.nextDraw);
            setHistoryResults(data.history);
        } catch (e) {
            console.error("Error fetching data", e);
        } finally {
            setIsSyncing(false);
        }
    };
    loadJPSData();
    const interval = setInterval(loadJPSData, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);


  // --- ACTIONS ---

  const handleLogin = async (email: string, passwordInput: string): Promise<{ error: any; data: any }> => {
    // Trigger Animation immediately
    setShowLoginAnim(true);
    
    // Perform Login
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: passwordInput,
    });
    
    if (error) {
        setShowLoginAnim(false); // Stop if error
    }
    
    // Note: We don't strictly need to setSession here because onAuthStateChange handles it,
    // but the animation component will cover the screen during the transition.
    
    return { error, data };
  };

  const handleRegister = async (userData: Partial<User>, role: 'admin' | 'client'): Promise<{ error: any; data: any }> => {
    const { data, error } = await supabase.auth.signUp({
        email: userData.email!,
        password: userData.password!,
        options: {
            data: { name: userData.name } 
        }
    });

    if (error && error.message.toLowerCase().includes('already registered')) {
        console.log("Usuario ya existe, intentando autologin...");
        return handleLogin(userData.email!, userData.password!);
    }

    if (error) return { error, data };

    if (data.user) {
        const { error: profileError } = await supabase.from('profiles').update({
            role: role,
            phone: userData.phone,
            cedula: userData.cedula,
            name: userData.name
        }).eq('id', data.user.id);
        
        if (profileError) console.error("Error updating profile details:", profileError);
        
        // Trigger animation for successful register-login
        if (data.session) {
            setShowLoginAnim(true);
        }
        refresh(); 
    }
    
    return { error: null, data };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const handleRecharge = async (userId: string, amount: number) => {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      await supabase.from('transactions').insert({
          user_id: userId,
          type: 'deposit',
          amount: amount,
          details: 'Recarga Admin'
      });

      await supabase.from('profiles').update({
          balance: user.balance + amount
      }).eq('id', userId);
      
      refresh();
  };

  const handleWithdraw = async (userId: string, amount: number) => {
      const user = users.find(u => u.id === userId);
      if (!user || user.balance < amount) return;

      await supabase.from('transactions').insert({
          user_id: userId,
          type: 'withdraw',
          amount: amount,
          details: 'Retiro Fondos'
      });

      await supabase.from('profiles').update({
          balance: user.balance - amount
      }).eq('id', userId);
      
      refresh();
  };

  const handlePurchase = async (userId: string, newTickets: Omit<Ticket, 'id' | 'purchaseDate'>[]) => {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const totalCost = newTickets.reduce((sum, t) => sum + t.amount + (t.reventadosAmount || 0), 0);
      
      if (user.balance < totalCost) {
        alert('Saldo insuficiente');
        return;
      }

      const { error: balError } = await supabase.from('profiles').update({
          balance: user.balance - totalCost
      }).eq('id', userId);

      if (balError) {
          alert("Error actualizando saldo");
          return;
      }

      await supabase.from('transactions').insert({
          user_id: userId,
          type: 'purchase',
          amount: totalCost,
          details: `Compra: ${newTickets.length} jugadas`
      });

      const dbTickets = newTickets.map(t => ({
          user_id: userId,
          number: t.number,
          amount: t.amount,
          reventados_amount: t.reventadosAmount || 0,
          draw_type: t.draw,
          status: 'pending'
      }));

      await supabase.from('tickets').insert(dbTickets);
      refresh();
  };

  const handleManualResultUpdate = async (draw: DrawType, number: string | null, ballColor: BallColor | null, rev: string | null): Promise<boolean> => {
      const todayStr = getSmartLocalISO();
      console.log(`[ADMIN UPDATE] Locking result for ${todayStr} - ${draw}: ${number}`);

      // 1. OPTIMISTIC UPDATE (Instant Feedback for User)
      // Updates local state immediately without waiting for network/DB
      optimisticUpdateResult({
          date: todayStr,
          draw: draw,
          number: number,
          reventadosNumber: rev,
          ballColor: ballColor
      });

      // 2. SERVER UPDATE
      const { error } = await supabase
          .from('daily_results')
          .upsert({
              date: todayStr,
              draw_type: draw,
              number: number,
              reventados_number: rev,
              ball_color: ballColor
          }, { onConflict: 'date, draw_type' });

      if (error) {
          console.error("Error updating result:", error);
          alert(`Error guardando resultado: ${error.message}`);
          return false;
      } else {
          refresh(); 
          return true;
      }
  };

  const handleHistoryUpdate = async (dateStr: string, res: any) => {
      const updates = [];
      if (res.mediodia.number) updates.push({ date: dateStr, draw_type: 'mediodia', number: res.mediodia.number, reventados_number: res.mediodia.reventadosNumber, ball_color: res.mediodia.ball });
      if (res.tarde.number) updates.push({ date: dateStr, draw_type: 'tarde', number: res.tarde.number, reventados_number: res.tarde.reventadosNumber, ball_color: res.tarde.ball });
      if (res.noche.number) updates.push({ date: dateStr, draw_type: 'noche', number: res.noche.number, reventados_number: res.noche.reventadosNumber, ball_color: res.noche.ball });

      if (updates.length > 0) {
          const { error } = await supabase
              .from('daily_results')
              .upsert(updates, { onConflict: 'date, draw_type' });
          if (error) console.error("History update failed", error);
          else refresh();
      }
  };

  const handleForceReset = (userId: string) => {
      alert("Para resetear contraseña real se requiere Backend Function (Edge Function).");
  };

  if (authLoading) {
       return <div className="min-h-screen bg-brand-primary flex items-center justify-center text-brand-accent animate-pulse">CARGANDO SISTEMA...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-primary text-brand-text-primary flex flex-col">
      {/* ANIMATION LAYER */}
      {showLoginAnim && <LoginSequence onComplete={() => setShowLoginAnim(false)} />}

      <SecurityModal isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} />

      {!session ? (
        <AuthScreen 
            onLogin={handleLogin} 
            onRegister={handleRegister}
            onVerifyIdentity={() => true} 
            onVerifyCode={() => true} 
            onResetPassword={() => alert("Revise su correo para el enlace de recuperación.")}
            onOpenSecurity={() => setIsSecurityModalOpen(true)}
        />
      ) : (
        <>
          {currentUser ? (
            <>
                <Header view={view} setView={setView} currentUser={currentUser} onLogout={handleLogout} />
                <main className="flex-grow container mx-auto p-4 md:p-8">
                    {view === 'admin' && currentUser.role === 'admin' ? (
                    <AdminPanel 
                        currentUser={currentUser}
                        users={users} 
                        dailyResults={effectiveDailyResults} 
                        historyResults={historyResults}
                        transactions={transactions}
                        onRecharge={handleRecharge} 
                        onWithdraw={handleWithdraw}
                        onUpdateResult={handleManualResultUpdate}
                        onUpdateHistory={handleHistoryUpdate}
                        onRegisterClient={(data) => handleRegister(data, 'client')}
                        onForceResetPassword={handleForceReset}
                    />
                    ) : (
                    <ClientPanel 
                        user={currentUser} 
                        onPurchase={handlePurchase} 
                        dailyResults={effectiveDailyResults} 
                        historyResults={historyResults}
                        nextDrawTime={nextDrawTime}
                        isSyncing={isSyncing}
                    />
                    )}
                </main>
            </>
          ) : (
              <div className="flex-grow flex items-center justify-center flex-col gap-4">
                 {/* While profile loads in background (animation usually covers this) */}
              </div>
          )}
          
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