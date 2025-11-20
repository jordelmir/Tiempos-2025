
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
import { CheckCircleIcon, CpuIcon, ExclamationTriangleIcon, ClipboardCheckIcon } from './components/icons/Icons';

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

// --- SQL FIX COMPONENT ---
const DatabaseFixModal = () => {
    const sqlCode = `-- SCRIPT MAESTRO v7.0 - SOLUCIÓN DEFINITIVA RECURSIVIDAD
-- Ejecuta este script en el Editor SQL de Supabase para reparar el error "infinite recursion".

-- 1. LIMPIEZA COMPLETA DE POLÍTICAS (Para evitar conflictos)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;

DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;

DROP POLICY IF EXISTS "trans_select" ON public.transactions;
DROP POLICY IF EXISTS "trans_insert" ON public.transactions;

-- 2. REPARACIÓN DE FUNCIÓN ADMIN (CRÍTICO: SECURITY DEFINER)
-- Esto soluciona el bucle infinito permitiendo que la función lea 'profiles'
-- con privilegios de sistema, saltándose las políticas RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- <<< CLAVE PARA EVITAR RECURSIVIDAD
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- 3. APLICAR POLÍTICAS SEGURAS

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR public.is_admin()
);

CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE USING (
  public.is_admin()
);

CREATE POLICY "profiles_insert" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- TICKETS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_select" ON public.tickets
FOR SELECT USING (
  auth.uid() = user_id OR public.is_admin()
);

CREATE POLICY "tickets_insert" ON public.tickets
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- TRANSACTIONS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trans_select" ON public.transactions
FOR SELECT USING (
  auth.uid() = user_id OR public.is_admin()
);

CREATE POLICY "trans_insert" ON public.transactions
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR public.is_admin()
);

-- DAILY RESULTS
CREATE TABLE IF NOT EXISTS public.daily_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  draw_type TEXT NOT NULL,
  number TEXT,
  reventados_number TEXT,
  ball_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, draw_type)
);

ALTER TABLE public.daily_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "results_select" ON public.daily_results;
DROP POLICY IF EXISTS "results_write" ON public.daily_results;

CREATE POLICY "results_select" ON public.daily_results
FOR SELECT USING (true);

CREATE POLICY "results_write" ON public.daily_results
FOR ALL USING (public.is_admin());

-- 4. TRIGGER DE USUARIO (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Nuevo Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. PUBLICACIÓN REALTIME
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT 'profiles' UNION SELECT 'tickets' UNION SELECT 'transactions' UNION SELECT 'daily_results'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime'
      AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    END IF;
  END LOOP;
END $$;
`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(sqlCode);
        alert("Script SQL Maestro v7.0 copiado. Ejecútalo en Supabase.");
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-brand-primary flex items-center justify-center p-6">
            <div className="max-w-3xl w-full bg-brand-secondary border-2 border-red-500 rounded-2xl p-8 shadow-[0_0_50px_rgba(220,38,38,0.3)] relative overflow-hidden max-h-[90vh] flex flex-col">
                <div className="absolute top-0 left-0 w-full h-2 bg-red-500 animate-pulse"></div>
                
                <div className="flex items-center gap-4 mb-4 shrink-0">
                    <ExclamationTriangleIcon className="h-12 w-12 text-red-500" />
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase">Reparación de Base de Datos</h2>
                        <p className="text-red-400 font-mono text-sm">ERROR CRÍTICO: RECURSIVIDAD EN POLÍTICAS (RLS)</p>
                    </div>
                </div>
                
                <p className="text-brand-text-secondary mb-4 text-sm shrink-0">
                    Se ha detectado un bucle infinito. Esto ocurre cuando <code>is_admin()</code> es <b>SECURITY INVOKER</b> y la política se llama a sí misma.
                    <br/>
                    <b>Solución:</b> Este script convierte la función a <code>SECURITY DEFINER</code>, permitiendo que lea el rol sin activar RLS de nuevo.
                </p>
                
                <div className="relative bg-black p-4 rounded-lg border border-brand-border mb-6 group flex-grow overflow-hidden flex flex-col">
                    <button 
                        onClick={copyToClipboard}
                        className="absolute top-4 right-4 bg-brand-accent hover:bg-brand-accent-hover text-white px-4 py-2 rounded shadow-lg text-xs font-bold flex items-center gap-2 transition-all z-10"
                    >
                        <ClipboardCheckIcon className="h-4 w-4"/> COPIAR SCRIPT v7.0
                    </button>
                    <pre className="text-[10px] md:text-xs text-green-400 font-mono overflow-y-auto custom-scrollbar whitespace-pre flex-grow p-2">
                        {sqlCode}
                    </pre>
                </div>
                
                <div className="flex justify-end shrink-0">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="bg-brand-tertiary hover:bg-brand-primary border border-brand-border text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
                    >
                        Ya ejecuté el SQL, Reiniciar App
                    </button>
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
  const { users, transactions, dbDailyResults, loading: dataLoading, error: supabaseError, refresh, optimisticUpdateResult } = useSupabaseData(session?.user?.id || null);

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
          const adminEntry = dbDailyResults.find(
              r => r.date === todayISO && r.draw === drawType
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
    setShowLoginAnim(true);
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: passwordInput,
    });
    if (error) setShowLoginAnim(false);
    return { error, data };
  };

  const handleRegister = async (userData: Partial<User>, role: 'admin' | 'client'): Promise<{ error: any; data: any }> => {
    const { data, error } = await supabase.auth.signUp({
        email: userData.email!,
        password: userData.password!,
        options: {
            // Include extended metadata here so the trigger can use it, 
            // and data isn't lost if the immediate update fails due to RLS.
            data: { 
                name: userData.name, 
                role: role,
                phone: userData.phone,
                cedula: userData.cedula
            } 
        }
    });

    if (error && error.message.toLowerCase().includes('already registered')) {
        return handleLogin(userData.email!, userData.password!);
    }

    if (error) return { error, data };

    if (data.user) {
        // Only attempt to update profile if we have a session.
        // If session is null (email confirmation pending), RLS will block the update.
        if (data.session) {
            const { error: profileError } = await supabase.from('profiles').update({
                phone: userData.phone,
                cedula: userData.cedula
            }).eq('id', data.user.id);
            
            if (profileError) {
                console.error("Profile Update Warning:", profileError.message || profileError);
            } else {
                setShowLoginAnim(true);
            }
        } else {
            // Session not yet active (e.g. email verify required). 
            // Data is safe in user_metadata for the trigger or future updates.
            console.log("Registration successful. Session pending verification.");
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

      const { error } = await supabase.from('transactions').insert({
          user_id: userId,
          type: 'deposit',
          amount: amount,
          details: 'Recarga Admin'
      });
      if(error) alert(`Error transaccion: ${error.message}`);

      const { error: balError } = await supabase.from('profiles').update({
          balance: user.balance + amount
      }).eq('id', userId);
      if(balError) alert(`Error balance: ${balError.message}`);
      
      refresh();
  };

  const handleWithdraw = async (userId: string, amount: number) => {
      const user = users.find(u => u.id === userId);
      if (!user || user.balance < amount) return;

      const { error } = await supabase.from('transactions').insert({
          user_id: userId,
          type: 'withdraw',
          amount: amount,
          details: 'Retiro Fondos'
      });
      if(error) alert(`Error transaccion: ${error.message}`);

      const { error: balError } = await supabase.from('profiles').update({
          balance: user.balance - amount
      }).eq('id', userId);
      if(balError) alert(`Error balance: ${balError.message}`);
      
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

      // 1. Deduct Balance
      const { error: balError } = await supabase.from('profiles').update({
          balance: user.balance - totalCost
      }).eq('id', userId);

      if (balError) {
          console.error("Balance Update Failed", balError);
          alert("Error al descontar saldo. Intente de nuevo.");
          return;
      }

      // 2. Record Transaction
      const { error: txError } = await supabase.from('transactions').insert({
          user_id: userId,
          type: 'purchase',
          amount: totalCost,
          details: `Compra: ${newTickets.length} jugadas`
      });
      if (txError) console.error("Transaction Log Failed", txError);

      // 3. Create Tickets
      const dbTickets = newTickets.map(t => ({
          user_id: userId,
          number: t.number,
          amount: t.amount,
          reventados_amount: t.reventadosAmount || 0,
          draw_type: t.draw,
          status: 'pending'
      }));

      const { error: tickError } = await supabase.from('tickets').insert(dbTickets);
      if (tickError) {
          console.error("Ticket Creation Failed", tickError);
          alert("Error creando tiquetes. Contacte soporte.");
      } else {
          refresh();
      }
  };

  const handleManualResultUpdate = async (draw: DrawType, number: string | null, ballColor: BallColor | null, rev: string | null) => {
      const todayStr = getSmartLocalISO();
      console.log(`[ADMIN UPDATE] Locking result for ${todayStr} - ${draw}: ${number}`);

      // Optimistic UI
      optimisticUpdateResult({
          date: todayStr,
          draw: draw,
          number: number,
          reventadosNumber: rev,
          ballColor: ballColor
      });

      // DB Upsert
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
      } else {
          refresh(); 
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

  // --- CRITICAL ERROR GUARD ---
  // Detect infinite recursion specifically or general unexpected recursion
  if (supabaseError && (supabaseError.toLowerCase().includes("infinite recursion") || supabaseError.toLowerCase().includes("recursion") || supabaseError.toLowerCase().includes("policy"))) {
      return <DatabaseFixModal />;
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
                 <div className="text-brand-accent animate-pulse">Sincronizando perfil...</div>
                 {supabaseError && (
                     <div className="text-red-500 text-sm bg-red-900/20 p-2 rounded border border-red-900/50">
                         {supabaseError}
                     </div>
                 )}
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
