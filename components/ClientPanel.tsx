
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Ticket, DrawType, DailyResult, HistoryResult, BallColor, Transaction } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import WinnerModal from './WinnerModal';
import ActionModal, { ActionType } from './ActionModal';
import { sendWinnerNotification } from '../utils/emailService';
import { 
  PlusIcon, 
  TrashIcon, 
  TicketIcon, 
  ShoppingCartIcon, 
  CheckCircleIcon, 
  SunIcon, 
  MoonIcon, 
  SunsetIcon,
  CalendarIcon,
  RefreshIcon,
  FireIcon,
  LinkIcon,
  GlobeAltIcon,
  UserCircleIcon,
  ArrowTrendingUpIcon,
  CpuIcon,
  BoltIcon,
  ClockIcon,
  CreditCardIcon,
  ArrowTrendingDownIcon
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
  const [selectedDraw, setSelectedDraw] = useState<DrawType>('mediodia');
  const [cart, setCart] = useState<NewTicket[]>([]);
  const [error, setError] = useState('');
  
  // Animation States
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Action Modal State (Purchase Confirmation)
  const [actionModal, setActionModal] = useState<{isOpen: boolean, amount: number, isReventados: boolean}>({
      isOpen: false, amount: 0, isReventados: false
  });

  // Win Notification State
  const [winNotification, setWinNotification] = useState<{type: 'regular'|'reventados', amount: number, number: string, draw: string} | null>(null);

  const totalCost = cart.reduce((sum, item) => sum + item.amount + (item.reventadosAmount || 0), 0);

  const DRAW_LABELS: Record<DrawType, string> = {
    mediodia: 'MEDIODÍA',
    tarde: 'TARDE',
    noche: 'NOCHE'
  };

  // --- INTELLIGENCE ENGINE ---
  
  const stats = useMemo(() => {
      const numCounts: Record<string, number> = {};
      let totalDraws = 0;
      let redBalls = 0;

      // Analyze History
      historyResults.forEach(day => {
          // Mediodia
          if(day.results.mediodia.number) {
              numCounts[day.results.mediodia.number] = (numCounts[day.results.mediodia.number] || 0) + 1;
              totalDraws++;
              if(day.results.mediodia.ball === 'roja') redBalls++;
          }
          // Tarde
          if(day.results.tarde.number) {
              numCounts[day.results.tarde.number] = (numCounts[day.results.tarde.number] || 0) + 1;
              totalDraws++;
              if(day.results.tarde.ball === 'roja') redBalls++;
          }
          // Noche
          if(day.results.noche.number) {
              numCounts[day.results.noche.number] = (numCounts[day.results.noche.number] || 0) + 1;
              totalDraws++;
              if(day.results.noche.ball === 'roja') redBalls++;
          }
      });

      // Get Top 3 "Hot" Numbers
      const hotNumbers = Object.entries(numCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([num, count]) => ({ num, count }));

      // Calculate Red Ball Percentage
      const redBallPercentage = totalDraws > 0 ? Math.round((redBalls / totalDraws) * 100) : 0;

      return { hotNumbers, redBallPercentage, totalDraws };
  }, [historyResults]);

  // --- RECENT TICKETS (LAST 7 DAYS & SCROLLABLE) ---
  const recentTickets = useMemo(() => {
      const now = new Date();
      const cutoffDate = new Date();
      cutoffDate.setDate(now.getDate() - 7);
      cutoffDate.setHours(0, 0, 0, 0);

      return user.tickets
          .filter(t => new Date(t.purchaseDate) >= cutoffDate)
          .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [user.tickets]);

  // --- WINNER DETECTION SYSTEM ---
  useEffect(() => {
      const checkWinners = async () => {
          const todayStr = new Date().toLocaleDateString('es-CR');
          const normalize = (d: Date) => d.toLocaleDateString('es-CR');
          const todayTickets = user.tickets.filter(t => normalize(new Date(t.purchaseDate)) === normalize(new Date()));

          if (todayTickets.length === 0 || dailyResults.length === 0) return;

          // Filter only Pending tickets for claim check to avoid double processing
          const pendingTickets = todayTickets.filter(t => t.status === 'pending');

          pendingTickets.forEach(ticket => {
              const result = dailyResults.find(r => r.draw === ticket.draw && r.number !== null);

              if (result && result.number === ticket.number) {
                  let winAmount = 0;
                  let type: 'regular' | 'reventados' = 'regular';
                  const regularPrize = ticket.amount * 90; 
                  winAmount += regularPrize;

                  if (ticket.reventadosAmount && ticket.reventadosAmount > 0) {
                      if (result.ballColor === 'roja' && result.reventadosNumber === ticket.number) {
                          type = 'reventados';
                          winAmount += (ticket.reventadosAmount * 200); 
                      }
                  }

                  // --- CLAIM PRIZE AUTOMATICALLY ---
                  // This will update the DB. The 'status' will change to 'paid',
                  // so this loop won't pick it up again on next render.
                  onClaimWinnings(ticket.id, winAmount, type);

                  // --- SHOW NOTIFICATION ---
                  setWinNotification({ type, amount: winAmount, number: ticket.number, draw: DRAW_LABELS[ticket.draw] });
                  
                  // --- TRIGGER EMAIL SERVICE ---
                  sendWinnerNotification(
                      user.email, 
                      user.name, 
                      winAmount, 
                      ticket.number, 
                      DRAW_LABELS[ticket.draw], 
                      type === 'reventados'
                  ).then(() => {
                      console.log("Email delivery confirmed via Agent.");
                  });
              }
          });
      };

      const timer = setTimeout(checkWinners, 2000); // slight delay to allow data settle
      return () => clearTimeout(timer);
  }, [dailyResults, user.tickets, user.email, user.name, onClaimWinnings]);


  const handleAddTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const num = parseInt(number, 10);
    const amnt = parseInt(amount, 10);
    const revAmnt = playReventados ? parseInt(reventadosAmount, 10) : 0;

    if (isNaN(num) || num < 0 || num > 99) {
      setError('El número debe estar entre 00 y 99.');
      return;
    }
    if (isNaN(amnt) || amnt <= 0) {
      setError('El monto debe ser un número positivo.');
      return;
    }
    if (playReventados && (isNaN(revAmnt) || revAmnt <= 0)) {
      setError('El monto de reventados debe ser un número positivo.');
      return;
    }

    setIsAddingToCart(true);

    // Trigger Animation delay for effect
    setTimeout(() => {
        const formattedNumber = num.toString().padStart(2, '0');
        setCart([...cart, { 
          number: formattedNumber, 
          amount: amnt, 
          draw: selectedDraw,
          reventadosAmount: playReventados ? revAmnt : undefined
        }]);
        
        // Reset form
        setNumber('');
        setAmount('');
        setReventadosAmount('');
        setPlayReventados(false);
        setIsAddingToCart(false);
    }, 400);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };
  
  const handlePurchase = () => {
      if (totalCost > user.balance) {
          setError('No tiene saldo suficiente para esta compra.');
          return;
      }

      // Detect if Reventados is present in ANY ticket in the cart
      const hasReventados = cart.some(item => item.reventadosAmount && item.reventadosAmount > 0);

      // Trigger Animation
      setActionModal({
          isOpen: true,
          amount: totalCost,
          isReventados: hasReventados
      });

      // Process
      onPurchase(user.id, cart);
      setCart([]);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);
  };

  const getDrawIcon = (type: DrawType, className: string = "h-5 w-5") => {
    switch(type) {
      case 'mediodia': return <SunIcon className={className} />;
      case 'tarde': return <SunsetIcon className={className} />;
      case 'noche': return <MoonIcon className={className} />;
    }
  };

  const formatTicketDate = (date: Date) => {
      return new Date(date).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit' });
  }

  return (
    <div className="space-y-8 relative">
      {/* WINNER MODAL INTEGRATION */}
      {winNotification && (
          <WinnerModal 
            winType={winNotification.type} 
            amount={winNotification.amount}
            ticketNumber={winNotification.number}
            userEmail={user.email}
            onClose={() => setWinNotification(null)}
          />
      )}

      {/* ACTION CONFIRMATION MODAL */}
      <ActionModal 
          isOpen={actionModal.isOpen}
          type="purchase"
          amount={actionModal.amount}
          details={`${cart.length || 'Múltiples'} Jugadas Confirmadas`}
          isReventados={actionModal.isReventados}
          onClose={() => setActionModal({...actionModal, isOpen: false})}
      />

      {/* HERO: Live Results with Holographic Effect */}
      <section className="relative overflow-hidden rounded-3xl border border-brand-border bg-brand-secondary/50 backdrop-blur-xl shadow-2xl animate-fade-in-up group hover:border-brand-accent/30 transition-colors duration-500">
        <div className="absolute inset-0 bg-hero-glow opacity-20 pointer-events-none"></div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-accent/10 rounded-full blur-[80px] animate-pulse-slow pointer-events-none"></div>
        
        <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${isSyncing ? 'bg-brand-accent animate-ping' : 'bg-brand-success'}`}></span>
                        <span className="text-xs font-bold uppercase tracking-widest text-brand-text-secondary flex items-center gap-2">
                           Resultados en Vivo {isSyncing && <span className="text-[9px] text-brand-accent animate-pulse">:: Sincronizando ::</span>}
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter mb-2 drop-shadow-lg">
                        HOY <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-purple-400">GANAMOS.</span>
                    </h2>
                    <a 
                      href="https://www.jps.go.cr/resultados/nuevos-tiempos-reventados" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary hover:text-white hover:bg-white/10 hover:border-brand-accent/50 transition-all group"
                    >
                      <LinkIcon className="h-3 w-3 text-brand-accent group-hover:scale-110 transition-transform"/>
                      Verificar en JPS.go.cr
                    </a>
                </div>
                <div className="text-right hidden md:block">
                     <div className="text-xs text-brand-text-secondary uppercase font-bold mb-1">Próximo Sorteo</div>
                     <div className="text-xl font-mono font-bold text-brand-accent flex items-center justify-end gap-2">
                        <ClockIcon className="h-4 w-4 animate-spin-slow opacity-70"/>
                        {nextDrawTime}
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {dailyResults.map((res, idx) => (
                    <div 
                        key={res.draw} 
                        className="group/card relative bg-brand-primary/60 rounded-2xl p-5 border border-brand-border hover:border-brand-accent/50 transition-all duration-500 overflow-hidden hover:shadow-[0_0_30px_rgba(79,70,229,0.15)] hover:-translate-y-1"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity duration-500 transform group-hover/card:scale-110">
                            {getDrawIcon(res.draw, "h-24 w-24")}
                        </div>
                        
                        <div className="flex items-center justify-between mb-4 relative z-10">
                             <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${res.draw === 'mediodia' ? 'bg-orange-500/20 text-orange-400' : res.draw === 'tarde' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {getDrawIcon(res.draw)}
                                </div>
                                <span className="font-bold text-white uppercase text-sm tracking-wide">{DRAW_LABELS[res.draw]}</span>
                             </div>
                        </div>

                        <div className="flex justify-center items-center gap-4 relative z-10 py-2">
                            {res.number ? (
                                <>
                                    {/* Main Number Ball */}
                                    <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-b from-white to-gray-300 shadow-[0_5px_15px_rgba(255,255,255,0.2)] text-brand-primary text-4xl font-black transform group-hover/card:scale-110 transition-transform duration-500">
                                        {res.number}
                                        <div className="absolute top-2 left-4 w-6 h-3 bg-white rounded-full opacity-50 filter blur-[1px]"></div>
                                    </div>
                                    
                                    {/* Reventados Indicator */}
                                    <div className="flex flex-col items-center gap-1 animate-fade-in-up" style={{animationDelay: '200ms'}}>
                                        {res.ballColor === 'roja' && res.reventadosNumber ? (
                                             <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-b from-red-500 to-red-700 shadow-[0_0_15px_rgba(239,68,68,0.6)] text-white text-lg font-bold border border-red-400 animate-pulse-slow">
                                                 {res.reventadosNumber}
                                             </div>
                                        ) : (
                                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-tertiary border border-brand-border text-brand-text-secondary text-xs font-bold opacity-50">
                                                -
                                            </div>
                                        )}
                                        <span className="text-[10px] uppercase font-bold text-brand-text-secondary">
                                            {res.ballColor === 'roja' ? 'ROJA' : 'BLANCA'}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="h-20 flex items-center justify-center w-full">
                                    <span className="text-xs font-mono text-brand-text-secondary animate-pulse">PENDIENTE DE SORTEO</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Betting Form & History */}
        <div className="lg:col-span-8 space-y-8">
           
           {/* TICKET CREATOR */}
           <Card className="relative overflow-hidden border-brand-accent/30 shadow-2xl animate-fade-in-up">
                <div className="flex items-center justify-between mb-8 border-b border-brand-border pb-4">
                    <div className="flex items-center gap-3">
                         <div className="bg-brand-accent/20 p-2 rounded-lg text-brand-accent shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                             <PlusIcon className="h-6 w-6" />
                         </div>
                         <div>
                             <h3 className="text-xl font-bold text-white">Crear Jugada</h3>
                             <p className="text-xs text-brand-text-secondary">Arma tu combinación ganadora</p>
                         </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-brand-tertiary px-3 py-1 rounded-lg border border-brand-border">
                        <FireIcon className="h-4 w-4 text-brand-danger animate-pulse" />
                        <span className="text-xs font-bold text-brand-text-primary">200x Reventados</span>
                    </div>
                </div>

                <form onSubmit={handleAddTicket} className="space-y-8">
                    {/* Draw Selection */}
                    <div>
                        <label className="block text-xs uppercase font-bold text-brand-text-secondary mb-3 tracking-wider">1. Elige el Sorteo</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['mediodia', 'tarde', 'noche'] as DrawType[]).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setSelectedDraw(type)}
                                    className={`
                                        relative flex flex-col items-center justify-center py-4 px-2 rounded-xl border-2 transition-all duration-300 transform active:scale-95
                                        ${selectedDraw === type 
                                            ? 'bg-brand-accent/10 border-brand-accent text-brand-accent shadow-[0_0_20px_rgba(79,70,229,0.3)] scale-105 z-10' 
                                            : 'bg-brand-tertiary/50 border-brand-border text-brand-text-secondary hover:border-brand-text-secondary/50 hover:bg-brand-tertiary grayscale hover:grayscale-0'
                                        }
                                    `}
                                >
                                    <div className={`mb-2 transition-all duration-300 ${selectedDraw === type ? 'text-brand-accent scale-110' : 'text-brand-text-secondary'}`}>
                                        {getDrawIcon(type, "h-6 w-6")}
                                    </div>
                                    <span className="font-bold text-xs uppercase tracking-widest">{DRAW_LABELS[type]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group">
                            <label className="block text-xs uppercase font-bold text-brand-text-secondary mb-3 tracking-wider group-focus-within:text-brand-accent transition-colors">2. Tu Número</label>
                            <div className="relative">
                                <input
                                    id="number"
                                    type="tel"
                                    value={number}
                                    onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                                    placeholder="00"
                                    className="w-full bg-brand-tertiary/50 border border-brand-border rounded-2xl text-center text-5xl font-black text-white py-6 focus:ring-2 focus:ring-brand-accent focus:border-transparent focus:bg-brand-tertiary transition-all placeholder-brand-text-secondary/20 font-mono shadow-inner focus:shadow-[0_0_30px_rgba(79,70,229,0.2)]"
                                    maxLength={2}
                                />
                                <span className="absolute top-4 left-4 text-[10px] font-bold text-brand-text-secondary uppercase group-focus-within:text-brand-accent transition-colors">NÚMERO</span>
                            </div>
                        </div>
                         <div className="group">
                            <label className="block text-xs uppercase font-bold text-brand-text-secondary mb-3 tracking-wider group-focus-within:text-brand-success transition-colors">3. Monto a Apostar</label>
                            <div className="relative">
                                <input
                                    id="amount"
                                    type="tel"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="1000"
                                    className="w-full bg-brand-tertiary/50 border border-brand-border rounded-2xl text-center text-4xl font-bold text-brand-success py-8 focus:ring-2 focus:ring-brand-success focus:border-transparent focus:bg-brand-tertiary transition-all placeholder-brand-text-secondary/20 font-mono shadow-inner focus:shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                                />
                                <span className="absolute top-4 left-4 text-[10px] font-bold text-brand-text-secondary uppercase group-focus-within:text-brand-success transition-colors">COLONES</span>
                            </div>
                        </div>
                    </div>

                    {/* Reventados Toggle */}
                    <div className={`bg-gradient-to-r from-red-900/10 to-transparent border rounded-xl p-4 transition-all duration-300 ${playReventados ? 'border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'border-red-500/20'}`}>
                        <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center gap-3">
                                 <div className={`p-2 rounded-lg transition-colors ${playReventados ? 'bg-red-500 text-white shadow-lg' : 'bg-red-500/20 text-red-500'}`}>
                                     <FireIcon className="h-5 w-5" />
                                 </div>
                                 <div>
                                     <h4 className="font-bold text-white text-sm">Jugar Reventados</h4>
                                     <p className="text-[10px] text-brand-text-secondary">Multiplica tu inversión hasta 200x</p>
                                 </div>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={playReventados} 
                                    onChange={(e) => setPlayReventados(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-brand-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 border border-brand-border group-hover:border-red-400/50 transition-colors"></div>
                            </label>
                        </div>

                        {playReventados && (
                            <div className="animate-fade-in-up">
                                <Input
                                    label="Monto Reventados"
                                    value={reventadosAmount}
                                    onChange={(e) => setReventadosAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Monto adicional..."
                                    className="bg-brand-secondary border-red-500/30 focus:ring-red-500 text-red-100 placeholder-red-900/50"
                                    icon={<span className="font-bold text-red-500">₡</span>}
                                />
                            </div>
                        )}
                    </div>

                    <Button 
                        variant="primary" 
                        size="lg" 
                        type="submit" 
                        className={`w-full uppercase tracking-widest text-sm shadow-xl transition-all duration-300 ${isAddingToCart ? 'scale-95 opacity-80' : 'hover:-translate-y-1'}`}
                        disabled={isAddingToCart}
                    >
                        {isAddingToCart ? (
                            <span className="flex items-center gap-2">
                                <RefreshIcon className="h-5 w-5 animate-spin"/> PROCESANDO DATOS...
                            </span>
                        ) : (
                            <>
                                <PlusIcon className="h-5 w-5" /> INYECTAR AL CARRITO
                            </>
                        )}
                    </Button>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold text-center animate-shake-hard">
                            {error}
                        </div>
                    )}
                </form>
           </Card>

           {/* INTELLIGENCE HUB: HISTORY & STATISTICS */}
           <div className="space-y-6 animate-fade-in-up" style={{animationDelay: '200ms'}}>
               <div className="flex items-center justify-between">
                   <h3 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                       <CpuIcon className="h-6 w-6 text-brand-accent" /> CENTRO DE INTELIGENCIA
                   </h3>
                   <span className="text-[10px] font-bold uppercase bg-brand-tertiary px-3 py-1 rounded-full text-brand-text-secondary border border-brand-border animate-pulse">
                       ● Datos en Tiempo Real
                   </span>
               </div>

               {/* ROW 1: PREDICTIVE STATS */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Hot Numbers Card */}
                   <Card className="bg-gradient-to-br from-brand-secondary to-brand-primary relative overflow-hidden border-brand-border group hover:border-yellow-500/30 transition-colors duration-500">
                        {/* Background Grid */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-10"></div>
                        
                        <div className="relative z-10">
                            <h4 className="text-xs font-bold text-brand-text-secondary uppercase mb-4 flex items-center gap-2">
                                <FireIcon className="h-4 w-4 text-brand-gold"/> Números Calientes (Top 3)
                            </h4>
                            <div className="flex items-end justify-between gap-2">
                                {stats.hotNumbers.length > 0 ? stats.hotNumbers.map((item, idx) => (
                                    <div key={item.num} className="flex flex-col items-center gap-2 flex-1 animate-fade-in-up" style={{animationDelay: `${idx * 150}ms`}}>
                                        <div className={`
                                            w-full aspect-square rounded-2xl flex flex-col items-center justify-center border transition-all duration-500
                                            ${idx === 0 ? 'bg-gradient-to-b from-yellow-500/20 to-yellow-700/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)] scale-110' : 
                                              idx === 1 ? 'bg-brand-tertiary border-brand-text-secondary/50 hover:border-white/30' : 
                                              'bg-brand-primary border-brand-border hover:border-white/30'}
                                        `}>
                                            <span className={`text-3xl font-black ${idx === 0 ? 'text-yellow-400' : 'text-white'}`}>
                                                {item.num}
                                            </span>
                                            <span className="text-[9px] uppercase font-bold text-brand-text-secondary">
                                                {item.count} VECES
                                            </span>
                                        </div>
                                        {idx === 0 && <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest animate-pulse">LIDER</span>}
                                    </div>
                                )) : (
                                    <div className="text-center w-full text-brand-text-secondary text-xs italic">Recopilando datos...</div>
                                )}
                            </div>
                        </div>
                   </Card>

                   {/* Reventados Probability */}
                   <Card className="bg-brand-secondary relative overflow-hidden flex items-center justify-between group hover:border-red-500/30 transition-colors">
                       <div>
                           <h4 className="text-xs font-bold text-brand-text-secondary uppercase mb-2">Probabilidad Reventados</h4>
                           <div className="text-4xl font-mono font-black text-white">{stats.redBallPercentage}%</div>
                           <p className="text-[10px] text-brand-text-secondary max-w-[150px] mt-2 leading-tight">
                               Porcentaje histórico de aparición de la <span className="text-red-400 font-bold">Bolita Roja</span>.
                           </p>
                       </div>
                       {/* Pure CSS Donut Chart with Glow */}
                       <div className="relative w-24 h-24 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 duration-500" style={{
                           background: `conic-gradient(#EF4444 ${stats.redBallPercentage}%, #1E2332 0)`
                       }}>
                           <div className="absolute inset-2 bg-brand-secondary rounded-full flex items-center justify-center">
                               <FireIcon className="h-8 w-8 text-red-500 animate-pulse-slow"/>
                           </div>
                           {/* Glow Ring */}
                           <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.3)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       </div>
                   </Card>
               </div>

               {/* ROW 2: VERTICAL TIMELINE REDESIGNED */}
               <Card>
                   <h4 className="text-xs font-bold text-brand-text-secondary uppercase mb-6 flex items-center gap-2">
                       <ArrowTrendingUpIcon className="h-4 w-4" /> Timeline de Resultados
                   </h4>
                   
                   <div className="relative border-l-2 border-brand-border ml-3 space-y-8">
                       {historyResults.length > 0 ? historyResults.map((day, idx) => (
                           <div key={idx} className="relative pl-8 animate-fade-in-up" style={{animationDelay: `${idx * 100}ms`}}>
                               {/* Timeline Dot */}
                               <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-brand-primary border-2 border-brand-accent box-content z-10"></div>
                               <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-brand-accent animate-ping opacity-20"></div>
                               
                               {/* Content */}
                               <div className="mb-3">
                                   <span className="text-lg font-bold text-white capitalize">{new Date(day.date).toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                               </div>
                               
                               <div className="grid grid-cols-1 gap-3">
                                   {(['mediodia', 'tarde', 'noche'] as DrawType[]).map(drawType => {
                                       const result = day.results[drawType];
                                       if (!result.number && !result.reventadosNumber) return null;

                                       return (
                                           <div key={drawType} className="rounded-xl border border-brand-border overflow-hidden flex flex-col sm:flex-row h-20 group hover:border-brand-accent/50 transition-colors">
                                               {/* Draw Label */}
                                               <div className={`bg-brand-primary/80 w-20 flex flex-col items-center justify-center border-r border-brand-border group-hover:border-brand-accent/30`}>
                                                   {drawType === 'mediodia' && <SunIcon className="h-5 w-5 text-orange-400 mb-1 group-hover:scale-110 transition-transform"/>}
                                                   {drawType === 'tarde' && <SunsetIcon className="h-5 w-5 text-purple-400 mb-1 group-hover:scale-110 transition-transform"/>}
                                                   {drawType === 'noche' && <MoonIcon className="h-5 w-5 text-blue-400 mb-1 group-hover:scale-110 transition-transform"/>}
                                                   <span className="text-[10px] font-bold uppercase text-brand-text-secondary">{DRAW_LABELS[drawType].substring(0, 3)}</span>
                                               </div>

                                               {/* Main Number Section - SPLIT LEFT */}
                                               <div className="flex-1 bg-brand-secondary flex flex-col items-center justify-center border-r border-brand-border relative group-hover:bg-brand-tertiary transition-colors">
                                                   <span className="text-[8px] uppercase font-bold text-blue-400 absolute top-1 left-2 tracking-wider">Nuevos Tiempos</span>
                                                   <span className="font-black text-4xl text-white font-mono tracking-tighter group-hover:text-brand-accent transition-colors">{result.number || '--'}</span>
                                               </div>

                                               {/* Reventados Section - SPLIT RIGHT */}
                                               <div className="flex-1 bg-gradient-to-br from-brand-secondary to-red-900/5 flex flex-col items-center justify-center relative">
                                                   <span className="text-[8px] uppercase font-bold text-red-400 absolute top-1 left-2 tracking-wider">Reventados</span>
                                                    <div className="flex items-center gap-2">
                                                        {/* Ball Indicator */}
                                                        {result.ball === 'roja' ? (
                                                            <>
                                                                <div className="w-4 h-4 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse"></div>
                                                                <span className="font-black text-2xl text-red-400 font-mono">{result.reventadosNumber || result.number}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                                                                <span className="text-xs font-bold text-brand-text-secondary uppercase">Blanca</span>
                                                            </>
                                                        )}
                                                    </div>
                                               </div>
                                           </div>
                                       );
                                   })}
                               </div>
                           </div>
                       )) : (
                           <div className="pl-8 text-sm text-brand-text-secondary italic py-4">
                               El historial se está construyendo. Los resultados de hoy aparecerán aquí al finalizar el día.
                           </div>
                       )}
                   </div>
               </Card>
           </div>
        </div>

        {/* RIGHT COLUMN: Cart & History */}
        <div className="lg:col-span-4 animate-fade-in-up space-y-6" style={{animationDelay: '300ms'}}>
            
            {/* CART WIDGET */}
            <Card className="border-brand-accent/50 shadow-[0_0_30px_rgba(79,70,229,0.1)] hover:shadow-[0_0_50px_rgba(79,70,229,0.2)] transition-shadow duration-500" noPadding>
                <div className="bg-brand-accent/10 p-6 border-b border-brand-border flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ShoppingCartIcon className="h-5 w-5 text-brand-accent"/> Tu Jugada
                    </h3>
                    <span className={`bg-brand-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg transition-transform ${cart.length > 0 ? 'scale-100' : 'scale-0'}`}>
                        {cart.length} Items
                    </span>
                </div>
                
                <div className="p-6">
                    {cart.length > 0 ? (
                        <div className="space-y-4">
                            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {cart.map((item, index) => (
                                    <div key={index} className="bg-brand-tertiary/50 p-3 rounded-xl border border-brand-border flex justify-between items-center group hover:border-brand-accent/50 transition-all duration-300 hover:bg-brand-tertiary animate-fade-in-up">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-brand-secondary flex flex-col items-center justify-center border border-brand-border shadow-inner">
                                                <span className="text-lg font-black text-white leading-none">{item.number}</span>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">{DRAW_LABELS[item.draw]}</div>
                                                <div className="text-xs text-white font-bold">Regular: {formatCurrency(item.amount)}</div>
                                                {item.reventadosAmount && item.reventadosAmount > 0 && (
                                                    <div className="text-[10px] text-red-400 font-bold flex items-center gap-1 animate-pulse">
                                                        <FireIcon className="h-3 w-3"/> {formatCurrency(item.reventadosAmount)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveFromCart(index)} className="text-brand-text-secondary hover:text-red-500 transition-colors p-2 hover:bg-white/5 rounded-lg group-hover:scale-110">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-brand-border pt-4 mt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-brand-text-secondary text-sm">Total a Pagar</span>
                                    <span className="text-2xl font-black text-brand-success">{formatCurrency(totalCost)}</span>
                                </div>
                                <Button 
                                    onClick={handlePurchase} 
                                    variant="success" 
                                    className="w-full uppercase tracking-widest font-bold text-sm shadow-xl shadow-brand-success/20 hover:shadow-brand-success/40 transition-all hover:-translate-y-1"
                                    disabled={totalCost > user.balance}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <BoltIcon className="h-4 w-4" /> Confirmar Compra
                                    </div>
                                </Button>
                                {totalCost > user.balance && (
                                    <p className="text-center text-xs text-red-400 mt-2 font-bold animate-bounce">Saldo insuficiente</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 opacity-50">
                            <ShoppingCartIcon className="h-12 w-12 mx-auto mb-3 text-brand-text-secondary"/>
                            <p className="text-sm text-brand-text-secondary">Tu carrito está vacío.</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* TRANSACTIONS WIDGET (MOVEMENTS) */}
            <Card className="bg-brand-secondary/30 hover:bg-brand-secondary/50 transition-colors duration-500 max-h-[300px] flex flex-col">
                <h4 className="text-xs font-bold text-brand-text-secondary uppercase mb-4 flex items-center gap-2 shrink-0">
                    <CreditCardIcon className="h-4 w-4" /> Movimientos Recientes
                </h4>
                {transactions.length > 0 ? (
                    <div className="overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {transactions.slice(0, 20).map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-brand-primary/50 border border-brand-border hover:bg-brand-tertiary transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-full ${
                                        tx.type === 'deposit' ? 'bg-green-900/30 text-green-400' : 
                                        tx.type === 'withdraw' ? 'bg-red-900/30 text-red-400' : 
                                        tx.type === 'winnings' ? 'bg-yellow-900/30 text-yellow-400' :
                                        'bg-blue-900/30 text-blue-400'
                                    }`}>
                                        {tx.type === 'deposit' && <ArrowTrendingUpIcon className="h-3 w-3"/>}
                                        {tx.type === 'withdraw' && <ArrowTrendingDownIcon className="h-3 w-3"/>}
                                        {tx.type === 'purchase' && <TicketIcon className="h-3 w-3"/>}
                                        {tx.type === 'winnings' && <FireIcon className="h-3 w-3"/>}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-white uppercase">
                                            {tx.type === 'deposit' ? 'Recarga' : 
                                             tx.type === 'withdraw' ? 'Retiro' : 
                                             tx.type === 'winnings' ? 'Premio' : 'Compra'}
                                        </div>
                                        <div className="text-[9px] text-brand-text-secondary">{new Date(tx.date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className={`text-xs font-mono font-bold ${
                                    tx.type === 'withdraw' || tx.type === 'purchase' ? 'text-brand-text-secondary' : 'text-brand-success'
                                }`}>
                                    {(tx.type === 'withdraw' || tx.type === 'purchase') ? '-' : '+'}{formatCurrency(tx.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 opacity-50 flex-grow flex flex-col items-center justify-center">
                        <CreditCardIcon className="h-8 w-8 mx-auto mb-2 text-brand-text-secondary"/>
                        <p className="text-xs text-brand-text-secondary">Sin movimientos.</p>
                    </div>
                )}
            </Card>

            {/* Recent User Tickets Widget - SCROLLABLE 7 DAYS MAX */}
            <Card className="bg-brand-secondary/30 hover:bg-brand-secondary/50 transition-colors duration-500">
                <h4 className="text-xs font-bold text-brand-text-secondary uppercase mb-4 flex items-center gap-2">
                    <TicketIcon className="h-4 w-4" /> Jugadas Recientes (7 Días)
                </h4>
                {recentTickets.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2 space-y-3">
                        {recentTickets.map((t, idx) => (
                            <div key={t.id} className="flex flex-col p-3 rounded-xl bg-brand-primary/50 border border-brand-border relative group hover:border-brand-accent/30 transition-all shadow-sm hover:shadow-lg hover:-translate-x-1 animate-fade-in-up" style={{animationDelay: `${idx * 50}ms`}}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-2xl font-black ${t.reventadosAmount ? 'text-red-400' : 'text-white'}`}>{t.number}</span>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase text-brand-text-secondary">{DRAW_LABELS[t.draw]}</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[9px] text-brand-text-secondary">{formatTicketDate(t.purchaseDate)}</span>
                                                <span className={`text-[8px] font-bold uppercase px-1.5 rounded ${t.status === 'paid' ? 'bg-green-900/40 text-green-400' : t.status === 'pending' ? 'bg-yellow-900/20 text-yellow-500' : 'bg-red-900/20 text-red-500'}`}>
                                                    {t.status === 'paid' ? 'PAGADO' : t.status === 'pending' ? 'PENDIENTE' : 'PERDIDO'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-white text-sm">{formatCurrency(t.amount)}</div>
                                        {t.reventadosAmount && (
                                                <div className="text-[9px] font-bold text-red-400 flex items-center justify-end gap-1">
                                                    <FireIcon className="h-3 w-3"/> +{formatCurrency(t.reventadosAmount)}
                                                </div>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                                    {getDrawIcon(t.draw, "h-10 w-10")}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 opacity-50">
                        <TicketIcon className="h-8 w-8 mx-auto mb-2 text-brand-text-secondary"/>
                        <p className="text-xs text-brand-text-secondary">No hay jugadas recientes.</p>
                    </div>
                )}
            </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientPanel;
