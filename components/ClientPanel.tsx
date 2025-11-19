import React, { useState } from 'react';
import type { User, Ticket, DrawType, DailyResult, HistoryResult, BallColor } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
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
  GlobeAltIcon
} from './icons/Icons';

interface ClientPanelProps {
  user: User;
  onPurchase: (userId: string, tickets: Omit<Ticket, 'id' | 'purchaseDate'>[]) => void;
  dailyResults: DailyResult[];
  historyResults: HistoryResult[];
  nextDrawTime: string;
  isSyncing: boolean;
}

type NewTicket = Omit<Ticket, 'id' | 'purchaseDate'>;

const ClientPanel: React.FC<ClientPanelProps> = ({ 
    user, 
    onPurchase, 
    dailyResults, 
    historyResults, 
    nextDrawTime, 
    isSyncing 
}) => {
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [playReventados, setPlayReventados] = useState(false);
  const [reventadosAmount, setReventadosAmount] = useState('');
  const [selectedDraw, setSelectedDraw] = useState<DrawType>('mediodia');
  const [cart, setCart] = useState<NewTicket[]>([]);
  const [error, setError] = useState('');

  const totalCost = cart.reduce((sum, item) => sum + item.amount + (item.reventadosAmount || 0), 0);

  const DRAW_LABELS: Record<DrawType, string> = {
    mediodia: 'MEDIODÍA',
    tarde: 'TARDE',
    noche: 'NOCHE'
  };

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
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };
  
  const handlePurchase = () => {
      if (totalCost > user.balance) {
          setError('No tiene saldo suficiente para esta compra.');
          return;
      }
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

  return (
    <div className="space-y-8">
      {/* HERO: Live Results */}
      <section className="relative overflow-hidden rounded-3xl border border-brand-border bg-brand-secondary/50 backdrop-blur-xl shadow-2xl">
        <div className="absolute inset-0 bg-hero-glow opacity-20 pointer-events-none"></div>
        
        <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${isSyncing ? 'bg-brand-accent animate-ping' : 'bg-brand-success'}`}></span>
                        <span className="text-xs font-bold uppercase tracking-widest text-brand-text-secondary">Resultados en Vivo</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter mb-2">
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
                     <div className="text-xl font-mono font-bold text-brand-accent">{nextDrawTime}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {dailyResults.map((res) => (
                    <div key={res.draw} className="group relative bg-brand-primary/60 rounded-2xl p-5 border border-brand-border hover:border-brand-accent/50 transition-all duration-300 overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            {getDrawIcon(res.draw, "h-24 w-24")}
                        </div>
                        
                        <div className="flex items-center justify-between mb-4 relative z-10">
                             <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${res.draw === 'mediodia' ? 'bg-orange-500/20 text-orange-400' : res.draw === 'tarde' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {getDrawIcon(res.draw)}
                                </div>
                                <span className="font-bold text-white uppercase text-sm">{DRAW_LABELS[res.draw]}</span>
                             </div>
                        </div>

                        <div className="flex justify-center items-center gap-4 relative z-10 py-2">
                            {res.number ? (
                                <>
                                    {/* Main Number Ball */}
                                    <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-b from-white to-gray-300 shadow-[0_5px_15px_rgba(255,255,255,0.2)] text-brand-primary text-4xl font-black transform group-hover:scale-110 transition-transform duration-500">
                                        {res.number}
                                        <div className="absolute top-2 left-4 w-6 h-3 bg-white rounded-full opacity-50 filter blur-[1px]"></div>
                                    </div>
                                    
                                    {/* Reventados Indicator */}
                                    <div className="flex flex-col items-center gap-1">
                                        {res.ballColor === 'roja' && res.reventadosNumber ? (
                                             <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-b from-red-500 to-red-700 shadow-[0_0_15px_rgba(239,68,68,0.6)] text-white text-lg font-bold border border-red-400 animate-pulse-slow">
                                                 {res.reventadosNumber}
                                             </div>
                                        ) : (
                                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-tertiary border border-brand-border text-brand-text-secondary text-xs font-bold">
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
           <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between mb-8 border-b border-brand-border pb-4">
                    <div className="flex items-center gap-3">
                         <div className="bg-brand-accent/20 p-2 rounded-lg text-brand-accent">
                             <PlusIcon className="h-6 w-6" />
                         </div>
                         <div>
                             <h3 className="text-xl font-bold text-white">Crear Jugada</h3>
                             <p className="text-xs text-brand-text-secondary">Arma tu combinación ganadora</p>
                         </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-brand-tertiary px-3 py-1 rounded-lg border border-brand-border">
                        <FireIcon className="h-4 w-4 text-brand-danger" />
                        <span className="text-xs font-bold text-brand-text-primary">200x Reventados</span>
                    </div>
                </div>

                <form onSubmit={handleAddTicket} className="space-y-8">
                    {/* Draw Selection */}
                    <div>
                        <label className="block text-xs uppercase font-bold text-brand-text-secondary mb-3">1. Elige el Sorteo</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['mediodia', 'tarde', 'noche'] as DrawType[]).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setSelectedDraw(type)}
                                    className={`
                                        relative flex flex-col items-center justify-center py-4 px-2 rounded-xl border-2 transition-all duration-200
                                        ${selectedDraw === type 
                                            ? 'bg-brand-accent/10 border-brand-accent text-brand-accent shadow-[0_0_20px_rgba(79,70,229,0.2)]' 
                                            : 'bg-brand-tertiary/50 border-brand-border text-brand-text-secondary hover:border-brand-text-secondary/50 hover:bg-brand-tertiary'
                                        }
                                    `}
                                >
                                    <div className={`mb-2 ${selectedDraw === type ? 'text-brand-accent' : 'text-brand-text-secondary'}`}>
                                        {getDrawIcon(type, "h-6 w-6")}
                                    </div>
                                    <span className="font-bold text-xs uppercase">{DRAW_LABELS[type]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs uppercase font-bold text-brand-text-secondary mb-3">2. Tu Número</label>
                            <div className="relative">
                                <input
                                    id="number"
                                    type="tel"
                                    value={number}
                                    onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                                    placeholder="00"
                                    className="w-full bg-brand-tertiary/50 border border-brand-border rounded-2xl text-center text-5xl font-black text-white py-6 focus:ring-2 focus:ring-brand-accent focus:border-transparent focus:bg-brand-tertiary transition-all placeholder-brand-text-secondary/20 font-mono"
                                    maxLength={2}
                                />
                                <span className="absolute top-4 left-4 text-[10px] font-bold text-brand-text-secondary uppercase">NÚMERO</span>
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs uppercase font-bold text-brand-text-secondary mb-3">3. Monto a Apostar</label>
                            <div className="relative">
                                <input
                                    id="amount"
                                    type="tel"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="1000"
                                    className="w-full bg-brand-tertiary/50 border border-brand-border rounded-2xl text-center text-4xl font-bold text-brand-success py-8 focus:ring-2 focus:ring-brand-success focus:border-transparent focus:bg-brand-tertiary transition-all placeholder-brand-text-secondary/20 font-mono"
                                />
                                <span className="absolute top-4 left-4 text-[10px] font-bold text-brand-text-secondary uppercase">COLONES</span>
                            </div>
                        </div>
                    </div>

                    {/* Reventados Toggle */}
                    <div className="bg-gradient-to-r from-red-900/10 to-transparent border border-red-500/20 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center gap-3">
                                 <div className="bg-red-500/20 p-2 rounded-lg text-red-500">
                                     <FireIcon className="h-5 w-5" />
                                 </div>
                                 <div>
                                     <h4 className="font-bold text-white text-sm">Jugar Reventados</h4>
                                     <p className="text-[10px] text-brand-text-secondary">Multiplica tu inversión hasta 200x</p>
                                 </div>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={playReventados} 
                                    onChange={(e) => setPlayReventados(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-brand-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 border border-brand-border"></div>
                            </label>
                        </div>

                        {playReventados && (
                            <div className="animate-fade-in-up">
                                <Input
                                    label="Monto Reventados"
                                    value={reventadosAmount}
                                    onChange={(e) => setReventadosAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Monto adicional..."
                                    className="bg-brand-secondary border-red-500/30 focus:ring-red-500"
                                    icon={<span className="font-bold text-red-500">₡</span>}
                                />
                            </div>
                        )}
                    </div>

                    <Button variant="primary" size="lg" type="submit" className="w-full uppercase tracking-widest text-sm shadow-xl shadow-brand-accent/20">
                        <PlusIcon className="h-5 w-5" /> Agregar al Carrito
                    </Button>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold text-center">
                            {error}
                        </div>
                    )}
                </form>
           </Card>

           {/* HISTORY TABLE */}
           <Card>
               <div className="flex items-center justify-between mb-6">
                   <h3 className="text-lg font-bold text-white flex items-center gap-2">
                       <CalendarIcon className="h-5 w-5 text-brand-accent" /> Historial Semanal
                   </h3>
                   <div className="flex items-center gap-2">
                       <a href="https://www.jps.go.cr/resultados/nuevos-tiempos-reventados" target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-accent hover:underline flex items-center gap-1 uppercase font-bold">
                           <GlobeAltIcon className="h-3 w-3"/> Ver Oficial
                       </a>
                   </div>
               </div>
               
               <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-text-secondary uppercase bg-brand-secondary/50">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Fecha</th>
                                <th className="px-4 py-3 text-center">Mediodía</th>
                                <th className="px-4 py-3 text-center">Tarde</th>
                                <th className="px-4 py-3 rounded-r-lg text-center">Noche</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {historyResults.map((item) => (
                                <tr key={item.date} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 font-mono text-brand-text-primary">{item.date}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="inline-flex items-center justify-center gap-2 bg-brand-secondary border border-brand-border px-2 py-1 rounded-md">
                                            <span className="font-bold text-white">{item.results.mediodia.number}</span>
                                            {item.results.mediodia.ball === 'roja' ? <span className="w-2 h-2 bg-red-500 rounded-full"></span> : <span className="w-2 h-2 bg-white/20 rounded-full"></span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="inline-flex items-center justify-center gap-2 bg-brand-secondary border border-brand-border px-2 py-1 rounded-md">
                                            <span className="font-bold text-white">{item.results.tarde.number}</span>
                                            {item.results.tarde.ball === 'roja' ? <span className="w-2 h-2 bg-red-500 rounded-full"></span> : <span className="w-2 h-2 bg-white/20 rounded-full"></span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="inline-flex items-center justify-center gap-2 bg-brand-secondary border border-brand-border px-2 py-1 rounded-md">
                                            <span className="font-bold text-white">{item.results.noche.number}</span>
                                            {item.results.noche.ball === 'roja' ? <span className="w-2 h-2 bg-red-500 rounded-full"></span> : <span className="w-2 h-2 bg-white/20 rounded-full"></span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
               </div>
           </Card>
        </div>

        {/* RIGHT COLUMN: Cart */}
        <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
                <Card className="border-brand-accent/50 shadow-[0_0_30px_rgba(79,70,229,0.1)]" noPadding>
                    <div className="bg-brand-accent/10 p-6 border-b border-brand-border flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ShoppingCartIcon className="h-5 w-5 text-brand-accent"/> Tu Jugada
                        </h3>
                        <span className="bg-brand-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                            {cart.length} Items
                        </span>
                    </div>
                    
                    <div className="p-6">
                        {cart.length > 0 ? (
                            <div className="space-y-4">
                                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                    {cart.map((item, index) => (
                                        <div key={index} className="bg-brand-tertiary/50 p-3 rounded-xl border border-brand-border flex justify-between items-center group hover:border-brand-accent/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-brand-secondary flex flex-col items-center justify-center border border-brand-border">
                                                    <span className="text-lg font-black text-white leading-none">{item.number}</span>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">{DRAW_LABELS[item.draw]}</div>
                                                    <div className="text-xs text-white font-bold">Regular: {formatCurrency(item.amount)}</div>
                                                    {item.reventadosAmount && item.reventadosAmount > 0 && (
                                                        <div className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                                                            <FireIcon className="h-3 w-3"/> {formatCurrency(item.reventadosAmount)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemoveFromCart(index)} className="text-brand-text-secondary hover:text-red-500 transition-colors p-2 hover:bg-white/5 rounded-lg">
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
                                        className="w-full uppercase tracking-widest font-bold text-sm shadow-xl shadow-brand-success/20"
                                        disabled={totalCost > user.balance}
                                    >
                                        Confirmar Compra
                                    </Button>
                                    {totalCost > user.balance && (
                                        <p className="text-center text-xs text-red-400 mt-2 font-bold">Saldo insuficiente</p>
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

                {/* Recent User Tickets Widget */}
                <Card className="bg-brand-secondary/30">
                    <h4 className="text-xs font-bold text-brand-text-secondary uppercase mb-4 flex items-center gap-2">
                        <TicketIcon className="h-4 w-4" /> Jugadas Recientes
                    </h4>
                    {user.tickets.length > 0 ? (
                        <div className="space-y-2">
                            {user.tickets.slice().reverse().slice(0, 3).map(t => (
                                <div key={t.id} className="flex justify-between items-center p-2 rounded-lg bg-brand-primary/50 border border-brand-border text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white bg-brand-secondary px-2 py-1 rounded">{t.number}</span>
                                        <span className="text-brand-text-secondary">{DRAW_LABELS[t.draw].substring(0,3)}</span>
                                    </div>
                                    <span className="text-brand-success font-mono">{formatCurrency(t.amount)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-brand-text-secondary text-center italic">Sin actividad reciente</p>
                    )}
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPanel;