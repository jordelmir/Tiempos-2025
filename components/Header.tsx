
import React, { useState } from 'react';
import type { User } from '../types';
import { WalletIcon, UserGroupIcon, LockIcon, CpuIcon } from './common/Icons';

interface HeaderProps {
  view: 'admin' | 'client';
  setView: (view: 'admin' | 'client') => void;
  currentUser: User;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ view, setView, currentUser, onLogout }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);
  };

  const handleLogoutClick = () => {
      if (!onLogout) return;
      setIsLoggingOut(true);
      // Retraso para permitir que la animación de salida se reproduzca
      setTimeout(() => {
          onLogout();
      }, 2000);
  };

  return (
    <>
      {/* ANIMACIÓN DE APAGADO DE SISTEMA */}
      {isLoggingOut && (
          <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden animate-fade-in-up">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-scan-line shadow-[0_0_20px_rgba(239,68,68,1)]"></div>
              
              <div className="relative z-10 text-center space-y-6 animate-pulse">
                  <LockIcon className="h-24 w-24 text-red-600 mx-auto animate-shake-hard" />
                  <h2 className="text-4xl font-black text-red-500 uppercase tracking-[0.3em] glitch-text">
                      SYSTEM SHUTDOWN
                  </h2>
                  <div className="w-64 h-2 bg-red-900/30 rounded-full mx-auto overflow-hidden border border-red-500/30">
                      <div className="h-full bg-red-600 animate-progress-indeterminate"></div>
                  </div>
                  <p className="text-xs font-mono text-red-400/70">
                      TERMINATING SESSION ID: {currentUser.id.split('-')[0]}...
                  </p>
              </div>
          </div>
      )}

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
                      onClick={handleLogoutClick}
                      className="group relative px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 
                      border-2 border-red-500 bg-red-950/20 text-red-500 
                      shadow-[0_0_15px_rgba(239,68,68,0.6)] hover:shadow-[0_0_30px_rgba(239,68,68,1)] 
                      hover:bg-red-500 hover:text-white animate-pulse hover:animate-none overflow-hidden"
                  >
                      <span className="relative z-10 flex items-center gap-2">
                          SALIR <LockIcon className="h-3 w-3 group-hover:scale-110 transition-transform"/>
                      </span>
                      {/* Efecto de brillo al hacer hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
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
    </>
  );
};

export default Header;
