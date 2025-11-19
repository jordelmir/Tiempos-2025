
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Ticket, DailyResult, DrawType, BallColor, HistoryResult } from './types';
import { mockUsers } from './mockData';
import { fetchOfficialData } from './utils/jpsAgent';
import AdminPanel from './components/AdminPanel';
import ClientPanel from './components/ClientPanel';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import Footer from './components/Footer';

type View = 'admin' | 'client';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [view, setView] = useState<View>('client');
  
  // User State
  const [users, setUsers] = useState<User[]>(mockUsers);
  
  // Game Data State (Centralized)
  const [dailyResults, setDailyResults] = useState<DailyResult[]>([]);
  const [historyResults, setHistoryResults] = useState<HistoryResult[]>([]);
  const [nextDrawTime, setNextDrawTime] = useState<string>('Cargando...');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const currentUser = useMemo(() => users.find(u => u.id === currentUserId), [users, currentUserId]);

  // Load Initial Data from Agent
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
    // Poll periodically for automatic updates (optional, handled manually by admin now primarily)
    const interval = setInterval(loadData, 60000); 
    return () => clearInterval(interval);
  }, []);

  // --- AUTH HANDLERS ---

  const handleLogin = (email: string, requestedRole: 'admin' | 'client') => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      if (requestedRole === 'admin' && user.role !== 'admin') {
        alert('Acceso denegado. Este usuario no tiene permisos de administrador.');
        return;
      }
      setCurrentUserId(user.id);
      setIsAuthenticated(true);
      setView(requestedRole);
    } else {
      alert('Usuario no encontrado. Por favor regístrese.');
    }
  };

  const handleRegister = (userData: Partial<User>, role: 'admin' | 'client') => {
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: userData.name!,
      email: userData.email!,
      phone: userData.phone!,
      balance: 0,
      role: role, // Set the selected role
      tickets: []
    };
    setUsers([...users, newUser]);
    setCurrentUserId(newUser.id);
    setIsAuthenticated(true);
    setView(role); // Redirect immediately to the correct dashboard
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUserId(null);
    setView('client');
  };

  // --- FINANCE HANDLERS ---

  const handleRecharge = useCallback((userId: string, amount: number) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId
          ? { ...user, balance: user.balance + amount }
          : user
      )
    );
  }, []);

  const handleWithdraw = useCallback((userId: string, amount: number) => {
    setUsers(prevUsers =>
      prevUsers.map(user => {
        if (user.id === userId) {
          if (user.balance < amount) return user; 
          return { ...user, balance: user.balance - amount };
        }
        return user;
      })
    );
  }, []);

  const handlePurchase = useCallback((userId: string, newTickets: Omit<Ticket, 'id' | 'purchaseDate'>[]) => {
    setUsers(prevUsers => {
      const user = prevUsers.find(u => u.id === userId);
      if (!user) return prevUsers;

      const totalCost = newTickets.reduce((sum, ticket) => sum + ticket.amount + (ticket.reventadosAmount || 0), 0);
      if (user.balance < totalCost) {
        alert('Saldo insuficiente.');
        return prevUsers;
      }

      const ticketsWithIds: Ticket[] = newTickets.map(ticket => ({
        ...ticket,
        id: `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        purchaseDate: new Date(),
      }));

      return prevUsers.map(u =>
        u.id === userId
          ? {
              ...u,
              balance: u.balance - totalCost,
              tickets: [...u.tickets, ...ticketsWithIds],
            }
          : u
      );
    });
  }, []);

  // --- ADMIN MANUAL OVERRIDE HANDLER ---
  
  const handleManualResultUpdate = useCallback((
    draw: DrawType, 
    number: string | null, 
    ballColor: BallColor | null, 
    reventadosNumber: string | null
  ) => {
      setDailyResults(prev => prev.map(item => {
          if (item.draw === draw) {
              return {
                  ...item,
                  number,
                  ballColor,
                  reventadosNumber
              };
          }
          return item;
      }));
  }, []);

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (!currentUser) return <div>Error de estado crítico. Reinicie la aplicación.</div>;

  return (
    <div className="min-h-screen bg-brand-primary text-brand-text-primary flex flex-col">
      <Header 
        view={view} 
        setView={setView} 
        currentUser={currentUser} 
        onLogout={handleLogout}
      />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {view === 'admin' ? (
          <AdminPanel 
            users={users} 
            dailyResults={dailyResults}
            onRecharge={handleRecharge} 
            onWithdraw={handleWithdraw}
            onUpdateResult={handleManualResultUpdate}
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
      <Footer />
    </div>
  );
};

export default App;
