
import React, { useState, useCallback, useMemo } from 'react';
import type { User, Ticket } from './types';
import { mockUsers } from './mockData';
import AdminPanel from './components/AdminPanel';
import ClientPanel from './components/ClientPanel';
import Header from './components/Header';
import Footer from './components/Footer';

type View = 'admin' | 'client';

const App: React.FC = () => {
  const [view, setView] = useState<View>('client');
  const [users, setUsers] = useState<User[]>(mockUsers);
  
  // For this demo, we'll hardcode the "logged in" user.
  // In a real app, this would come from an authentication context.
  const [currentUserId, setCurrentUserId] = useState<string>('usr_1');
  
  const currentUser = useMemo(() => users.find(u => u.id === currentUserId)!, [users, currentUserId]);

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

  return (
    <div className="min-h-screen bg-brand-primary text-brand-text-primary flex flex-col">
      <Header view={view} setView={setView} currentUser={currentUser} />
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
