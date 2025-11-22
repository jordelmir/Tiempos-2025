
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import type { User, Ticket, DailyResult, DrawType, BallColor, HistoryResult, Transaction } from './types';
import { fetchOfficialData } from './utils/jpsAgent';
import { useSupabaseData } from './hooks/useSupabaseData';
import AdminPanel from './components/AdminPanel';
import ClientPanel from './components/ClientPanel';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import Footer from './components/Footer';
import SecurityModal from './components/SecurityModal';
import { BoltIcon, ClipboardCheckIcon, ExclamationTriangleIcon } from './components/icons/Icons';

// --- DATABASE REPAIR MODAL ---
const DatabaseFixModal = ({ error, onClose }: { error: string, onClose: () => void }) => {
    const sqlScript = `
-- SCRIPT V24: REPARACIÓN INTEGRAL DE PERMISOS Y BORRADO
-- Ejecute este script en el Editor SQL de Supabase para corregir errores de eliminación.

BEGIN;

-- 1. Limpiar Policies Antiguas (Evita conflictos)
DROP POLICY IF EXISTS "Admins all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users insert tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins all txs" ON public.transactions;
DROP POLICY IF EXISTS "Users own txs" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins full access tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins full access txs" ON public.transactions;

-- 2. Políticas de Perfiles (Admin Total + Delete)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access profiles" ON public.profiles
FOR ALL
USING ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' );

CREATE POLICY "Users read own profile" ON public.profiles
FOR SELECT
USING ( auth.uid() = id );

-- 3. Políticas de Tickets y Transacciones
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access tickets" ON public.tickets 
FOR ALL 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Users select own tickets" ON public.tickets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tickets" ON public.tickets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access txs" ON public.transactions 
FOR ALL 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Users select own txs" ON public.transactions 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Configurar Borrado en Cascada (Clave para que funcione 'Eliminar')
-- Esto hace que si borras el perfil, se borren tickets y transacciones automáticamente.
DO $$
BEGIN
    -- Tickets
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tickets_user_id_fkey') THEN
        ALTER TABLE public.tickets DROP CONSTRAINT tickets_user_id_fkey;
    END IF;
    
    ALTER TABLE public.tickets 
    ADD CONSTRAINT tickets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Transactions
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_user_id_fkey') THEN
        ALTER TABLE public.transactions DROP CONSTRAINT transactions_user_id_fkey;
    END IF;

    ALTER TABLE public.transactions 
    ADD CONSTRAINT transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END $$;

-- 5. Función RPC para Crear Usuarios (Admin)
CREATE OR REPLACE FUNCTION public.create_user_by_admin(
  new_email text,
  new_password text,
  new_name text,
  new_phone text,
  new_cedula text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_id uuid;
  crypted_pw text;
BEGIN
  IF (auth.jwt() -> 'user_metadata' ->> 'role') <> 'admin' THEN
    RAISE EXCEPTION 'Permiso denegado';
  END IF;

  new_id := gen_random_uuid();
  crypted_pw := crypt(new_password, gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', new_email, crypted_pw, now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('role', 'client', 'name', new_name),
    now(), now()
  );

  INSERT INTO public.profiles (id, email, name, phone, cedula, role, balance, created_at)
  VALUES (new_id, new_email, new_name, new_phone, new_cedula, 'client', 0, now())
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, phone = EXCLUDED.phone, cedula = EXCLUDED.cedula;

  RETURN new_id;
END;
$$;

COMMIT;
`;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <div className="w-full max-w-4xl bg-[#0f172a] border-2 border-red-500 rounded-2xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.3)] overflow-hidden flex flex-col max-h-[90vh] animate-bounce-in">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-4 bg-red-900/30 rounded-full border border-red-500 animate-pulse">
                        <BoltIcon className="h-10 w-10 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest">Reparación de Sistema (v24)</h2>
                        <p className="text-red-400 font-mono mt-2 text-sm bg-red-950/50 p-2 rounded border border-red-900">
                            {error}
                        </p>
                    </div>
                </div>
                
                <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg mb-6 text-blue-200 text-sm">
                    <strong>DIAGNÓSTICO:</strong> Fallo crítico en permisos o integridad referencial. El Script V24 reestablece todas las políticas de seguridad y activa el "Borrado en Cascada" para eliminar usuarios limpiamente.
                </div>

                <div className="relative flex-grow overflow-hidden rounded-xl border border-gray-700 bg-[#020617]">
                    <div className="absolute top-0 left-0 right-0 bg-[#1e293b] px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-400">full_repair_v24.sql</span>
                        <button 
                            onClick={() => navigator.clipboard.writeText(sqlScript)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                        >
                            <ClipboardCheckIcon className="h-4 w-4"/> COPIAR SCRIPT
                        </button>
                    </div>
                    <pre className="p-4 pt-12 text-[10px] sm:text-xs text-green-400 font-mono overflow-auto h-full custom-scrollbar whitespace-pre-wrap">
                        {sqlScript}
                    </pre>
                </div>

                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-colors">
                        Cancelar
                    </button>
                    <button onClick={onClose} className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg transition-colors">
                        He ejecutado el Script v24
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
  // New state to control the Fix Modal specifically
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixModalError, setFixModalError] = useState('');

  // Check Auth State on Mount
  useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          if(session?.user?.user_metadata?.role === 'admin') setView('admin');
          setAuthChecking(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          if(session?.user?.user_metadata?.role === 'admin') setView('admin');
          else if(session) setView('client');
      });

      return () => subscription.unsubscribe();
  }, []);

  // Fetch Data Hook
  const { users, transactions, dbDailyResults, loading, error, refresh, optimisticUpdateResult, optimisticAddUser, optimisticUpdateUser, optimisticDeleteUser } = useSupabaseData(session?.user.id);

  // Handle global errors (like RLS recursion)
  useEffect(() => {
      if (error) {
          const lowerErr = error.toLowerCase();
          if (lowerErr.includes('recursion') || lowerErr.includes('policy') || lowerErr.includes('permission')) {
              setFixModalError(error);
              setShowFixModal(true);
          }
      }
  }, [error]);

  // --- JPS AUTO-SYNC ENGINE ---
  useEffect(() => {
      if (session?.user?.user_metadata?.role !== 'admin') return;

      const syncJPS = async () => {
          console.log("🤖 [AUTO-SYNC] Buscando resultados oficiales JPS...");
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
                       console.log(`✨ [NEW RESULT] Sorteo ${res.draw}: ${res.number} (Bolita: ${res.ballColor})`);
                       
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

              if (hasUpdates) {
                  console.log("✅ [SYNC COMPLETE] Base de datos actualizada.");
                  refresh();
              }
          } catch (e) {
              console.warn("⚠️ [SYNC FAILED] No se pudo conectar con JPS (Reintentando luego...)", e);
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
      const now = new Date();
      const h = now.getHours();
      if (h < 13) return "12:55 PM";
      if (h < 16 || (h === 16 && now.getMinutes() < 30)) return "4:30 PM";
      return "7:30 PM";
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
                  role: role, 
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

  // Admin Actions
  const handleRecharge = async (userId: string, amount: number) => {
      const user = users.find(u => u.id === userId);
      if(!user) return;
      
      const newBalance = user.balance + amount;
      
      // 1. Optimistic Update (Instant Feedback)
      optimisticUpdateUser(userId, { balance: newBalance });

      // 2. DB Update
      const { error } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);

      if (error) {
          console.error("Error recargando saldo:", error);
          // Trigger repair modal if permission denied
          if (error.message.includes('policy') || error.message.includes('permission')) {
             setFixModalError(`Error de Permisos: ${error.message}. Ejecute Script V24.`);
             setShowFixModal(true);
          }
          refresh();
          return;
      }

      await supabase.from('transactions').insert({
          user_id: userId,
          type: 'deposit',
          amount: amount,
          details: 'Recarga administrativa'
      });
      
      refresh();
  };

  const handleWithdraw = async (userId: string, amount: number) => {
      const user = users.find(u => u.id === userId);
      if(!user) return;

      const newBalance = user.balance - amount;
      if(newBalance < 0) return;

      // 1. Optimistic Update
      optimisticUpdateUser(userId, { balance: newBalance });

      const { error } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
      
      if (error) {
          console.error("Error retirando saldo:", error);
          if (error.message.includes('policy') || error.message.includes('permission')) {
             setFixModalError(`Error de Permisos: ${error.message}. Ejecute Script V24.`);
             setShowFixModal(true);
          }
          refresh();
          return;
      }

      await supabase.from('transactions').insert({
          user_id: userId,
          type: 'withdraw',
          amount: amount,
          details: 'Retiro de fondos'
      });
      refresh();
  };

  const handleUpdateResult = async (draw: DrawType, number: string | null, ballColor: BallColor | null, reventados: string | null) => {
      const existing = dbDailyResults.find(r => r.draw === draw && new Date(r.date).toLocaleDateString() === new Date().toLocaleDateString());
      
      if(existing) {
           const { error } = await supabase.from('daily_results').update({
               number, ball_color: ballColor, reventados_number: reventados
           }).eq('id', existing.id);
           if(!error) optimisticUpdateResult({ ...existing, number, ballColor, reventadosNumber: reventados });
           return !error;
      } else {
           const { error } = await supabase.from('daily_results').insert({
               date: new Date().toISOString(),
               draw_type: draw,
               number,
               ball_color: ballColor,
               reventados_number: reventados
           });
           refresh();
           return !error;
      }
  };

  const handleRegisterClient = async (userData: Partial<User>) => {
      // Use the V24 RPC function to create user as Admin
      const { data, error } = await supabase.rpc('create_user_by_admin', {
          new_email: userData.email,
          new_password: userData.password,
          new_name: userData.name,
          new_phone: userData.phone,
          new_cedula: userData.cedula
      });

      if (error) {
          console.error("Error creating user:", error);
          const msg = error.message.toLowerCase();

          if (msg.includes('function') && msg.includes('create_user_by_admin')) {
               setFixModalError("Falta la función 'create_user_by_admin'. Ejecute el Script v24.");
               setShowFixModal(true);
               return { error: { message: "Falta configuración DB. Ver modal." }, data: null };
          }

          if (msg.includes('full_name') || msg.includes('column')) {
              setFixModalError("Conflicto de columnas. Ejecute el Script v24.");
              setShowFixModal(true);
              return { error: { message: "Conflicto de base de datos. Ver modal." }, data: null };
          }

          return { error, data: null };
      }

      // --- OPTIMISTIC UPDATE START ---
      if (data) {
          const optimUser: User = {
              id: data, // The UUID returned by RPC
              email: userData.email || '',
              name: userData.name || 'Nuevo Usuario',
              cedula: userData.cedula || '',
              phone: userData.phone || '',
              role: 'client',
              balance: 0,
              tickets: [],
              password: '', // Internal use only
              createdAt: new Date() 
          };
          optimisticAddUser(optimUser);
      }
      // --- OPTIMISTIC UPDATE END ---
      
      setTimeout(() => { refresh(); }, 1500); 
      return { data: { user: { id: data }, session: null }, error: null };
  };

  const handleForceResetPassword = async (userId: string) => {
     const user = users.find(u => u.id === userId);
     if(!user || !user.email) return;

     try {
         const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
             redirectTo: window.location.origin
         });
         
         if (error) throw error;
         
     } catch (err: any) {
         console.error("Error sending reset email:", err);
         alert(`Error enviando correo: ${err.message}`);
     }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
      optimisticUpdateUser(userId, { blocked: !currentStatus });
      const { error } = await supabase.from('profiles').update({ blocked: !currentStatus }).eq('id', userId);
      if(!error) refresh();
      return !error;
  };

  const handleDeleteUser = async (userId: string) => {
      // 1. Optimistic Delete (Visual feedback first)
      optimisticDeleteUser(userId);

      try {
          // 2. Attempt cascading delete manually first (safest approach if cascade is missing)
          // Ignore errors here to allow profile delete to try its best
          await supabase.from('transactions').delete().eq('user_id', userId);
          await supabase.from('tickets').delete().eq('user_id', userId);

          // 3. Delete profile (This is the critical step)
          const { error } = await supabase.from('profiles').delete().eq('id', userId);
          
          if (error) throw error;

          refresh();
          return true;

      } catch (error: any) {
          console.error("Error deleting user:", error);
          
          // Show repair modal for any error to be safe
          setFixModalError(`Error de Eliminación: ${error.message || error}. Ejecute Script V24.`);
          setShowFixModal(true);
          
          refresh(); // Revert optimistic delete by re-fetching if failed
          return false;
      }
  };

  // Shared Purchase Logic (used by Client Panel AND Admin Panel POS)
  const handlePurchase = async (userId: string, tickets: Omit<Ticket, 'id' | 'purchaseDate'>[]) => {
      const totalCost = tickets.reduce((sum, t) => sum + t.amount + (t.reventadosAmount || 0), 0);
      
      const user = users.find(u => u.id === userId);
      if(!user) return { success: false, message: 'Usuario no encontrado' };
      
      if(user.balance < totalCost) return { success: false, message: 'Saldo insuficiente' };

      const newBalance = user.balance - totalCost;
      
      // Optimistic update
      optimisticUpdateUser(userId, { balance: newBalance });

      // Update Balance
      const { error: balError } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
      if(balError) {
           refresh();
           return { success: false, message: balError.message };
      }

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
      if(tktError) {
          return { success: false, message: tktError.message };
      }

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
      await supabase.from('tickets').update({ status: 'paid' }).eq('id', ticketId);
      
      const user = currentUser;
      if(user) {
          const newBalance = user.balance + amount;
          optimisticUpdateUser(user.id, { balance: newBalance });

          await supabase.from('profiles').update({ balance: newBalance }).eq('id', user.id);
          
          await supabase.from('transactions').insert({
              user_id: user.id,
              type: 'winnings',
              amount: amount,
              details: `Premio ${type === 'reventados' ? 'REVENTADO' : ''} Ticket #${ticketId.slice(0,4)}`
          });
          refresh();
      }
  };

  if (authChecking) {
      return (
          <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
              <div className="relative w-24 h-24">
                  <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                  <BoltIcon className="absolute inset-0 m-auto h-8 w-8 text-indigo-500 animate-pulse"/>
              </div>
          </div>
      );
  }

  return (
    <>
      {showFixModal && (
          <DatabaseFixModal error={fixModalError} onClose={() => setShowFixModal(false)} />
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
                currentUser={currentUser || { id: 'ghost', name: 'Cargando...', email: '', role: 'client', balance: 0, phone: '', password: '', tickets: [] }} 
                onLogout={handleLogout} 
             />
             
             <main className="container mx-auto px-4 pt-8 relative z-10">
                {view === 'admin' && currentUser?.role === 'admin' ? (
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
                        onRegisterClient={handleRegisterClient}
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
                    <div className="text-center py-20">
                        <div className="animate-spin h-10 w-10 border-4 border-brand-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-brand-text-secondary">Sincronizando perfil...</p>
                    </div>
                )}
             </main>
             
             <Footer />
        </div>
      )}

      <SecurityModal isOpen={showSecurity} onClose={() => setShowSecurity(false)} />
    </>
  );
}

export default App;
