
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
import { BoltIcon, ClipboardCheckIcon, ExclamationTriangleIcon, SparklesIcon, KeyIcon, CpuIcon, ShieldCheckIcon, RefreshIcon } from './components/icons/Icons';

// --- DATABASE REPAIR MODAL ---
const DatabaseFixModal = ({ error, onClose }: { error: string, onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<'repair' | 'restore'>(error.includes("Manual") ? 'repair' : 'repair');

    const repairScript = `
-- SCRIPT V34: CORRECCIÓN DE RESTRICCIONES (CONSTRAINT) Y ACCESO
-- Ejecutar si recibe error "violates check constraint" o pantalla vacía.

BEGIN;

-- 1. CORREGIR RESTRICCIÓN DE ROLES (El error 23514 suele ser esto)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('owner', 'seller', 'client', 'admin')); -- Ampliar roles permitidos

-- 2. DESACTIVAR RLS TEMPORALMENTE
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. CREAR PERFIL PARA TU CORREO (Si falta)
INSERT INTO public.profiles (id, email, name, role, balance, created_at)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Dueño Sistema'),
  'owner',
  9999999,
  created_at
FROM auth.users
WHERE email = 'elysiumalternative9@gmail.com'
AND id NOT IN (SELECT id FROM public.profiles);

-- 4. FORZAR ROL DE DUEÑO (Si ya existía)
UPDATE public.profiles 
SET role = 'owner', balance = 9999999
WHERE email = 'elysiumalternative9@gmail.com';

-- 5. SINCRONIZAR OTROS USUARIOS FANTASMA
INSERT INTO public.profiles (id, email, name, role, balance, created_at)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', 'Usuario Recuperado'),
  'client',
  0,
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 6. RESTAURAR POLÍTICAS DE SEGURIDAD
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manage_all" ON public.profiles;
CREATE POLICY "owner_manage_all" ON public.profiles
FOR ALL USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' );

DROP POLICY IF EXISTS "read_own_profile" ON public.profiles;
CREATE POLICY "read_own_profile" ON public.profiles
FOR SELECT USING ( auth.uid() = id );

COMMIT;
`;

    const restoreScript = `
-- SCRIPT SIMPLE: RECUPERAR DUEÑO
-- Úselo si V34 falla.

UPDATE public.profiles 
SET role = 'owner' 
WHERE email = 'elysiumalternative9@gmail.com';
`;

    const activeScript = activeTab === 'repair' ? repairScript : restoreScript;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <div className="w-full max-w-4xl bg-[#0f172a] border-2 border-red-500 rounded-2xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.3)] overflow-hidden flex flex-col max-h-[90vh] animate-bounce-in">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-4 bg-red-900/30 rounded-full border border-red-500 animate-pulse">
                        <ShieldCheckIcon className="h-10 w-10 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest">
                            {activeTab === 'repair' ? 'Protocolo de Reparación (V34)' : 'Recuperación Simple'}
                        </h2>
                        <p className="text-red-300 font-mono mt-2 text-sm">
                           {activeTab === 'repair' 
                             ? 'Corrige error de restricciones SQL y restaura perfil.' 
                             : 'Fuerza el rol de dueño en el perfil existente.'}
                        </p>
                        {error && (
                             <p className="text-yellow-400 font-mono mt-2 text-xs bg-yellow-950/50 p-2 rounded border border-yellow-900">
                                Detección: {error}
                            </p>
                        )}
                    </div>
                </div>

                {/* TABS */}
                <div className="flex gap-4 mb-4 border-b border-gray-700 pb-1">
                    <button 
                        onClick={() => setActiveTab('repair')}
                        className={`px-4 py-2 font-bold text-sm uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'repair' ? 'text-red-400 border-red-500' : 'text-gray-500 border-transparent hover:text-white'}`}
                    >
                        <span className="flex items-center gap-2"><BoltIcon className="h-4 w-4"/> REPARACIÓN V34</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('restore')}
                        className={`px-4 py-2 font-bold text-sm uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'restore' ? 'text-red-400 border-red-500' : 'text-gray-500 border-transparent hover:text-white'}`}
                    >
                        <span className="flex items-center gap-2"><KeyIcon className="h-4 w-4"/> Solo Rol Dueño</span>
                    </button>
                </div>
                
                <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg mb-6 text-blue-200 text-sm">
                    <strong>INSTRUCCIONES:</strong> Copie el código SQL y ejecútelo en el <strong>SQL Editor</strong> de Supabase.
                    <br/><span className="text-xs opacity-70">Esto arreglará el problema de "pantalla vacía" y errores de "check constraint".</span>
                </div>

                <div className="relative flex-grow overflow-hidden rounded-xl border border-gray-700 bg-[#020617]">
                    <div className="absolute top-0 left-0 right-0 bg-[#1e293b] px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-400">
                            SQL_EDITOR_INPUT.sql
                        </span>
                        <button 
                            onClick={() => navigator.clipboard.writeText(activeScript)}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                        >
                            <ClipboardCheckIcon className="h-4 w-4"/> COPIAR SCRIPT
                        </button>
                    </div>
                    <pre className="p-4 pt-12 text-[10px] sm:text-xs text-green-400 font-mono overflow-auto h-full custom-scrollbar whitespace-pre-wrap">
                        {activeScript}
                    </pre>
                </div>

                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-colors">
                        Cerrar y Recargar
                    </button>
                    <button onClick={onClose} className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg transition-colors">
                        Entendido
                    </button>
                </div>
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
      supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          const role = session?.user?.user_metadata?.role;
          if(role === 'owner' || role === 'seller') setView('admin');
          setAuthChecking(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          const role = session?.user?.user_metadata?.role;
          if(role === 'owner' || role === 'seller') setView('admin');
          else if(session) setView('client');
      });

      return () => subscription.unsubscribe();
  }, []);

  // Fetch Data Hook
  // FIX: Ensure undefined is not passed to hook which expects string | null
  const { users, transactions, dbDailyResults, loading, error, refresh, optimisticUpdateResult, optimisticAddUser, optimisticUpdateUser, optimisticDeleteUser } = useSupabaseData(session?.user?.id || null);

  useEffect(() => {
      if (error) {
          const lowerErr = error.toLowerCase();
          // Detectar errores críticos de base de datos para ofrecer solución inmediata
          if (lowerErr.includes('recursion') || lowerErr.includes('policy') || lowerErr.includes('permission') || lowerErr.includes('constraint') || lowerErr.includes('violates')) {
              setFixModalError(error);
              setShowFixModal(true);
          }
      }
  }, [error]);

  // --- DATA PROCESSING ---
  const currentUser = useMemo(() => {
      if (!session || !users.length) return null;
      return users.find(u => u.id === session.user.id) || null;
  }, [session, users]);

  // --- JPS AUTO-SYNC ENGINE (Only Owner) ---
  useEffect(() => {
      if (currentUser?.role !== 'owner') return;

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
  }, [currentUser, dbDailyResults, refresh]);

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
          setFixModalError(`Error: ${error.message}`);
          setShowFixModal(true);
          refresh();
          return;
      }
      await supabase.from('transactions').insert({
          user_id: userId,
          type: 'deposit',
          amount: amount,
          details: currentUser?.role === 'owner' ? 'Recarga Dueño' : `Recarga Vendedor`
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
          setFixModalError(`Error: ${error.message}`);
          setShowFixModal(true);
          refresh();
          return;
      }
      await supabase.from('transactions').insert({
          user_id: userId,
          type: 'withdraw',
          amount: amount,
          details: currentUser?.role === 'owner' ? 'Retiro Dueño' : `Retiro Vendedor`
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
              setFixModalError(`Error DB: ${result.error.message}`);
              setShowFixModal(true);
              return false;
          }
          if(existing) optimisticUpdateResult({ ...existing, number, ballColor, reventadosNumber: reventados });
          else refresh();
          return true;

      } catch (e: any) {
          setFixModalError(`Excepción: ${e.message}`);
          setShowFixModal(true);
          return false;
      }
  };

  const handleRegisterUserInternal = async (userData: Partial<User>, targetRole: 'client' | 'seller') => {
      const rpcFunc = targetRole === 'seller' ? 'create_seller_by_owner' : 'create_user_by_admin';
      
      const { data, error } = await supabase.rpc(rpcFunc, {
          new_email: userData.email,
          new_password: userData.password,
          new_name: userData.name,
          new_phone: userData.phone,
          new_cedula: userData.cedula
      });

      if (error) {
          setFixModalError(`Falta función '${rpcFunc}'. Ejecute Script V34.`);
          setShowFixModal(true);
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
          setFixModalError(`Error: ${error.message}`);
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
          console.error(error);
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
          <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
      );
  }

  return (
    <>
      {showFixModal && (
          <DatabaseFixModal error={fixModalError || "Reparación Manual"} onClose={() => setShowFixModal(false)} />
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
                currentUser={currentUser || { id: 'ghost', name: 'Cargando Perfil...', email: '', role: 'client', balance: 0, phone: '', password: '', tickets: [] }} 
                onLogout={handleLogout} 
             />
             
             <main className="container mx-auto px-4 pt-8 relative z-10">
                {view === 'admin' && currentUser && (currentUser.role === 'owner' || currentUser.role === 'seller') ? (
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
                ) : currentUser ? (
                    <ClientPanel 
                        user={currentUser}
                        transactions={transactions.filter(t => t.userId === currentUser.id)}
                        dailyResults={dbDailyResults}
                        historyResults={processedHistory}
                        nextDrawTime={nextDrawTime}
                        isSyncing={loading}
                        onPurchase={handlePurchase}
                        onClaimWinnings={handleClaimWinnings}
                    />
                ) : (
                    // MANEJO DE ESTADO "NO APARECE NADA" (Usuario Fantasma)
                    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 animate-fade-in-up px-4">
                        <div className="w-24 h-24 bg-red-900/20 border-2 border-red-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                             <ExclamationTriangleIcon className="h-12 w-12 text-red-500" />
                        </div>
                        <div className="bg-[#0f172a] p-6 rounded-2xl border border-red-500/30 max-w-lg shadow-2xl">
                            <h2 className="text-3xl font-black text-white uppercase mb-2">ERROR DE PERFIL</h2>
                            <p className="text-gray-300 mb-4 text-sm">
                                Su cuenta de usuario existe, pero la base de datos rechazó la creación de su perfil debido a restricciones de seguridad obsoletas.
                                <br/><br/>
                                <span className="text-red-400 font-bold bg-red-950/40 p-1 rounded">Constraint Violation: profiles_role_check</span>
                            </p>
                            <button 
                                onClick={() => { setFixModalError("Error de Restricción SQL"); setShowFixModal(true); }}
                                className="w-full py-4 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                            >
                                <BoltIcon className="h-6 w-6" />
                                EJECUTAR SOLUCIÓN V34
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-600 font-mono">CODE: ROLE_CONSTRAINT_VIOLATION</p>
                    </div>
                )}
             </main>
             <Footer onOpenGodMode={() => { setFixModalError("Acceso Manual a Consola"); setShowFixModal(true); }} />
        </div>
      )}
      <SecurityModal isOpen={showSecurity} onClose={() => setShowSecurity(false)} />
    </>
  );
}

export default App;
