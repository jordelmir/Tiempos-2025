
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
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-brand-primary/70 border-b border-brand-border">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-accent to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                <span className="font-black text-white text-lg">T</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight hidden xs:block">
              TIEMPOS<span className="text-brand-accent">PRO</span>
            </h1>
          </div>
          
          {/* Desktop Nav */}
          {currentUser.role === 'admin' && (
            <nav className="hidden md:flex items-center bg-brand-secondary/50 border border-brand-border rounded-full p-1">
                <button
                onClick={() => setView('client')}
                className={`px-4 py-1.5 text-xs uppercase font-bold rounded-full transition-all ${view === 'client' ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-white'}`}
                >
                Cliente
                </button>
                <button
                onClick={() => setView('admin')}
                className={`px-4 py-1.5 text-xs uppercase font-bold rounded-full transition-all ${view === 'admin' ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-white'}`}
                >
                Admin
                </button>
            </nav>
          )}
        </div>
        
        <div className="flex items-center gap-3 md:gap-6">
            {view === 'client' && (
              <div className="flex items-center gap-3 bg-brand-secondary/80 border border-brand-border pl-4 pr-2 py-1.5 rounded-full shadow-lg">
                 <div className="hidden sm:block text-right mr-2">
                    <div className="text-[10px] text-brand-text-secondary uppercase font-bold leading-tight">Tu Saldo</div>
                    <div className="text-xs font-bold text-white leading-tight">{currentUser.name.split(' ')[0]}</div>
                 </div>
                 <div className="flex items-center gap-2 bg-brand-tertiary px-3 py-1 rounded-full border border-brand-border">
                    <WalletIcon className="h-4 w-4 text-brand-success" />
                    <span className="font-mono font-bold text-brand-success text-sm md:text-base">{formatCurrency(currentUser.balance)}</span>
                 </div>
              </div>
            )}
            
            {onLogout && (
                <button 
                    onClick={onLogout}
                    className="text-brand-text-secondary hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-white/10"
                >
                    SALIR
                </button>
            )}
        </div>
      </div>
       
       {/* Mobile Navigation - Only for Admins */}
       {currentUser.role === 'admin' && (
           <nav className="md:hidden flex items-center bg-brand-secondary border-b border-brand-border p-1">
                <button
                onClick={() => setView('client')}
                className={`w-1/2 py-2 text-xs uppercase font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${view === 'client' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary hover:text-white'}`}
                >
                <WalletIcon className="h-4 w-4"/> Vista Cliente
                </button>
                <button
                onClick={() => setView('admin')}
                className={`w-1/2 py-2 text-xs uppercase font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${view === 'admin' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary hover:text-white'}`}
                >
                <UserGroupIcon className="h-4 w-4"/> Vista Admin
                </button>
           </nav>
       )}
    </header>
  );
};

export default Header;