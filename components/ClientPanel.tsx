
import React, { useState, useEffect } from 'react';
import type { User, Ticket, DrawType, DailyResult } from '../types';
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
  SunsetIcon 
} from './icons/Icons';

interface ClientPanelProps {
  user: User;
  onPurchase: (userId: string, tickets: Omit<Ticket, 'id' | 'purchaseDate'>[]) => void;
}

type NewTicket = Omit<Ticket, 'id' | 'purchaseDate'>;

const ClientPanel: React.FC<ClientPanelProps> = ({ user, onPurchase }) => {
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDraw, setSelectedDraw] = useState<DrawType>('mediodia');
  const [cart, setCart] = useState<NewTicket[]>([]);
  const [error, setError] = useState('');
  const [dailyResults, setDailyResults] = useState<DailyResult[]>([]);
  const [nextDrawTime, setNextDrawTime] = useState<string>('');

  const totalCost = cart.reduce((sum, item) => sum + item.amount, 0);

  // Configuración de horarios
  const drawSchedules = {
    mediodia: { hour: 12, minute: 55, label: 'Mediodía' },
    tarde: { hour: 16, minute: 30, label: 'Tarde' },
    noche: { hour: 19, minute: 30, label: 'Noche' }
  };

  useEffect(() => {
    const updateStatus = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeValue = currentHour * 60 + currentMinute;

      // Simulación de resultados basados en hora
      // Mediodía se revela a las 13:00, Tarde 17:00, Noche 20:00
      const results: DailyResult[] = [
        { 
          date: now.toLocaleDateString(), 
          draw: 'mediodia', 
          number: currentTimeValue >= (13 * 60) ? '45' : null 
        },
        { 
          date: now.toLocaleDateString(), 
          draw: 'tarde', 
          number: currentTimeValue >= (17 * 60) ? '82' : null 
        },
        { 
          date: now.toLocaleDateString(), 
          draw: 'noche', 
          number: currentTimeValue >= (20 * 60) ? '19' : null 
        },
      ];
      setDailyResults(results);

      // Calcular próximo sorteo
      let targetDraw = drawSchedules.mediodia;
      let targetTime = targetDraw.hour * 60 + targetDraw.minute;
      
      if (currentTimeValue > (19 * 60 + 30)) {
        // Mañana mediodía
        setNextDrawTime("Mañana 12:55 PM");
      } else {
        if (currentTimeValue > (16 * 60 + 30)) {
          targetDraw = drawSchedules.noche;
        } else if (currentTimeValue > (12 * 60 + 55)) {
          targetDraw = drawSchedules.tarde;
        }
        
        const diff = (targetDraw.hour * 60 + targetDraw.minute) - currentTimeValue;
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        setNextDrawTime(`${hours}h ${minutes}m para ${targetDraw.label}`);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, []);

  const handleAddTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const num = parseInt(number, 10);
    const amnt = parseInt(amount, 10);

    if (isNaN(num) || num < 0 || num > 99) {
      setError('El número debe estar entre 00 y 99.');
      return;
    }
    if (isNaN(amnt) || amnt <= 0) {
      setError('El monto debe ser un número positivo.');
      return;
    }

    const formattedNumber = num.toString().padStart(2, '0');
    setCart([...cart, { number: formattedNumber, amount: amnt, draw: selectedDraw }]);
    setNumber('');
    setAmount('');
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
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(amount);
  };

  const getDrawIcon = (type: DrawType, className: string = "h-5 w-5") => {
    switch(type) {
      case 'mediodia': return <SunIcon className={className} />;
      case 'tarde': return <SunsetIcon className={className} />;
      case 'noche': return <MoonIcon className={className} />;
    }
  };

  const getDrawLabel = (type: DrawType) => {
    switch(type) {
      case 'mediodia': return 'Mediodía (12:55 PM)';
      case 'tarde': return 'Tarde (4:30 PM)';
      case 'noche': return 'Noche (7:30 PM)';
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner de Resultados del Día */}
      <section className="bg-gradient-to-br from-brand-secondary to-[#0f131a] border border-brand-border rounded-xl p-6 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand-accent/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-brand-success/10 rounded-full blur-xl"></div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h2 className="text-3xl font-black text-white tracking-tight uppercase italic transform -skew-x-6">
                <span className="text-brand-accent">Top</span> Mundial
              </h2>
              <p className="text-brand-text-secondary text-sm mt-1">Resultados Oficiales del Día</p>
            </div>
            <div className="bg-brand-primary/80 border border-brand-border px-4 py-2 rounded-lg shadow-inner">
               <span className="text-brand-text-secondary text-xs uppercase font-bold mr-2">Próximo Sorteo:</span>
               <span className="text-brand-accent font-mono font-bold animate-pulse">{nextDrawTime}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {dailyResults.map((res) => (
                <div key={res.draw} className="bg-brand-primary/50 backdrop-blur-sm border border-brand-border rounded-xl p-5 flex items-center justify-between relative overflow-hidden group hover:border-brand-accent/50 transition-all duration-300">
                  <div className="absolute right-0 top-0 h-full w-1 bg-brand-border group-hover:bg-brand-accent transition-colors"></div>
                  
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2 text-brand-text-secondary group-hover:text-brand-text-primary transition-colors">
                      {getDrawIcon(res.draw, "h-5 w-5")}
                      <span className="text-xs font-bold uppercase tracking-widest">{res.draw}</span>
                    </div>
                    <div className="text-xs text-brand-text-secondary">
                       {res.draw === 'mediodia' ? '12:55 PM' : res.draw === 'tarde' ? '4:30 PM' : '7:30 PM'}
                    </div>
                  </div>

                  <div className="relative">
                    {res.number ? (
                      <div className="flex items-center justify-center w-16 h-16 bg-brand-secondary rounded-full border-2 border-brand-accent/50 shadow-[0_0_15px_rgba(88,166,255,0.3)]">
                        <span className="text-3xl font-black text-white">{res.number}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-16 h-16 bg-brand-secondary/50 rounded-full border border-dashed border-brand-text-secondary">
                        <span className="text-xs font-bold text-brand-text-secondary">???</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="border-t-4 border-t-brand-accent">
            <h2 className="text-2xl font-bold mb-6 text-brand-text-primary flex items-center gap-2">
              <PlusIcon className="h-6 w-6 text-brand-accent"/> Nueva Jugada
            </h2>
            
            <form onSubmit={handleAddTicket} className="space-y-6">
              {/* Selector de Sorteo */}
              <div>
                <label className="block text-sm font-bold text-brand-text-secondary mb-3 uppercase tracking-wider">Seleccione Horario</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['mediodia', 'tarde', 'noche'] as DrawType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedDraw(type)}
                      className={`
                        relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200
                        ${selectedDraw === type 
                          ? 'bg-brand-accent/10 border-brand-accent text-brand-accent shadow-lg shadow-brand-accent/10' 
                          : 'bg-brand-primary border-brand-border text-brand-text-secondary hover:border-brand-text-secondary hover:bg-brand-secondary'
                        }
                      `}
                    >
                      <div className={`mb-2 p-2 rounded-full ${selectedDraw === type ? 'bg-brand-accent text-white' : 'bg-brand-secondary text-brand-text-secondary'}`}>
                         {getDrawIcon(type, "h-6 w-6")}
                      </div>
                      <span className="font-bold text-sm uppercase">{type}</span>
                      <span className="text-xs opacity-80 mt-1 font-mono">
                        {type === 'mediodia' ? '12:55 PM' : type === 'tarde' ? '04:30 PM' : '07:30 PM'}
                      </span>
                      {selectedDraw === type && (
                        <div className="absolute -top-2 -right-2 bg-brand-accent text-white rounded-full p-1">
                          <CheckCircleIcon className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                   <Input
                    label="Número (00-99)"
                    id="number"
                    type="tel"
                    value={number}
                    onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="00"
                    className="text-center text-3xl font-mono tracking-widest font-bold"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    label="Monto (₡)"
                    id="amount"
                    type="tel"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="1000"
                    className="text-center text-3xl font-mono font-bold"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-4 text-lg font-bold uppercase tracking-wide shadow-lg hover:shadow-brand-accent/20 transform hover:-translate-y-0.5 transition-all">
                Agregar a la Lista
              </Button>
            </form>
            {error && <div className="mt-4 p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-brand-danger text-center font-medium animate-pulse">{error}</div>}
          </Card>

          <Card className="mt-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-brand-text-primary">
                <TicketIcon className="h-6 w-6 text-brand-text-secondary"/> Historial Reciente
              </h3>
              {user.tickets.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {user.tickets.slice().reverse().map(ticket => (
                              <li key={ticket.id} className="bg-brand-primary p-4 rounded-lg border border-brand-border hover:border-brand-accent/50 transition-colors flex justify-between items-center group">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-brand-secondary border border-brand-border group-hover:border-brand-accent group-hover:text-brand-accent transition-colors`}>
                                      {getDrawIcon(ticket.draw)}
                                    </div>
                                    <div>
                                      <span className="font-mono text-2xl text-white font-bold">{ticket.number}</span>
                                      <span className="block text-[10px] text-brand-text-secondary uppercase tracking-wider">{ticket.draw}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                      <div className="font-bold text-brand-success">{formatCurrency(ticket.amount)}</div>
                                      <div className="text-xs text-brand-text-secondary">{ticket.purchaseDate.toLocaleDateString()}</div>
                                  </div>
                              </li>
                          ))}
                      </ul>
                  </div>
              ) : (
                  <div className="text-center py-12 bg-brand-primary/30 rounded-lg border border-brand-border border-dashed">
                    <TicketIcon className="h-12 w-12 mx-auto text-brand-border mb-2 opacity-50"/>
                    <p className="text-brand-text-secondary">No hay jugadas registradas aún.</p>
                  </div>
              )}
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 border border-brand-accent shadow-[0_0_30px_rgba(88,166,255,0.1)]">
              <div className="flex items-center justify-between mb-6 border-b border-brand-border pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <ShoppingCartIcon className="h-6 w-6 text-brand-accent"/> Tu Jugada
                </h3>
                <span className="bg-brand-accent text-brand-primary text-xs font-extrabold px-2 py-1 rounded-full">{cart.length}</span>
              </div>
              
              {cart.length > 0 ? (
                  <>
                      <div className="max-h-80 overflow-y-auto pr-1 mb-6 space-y-2 custom-scrollbar">
                        {cart.map((item, index) => (
                            <div key={index} className="flex justify-between items-center bg-brand-primary p-3 rounded-lg border border-brand-border group hover:border-brand-border/80">
                                <div className="flex items-center gap-3">
                                    <div className="text-brand-text-secondary group-hover:text-brand-accent transition-colors">
                                      {getDrawIcon(item.draw, "h-4 w-4")}
                                    </div>
                                    <div>
                                      <div className="font-mono text-xl font-bold text-white">{item.number}</div>
                                      <div className="text-[10px] text-brand-text-secondary uppercase tracking-wider">{item.draw}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-brand-text-primary">{formatCurrency(item.amount)}</span>
                                    <button onClick={() => handleRemoveFromCart(index)} className="text-brand-text-secondary hover:text-brand-danger transition-colors p-1.5 rounded-md hover:bg-brand-secondary">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                      </div>
                      
                      <div className="bg-brand-primary rounded-lg p-4 mb-6 border border-brand-border">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-brand-text-secondary text-sm">Cantidad de números:</span>
                            <span className="text-white font-medium">{cart.length}</span>
                          </div>
                          <div className="flex justify-between items-end pt-2 border-t border-brand-border">
                              <span className="text-brand-text-secondary">Total a Pagar:</span>
                              <span className="text-2xl font-black text-white tracking-tight">{formatCurrency(totalCost)}</span>
                          </div>
                      </div>

                      <Button onClick={handlePurchase} variant="success" className="w-full py-4 text-lg font-bold shadow-lg shadow-brand-success/20" disabled={totalCost > user.balance}>
                          <CheckCircleIcon className="h-6 w-6"/> CONFIRMAR
                      </Button>
                      <p className="text-center text-xs text-brand-text-secondary mt-4 opacity-60">
                        Al confirmar, acepta los términos y condiciones del sorteo.
                      </p>
                  </>
              ) : (
                  <div className="text-center py-12 flex flex-col items-center justify-center opacity-60">
                    <ShoppingCartIcon className="h-12 w-12 text-brand-text-secondary mb-3"/>
                    <p className="text-brand-text-secondary text-sm">Seleccione sus números de la suerte para comenzar.</p>
                  </div>
              )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientPanel;
