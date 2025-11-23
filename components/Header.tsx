
import React from 'react';
import type { User } from '../types';
import { WalletIcon, UserGroupIcon, CpuIcon, BoltIcon, SparklesIcon } from './icons/Icons';

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

  const isStaff = currentUser.role === 'owner' || currentUser.role === 'seller';
  const roleLabel = currentUser.role === 'owner' ? 'DUEÑO' : (currentUser.role === 'seller' ? 'VENDEDOR' : 'CLIENTE');
  const roleColor = currentUser.role === 'owner' ? 'text-purple-400' : (currentUser.role === 'seller' ? 'text-emerald-400' : 'text-cyan-400');

  return (
    <header className="sticky top-0 z-50">
      <div className="absolute inset-0 bg-[#030508]/80 backdrop-blur-xl border-b border-white/10"></div>
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/50 to-transparent"></div>

      {/* Super User / Owner Background Effect */}
      {currentUser.role === 'owner' && (
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 opacity-80"></div>
      )}

      <div className="container mx-auto px-4 py-4 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="relative w-10 h-10 flex items-center justify-center">
                <div className={`absolute inset-0 rounded-xl blur-md opacity-50 group-hover:opacity-100 transition duration-500 animate-pulse-slow ${currentUser.role === 'owner' ? 'bg-purple-600' : 'bg-brand-accent'}`}></div>
                <div className={`relative w-full h-full rounded-xl flex items-center justify-center border border-white/20 shadow-lg bg-gradient-to-br ${currentUser.role === 'owner' ? 'from-purple-700 to-indigo-900' : 'from-brand-accent to-brand-primary'}`}>
                    <span className="font-black text-white text-xl font-mono">T</span>
                </div>
            </div>
            <div>
                <h1 className="text-xl font-bold text-white tracking-tight font-mono leading-none">
                TIEMPOS<span className={`drop-shadow-[0_0_5px_rgba(6,182,212,0.8)] ${currentUser.role === 'owner' ? 'text-purple-400' : 'text-brand-cyan'}`}>PRO</span>
                </h1>
                <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-black tracking-[0.3em] uppercase ${roleColor} glow`}>
                        {roleLabel} CONSOLE
                    </span>
                    {currentUser.role === 'owner' && <SparklesIcon className="h-3 w-3 text-purple-400 animate-pulse"/>}
                </div>
            </div>
          </div>
          
          {isStaff && (
            <nav className="hidden md:flex items-center gap-4">
                <button
                  onClick={() => setView('client')}
                  className="relative group"
                >
                  <div className={`absolute -inset-2 bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-600 rounded-lg blur-lg transition-all duration-500 ${view === 'client' ? 'opacity-60 animate-pulse-slow' : 'opacity-20 group-hover:opacity-40'}`}></div>
                  <div className={`relative px-5 py-2 rounded-md flex items-center gap-2 border transition-all duration-300 ${view === 'client' ? 'bg-[#0B101B] border-brand-cyan text-brand-cyan shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]' : 'bg-black/50 border-white/5 text-gray-500 hover:text-white hover:border-white/20'}`}>
                      <WalletIcon className={`h-3 w-3 ${view === 'client' ? 'animate-pulse' : ''}`} />
                      <span className="text-[10px] uppercase tracking-widest font-bold">Mi Cuenta</span>
                  </div>
                </button>

                <button
                  onClick={() => setView('admin')}
                  className="relative group"
                >
                  <div className={`absolute -inset-2 bg-gradient-to-r ${currentUser.role === 'owner' ? 'from-indigo-600 via-purple-500 to-indigo-600' : 'from-emerald-600 via-green-500 to-emerald-600'} rounded-lg blur-lg transition-all duration-500 ${view === 'admin' ? 'opacity-70 animate-pulse-slow' : 'opacity-20 group-hover:opacity-40'}`}></div>
                  <div className={`relative px-5 py-2 rounded-md flex items-center gap-2 border transition-all duration-300 ${view === 'admin' ? (currentUser.role === 'owner' ? 'bg-[#0B101B] border-purple-500 text-purple-400 shadow-[inset_0_0_10px_rgba(147,51,234,0.2)]' : 'bg-[#0B101B] border-emerald-500 text-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]') : 'bg-black/50 border-white/5 text-gray-500 hover:text-white hover:border-white/20'}`}>
                      {currentUser.role === 'owner' ? <BoltIcon className={`h-3 w-3 ${view === 'admin' ? 'animate-pulse' : ''}`} /> : <CpuIcon className={`h-3 w-3 ${view === 'admin' ? 'animate-pulse' : ''}`} />}
                      <span className="text-[10px] uppercase tracking-widest font-bold">
                          {currentUser.role === 'owner' ? 'GOD MODE' : 'Terminal'}
                      </span>
                  </div>
                </button>
            </nav>
          )}
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
            {view === 'client' && (
              <div className="flex items-center gap-6">
                 <div className="hidden sm:block text-right relative group mr-2">
                    <div className="absolute -inset-x-6 -inset-y-4 bg-gradient-to-r from-transparent via-brand-cyan/20 to-transparent blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-end gap-2 mb-0.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-cyan"></span>
                            </span>
                            <div className="text-[9px] text-brand-cyan uppercase font-bold tracking-[0.25em] opacity-80">
                                CUENTA ACTIVA
                            </div>
                        </div>
                        <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-brand-cyan font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                            {currentUser.name.split(' ')[0]}
                        </div>
                    </div>
                 </div>
                 <div className="relative group">
                    <div className="absolute -inset-1 bg-brand-success/30 rounded-lg blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
                    <div className="relative flex items-center gap-3 bg-[#050910] px-4 py-2 rounded-lg border border-brand-success/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <WalletIcon className="h-5 w-5 text-brand-success" />
                        <span className="font-mono font-bold text-brand-success text-lg tracking-tight shadow-brand-success">{formatCurrency(currentUser.balance)}</span>
                    </div>
                 </div>
              </div>
            )}
            
            {onLogout && (
                <button onClick={onLogout} className="relative group">
                    <div className="absolute -inset-3 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 rounded-xl blur-xl opacity-20 group-hover:opacity-80 transition-all duration-500 animate-pulse"></div>
                    <div className="relative bg-[#0B0F19] border border-white/10 group-hover:border-red-500/50 px-5 py-2 rounded-lg flex items-center gap-3 transition-all duration-300 group-hover:shadow-[inset_0_0_20px_rgba(220,38,38,0.2)] overflow-hidden">
                        <div className="w-2 h-2 rounded-full bg-red-500 group-hover:animate-ping group-hover:bg-red-400 shadow-[0_0_10px_#EF4444]"></div>
                        <span className="text-xs font-bold font-mono text-gray-400 group-hover:text-red-100 transition-colors tracking-widest uppercase">SALIR</span>
                    </div>
                </button>
            )}
        </div>
      </div>
       
       {isStaff && (
           <nav className="md:hidden flex items-center bg-[#050910] border-b border-white/10 p-2 gap-2 relative z-20">
                <button onClick={() => setView('client')} className={`flex-1 py-3 text-[10px] uppercase font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${view === 'client' ? 'bg-brand-tertiary text-brand-cyan border border-brand-cyan/30' : 'text-brand-text-secondary bg-white/5'}`}>
                   <WalletIcon className="h-4 w-4"/> Mi Cuenta
                </button>
                <button onClick={() => setView('admin')} className={`flex-1 py-3 text-[10px] uppercase font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${view === 'admin' ? (currentUser.role === 'owner' ? 'bg-purple-900/30 text-purple-400 border border-purple-500/30' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30') : 'text-brand-text-secondary bg-white/5'}`}>
                   <CpuIcon className="h-4 w-4"/> {currentUser.role === 'owner' ? 'GOD MODE' : 'Vendedor'}
                </button>
           </nav>
       )}
    </header>
  );
};

export default Header;
