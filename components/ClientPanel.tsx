
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Ticket, DrawType, DailyResult, HistoryResult, BallColor, Transaction } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import WinnerModal from './WinnerModal';
import ActionModal, { ActionType } from './ActionModal';
import { sendWinnerNotification } from '../utils/emailService';
import { 
  PlusIcon, 
  TrashIcon, 
  ShoppingCartIcon, 
  CheckCircleIcon, 
  SunIcon, 
  MoonIcon, 
  SunsetIcon,
  ClockIcon,
  FireIcon,
  CpuIcon,
  BoltIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from './icons/Icons';

interface ClientPanelProps {
  user: User;
  transactions: Transaction[];
  onPurchase: (userId: string, tickets: Omit<Ticket, 'id' | 'purchaseDate'>[]) => void;
  dailyResults: DailyResult[];
  historyResults: HistoryResult[];
  nextDrawTime: string;
  isSyncing: boolean;
  onClaimWinnings: (ticketId: string, amount: number, type: 'regular' | 'reventados') => void;
}

type NewTicket = Omit<Ticket, 'id' | 'purchaseDate'>;

const getNextDraw = (): DrawType => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const totalMinutes = h * 60 + m;
    if (totalMinutes < 12 * 60 + 55) return 'mediodia';
    if (totalMinutes < 16 * 60 + 30) return 'tarde';
    if (totalMinutes < 19 * 60 + 30) return 'noche';
    return 'mediodia';
};

const ClientPanel: React.FC<ClientPanelProps> = ({ 
    user, 
    transactions,
    onPurchase, 
    dailyResults, 
    historyResults, 
    nextDrawTime, 
    isSyncing,
    onClaimWinnings
}) => {
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [playReventados, setPlayReventados] = useState(false);
  const [reventadosAmount, setReventadosAmount] = useState('');
  const [selectedDraw, setSelectedDraw] = useState<DrawType>(getNextDraw()); 
  const [cart, setCart] = useState<NewTicket[]>([]);
  const [error, setError] = useState('');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const [actionModal, setActionModal] = useState<{isOpen: boolean, amount: number, isReventados: boolean}>({
      isOpen: false, amount: 0, isReventados: false
  });

  const [winNotification, setWinNotification] = useState<{type: 'regular'|'reventados', amount: number, number: string, draw: string} | null>(null);
  const totalCost = cart.reduce((sum, item) => sum + item.amount + (item.reventadosAmount || 0), 0);

  const DRAW_LABELS: Record<DrawType, string> = {
    mediodia: 'MEDIODÍA',
    tarde: 'TARDE',
    noche: 'NOCHE'
  };

  const stats = useMemo(() => {
      const numCounts: Record<string, number> = {};
      let totalDraws = 0;
      let redBalls = 0;

      historyResults.forEach(day => {
          ['mediodia', 'tarde', 'noche'].forEach((d) => {
              const res = day.results[d as DrawType];
              if(res.number) {
                  numCounts[res.number] = (numCounts[res.number] || 0) + 1;
                  totalDraws++;
                  if(res.ball === 'roja') redBalls++;
              }
          });
      });

      const hotNumbers = Object.entries(numCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([num, count]) => ({ num, count }));

      const redBallPercentage = totalDraws > 0 ? Math.round((redBalls / totalDraws) * 100) : 0;

      return { hotNumbers, redBallPercentage, totalDraws };
  }, [historyResults]);

  useEffect(() => {
      const checkWinners = async () => {
          const normalize = (d: Date) => d.toLocaleDateString('es-CR');
          const todayTickets = user.tickets.filter(t => normalize(new Date(t.purchaseDate)) === normalize(new Date()));
          if (todayTickets.length === 0 || dailyResults.length === 0) return;
          const pendingTickets = todayTickets.filter(t => t.status === 'pending');
          pendingTickets.forEach(ticket => {
              const result = dailyResults.find(r => r.draw === ticket.draw && r.number !== null);
              if (result && result.number === ticket.number) {
                  let winAmount = ticket.amount * 90; 
                  let type: 'regular' | 'reventados' = 'regular';
                  if (ticket.reventadosAmount && ticket.reventadosAmount > 0 && result.ballColor === 'roja' && result.reventadosNumber === ticket.number) {
                      type = 'reventados';
                      winAmount += (ticket.reventadosAmount * 200); 
                  }
                  onClaimWinnings(ticket.id, winAmount, type);
                  setWinNotification({ type, amount: winAmount, number: ticket.number, draw: DRAW_LABELS[ticket.draw] });
                  sendWinnerNotification(user.email, user.name, winAmount, ticket.number, DRAW_LABELS[ticket.draw], type === 'reventados');
              }
          });
      };
      const timer = setTimeout(checkWinners, 2000); 
      return () => clearTimeout(timer);
  }, [dailyResults, user.tickets, user.email, user.name, onClaimWinnings]);

  const handleAddTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const num = parseInt(number, 10);
    const amnt = parseInt(amount, 10);
    const revAmt = playReventados ? parseInt(reventadosAmount, 10) : 0;

    if (isNaN(num) || num < 0 || num > 99) { setError('Número inválido'); return; }
    if (isNaN(amnt) || amnt <= 0) { setError('Monto inválido'); return; }

    setIsAddingToCart(true);
    setTimeout(() => {
        setCart([...cart, { number: num.toString().padStart(2, '0'), amount: amnt, draw: selectedDraw, reventadosAmount: playReventados ? revAmt : undefined }]);
        setNumber(''); setAmount(''); setReventadosAmount(''); setPlayReventados(false); setIsAddingToCart(false);
    }, 400);
  };

  const handlePurchase = () => {
      if (totalCost > user.balance) { setError('Saldo insuficiente'); return; }
      const hasReventados = cart.some(item => item.reventadosAmount && item.reventadosAmount > 0);
      setActionModal({ isOpen: true, amount: totalCost, isReventados: hasReventados });
      onPurchase(user.id, cart);
      setCart([]);
  }

  const getDrawIcon = (type: DrawType) => {
    switch(type) {
      case 'mediodia': return <SunIcon className="h-5 w-5" />;
      case 'tarde': return <SunsetIcon className="h-5 w-5" />;
      case 'noche': return <MoonIcon className="h-5 w-5" />;
    }
  };

  // Helper render for history badges
  const renderHistoryBadge = (draw: DrawType, result: any) => {
      if(!result.number) return <div className="text-gray-700 text-xs">-</div>;
      
      const isRed = result.ball === 'roja';
      
      return (
          <div className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-lg border relative ${
                  isRed 
                  ? 'bg-gradient-to-br from-red-600 to-red-800 text-white border-red-500' 
                  : 'bg-[#0B101B] text-white border-white/20'
              }`}>
                  {result.number}
                  {isRed && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-black"></div>}
              </div>
              {isRed && <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">ROJA</span>}
          </div>
      );
  };

  return (
    <div className="space-y-8 relative pb-20">
      {winNotification && <WinnerModal winType={winNotification.type} amount={winNotification.amount} ticketNumber={winNotification.number} userEmail={user.email} onClose={() => setWinNotification(null)} />}
      <ActionModal isOpen={actionModal.isOpen} type="purchase" amount={actionModal.amount} details={`${cart.length} JUGADAS`} isReventados={actionModal.isReventados} onClose={() => setActionModal({...actionModal, isOpen: false})} />

      {/* HERO SECTION - RESULTS */}
      <section className="relative animate-fade-in-up">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div className="relative z-10">
                  {/* Live Feed Indicator - Cyberpunk Style */}
                  <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-sm bg-black/40 border-l-2 border-brand-success backdrop-blur-sm mb-6 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                      <div className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSyncing ? 'bg-brand-cyan' : 'bg-brand-success'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isSyncing ? 'bg-brand-cyan' : 'bg-brand-success'}`}></span>
                      </div>
                      <div className="flex flex-col leading-none">
                          <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-0.5">STATUS_LINK</span>
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isSyncing ? 'text-brand-cyan' : 'text-brand-success'}`}>
                              {isSyncing ? 'SYNCING_STREAM...' : 'LIVE_DATA_FEED_ACTIVE'}
                          </span>
                      </div>
                  </div>

                  {/* Title Block with layered glow */}
                  <div className="relative">
                      <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-[0.9] select-none">
                          <span className="block text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] relative z-10">
                              RESULTADOS
                          </span>
                          <span className="relative block text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-cyan-400 to-purple-500 drop-shadow-[0_0_25px_rgba(6,182,212,0.4)] z-10">
                              DE HOY
                          </span>
                          
                          {/* Decorative Glitch Elements behind text */}
                          <div className="absolute -left-4 top-8 w-1 h-16 bg-brand-cyan/50 blur-[2px]"></div>
                          <div className="absolute left-0 -bottom-4 w-24 h-1.5 bg-gradient-to-r from-brand-accent to-transparent"></div>
                      </h2>
                  </div>
              </div>
              
              {/* NEXT DRAW CARD - FUTURISTIC BACKLIGHT EDITION */}
              <div className="relative group cursor-default">
                  {/* Backlight Glow - Chrono/Time Theme (Cyan/Blue/Purple) */}
                  <div className="absolute -inset-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition duration-1000 animate-pulse-slow"></div>
                  
                  {/* Card Surface */}
                  <div className="relative bg-[#050910]/90 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col items-end min-w-[160px]">
                      
                      {/* Label with scanning indicator */}
                      <div className="flex items-center gap-2 mb-1">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-cyan"></span>
                          </span>
                          <span className="text-[9px] font-bold text-brand-cyan uppercase tracking-[0.2em] drop-shadow-sm">Siguiente Sorteo</span>
                      </div>
                      
                      {/* Time Display with Holographic Text */}
                      <div className="flex items-center gap-3">
                           <ClockIcon className="h-5 w-5 text-brand-text-secondary animate-spin-slower"/>
                           <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 drop-shadow-[0_0_10px_rgba(6,182,212,0.7)]">
                               {nextDrawTime}
                           </span>
                      </div>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Se muestran estrictamente las 3 tarjetas: Mediodía, Tarde, Noche */}
              {(['mediodia', 'tarde', 'noche'] as DrawType[]).map((drawType) => {
                  // Buscar resultado EXACTO del día de hoy
                  const existingResult = dailyResults.find(r => 
                      r.draw === drawType && 
                      new Date(r.date).toDateString() === new Date().toDateString()
                  );

                  // Si no existe, usamos un placeholder "Pendiente"
                  const res = existingResult || { 
                      date: new Date().toISOString(), 
                      draw: drawType, 
                      number: null, 
                      reventadosNumber: null, 
                      ballColor: null 
                  };

                  const isReventado = res.ballColor === 'roja';

                  return (
                      <Card 
                        key={drawType} 
                        glowColor={
                            res.draw === 'mediodia' ? 'from-orange-500 via-yellow-500 to-orange-600' : 
                            res.draw === 'tarde' ? 'from-purple-600 via-pink-500 to-purple-700' : 
                            'from-blue-900 via-blue-800 to-indigo-900' // Dark Blue Neon updated
                        }
                      >
                          <div className="flex items-center justify-between mb-8 relative z-20">
                              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border bg-black/20 backdrop-blur-md ${
                                  res.draw === 'mediodia' ? 'text-orange-400 border-orange-500/30' : 
                                  res.draw === 'tarde' ? 'text-purple-400 border-purple-500/30' : 
                                  'text-blue-300 border-blue-500/30'
                                }`}>
                                  {getDrawIcon(res.draw)}
                                  <span className="text-xs font-bold uppercase tracking-wider">{DRAW_LABELS[res.draw]}</span>
                              </div>
                              {res.number && (
                                  <div className={`w-2 h-2 rounded-full animate-pulse ${isReventado ? 'bg-brand-danger shadow-[0_0_15px_#EF4444]' : 'bg-brand-success shadow-[0_0_15px_#10B981]'}`}></div>
                              )}
                          </div>

                          <div className="flex justify-center py-6">
                              {res.number ? (
                                  <div className="relative group cursor-default select-none">
                                      {/* Layer 1: Outer Atmosphere */}
                                      <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse-slow ${isReventado ? 'bg-red-600' : 'bg-blue-400'}`}></div>
                                      
                                      {/* Layer 2: The Orb */}
                                      <div className={`
                                          relative w-36 h-36 rounded-full flex items-center justify-center
                                          bg-gradient-radial ${isReventado ? 'from-red-500 via-red-700 to-black' : 'from-white via-slate-300 to-slate-500'}
                                          shadow-[inset_0_-10px_20px_rgba(0,0,0,0.8),0_0_20px_rgba(255,255,255,0.2)]
                                          border-[1px] ${isReventado ? 'border-red-400' : 'border-white/40'}
                                      `}>
                                          <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-20 mix-blend-overlay"></div>
                                          
                                          <span className={`text-7xl font-black tracking-tighter z-10 ${isReventado ? 'text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]' : 'text-brand-primary drop-shadow-sm'}`}>
                                              {res.number}
                                          </span>
                                          
                                          {/* Specular Highlight */}
                                          <div className="absolute top-4 left-6 w-12 h-6 bg-white rounded-full opacity-40 blur-[4px]"></div>
                                      </div>
                                      
                                      {isReventado && (
                                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-danger text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_#EF4444] border border-red-400 flex items-center gap-1 whitespace-nowrap z-30 animate-bounce">
                                              <FireIcon className="h-3 w-3"/> x200
                                          </div>
                                      )}
                                  </div>
                              ) : (
                                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center animate-spin-slow relative">
                                      <div className="absolute inset-0 rounded-full border border-white/5 animate-ping opacity-20"></div>
                                      <span className="text-xs font-mono text-white/30 animate-pulse">WAITING</span>
                                  </div>
                              )}
                          </div>
                      </Card>
                  )
              })}
          </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* BETTING INTERFACE - WORLD CLASS DESIGN UPDATE */}
          <div className="lg:col-span-8">
              <div className="relative group">
                  {/* MASSIVE BACKLIGHT EFFECT (Light coming from behind) */}
                  {/* Outer wide glow */}
                  <div className="absolute -inset-8 bg-gradient-to-r from-purple-900 via-fuchsia-900 to-purple-900 rounded-[3rem] blur-3xl opacity-60 group-hover:opacity-80 transition duration-1000 animate-pulse-slow pointer-events-none"></div>
                  
                  {/* Inner intense glow */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-[2rem] blur-xl opacity-30 group-hover:opacity-60 transition duration-500 pointer-events-none"></div>
                  
                  <div className="relative bg-[#050910]/90 backdrop-blur-xl border border-purple-500/20 rounded-[1.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-8">
                      {/* Inner Ambient Light */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50 blur-sm"></div>
                      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                      <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6 relative z-10">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-900 flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(147,51,234,0.3)]">
                              <CpuIcon className="h-6 w-6 text-white"/>
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Configurar Jugada</h3>
                              <p className="text-xs font-mono text-purple-400 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></span>
                                  INGRESE COORDENADAS DE APUESTA
                              </p>
                          </div>
                      </div>

                      <form onSubmit={handleAddTicket} className="space-y-8 relative z-10">
                          {/* Draw Selector */}
                          <div className="grid grid-cols-3 gap-4 p-2 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                              {(['mediodia', 'tarde', 'noche'] as DrawType[]).map(type => (
                                  <button
                                      key={type}
                                      type="button"
                                      onClick={() => setSelectedDraw(type)}
                                      className={`relative py-4 rounded-xl transition-all duration-300 overflow-hidden group/btn ${selectedDraw === type ? 'bg-[#1E1B4B] shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-purple-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                                  >
                                      <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700`}></div>
                                      <div className={`flex flex-col items-center gap-2 relative z-10 ${selectedDraw === type ? 'text-white scale-105' : 'text-gray-500 grayscale'}`}>
                                          {getDrawIcon(type)}
                                          <span className="text-[10px] font-bold uppercase tracking-widest">{DRAW_LABELS[type]}</span>
                                      </div>
                                      {selectedDraw === type && (
                                          <>
                                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 shadow-[0_0_10px_#A855F7]"></div>
                                            <div className="absolute inset-0 bg-purple-500/5"></div>
                                          </>
                                      )}
                                  </button>
                              ))}
                          </div>

                          {/* Input Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                  <label className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest mb-3 block pl-1">Número (00-99)</label>
                                  <div className="relative group/input">
                                      <div className="absolute -inset-0.5 bg-purple-600/30 rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition duration-500"></div>
                                      <input 
                                          type="tel" 
                                          maxLength={2}
                                          value={number}
                                          onChange={e => setNumber(e.target.value.replace(/[^0-9]/g, '').slice(0,2))}
                                          className="relative w-full bg-[#020408] border border-white/10 rounded-2xl py-6 text-center text-6xl font-black text-white outline-none focus:border-purple-500/50 transition-colors font-mono tracking-tighter shadow-inner"
                                          placeholder="00"
                                      />
                                  </div>
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest mb-3 block pl-1">Inversión (CRC)</label>
                                  <div className="relative group/input">
                                      <div className="absolute -inset-0.5 bg-brand-success/30 rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition duration-500"></div>
                                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-success/40 text-3xl font-light z-10">₡</span>
                                      <input 
                                          type="tel" 
                                          value={amount}
                                          onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                          className="relative w-full bg-[#020408] border border-white/10 rounded-2xl py-8 pl-14 pr-6 text-right text-4xl font-bold text-brand-success outline-none focus:border-brand-success/50 transition-colors font-mono shadow-inner"
                                          placeholder="1000"
                                      />
                                  </div>
                              </div>
                          </div>

                          {/* Reventados Module (Updated Visuals) */}
                          <div 
                            onClick={() => setPlayReventados(!playReventados)}
                            className={`
                                group relative rounded-2xl p-1 transition-all duration-500 cursor-pointer overflow-hidden
                                ${playReventados 
                                    ? 'shadow-[0_0_40px_rgba(239,68,68,0.4)] border border-red-500/50' 
                                    : 'border border-white/5 hover:border-white/10'}
                            `}
                          >
                              {/* Background layers */}
                              <div className={`absolute inset-0 transition-opacity duration-500 ${playReventados ? 'opacity-100' : 'opacity-0'}`}>
                                  <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-orange-900 to-red-900 animate-pulse-slow"></div>
                                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                              </div>
                              
                              <div className="relative z-10 p-4 rounded-xl bg-[#050910]/80 backdrop-blur-sm flex flex-col gap-4">
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                          <div className={`
                                              w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
                                              ${playReventados ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-[0_0_15px_#EF4444]' : 'bg-white/5 text-gray-600'}
                                          `}>
                                              <FireIcon className={`h-6 w-6 ${playReventados ? 'animate-pulse' : ''}`}/>
                                          </div>
                                          <div>
                                              <h4 className={`font-black uppercase tracking-wider text-sm transition-colors ${playReventados ? 'text-red-400 drop-shadow-sm' : 'text-gray-400'}`}>
                                                  Protocolo Reventados
                                              </h4>
                                              <p className={`text-[10px] font-mono transition-colors ${playReventados ? 'text-orange-300' : 'text-gray-600'}`}>
                                                  {playReventados ? '/// Multiplicador x200 activado' : 'Modo Estándar'}
                                              </p>
                                          </div>
                                      </div>
                                      
                                      {/* Switch UI */}
                                      <div className={`w-14 h-7 rounded-full relative border transition-all duration-300 ${playReventados ? 'bg-red-900/50 border-red-500' : 'bg-black border-white/10'}`}>
                                          <div className={`absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-300 ${playReventados ? 'left-8 bg-white shadow-[0_0_10px_white]' : 'left-1 bg-gray-700'}`}></div>
                                      </div>
                                  </div>

                                  {/* Input Module */}
                                  {playReventados && (
                                      <div className="animate-fade-in-up relative mt-2">
                                          <div className="absolute inset-0 bg-red-500/5 rounded-xl blur-sm"></div>
                                          <input 
                                              type="tel" 
                                              placeholder="MONTO EXTRA" 
                                              onClick={(e) => e.stopPropagation()}
                                              value={reventadosAmount}
                                              onChange={e => setReventadosAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                              className="relative w-full bg-black/50 border border-red-500/50 rounded-xl p-4 text-right text-2xl font-black font-mono text-white placeholder-red-900/50 outline-none focus:border-red-400 focus:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all"
                                          />
                                      </div>
                                  )}
                              </div>
                              
                              {/* Energy bar bottom */}
                              {playReventados && (
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse"></div>
                              )}
                          </div>

                          {/* CUSTOM HIGH-END NEON BUTTON */}
                          <button
                              type="submit"
                              disabled={isAddingToCart}
                              className={`
                                group relative w-full py-5 rounded-2xl overflow-hidden 
                                transition-all duration-300 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                                shadow-[0_0_30px_rgba(147,51,234,0.4)] hover:shadow-[0_0_50px_rgba(147,51,234,0.7)]
                              `}
                          >
                              {/* 1. Background Plasma Layer (Animated Gradient) */}
                              <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-fuchsia-600 to-purple-700 bg-[length:200%_auto] opacity-90 group-hover:opacity-100 transition-opacity animate-pulse-slow"></div>
                              
                              {/* 2. Carbon Texture Overlay */}
                              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>

                              {/* 3. Moving Shine/Sheen */}
                              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-in-out skew-x-12"></div>
                              
                              {/* 4. Border Glow */}
                              <div className="absolute inset-0 rounded-2xl border border-white/20 group-hover:border-white/50 transition-colors"></div>

                              {/* 5. Content */}
                              <div className="relative z-10 flex items-center justify-center gap-4 text-white">
                                  {isAddingToCart ? (
                                      <CpuIcon className="h-6 w-6 animate-spin text-purple-200"/>
                                  ) : (
                                      <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md shadow-inner border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                          <PlusIcon className="h-5 w-5 text-white"/>
                                      </div>
                                  )}
                                  <div className="flex flex-col items-start leading-none">
                                      <span className="font-black font-mono text-base tracking-[0.2em] uppercase drop-shadow-md group-hover:text-white transition-colors">
                                          {isAddingToCart ? 'PROCESANDO...' : 'AGREGAR AL CONTRATO'}
                                      </span>
                                      {!isAddingToCart && (
                                          <span className="text-[9px] font-mono text-purple-200 uppercase tracking-widest opacity-80">
                                              /// Ejecutar Inyección de Datos
                                          </span>
                                      )}
                                  </div>
                              </div>
                              
                              {/* 6. Bottom Energy Bar */}
                              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity blur-[1px]"></div>
                          </button>
                          
                          {error && (
                              <div className="text-center p-3 rounded-lg bg-brand-danger/10 border border-brand-danger/30 text-brand-danger text-xs font-bold animate-shake-hard uppercase tracking-widest">
                                  {error}
                              </div>
                          )}
                      </form>
                  </div>
              </div>
          </div>

          {/* CART & STATS */}
          <div className="lg:col-span-4 space-y-6">
              {/* Cart Card */}
              <Card glowColor="from-purple-600 via-fuchsia-500 to-brand-accent" className="h-[600px] flex flex-col">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                      <h3 className="font-bold text-white uppercase flex items-center gap-2"><ShoppingCartIcon className="h-5 w-5 text-purple-400"/> Contrato Actual</h3>
                      <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-1 rounded border border-purple-500/30">{cart.length} JUGADAS</span>
                  </div>

                  <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-3">
                      {cart.length > 0 ? cart.map((item, i) => (
                          <div key={i} className="bg-[#050910] p-4 rounded-xl border border-white/5 flex justify-between items-center group hover:border-brand-accent/30 transition-all hover:bg-brand-tertiary relative overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-accent to-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-lg bg-brand-tertiary flex items-center justify-center font-black text-xl text-white border border-white/10 shadow-inner">
                                      {item.number}
                                  </div>
                                  <div>
                                      <div className="text-[10px] font-bold text-brand-text-secondary uppercase mb-1">{DRAW_LABELS[item.draw]}</div>
                                      <div className="flex flex-col">
                                          <span className="text-xs text-brand-success font-mono font-bold">₡{item.amount}</span>
                                          {item.reventadosAmount && item.reventadosAmount > 0 && (
                                              <span className="text-[9px] text-brand-danger font-mono font-bold flex items-center gap-1">+ ₡{item.reventadosAmount} <FireIcon className="h-2 w-2"/></span>
                                          )}
                                      </div>
                                  </div>
                              </div>
                              <button onClick={() => {
                                  const newCart = [...cart];
                                  newCart.splice(i, 1);
                                  setCart(newCart);
                              }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-danger/20 text-gray-500 hover:text-brand-danger transition-colors"><TrashIcon className="h-4 w-4"/></button>
                          </div>
                      )) : (
                          <div className="h-full flex flex-col items-center justify-center opacity-30">
                              <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center mb-4">
                                  <ShoppingCartIcon className="h-8 w-8"/>
                              </div>
                              <p className="text-xs font-bold uppercase tracking-widest">Sin Items en Contrato</p>
                          </div>
                      )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/10 bg-[#050910]/50 -mx-6 -mb-6 p-6 rounded-b-[1.4rem]">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-xs text-brand-text-secondary uppercase tracking-widest">Total a Pagar</span>
                          <span className="text-3xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">₡{totalCost}</span>
                      </div>
                      
                      {/* CUSTOM EXECUTE BUTTON */}
                      <button
                          onClick={handlePurchase}
                          disabled={cart.length === 0}
                          className={`
                            group relative w-full py-5 rounded-xl overflow-hidden 
                            transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                            shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)]
                          `}
                      >
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-700 bg-[length:200%_auto] opacity-90 animate-pulse-slow"></div>
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
                          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-in-out skew-x-12"></div>
                          <div className="relative z-10 flex flex-col items-center justify-center text-white gap-1">
                               <div className="flex items-center gap-2 text-lg font-black font-mono uppercase tracking-[0.2em]">
                                  <BoltIcon className="h-6 w-6 text-white"/> EJECUTAR CONTRATO
                               </div>
                               <span className="text-[9px] font-mono opacity-80">/// CONFIRMAR TRANSACCIÓN</span>
                          </div>
                      </button>
                  </div>
              </Card>

              {/* Stats Mini Cards - Refined */}
              <div className="grid grid-cols-2 gap-4">
                  {/* CARD CALIENTES */}
                  <div className="bg-[#050910] border border-brand-gold/30 p-4 rounded-2xl relative overflow-hidden group hover:border-brand-gold/60 transition-all shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                      <div className="absolute inset-0 bg-brand-gold/10 animate-pulse-slow"></div>
                      <div className="absolute -inset-4 bg-brand-gold/20 blur-xl group-hover:opacity-70 transition opacity-30"></div>
                      
                      <h4 className="text-[10px] font-bold text-brand-gold uppercase mb-3 relative z-10 flex items-center gap-2">
                          <SparklesIcon className="h-3 w-3"/> Calientes
                      </h4>
                      <div className="flex gap-2 relative z-10 justify-between">
                          {stats.hotNumbers.map((n, i) => (
                              <div key={i} className={`aspect-square flex-1 rounded-lg flex items-center justify-center font-black text-sm shadow-lg transition-transform duration-300 hover:scale-110 ${i === 0 ? 'bg-gradient-to-br from-brand-gold to-orange-600 text-black border border-white/20' : 'bg-black/60 text-brand-gold border border-brand-gold/20'}`}>
                                  {n.num}
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* CARD REVENTADOS */}
                  <div className="bg-[#050910] border border-brand-danger/30 p-4 rounded-2xl relative overflow-hidden group hover:border-brand-danger/60 transition-all shadow-[0_0_30px_rgba(239,68,68,0.1)] flex flex-col justify-center">
                      <div className="absolute inset-0 bg-brand-danger/10 animate-pulse-slow"></div>
                      <div className="absolute -inset-4 bg-brand-danger/20 blur-xl group-hover:opacity-70 transition opacity-30"></div>
                      
                      <div className="absolute -right-4 -bottom-4 text-brand-danger/20 group-hover:text-brand-danger/30 transition-colors"><FireIcon className="h-20 w-20"/></div>
                      <h4 className="text-[10px] font-bold text-white uppercase mb-1 relative z-10 flex items-center gap-2">
                         <FireIcon className="h-3 w-3 text-brand-danger"/> Prob. Reventados
                      </h4>
                      <div className="text-4xl font-black text-brand-danger relative z-10 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse">
                          {stats.redBallPercentage}%
                      </div>
                  </div>
              </div>
          </div>
      </div>
      
      {/* HISTORY SECTION - NEW ADDITION FOR CLIENTS */}
      <div className="mt-12 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
              <CalendarDaysIcon className="h-6 w-6 text-brand-cyan" />
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Historial Reciente</h3>
              <div className="h-px bg-brand-border flex-grow ml-4"></div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
              {historyResults.slice(0, isHistoryExpanded ? undefined : 5).map((day, idx) => (
                  <div key={idx} className="bg-[#050910]/50 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-brand-cyan/30 transition-colors">
                      <div className="flex items-center gap-4 min-w-[150px]">
                          <div className="w-12 h-12 bg-white/5 rounded-lg flex flex-col items-center justify-center border border-white/10">
                              <span className="text-xs font-bold text-gray-400 uppercase">{new Date(day.date).toLocaleDateString('es-CR', { month: 'short' }).slice(0,3)}</span>
                              <span className="text-xl font-black text-white">{new Date(day.date).getDate()}</span>
                          </div>
                          <div>
                              <p className="text-sm font-bold text-white uppercase">{new Date(day.date).toLocaleDateString('es-CR', { weekday: 'long' })}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{new Date(day.date).getFullYear()}</p>
                          </div>
                      </div>
                      
                      <div className="flex-grow grid grid-cols-3 gap-4 w-full md:w-auto">
                          {/* Mediodia */}
                          <div className="flex flex-col items-center bg-black/20 p-2 rounded-lg border border-white/5">
                              <span className="text-[9px] text-orange-400 font-bold uppercase mb-2 flex items-center gap-1"><SunIcon className="h-3 w-3"/> 12:55 PM</span>
                              {renderHistoryBadge('mediodia', day.results.mediodia)}
                          </div>
                          {/* Tarde */}
                          <div className="flex flex-col items-center bg-black/20 p-2 rounded-lg border border-white/5">
                              <span className="text-[9px] text-purple-400 font-bold uppercase mb-2 flex items-center gap-1"><SunsetIcon className="h-3 w-3"/> 4:30 PM</span>
                              {renderHistoryBadge('tarde', day.results.tarde)}
                          </div>
                          {/* Noche */}
                          <div className="flex flex-col items-center bg-black/20 p-2 rounded-lg border border-white/5">
                              <span className="text-[9px] text-blue-400 font-bold uppercase mb-2 flex items-center gap-1"><MoonIcon className="h-3 w-3"/> 7:30 PM</span>
                              {renderHistoryBadge('noche', day.results.noche)}
                          </div>
                      </div>
                  </div>
              ))}
              
              {historyResults.length === 0 && (
                  <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl">
                      No hay historial disponible sincronizado aún.
                  </div>
              )}
          </div>

          {/* HISTORY EXPANSION BUTTON */}
          {historyResults.length > 5 && (
              <div className="mt-6 flex justify-center">
                  <Button 
                      variant="secondary" 
                      onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                      className="w-full md:w-auto min-w-[200px]"
                  >
                      {isHistoryExpanded ? 'MOSTRAR MENOS' : 'VER HISTORIAL COMPLETO'}
                  </Button>
              </div>
          )}
      </div>
    </div>
  );
};

export default ClientPanel;
