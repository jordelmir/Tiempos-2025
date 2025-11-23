
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import type { User, Ticket, DailyResult, DrawType, BallColor, HistoryResult, Transaction } from './types';
import { fetchOfficialData, getNextDrawLabel } from './utils/jpsAgent';
import { useSupabaseData } from './hooks/useSupabaseData';
import AdminPanel from './components/AdminPanel';
import ClientPanel from './components/ClientPanel';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import Footer from './components/Footer';
import SecurityModal from './components/SecurityModal';
import { BoltIcon, ClipboardCheckIcon, ExclamationTriangleIcon, SparklesIcon, GlobeAltIcon } from './components/icons/Icons';

// --- DATABASE REPAIR / DIAGNOSTIC MODAL ---
const DatabaseFixModal = ({ error, onClose }: { error: string, onClose: () => void }) => {
    const isNetworkError = error.toLowerCase().includes('fetch') || error.toLowerCase().includes('connection') || error.toLowerCase().includes('connect') || error.toLowerCase().includes('network');

    const sqlScript = `
-- SCRIPT V35: SOLUCIÓN DEFINITIVA DE RECURSIÓN Y CARGA INFINITA
-- Este script rompe el ciclo de permisos utilizando Metadata en lugar de consultas a tabla.

BEGIN;

-- 1. DESACTIVAR RLS TEMPORALMENTE PARA PERMITIR ARREGLOS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;

-- 2. LIMPIEZA DE POLÍTICAS ANTIGUAS
DROP POLICY IF EXISTS "Owner full access" ON public.profiles;
DROP POLICY IF EXISTS "Seller read all" ON public.profiles;
DROP POLICY IF EXISTS "Seller update balance" ON public.profiles;
DROP POLICY IF EXISTS "Client read own" ON public.profiles;
DROP POLICY IF EXISTS "Owner all txs" ON public.transactions;
DROP POLICY IF EXISTS "Owner all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Public read results" ON public.daily_results;

-- 3. FUNCIÓN DE SINCRONIZACIÓN (CLAVE PARA EVITAR RECURSIÓN)
-- Esto asegura que el rol en la base de datos coincida con el token de auth
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
      coalesce(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', NEW.role, 'name', NEW.name)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para mantener sincronía
DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

-- 4. POLÍTICAS BASADAS EN METADATA (CERO RECURSIÓN)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_results ENABLE ROW LEVEL SECURITY;

-- Perfiles
CREATE POLICY "Owner Access" ON public.profiles
FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner' );

CREATE POLICY "Seller Access" ON public.profiles
FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'seller' );

CREATE POLICY "Self Access" ON public.profiles
FOR SELECT USING ( auth.uid() = id );

-- Transacciones
CREATE POLICY "Owner Txs" ON public.transactions
FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner' );

CREATE POLICY "Seller Txs" ON public.transactions
FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'seller' );

CREATE POLICY "Self Txs" ON public.transactions
FOR SELECT USING ( auth.uid() = user_id );

-- Tickets
CREATE POLICY "Owner Tickets" ON public.tickets
FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner' );

CREATE POLICY "Seller Tickets" ON public.tickets
FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'seller' );

CREATE POLICY "Self Tickets" ON public.tickets
FOR SELECT USING ( auth.uid() = user_id );

-- Resultados (Públicos lectura, Owner escritura)
CREATE POLICY "Public Results" ON public.daily_results FOR SELECT USING (true);
CREATE POLICY "Owner Results" ON public.daily_results FOR ALL USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner' );

-- 5. REPARACIÓN DE TRIGGER DE CREACIÓN DE USUARIO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Nuevo Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    0
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ⬇⬇⬇ PASO FINAL: ESTABLECER DUEÑO ⬇⬇⬇
-- Reemplace el correo y ejecute estas líneas al final:

/*
UPDATE public.profiles 
SET role = 'owner', balance = 9999999 
WHERE email = 'TU_EMAIL_AQUI';
*/
`;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <div className="w-full max-w-4xl bg-[#0f172a] border-2 border-purple-500 rounded-2xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.3)] overflow-hidden flex flex-col max-h-[90vh] animate-bounce-in">
                <div className="flex items-start gap-4 mb-6">
                    <div className={`p-4 rounded-full border ${isNetworkError ? 'bg-red-900/30 border-red-500' : 'bg-purple-900/30 border-purple-500'} animate-pulse`}>
                        {isNetworkError ? <GlobeAltIcon className="h-10 w-10 text-red-500"/> : <SparklesIcon className="h-10 w-10 text-purple-500" />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest">
                            {isNetworkError ? 'ERROR DE CONEXIÓN DETECTADO' : 'Reparación V35 (Anti-Bloqueo)'}
                        </h2>
                        <p className={`${isNetworkError ? 'text-red-300' : 'text-purple-300'} font-mono mt-2 text-sm`}>
                           {isNetworkError ? 'El sistema no puede comunicarse con la base de datos Supabase.' : 'Soluciona la pantalla de "Cargando..." eliminando la recursión de políticas.'}
                        </p>
                        {error && (
                             <p className="text-red-400 font-mono mt-2 text-xs bg-red-950/50 p-2 rounded border border-red-900 truncate">
                                DIAGNÓSTICO: {error}
                            </p>
                        )}
                    </div>
                </div>

                {isNetworkError ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 bg-[#020617] rounded-xl border border-red-900/50">
                        <ExclamationTriangleIcon className="h-16 w-16 text-brand-gold mb-6 animate-pulse"/>
                        <h3 className="text-xl font-bold text-white mb-4 text-center">Posibles Causas de "Failed to Fetch"</h3>
                        <ul className="text-brand-text-secondary space-y-3 mb-8 text-sm font-mono bg-black/40 p-6 rounded-lg border border-white/5 w-full max-w-lg">
                            <li className="flex items-center gap-2"><span className="text-red-500">⚠</span> Proyecto Supabase PAUSADO por inactividad.</li>
                            <li className="flex items-center gap-2"><span className="text-red-500">⚠</span> Bloqueador de Anuncios (AdBlock) activo.</li>
                            <li className="flex items-center gap-2"><span className="text-red-500">⚠</span> Firewall corporativo o sin internet.</li>
                        </ul>
                        <div className="flex gap-4">
                            <a 
                                href="https://supabase.com/dashboard/projects" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="px-6 py-3 rounded-xl bg-brand-accent hover:bg-brand-accent/80 text-white font-bold transition-colors flex items-center gap-2 shadow-lg"
                            >
                                <GlobeAltIcon className="h-4 w-4"/>
                                IR AL DASHBOARD PARA REACTIVAR
                            </a>
                            <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold border border-white/10">
                                Reintentar Ahora
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg mb-6 text-blue-200 text-sm">
                            <strong>INSTRUCCIONES:</strong> Copie el script y ejecútelo en Supabase para reparar los permisos y el acceso.
                        </div>

                        <div className="relative flex-grow overflow-hidden rounded-xl border border-gray-700 bg-[#020617]">
                            <div className="absolute top-0 left-0 right-0 bg-[#1e293b] px-4 py-2 flex justify-between items-center border-b border-gray-700">
                                <span className="text-xs font-mono text-gray-400">fix_infinite_loading_v35.sql</span>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(sqlScript)}
                                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                                >
                                    <ClipboardCheckIcon className="h-4 w-4"/> COPIAR SCRIPT
                                </button>
                            </div>
                            <pre className="p-4 pt-12 text-[10px] sm:text-xs text-green-400 font-mono overflow-auto h-full custom-scrollbar whitespace-pre-wrap">
                                {sqlScript}
                            </pre>
                        </div>
                    </>
                )}

                {!isNetworkError && (
                    <div className="mt-6 flex justify-end gap-4">
                        <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-colors">
                            Cancelar
                        </button>
                        <button onClick={onClose} className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg transition-colors">
                            Entendido (Recargar)
                        </button>
                    </div>
                )}
                
                {isNetworkError && (
                    <div className="mt-6 text-center">
                        <button onClick={onClose} className="text-xs text-gray-500 hover:text-white underline">
                            Cerrar este diagnóstico (No recomendado)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'admin' | 'client'>('client');
  const [showSecurity, setShowSecurity] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixModalError, setFixModalError] = useState('');

  // Check Auth State on Mount
  useEffect(() => {
      // SAFETY TIMEOUT: If auth takes too long (stuck loading), force rendering to show potential errors/modals
      const safetyTimer = setTimeout(() => {
          if (authChecking) {
              console.warn("Auth check timed out - forcing render");
              setAuthChecking(false);
          }
      }, 2500); // 2.5 seconds timeout

      supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          const role = session?.user?.user_metadata?.role;
          if(role === 'owner' || role === 'seller') setView('admin');
          setAuthChecking(false);
          clearTimeout(safetyTimer);
      }).catch((err: any) => {
          console.error("Critical Session Error:", err);
          const msg = err.message || "Fallo de conexión inicial";
          setFixModalError(msg);
          setShowFixModal(true);
          setAuthChecking(false);
          clearTimeout(safetyTimer);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          const role = session?.user?.user_metadata?.role;
          if(role === 'owner' || role === 'seller') setView('admin');
          else if(session) setView('client');
          setAuthChecking(false);
      });

      return () => {
          subscription.unsubscribe();
          clearTimeout(safetyTimer);
      };
  }, []);

  // Fetch Data Hook
  const { users, transactions, dbDailyResults, loading, error, refresh, optimisticUpdateResult, optimisticAddUser, optimisticUpdateUser, optimisticDeleteUser } = useSupabaseData(session?.user.id);

  useEffect(() => {
      if (error) {
          const lowerErr = error.toLowerCase();
          // Detect infinite recursion, permission issues OR NETWORK ISSUES
          if (lowerErr.includes('recursion') || lowerErr.includes('policy') || lowerErr.includes('permission') || lowerErr.includes('fetch') || lowerErr.includes('network')) {
              setFixModalError(error);
              setShowFixModal(true);
          }
      }
  }, [error]);

  // --- JPS AUTO-SYNC ENGINE (Only Owner) ---
  useEffect(() => {
      if (session?.user?.user_metadata?.role !== 'owner') return;

      const syncJPS = async () => {
          try {
              const { today } = await fetchOfficialData();
              let hasUpdates = false;
              for (const res of today) {
                  if (!res.number) continue;
                  const resDateStr = new Date(res.date).toLocaleDateString('es-CR');
                  const existing = dbDailyResults.find(r => {
                      const dbDateStr = new Date(r.date).toLocaleDateString('es-CR');
                      return r.draw === res.draw && dbDateStr === resDateStr;
                  });

                  if (!existing || existing.number !== res.number) {
                       const { error: upsertError } = await supabase.from('daily_results').upsert({
                           date: new Date(res.date).toISOString(),
                           draw_type: res.draw,
                           number: res.number,
                           reventados_number: res.reventadosNumber,
                           ball_color: res.ballColor
                       }, { onConflict: 'date, draw_type' });

                       if (!upsertError) hasUpdates = true;
                  }
              }
              if (hasUpdates) refresh();
          } catch (e) {
              console.warn("Sync warn", e);
          }
      };

      const interval = setInterval(syncJPS, 60000 * 5); 
      syncJPS();
      return () => clearInterval(interval);
  }, [session, dbDailyResults, refresh]);

  // --- DATA PROCESSING ---
  const currentUser = useMemo(() => {
      if (!session || !users.length) return null;
      return users.find(u => u.id === session.user.id) || null;
  }, [session, users]);

  const processedHistory = useMemo(() => {
      const groups: Record<string, HistoryResult> = {};
      dbDailyResults.forEach(r => {
          const dateObj = new Date(r.date);
          const dateKey = dateObj.toLocaleDateString('es-CR');
          if (!groups[dateKey]) {
              groups[dateKey] = {
                  date: r.date,
                  results: {
                      mediodia: { number: '', reventadosNumber: '', ball: 'blanca' },
                      tarde: { number: '', reventadosNumber: '', ball: 'blanca' },
                      noche: { number: '', reventadosNumber: '', ball: 'blanca' }
                  }
              };
          }
          if (r.draw) {
              groups[dateKey].results[r.draw] = {
                  number: r.number || '',
                  reventadosNumber: r.reventadosNumber || '',
                  ball: r.ballColor || 'blanca'
              };
          }
      });
      return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dbDailyResults]);

  const nextDrawTime = useMemo(() => {
      return getNextDrawLabel();
  }, []);

  // --- ACTIONS ---
  const handleLogin = async (e: string, p: string) => {
      return await supabase.auth.signInWithPassword({ email: e, password: p });
  };

  const handleRegister = async (data: Partial<User>, role: 'admin' | 'client') => {
      return await supabase.auth.signUp({
          email: data.email,
          password: data.password!,
          options: {
              data: {
                  name: data.name,
                  phone: data.phone,
                  role: 'client',
                  balance: 0,
                  cedula: data.cedula || ''
              }
          }
      });
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setView('client');
  };

  const handleRecharge = async (userId: string, amount: number) => {
      const user = users.find(u => u.id === userId);
      if(!user) return;
      const newBalance = user.balance + amount;
      optimisticUpdateUser(userId, { balance: newBalance });

      const { error } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
      if (error) {
          setFixModalError(`Error de Permisos: ${error.message}. Ejecute Script V35.`);
          setShowFixModal(true);
          refresh();
          return;
      }
      await supabase.from('transactions').insert({
          user_id: userId,
          type: 'deposit',
          amount: amount,
          details: currentUser?.role === 'owner' ? 'Recarga Dueño' : `Recarga Vendedor ${currentUser?.name.split(' ')[0]}`
      });
      refresh();
  };

  const handleWithdraw = async (userId: string, amount: number) => {
      const user = users.find(u => u.id === userId);
      if(!user) return;
      const newBalance = user.balance - amount;
      if(newBalance < 0) return;
      optimisticUpdateUser(userId, { balance: newBalance });

      const { error } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
      if (error) {
          setFixModalError(`Error de Permisos: ${error.message}. Ejecute Script V35.`);
          setShowFixModal(true);
          refresh();
          return;
      }
      await supabase.from('transactions').insert({
          user_id: userId,
          type: 'withdraw',
          amount: amount,
          details: currentUser?.role === 'owner' ? 'Retiro Dueño' : `Retiro Vendedor ${currentUser?.name.split(' ')[0]}`
      });
      refresh();
  };

  const handleUpdateResult = async (draw: DrawType, number: string | null, ballColor: BallColor | null, reventados: string | null) => {
      if (currentUser?.role !== 'owner') return false; 

      try {
          const now = new Date();
          const existing = dbDailyResults.find(r => {
              const rDate = new Date(r.date);
              return r.draw === draw && rDate.toDateString() === now.toDateString();
          });
          
          let result;
          if(existing) {
               result = await supabase.from('daily_results').update({
                   number, ball_color: ballColor, reventados_number: reventados
               }).eq('id', existing.id);
          } else {
               result = await supabase.from('daily_results').insert({
                   date: now.toISOString(),
                   draw_type: draw,
                   number,
                   ball_color: ballColor,
                   reventados_number: reventados
               });
          }

          if (result.error) {
              setFixModalError(`Error DB: ${result.error.message}. Ejecute Script V35.`);
              setShowFixModal(true);
              return false;
          }
          if(existing) optimisticUpdateResult({ ...existing, number, ballColor, reventadosNumber: reventados });
          else refresh();
          return true;

      } catch (e: any) {
          setFixModalError(`Excepción: ${e.message}. Ejecute Script V35.`);
          setShowFixModal(true);
          return false;
      }
  };

  const handleRegisterUserInternal = async (userData: Partial<User>, targetRole: 'client' | 'seller') => {
      // For Owner role, we use RPC to bypass registration limits and set roles immediately
      const rpcFunc = targetRole === 'seller' ? 'create_seller_by_owner' : 'create_user_by_admin';
      
      const { data, error } = await supabase.rpc(rpcFunc, {
          new_email: userData.email,
          new_password: userData.password,
          new_name: userData.name,
          new_phone: userData.phone,
          new_cedula: userData.cedula
      });

      if (error) {
          if (error.message.includes('function') || error.message.includes('permission')) {
               setFixModalError(`Falta función '${rpcFunc}'. Ejecute el Script V35.`);
               setShowFixModal(true);
               return { error: { message: "Falta configuración DB. Ver modal." }, data: null };
          }
          return { error, data: null };
      }

      if (data) {
          const optimUser: User = {
              id: data,
              email: userData.email || '',
              name: userData.name || (targetRole === 'seller' ? 'Nuevo Vendedor' : 'Nuevo Cliente'),
              cedula: userData.cedula || '',
              phone: userData.phone || '',
              role: targetRole,
              balance: 0,
              tickets: [],
              password: '', 
              createdAt: new Date() 
          };
          optimisticAddUser(optimUser);
      }
      setTimeout(() => { refresh(); }, 1500); 
      return { data: { user: { id: data }, session: null }, error: null };
  };

  const handleForceResetPassword = async (userId: string) => {
     const user = users.find(u => u.id === userId);
     if(!user || !user.email) return;
     try {
         await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin });
     } catch (err) {}
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
      optimisticUpdateUser(userId, { blocked: !currentStatus });
      const { error } = await supabase.from('profiles').update({ blocked: !currentStatus }).eq('id', userId);
      if(!error) refresh();
      return !error;
  };

  const handleDeleteUser = async (userId: string) => {
      optimisticDeleteUser(userId);
      try {
          await supabase.from('transactions').delete().eq('user_id', userId);
          await supabase.from('tickets').delete().eq('user_id', userId);
          const { error } = await supabase.from('profiles').delete().eq('id', userId);
          if (error) throw error;
          refresh();
          return true;
      } catch (error: any) {
          setFixModalError(`Error de Eliminación: ${error.message}. Ejecute Script V35.`);
          setShowFixModal(true);
          refresh();
          return false;
      }
  };

  const handlePurchase = async (userId: string, tickets: Omit<Ticket, 'id' | 'purchaseDate'>[]) => {
      const totalCost = tickets.reduce((sum, t) => sum + t.amount + (t.reventadosAmount || 0), 0);
      const user = users.find(u => u.id === userId);
      if(!user) return { success: false, message: 'Usuario no encontrado' };
      if(user.balance < totalCost) return { success: false, message: 'Saldo insuficiente' };

      const newBalance = user.balance - totalCost;
      optimisticUpdateUser(userId, { balance: newBalance });

      const { error: balError } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
      if(balError) { refresh(); return { success: false, message: balError.message }; }

      const ticketsToInsert = tickets.map(t => ({
          user_id: userId,
          number: t.number,
          amount: t.amount,
          reventados_amount: t.reventadosAmount || 0,
          draw_type: t.draw,
          status: 'pending',
          purchase_date: new Date().toISOString()
      }));
      
      const { error: tktError } = await supabase.from('tickets').insert(ticketsToInsert);
      if(tktError) return { success: false, message: tktError.message };

      await supabase.from('transactions').insert({
          user_id: userId,
          type: 'purchase',
          amount: totalCost,
          details: `Compra ${tickets.length} tickets`
      });
      
      refresh();
      return { success: true };
  };

  const handleClaimWinnings = async (ticketId: string, amount: number, type: 'regular' | 'reventados') => {
      const { error } = await supabase.rpc('claim_winnings', { 
          ticket_id: ticketId, 
          win_amount: amount 
      });
      
      if (error) {
          setFixModalError(`Error RPC Claim: ${error.message}. Ejecute Script V35.`);
          setShowFixModal(true);
          return;
      }

      const user = currentUser;
      if(user) {
          const newBalance = user.balance + amount;
          optimisticUpdateUser(user.id, { balance: newBalance });
          refresh();
      }
  };

  if (authChecking) {
      return (
          <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              <p className="text-gray-500 text-xs font-mono animate-pulse">Estableciendo enlace seguro...</p>
          </div>
      );
  }

  return (
    <>
      {showFixModal && (
          <DatabaseFixModal error={fixModalError || "Error Desconocido"} onClose={() => setShowFixModal(false)} />
      )}

      {!session ? (
        <AuthScreen 
            onLogin={handleLogin} 
            onRegister={handleRegister} 
            onOpenSecurity={() => setShowSecurity(true)}
        />
      ) : (
        <div className="min-h-screen bg-brand-primary pb-12 relative overflow-hidden">
             <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
             <div className="fixed -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-brand-accent/5 blur-[100px] pointer-events-none"></div>

             <Header 
                view={view} 
                setView={setView} 
                currentUser={currentUser || { id: session.user.id, name: 'Cargando...', email: session.user.email, role: session.user.user_metadata?.role || 'client', balance: 0, phone: '', password: '', tickets: [] } as any} 
                onLogout={handleLogout} 
             />
             
             <main className="container mx-auto px-4 pt-8 relative z-10">
                {view === 'admin' && (currentUser?.role === 'owner' || currentUser?.role === 'seller') ? (
                    <AdminPanel 
                        currentUser={currentUser}
                        users={users}
                        transactions={transactions}
                        dailyResults={dbDailyResults}
                        historyResults={processedHistory}
                        onRecharge={handleRecharge}
                        onWithdraw={handleWithdraw}
                        onUpdateResult={handleUpdateResult}
                        onUpdateHistory={() => {}}
                        onRegisterClient={handleRegisterUserInternal}
                        onForceResetPassword={handleForceResetPassword}
                        onToggleBlock={handleToggleBlock}
                        onDeleteUser={handleDeleteUser}
                        onPurchase={handlePurchase}
                    />
                ) : (
                    <ClientPanel 
                        user={currentUser || { id: 'temp', name: '...', balance: 0, tickets: [], role: 'client' } as any}
                        transactions={transactions.filter(t => t.userId === session.user.id)}
                        dailyResults={dbDailyResults}
                        historyResults={processedHistory}
                        nextDrawTime={nextDrawTime}
                        isSyncing={loading}
                        onPurchase={handlePurchase}
                        onClaimWinnings={handleClaimWinnings}
                    />
                )}
             </main>
             <Footer onOpenGodMode={() => { setFixModalError("Acceso Manual a Consola de Dios"); setShowFixModal(true); }} />
        </div>
      )}
      <SecurityModal isOpen={showSecurity} onClose={() => setShowSecurity(false)} />
    </>
  );
}

export default App;
