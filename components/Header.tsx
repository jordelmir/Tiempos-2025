
import React from 'react';
import type { User } from '../types';
import { WalletIcon, UserGroupIcon } from './icons/Icons';

interface HeaderProps {
  view: 'admin' | 'client';
  setView: (view: 'admin' | 'client') => void;
  currentUser: User;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ view, setView, currentUser, onLogout }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(amount);
  };

  return (
    <header className="bg-brand-secondary border-b border-brand-border sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-brand-text-primary">
            <span className="text-brand-accent">Tiempos</span>PRO
          </h1>
          <nav className="hidden md:flex items-center bg-brand-primary border border-brand-border rounded-lg p-1">
            <button
              onClick={() => setView('client')}
              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === 'client' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}
            >
              Cliente
            </button>
            <button
              onClick={() => setView('admin')}
              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === 'admin' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}
            >
              Admin
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
            {view === 'client' && (
              <>
                <div className="hidden sm:block text-right">
                  <div className="text-sm text-brand-text-primary font-semibold">{currentUser.name}</div>
                  <div className="text-xs text-brand-text-secondary">Saldo Actual</div>
                </div>
                <div className="bg-brand-primary border border-brand-border rounded-lg px-3 py-1.5 md:px-4 md:py-2 flex items-center gap-2">
                  <WalletIcon className="h-5 w-5 text-brand-accent" />
                  <span className="font-bold text-brand-text-primary text-sm md:text-lg">{formatCurrency(currentUser.balance)}</span>
                </div>
              </>
            )}
            {onLogout && (
                <button 
                    onClick={onLogout}
                    className="text-brand-danger border border-brand-danger/20 bg-brand-danger/10 hover:bg-brand-danger hover:text-white px-3 py-1.5 rounded-md text-xs font-bold transition-all"
                >
                    SALIR
                </button>
            )}
        </div>
      </div>
       <nav className="md:hidden flex items-center bg-brand-primary border-t border-brand-border p-2">
            <button
              onClick={() => setView('client')}
              className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${view === 'client' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}
            >
              <WalletIcon className="h-5 w-5"/> Cliente
            </button>
            <button
              onClick={() => setView('admin')}
              className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${view === 'admin' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}
            >
              <UserGroupIcon className="h-5 w-5"/> Admin
            </button>
       </nav>
    </header>
  );
};

export default Header;
