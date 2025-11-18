
import React, { useState, useCallback, useMemo } from 'react';
import type { User, Ticket } from './types';
import { mockUsers } from './mockData';
import AdminPanel from './components/AdminPanel';
import ClientPanel from './components/ClientPanel';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import Footer from './components/Footer';

type View = 'admin' | 'client';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [view, setView] = useState<View>('client'); // This effectively acts as the role view for now
  
  // In a real app, this state would be managed by a backend or simpler local storage
  const [users, setUsers] = useState<User[]>(mockUsers);
  
  const currentUser = useMemo(() => users.find(u => u.id === currentUserId), [users, currentUserId]);

  const handleLogin = (email: string, role: 'admin' | 'client') => {
    // Simple mock authentication
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      setCurrentUserId(user.id);
      setIsAuthenticated(true);
      setView(role);
    } else {
      alert('Usuario no encontrado. Por favor regístrese.');
    }
  };

  const handleRegister = (userData: Partial<User>) => {
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: userData.name!,
      email: userData.email!,
      phone: userData.phone!,
      balance: 0, // Start with 0 balance
      tickets: []
    };
    
    setUsers([...users, newUser]);
    setCurrentUserId(newUser.id);
    setIsAuthenticated(true);
    setView('client'); // Default to client view on register
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUserId(null);
    setView('client');
  };

  const handleRecharge = useCallback((userId: string, amount: number) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId
          ? { ...user, balance: user.balance + amount }
          : user
      )
    );
  }, []);

  const handlePurchase = useCallback((userId: string, newTickets: Omit<Ticket, 'id' | 'purchaseDate'>[]) => {
    setUsers(prevUsers => {
      const user = prevUsers.find(u => u.id === userId);
      if (!user) return prevUsers;

      const totalCost = newTickets.reduce((sum, ticket) => sum + ticket.amount, 0);
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
          <AdminPanel users={users} onRecharge={handleRecharge} />
        ) : (
          <ClientPanel user={currentUser} onPurchase={handlePurchase} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
