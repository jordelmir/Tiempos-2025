
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { User, DailyResult, DrawType, BallColor, Transaction, HistoryResult, Ticket } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import ActionModal, { ActionType } from './ActionModal';
import { 
    SearchIcon, 
    CreditCardIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CheckCircleIcon,
    SunIcon,
    SunsetIcon,
    MoonIcon,
    CalendarIcon,
    UserPlusIcon,
    LockIcon,
    ClipboardCheckIcon,
    ShieldCheckIcon,
    WalletIcon,
    FireIcon,
    IdentificationIcon,
    CpuIcon,
    RefreshIcon,
    BoltIcon,
    SparklesIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    FingerPrintIcon,
    GlobeAltIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CalendarDaysIcon
} from './icons/Icons';

interface AdminPanelProps {
  currentUser: User;
  users: User[]; 
  dailyResults: DailyResult[];
  historyResults: HistoryResult[]; 
  transactions: Transaction[];
  onRecharge: (userId: string, amount: number) => void;
  onWithdraw: (userId: string, amount: number) => void;
  onUpdateResult: (draw: DrawType, number: string | null, ballColor: BallColor | null, reventadosNumber: string | null) => void;
  onUpdateHistory: (date: string, data: HistoryResult['results']) => void; 
  onRegisterClient: (userData: Partial<User>) => void;
  onForceResetPassword: (userId: string) => void;
}

type TabView = 'finance' | 'draws' | 'reports';

interface GlobalTicket extends Ticket {
    userId: string;
    userName: string;
    userEmail: string;
}

// --- NEW: ANIMATION STATE INTERFACES ---
interface DrawConfirmationState {
    isActive: boolean;
    type: 'normal' | 'reventado' | null;
    step: 'input' | 'confirming' | 'animation' | 'complete';
    drawType: DrawType | null;
}

// RESET PASSWORD ANIMATION STATE
interface ResetAnimState {
    isActive: boolean;
    userId: string | null;
    userName: string;
    step: 'idle' | 'scanning' | 'decrypting' | 'overwriting' | 'success';
}

// --- HELPER: ISO WEEK CALCULATION ---
const getWeekNumber = (d: Date): { year: number, week: number } => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
};

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    currentUser,
    users, 
    dailyResults, 
    historyResults,
    transactions, 
    onRecharge, 
    onWithdraw, 
    onUpdateResult,
    onUpdateHistory,
    onRegisterClient,
    onForceResetPassword
}) => {
  const [activeTab, setActiveTab] = useState<TabView>('draws'); // Default to draws for management focus
  
  // Finance State
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null); // For Accordion UI
  const [amountInput, setAmountInput] = useState('');
  const [transactionMode, setTransactionMode] = useState<'deposit' | 'withdraw'>('deposit');
  
  // --- FINANCE WEEKLY NAVIGATION STATE ---
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(() => {
      const now = new Date();
      const { year, week } = getWeekNumber(now);
      return `${year}-W${week}`;
  });

  // Modal States
  const [actionModal, setActionModal] = useState<{isOpen: boolean, type: ActionType, amount: number, details?: string}>({
      isOpen: false, type: 'deposit', amount: 0
  });
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newUser, setNewUser] = useState({ cedula: '', name: '', email: '', phone: '' });

  // --- DRAW MANAGEMENT STATE ---
  const [editingDraw, setEditingDraw] = useState<DrawType | null>(null);
  const [drawNumber, setDrawNumber] = useState('');
  const [drawBall, setDrawBall] = useState<BallColor>('blanca');
  const [drawRevNumber, setDrawRevNumber] = useState('');
  
  // ANIMATION STATE FOR DRAW CONFIRMATION
  const [confirmAnim, setConfirmAnim] = useState<DrawConfirmationState>({
      isActive: false,
      type: null,
      step: 'input',
      drawType: null
  });

  // ANIMATION STATE FOR RESET PASSWORD
  const [resetAnim, setResetAnim] = useState<ResetAnimState>({
      isActive: false,
      userId: null,
      userName: '',
      step: 'idle'
  });

  // TIME MACHINE STATE
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]); 
  const [timeMachineState, setTimeMachineState] = useState({
      mediodia: { number: '', ball: 'blanca' as BallColor, reventados: '' },
      tarde: { number: '', ball: 'blanca' as BallColor, reventados: '' },
      noche: { number: '', ball: 'blanca' as BallColor, reventados: '' }
  });
  const [isTimeTraveling, setIsTimeTraveling] = useState(false);
  const [stabilizationState, setStabilizationState] = useState<'idle' | 'stabilizing' | 'complete'>('idle');

  const DRAW_LABELS: Record<DrawType, string> = {
    mediodia: 'MEDIODÍA',
    tarde: 'TARDE',
    noche: 'NOCHE'
  };

  // --- FINANCE ENGINE: WEEKLY GROUPING ---
  const weeklyData = useMemo(() => {
      const grouped: Record<string, { 
          cashIn: number, 
          cashOut: number, 
          net: number, 
          txs: Transaction[],
          label: string,
          isCurrent: boolean 
      }> = {};

      const now = new Date();
      const currentWeek = getWeekNumber(now);
      const currentKey = `${currentWeek.year}-W${currentWeek.week}`;

      // 1. Group Transactions by Week
      transactions.forEach(tx => {
          const date = new Date(tx.date);
          const { year, week } = getWeekNumber(date);
          const key = `${year}-W${week}`;

          if (!grouped[key]) {
              grouped[key] = { 
                  cashIn: 0, 
                  cashOut: 0, 
                  net: 0, 
                  txs: [],
                  label: `Semana ${week} - ${year}`,
                  isCurrent: key === currentKey
              };
          }

          if (tx.type === 'deposit') {
              grouped[key].cashIn += tx.amount;
          } else if (tx.type === 'withdraw') {
              grouped[key].cashOut += tx.amount;
          }
          
          grouped[key].txs.push(tx);
      });

      // 2. Ensure Current Week Exists even if no transactions
      if (!grouped[currentKey]) {
          grouped[currentKey] = {
              cashIn: 0, cashOut: 0, net: 0, txs: [],
              label: `Semana ${currentWeek.week} - ${currentWeek.year}`,
              isCurrent: true
          };
      }

      // 3. Calculate Net per week
      Object.keys(grouped).forEach(key => {
          grouped[key].net = grouped[key].cashIn - grouped[key].cashOut;
          // Sort transactions by date desc
          grouped[key].txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });

      // 4. Sort Weeks (Newest First) and slice to 52 limit
      const sortedKeys = Object.keys(grouped).sort((a, b) => {
          const [yA, wA] = a.split('-W').map(Number);
          const [yB, wB] = b.split('-W').map(Number);
          return yB === yA ? wB - wA : yB - yA;
      }).slice(0, 52); // LIMIT 52 WEEKS

      return { grouped, sortedKeys, currentKey };
  }, [transactions]);

  // --- FINANCE STATS FOR SELECTED WEEK ---
  const selectedWeekStats = useMemo(() => {
      const data = weeklyData.grouped[selectedWeekKey];
      if (!data) {
          return { 
              cashIn: 0, 
              cashOut: 0, 
              net: 0, 
              txs: [], 
              label: 'Semana No Encontrada',
              profitMargin: "0.0",
              chartData: [],
              chartLabels: []
          };
      }

      const profitMargin = data.cashIn > 0 
          ? ((data.net / data.cashIn) * 100).toFixed(1) 
          : "0.0";

      // Generate Daily Chart Data for the selected week (Mon-Sun)
      const [yearStr, weekStr] = selectedWeekKey.split('-W');
      const year = parseInt(yearStr);
      const week = parseInt(weekStr);
      
      // Calculate Monday of that week
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4)
          ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else
          ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      
      const chartLabels = [];
      const chartData = [];

      for(let i=0; i<7; i++) {
          const d = new Date(ISOweekStart);
          d.setDate(ISOweekStart.getDate() + i);
          chartLabels.push(d.toLocaleDateString('es-CR', { weekday: 'short' }));
          
          const dayStr = d.toLocaleDateString();
          const dayTxs = data.txs.filter(t => new Date(t.date).toLocaleDateString() === dayStr);
          
          const dayIn = dayTxs.filter(t => t.type === 'deposit').reduce((acc, t) => acc + t.amount, 0);
          const dayOut = dayTxs.filter(t => t.type === 'withdraw').reduce((acc, t) => acc + t.amount, 0);
          chartData.push(dayIn - dayOut);
      }

      return { 
          cashIn: data.cashIn,
          cashOut: data.cashOut,
          net: data.net,
          txs: data.txs,
          label: data.label,
          profitMargin,
          chartData,
          chartLabels
      };
  }, [weeklyData, selectedWeekKey]);

  // --- NAVIGATION HANDLERS ---
  const handleWeekNav = (direction: 'prev' | 'next') => {
      const currentIndex = weeklyData.sortedKeys.indexOf(selectedWeekKey);
      if (currentIndex === -1) return;

      let newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
      
      // Bounds check
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= weeklyData.sortedKeys.length) newIndex = weeklyData.sortedKeys.length - 1;

      setSelectedWeekKey(weeklyData.sortedKeys[newIndex]);
  };

  const handleJumpToCurrent = () => {
      setSelectedWeekKey(weeklyData.currentKey);
  }

  // --- SVG PATH GENERATOR (For Flux Chart) ---
  const generateSmoothPath = (data: number[], width: number, height: number) => {
      if (data.length === 0) return "";
      
      // Normalize data to fit graph
      const maxVal = Math.max(...data.map(Math.abs), 1); // Find max absolute value to center 0
      
      const points = data.map((val, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = (height / 2) - (val / maxVal) * (height / 2) * 0.8;
          return [x, y];
      });

      return points.reduce((path, point, i, a) => {
          if (i === 0) return `M ${point[0]},${point[1]}`;
          const prev = a[i - 1];
          const cp1x = prev[0] + (point[0] - prev[0]) / 2;
          const cp1y = prev[1];
          const cp2x = prev[0] + (point[0] - prev[0]) / 2;
          const cp2y = point[1];
          return `${path} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point[0]},${point[1]}`;
      }, "");
  };

  // --- AGGREGATION LOGIC --- 
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users; 
    return users.filter(
      user =>
        user.cedula?.includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, users]);

  // --- HANDLERS ---

  // FINANCE HANDLERS
  const handleToggleUserCard = (userId: string) => {
      setExpandedUserId(prev => prev === userId ? null : userId);
      setAmountInput('');
  };

  const handleSubmitFinance = (e: React.FormEvent, user: User) => {
    e.preventDefault();
    if (!amountInput) return;
    const amount = parseInt(amountInput);
    if (isNaN(amount) || amount <= 0) return;

    // --- LIQUIDITY CHECK ---
    if (transactionMode === 'withdraw' && user.balance < amount) {
        // Trigger Rejected Animation
        setActionModal({ isOpen: true, type: 'error', amount, details: 'Saldo insuficiente' });
        return;
    }

    if (transactionMode === 'deposit') onRecharge(user.id, amount);
    else onWithdraw(user.id, amount);

    setActionModal({ isOpen: true, type: transactionMode, amount, details: `Cliente: ${user.name}` });
    setAmountInput('');
  };

  // REGISTER HANDLER
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegisterClient(newUser);
    setShowRegisterModal(false);
    setNewUser({ cedula: '', name: '', email: '', phone: '' });
  };

  // RESET PASSWORD HANDLERS
  const initiatePasswordReset = (user: User) => {
      setResetAnim({
          isActive: true,
          userId: user.id,
          userName: user.name,
          step: 'idle'
      });
  };

  const confirmResetPassword = () => {
      if (!resetAnim.userId) return;

      // Sequence: Idle -> Scanning -> Decrypting -> Overwriting -> Success
      setResetAnim(prev => ({ ...prev, step: 'scanning' }));

      setTimeout(() => {
          setResetAnim(prev => ({ ...prev, step: 'decrypting' }));
          
          setTimeout(() => {
              setResetAnim(prev => ({ ...prev, step: 'overwriting' }));
              onForceResetPassword(resetAnim.userId!);

              setTimeout(() => {
                  setResetAnim(prev => ({ ...prev, step: 'success' }));
              }, 1500);
          }, 1500);
      }, 1000);
  };

  const closeResetModal = () => {
      setResetAnim({ isActive: false, userId: null, userName: '', step: 'idle' });
  };

  // --- DRAW MANAGEMENT HANDLERS (THE QUANTUM COMMIT) ---

  const openDrawManager = (draw: DrawType, currentRes: DailyResult) => {
      setEditingDraw(draw);
      setDrawNumber(currentRes.number || '');
      setDrawBall(currentRes.ballColor || 'blanca');
      setDrawRevNumber(currentRes.reventadosNumber || '');
      setConfirmAnim({ isActive: true, type: null, step: 'input', drawType: draw });
  };

  const handleConfirmDraw = () => {
      // 1. Validate
      if (!drawNumber) return;

      // 2. Determine Type
      const isReventado = drawBall === 'roja';
      const type = isReventado ? 'reventado' : 'normal';

      // 3. Start Sequence
      setConfirmAnim(prev => ({ ...prev, type, step: 'confirming' }));

      // 4. Animation Timing
      setTimeout(() => {
          setConfirmAnim(prev => ({ ...prev, step: 'animation' }));
          
          // Actual Save Delay to sync with visual impact
          setTimeout(() => {
              onUpdateResult(
                  editingDraw!, 
                  drawNumber, 
                  drawBall, 
                  isReventado ? (drawRevNumber || drawNumber) : null
              );
              
              // Complete State
              setTimeout(() => {
                  setConfirmAnim(prev => ({ ...prev, step: 'complete' }));
                  
                  // Reset after success
                  setTimeout(() => {
                      setConfirmAnim({ isActive: false, type: null, step: 'input', drawType: null });
                      setEditingDraw(null);
                  }, 2000);
              }, 1500);
          }, isReventado ? 2000 : 1000); // Reventado has longer buildup
      }, 500);
  };

  // --- TIME MACHINE HANDLERS ---

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      setHistoryDate(newDate);
      setIsTimeTraveling(true);
      
      // Simulate fetch delay with visual distortion
      setTimeout(() => {
          setIsTimeTraveling(false);
          const found = historyResults.find(h => new Date(h.date).toISOString().split('T')[0] === newDate);
          if (found) {
             setTimeMachineState({
                 mediodia: { number: found.results.mediodia.number || '', ball: found.results.mediodia.ball || 'blanca', reventados: found.results.mediodia.reventadosNumber || '' },
                 tarde: { number: found.results.tarde.number || '', ball: found.results.tarde.ball || 'blanca', reventados: found.results.tarde.reventadosNumber || '' },
                 noche: { number: found.results.noche.number || '', ball: found.results.noche.ball || 'blanca', reventados: found.results.noche.reventadosNumber || '' }
             });
          } else {
             setTimeMachineState({
                 mediodia: { number: '', ball: 'blanca', reventados: '' },
                 tarde: { number: '', ball: 'blanca', reventados: '' },
                 noche: { number: '', ball: 'blanca', reventados: '' }
             });
          }
      }, 800);
  };

  const handleTimelineStabilize = () => {
      setStabilizationState('stabilizing');
      
      setTimeout(() => {
          const formattedResults = {
              mediodia: { number: timeMachineState.mediodia.number, reventadosNumber: timeMachineState.mediodia.reventados, ball: timeMachineState.mediodia.ball },
              tarde: { number: timeMachineState.tarde.number, reventadosNumber: timeMachineState.tarde.reventados, ball: timeMachineState.tarde.ball },
              noche: { number: timeMachineState.noche.number, reventadosNumber: timeMachineState.noche.reventados, ball: timeMachineState.noche.ball },
          };
          
          const dateObj = new Date(historyDate + 'T12:00:00'); 
          const dateStr = dateObj.toLocaleDateString(); 

          onUpdateHistory(dateStr, formattedResults);
          
          setStabilizationState('complete');
          setTimeout(() => setStabilizationState('idle'), 3000);
      }, 2000);
  };

  // --- RENDER COMPONENTS ---

  return (
    <div className="space-y-8 relative">
      <ActionModal 
        isOpen={actionModal.isOpen} 
        type={actionModal.type} 
        amount={actionModal.amount} 
        details={actionModal.details}
        onClose={() => setActionModal({...actionModal, isOpen: false})} 
      />

      {/* --- NEURAL OVERWRITE (RESET PASSWORD) OVERLAY --- */}
      {resetAnim.isActive && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl">
              {/* Background Matrix Effect */}
              <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse-slow"></div>
              </div>

              <div className="relative w-full max-w-lg p-8 bg-brand-secondary/50 border border-brand-border rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                  {/* Content depends on step */}
                  
                  {resetAnim.step === 'idle' && (
                      <div className="text-center space-y-6 animate-fade-in-up">
                          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/50 mb-4">
                              <ExclamationTriangleIcon className="h-10 w-10 text-red-500 animate-pulse" />
                          </div>
                          <h2 className="text-2xl font-black text-white uppercase tracking-widest">Confirmar Reset</h2>
                          <p className="text-sm text-brand-text-secondary">
                              Está a punto de iniciar el protocolo de restablecimiento de credenciales para:
                          </p>
                          <div className="bg-brand-primary p-4 rounded-xl border border-brand-border">
                              <p className="text-lg font-bold text-brand-accent">{resetAnim.userName}</p>
                              <p className="text-xs text-brand-text-secondary font-mono mt-1">ID: {resetAnim.userId}</p>
                          </div>
                          <div className="flex gap-4 pt-4">
                              <Button variant="secondary" onClick={closeResetModal} className="flex-1">Cancelar</Button>
                              <Button onClick={confirmResetPassword} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                                  <FingerPrintIcon className="h-5 w-5"/> INICIAR PROTOCOLO
                              </Button>
                          </div>
                      </div>
                  )}

                  {(resetAnim.step === 'scanning' || resetAnim.step === 'decrypting' || resetAnim.step === 'overwriting') && (
                      <div className="text-center space-y-6">
                           {/* Animation Stage */}
                           <div className="relative w-32 h-32 mx-auto">
                               <div className="absolute inset-0 rounded-full border-4 border-brand-accent/30 animate-ping"></div>
                               <div className="absolute inset-2 rounded-full border-4 border-t-brand-accent border-r-transparent border-b-brand-accent border-l-transparent animate-spin"></div>
                               <div className="absolute inset-0 flex items-center justify-center">
                                   {resetAnim.step === 'scanning' && <FingerPrintIcon className="h-12 w-12 text-brand-accent animate-pulse" />}
                                   {resetAnim.step === 'decrypting' && <LockIcon className="h-12 w-12 text-yellow-400 animate-bounce" />}
                                   {resetAnim.step === 'overwriting' && <CpuIcon className="h-12 w-12 text-red-500 animate-pulse" />}
                               </div>
                           </div>
                           
                           <div>
                               <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2 font-mono animate-glitch">
                                   {resetAnim.step === 'scanning' && 'ESCANEANDO IDENTIDAD...'}
                                   {resetAnim.step === 'decrypting' && 'ROMPIENDO ENCRIPTACIÓN...'}
                                   {resetAnim.step === 'overwriting' && 'SOBRESCRIBIENDO CLAVE...'}
                               </h2>
                               {/* Progress Bar */}
                               <div className="w-full h-2 bg-brand-primary rounded-full overflow-hidden mt-4">
                                   <div className={`h-full transition-all duration-500 rounded-full ${resetAnim.step === 'scanning' ? 'w-1/3 bg-blue-500' : resetAnim.step === 'decrypting' ? 'w-2/3 bg-yellow-500' : 'w-full bg-red-500'}`}></div>
                               </div>
                           </div>
                      </div>
                  )}

                  {resetAnim.step === 'success' && (
                      <div className="text-center space-y-6 animate-stamp">
                          <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/50 mb-4">
                              <CheckCircleIcon className="h-10 w-10 text-brand-success" />
                          </div>
                          <h2 className="text-2xl font-black text-white uppercase tracking-widest">Acceso Restaurado</h2>
                          <p className="text-sm text-brand-text-secondary">
                              Las credenciales han sido reiniciadas correctamente.
                          </p>
                          
                          <div className="bg-brand-tertiary p-6 rounded-xl border border-brand-accent/30 relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent animate-shimmer"></div>
                              <p className="text-xs text-brand-text-secondary uppercase mb-2">Nueva Contraseña Temporal</p>
                              <p className="text-3xl font-black text-white font-mono tracking-wider select-all cursor-text hover:text-brand-accent transition-colors">
                                  Ganador2025$$
                              </p>
                              <p className="text-[10px] text-brand-text-secondary mt-2 opacity-60">
                                  Informe al usuario inmediatamente.
                              </p>
                          </div>

                          <Button onClick={closeResetModal} className="w-full bg-brand-success hover:bg-emerald-600 text-white border-none shadow-lg">
                              Finalizar Proceso
                          </Button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- THE QUANTUM COMMIT OVERLAY --- */}
      {confirmAnim.isActive && confirmAnim.step !== 'input' && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-brand-primary/95 backdrop-blur-2xl overflow-hidden">
              {/* Background FX */}
              <div className={`absolute inset-0 opacity-20 ${confirmAnim.type === 'reventado' ? 'bg-red-900 animate-pulse-slow' : 'bg-blue-900 animate-pulse'}`}></div>
              {confirmAnim.type === 'reventado' && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay animate-shake-hard"></div>}
              
              {/* SCANLINE OVERLAY */}
              <div className="absolute inset-0 z-0 pointer-events-none bg-scan-lines opacity-10"></div>
              <div className="absolute w-full h-1 bg-white/20 top-0 z-10 animate-scan-line"></div>

              <div className="relative z-20 text-center p-8 max-w-lg w-full">
                  
                  {confirmAnim.step === 'confirming' && (
                      <div className="animate-zoom-in-fast">
                          <div className={`w-20 h-20 mx-auto mb-6 rounded-full border-4 border-t-transparent animate-spin ${confirmAnim.type === 'reventado' ? 'border-red-500' : 'border-brand-accent'}`}></div>
                          <h2 className="text-2xl font-mono font-bold text-white tracking-widest uppercase blink">
                              {confirmAnim.type === 'reventado' ? 'INITIATING CRITICAL SEQUENCE...' : 'ENCRYPTING DATA BLOCK...'}
                          </h2>
                      </div>
                  )}

                  {confirmAnim.step === 'animation' && (
                      <div className={`${confirmAnim.type === 'reventado' ? 'animate-shake-hard' : 'animate-lock-in'}`}>
                           {confirmAnim.type === 'reventado' ? (
                               <div className="relative">
                                   <div className="absolute inset-0 bg-red-500 blur-[100px] animate-pulse"></div>
                                   <ExclamationTriangleIcon className="h-32 w-32 text-yellow-400 mx-auto mb-4 animate-bounce relative z-10"/>
                                   <h1 className="text-6xl font-black text-white relative z-10 drop-shadow-[0_0_10px_rgba(239,68,68,1)]">
                                       REVENTADO
                                   </h1>
                                   <p className="text-red-300 font-mono mt-2">HIGH YIELD EVENT LOGGED</p>
                               </div>
                           ) : (
                               <div>
                                   <div className="flex justify-center mb-4">
                                       <BoltIcon className="h-24 w-24 text-brand-accent animate-pulse"/>
                                   </div>
                                   <h1 className="text-6xl font-black text-white tracking-tighter glitch-text" data-text={drawNumber}>
                                       {drawNumber}
                                   </h1>
                                   <div className="h-1 w-full bg-brand-tertiary mt-6 rounded-full overflow-hidden">
                                       <div className="h-full bg-brand-accent animate-progress-indeterminate"></div>
                                   </div>
                               </div>
                           )}
                      </div>
                  )}

                  {confirmAnim.step === 'complete' && (
                      <div className="animate-stamp">
                          <CheckCircleIcon className={`h-24 w-24 mx-auto mb-4 ${confirmAnim.type === 'reventado' ? 'text-yellow-400' : 'text-brand-success'}`}/>
                          <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                              {confirmAnim.type === 'reventado' ? 'ANOMALY REGISTERED' : 'BLOCK CONFIRMED'}
                          </h2>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- MAIN NAVIGATION --- */}
      <nav className="flex justify-center mb-8">
          <div className="bg-brand-secondary/80 backdrop-blur-md p-1.5 rounded-2xl border border-brand-border inline-flex gap-2 shadow-2xl">
              <button onClick={() => setActiveTab('draws')} className={`px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${activeTab === 'draws' ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'text-brand-text-secondary hover:text-white hover:bg-white/5'}`}>
                  <BoltIcon className="h-4 w-4" /> Sorteos
              </button>
              <button onClick={() => setActiveTab('reports')} className={`px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'text-brand-text-secondary hover:text-white hover:bg-white/5'}`}>
                  <ClockIcon className="h-4 w-4" /> Máquina del Tiempo
              </button>
              <button onClick={() => setActiveTab('finance')} className={`px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${activeTab === 'finance' ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'text-brand-text-secondary hover:text-white hover:bg-white/5'}`}>
                  <CreditCardIcon className="h-4 w-4" /> Finanzas Reales
              </button>
          </div>
      </nav>

      {/* ================= DRAWS TAB (LIVE MANAGEMENT) ================= */}
      {activeTab === 'draws' && (
          <div className="max-w-5xl mx-auto">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {(['mediodia', 'tarde', 'noche'] as DrawType[]).map(draw => {
                     const result = dailyResults.find(r => r.draw === draw) || { number: null, ballColor: null, reventadosNumber: null };
                     const hasResult = result.number !== null;
                     
                     return (
                        <div key={draw} className="relative group">
                            {/* Card Glow */}
                            <div className={`absolute -inset-0.5 rounded-2xl blur opacity-30 transition duration-500 group-hover:opacity-75 ${hasResult ? 'bg-brand-success' : 'bg-brand-accent'}`}></div>
                            
                            <Card className="relative h-full flex flex-col justify-between border-brand-border/50 bg-brand-secondary/90">
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-3 rounded-xl ${draw === 'mediodia' ? 'bg-orange-500/20 text-orange-400' : draw === 'tarde' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {draw === 'mediodia' ? <SunIcon className="h-6 w-6"/> : draw === 'tarde' ? <SunsetIcon className="h-6 w-6"/> : <MoonIcon className="h-6 w-6"/>}
                                        </div>
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${hasResult ? 'bg-brand-success/10 text-brand-success border-brand-success/30' : 'bg-brand-tertiary text-brand-text-secondary border-brand-border'}`}>
                                            {hasResult ? 'FINALIZADO' : 'PENDIENTE'}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-1">{DRAW_LABELS[draw]}</h3>
                                    <p className="text-xs text-brand-text-secondary mb-6">Gestión de Sorteo Diario</p>
                                    
                                    <div className="flex items-center justify-center py-4">
                                        {hasResult ? (
                                            <div className="text-center">
                                                <div className="text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{result.number}</div>
                                                <div className="flex items-center justify-center gap-2 mt-2">
                                                    <span className={`w-3 h-3 rounded-full ${result.ballColor === 'roja' ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-gray-300'}`}></span>
                                                    <span className="text-[10px] font-bold text-brand-text-secondary uppercase">{result.ballColor}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <div className="w-16 h-1 h-px bg-brand-border mx-auto mb-2"></div>
                                                <span className="text-xs font-mono text-brand-text-secondary animate-pulse">ESPERANDO DATOS...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Button 
                                    onClick={() => openDrawManager(draw, result as DailyResult)}
                                    className="w-full mt-4 group-hover:scale-[1.02] transition-transform shadow-lg"
                                >
                                    GESTIONAR
                                </Button>
                            </Card>
                        </div>
                     );
                 })}
             </div>

             {/* --- CONTROL CONSOLE MODAL (MANAGE MODE) --- */}
             {confirmAnim.isActive && confirmAnim.step === 'input' && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                     <div className="absolute inset-0 bg-brand-primary/90 backdrop-blur-md" onClick={() => setConfirmAnim(prev => ({...prev, isActive: false}))}></div>
                     <Card className="relative w-full max-w-md bg-brand-secondary border border-brand-accent/50 shadow-[0_0_100px_rgba(79,70,229,0.3)] overflow-hidden">
                         
                         {/* Holographic Header */}
                         <div className="relative p-6 border-b border-brand-border/50 bg-gradient-to-r from-brand-secondary to-brand-tertiary">
                             <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30">
                                 <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
                             </div>
                             <h2 className="text-2xl font-black text-white uppercase flex items-center gap-2 relative z-10">
                                 <CpuIcon className="h-6 w-6 text-brand-accent"/>
                                 Consola de Control
                             </h2>
                             <p className="text-xs text-brand-accent font-mono relative z-10">
                                 {DRAW_LABELS[confirmAnim.drawType!]} :: SYSTEM_READY
                             </p>
                             <button onClick={() => setConfirmAnim(prev => ({...prev, isActive: false}))} className="absolute top-6 right-6 text-brand-text-secondary hover:text-white">✕</button>
                         </div>

                         <div className="p-8 space-y-8">
                             {/* NUMBER INPUT */}
                             <div className="space-y-2">
                                 <label className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider">Número Ganador</label>
                                 <input 
                                     type="number" 
                                     value={drawNumber}
                                     onChange={(e) => setDrawNumber(e.target.value.slice(0, 2))}
                                     className="w-full bg-brand-primary/50 border-2 border-brand-border rounded-xl text-center text-6xl font-black text-white py-4 focus:border-brand-accent focus:shadow-[0_0_30px_rgba(79,70,229,0.3)] focus:outline-none transition-all duration-300 font-mono"
                                     placeholder="00"
                                 />
                             </div>

                             {/* BALL SELECTOR - TOGGLE */}
                             <div className="bg-brand-tertiary/30 p-4 rounded-xl border border-brand-border">
                                 <div className="flex justify-between items-center mb-4">
                                     <span className="text-xs font-bold text-brand-text-secondary uppercase">Color de Bolita</span>
                                     <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${drawBall === 'roja' ? 'bg-red-500 text-white shadow-[0_0_10px_red]' : 'bg-gray-600 text-gray-300'}`}>
                                         {drawBall}
                                     </span>
                                 </div>
                                 <div className="flex gap-4">
                                     <button 
                                        onClick={() => setDrawBall('blanca')}
                                        className={`flex-1 py-3 rounded-lg border-2 transition-all font-bold text-xs uppercase ${drawBall === 'blanca' ? 'bg-white text-brand-primary border-white shadow-[0_0_15px_white]' : 'bg-transparent border-brand-border text-brand-text-secondary hover:border-white/50'}`}
                                     >
                                         Blanca
                                     </button>
                                     <button 
                                        onClick={() => setDrawBall('roja')}
                                        className={`flex-1 py-3 rounded-lg border-2 transition-all font-bold text-xs uppercase ${drawBall === 'roja' ? 'bg-red-600 text-white border-red-500 shadow-[0_0_15px_red]' : 'bg-transparent border-brand-border text-brand-text-secondary hover:border-red-500/50'}`}
                                     >
                                         Roja
                                     </button>
                                 </div>
                             </div>

                             {/* REVENTADO INPUT - SLIDE REVEAL */}
                             <div className={`overflow-hidden transition-all duration-500 ease-in-out ${drawBall === 'roja' ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                                 <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl mt-2 animate-shake-hard">
                                     <div className="flex items-center gap-2 mb-2 text-red-400">
                                         <FireIcon className="h-4 w-4"/>
                                         <span className="text-xs font-bold uppercase">Número Reventado</span>
                                     </div>
                                     <input 
                                         type="number" 
                                         value={drawRevNumber}
                                         onChange={(e) => setDrawRevNumber(e.target.value.slice(0, 2))}
                                         className="w-full bg-brand-primary/80 border border-red-500/50 rounded-lg text-center text-2xl font-black text-red-100 py-2 focus:border-red-500 focus:shadow-[0_0_15px_red] focus:outline-none font-mono"
                                         placeholder="--"
                                     />
                                 </div>
                             </div>

                             <Button 
                                onClick={handleConfirmDraw}
                                disabled={!drawNumber}
                                className={`w-full py-4 text-sm font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.02] ${drawBall === 'roja' ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500' : 'bg-gradient-to-r from-brand-accent to-cyan-600 hover:from-brand-accent-hover hover:to-cyan-500'}`}
                             >
                                 {drawBall === 'roja' ? '⚠️ CONFIRMAR EVENTO CRÍTICO' : 'CONFIRMAR RESULTADO'}
                             </Button>
                         </div>
                     </Card>
                 </div>
             )}
          </div>
      )}

      {/* ================= REPORTS / TIME MACHINE TAB ================= */}
      {activeTab === 'reports' && (
          <div className="max-w-4xl mx-auto space-y-8">
              <Card className="relative overflow-hidden border-brand-accent/30">
                  {/* Time Machine Header Effect */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-shimmer"></div>
                  
                  <div className="flex items-center gap-4 mb-8">
                      <div className="bg-brand-tertiary p-3 rounded-2xl border border-brand-border shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                          <ClockIcon className="h-8 w-8 text-cyan-400 animate-spin-slow"/>
                      </div>
                      <div>
                          <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                              Máquina del Tiempo <span className="text-xs align-top bg-cyan-500/20 text-cyan-400 px-1.5 rounded border border-cyan-500/50">v2.0</span>
                          </h2>
                          <p className="text-brand-text-secondary text-sm">Modificación de registros históricos y líneas temporales.</p>
                      </div>
                  </div>

                  {/* DATE PICKER WITH WARP EFFECT */}
                  <div className="mb-8 relative group">
                      <label className="block text-xs font-bold text-cyan-500 uppercase mb-2 tracking-wider">Fecha de Incursión</label>
                      <div className="relative">
                          <input 
                              type="date" 
                              value={historyDate}
                              onChange={handleDateChange}
                              className="w-full bg-brand-primary/80 border-2 border-cyan-900/50 text-white text-xl p-4 rounded-xl focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.4)] focus:outline-none transition-all font-mono uppercase z-10 relative"
                          />
                          <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-600 h-6 w-6 pointer-events-none z-20"/>
                      </div>
                  </div>

                  {/* TEMPORAL FLUX CONTAINER */}
                  <div className={`transition-all duration-500 ${isTimeTraveling ? 'animate-temporal-flux opacity-50 blur-sm' : 'opacity-100 blur-0'}`}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {(['mediodia', 'tarde', 'noche'] as DrawType[]).map(draw => (
                              <div key={draw} className="bg-brand-tertiary/30 border border-brand-border p-4 rounded-xl hover:border-brand-accent/50 transition-colors group">
                                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-brand-border/50">
                                      {draw === 'mediodia' ? <SunIcon className="h-4 w-4 text-orange-400"/> : draw === 'tarde' ? <SunsetIcon className="h-4 w-4 text-purple-400"/> : <MoonIcon className="h-4 w-4 text-blue-400"/>}
                                      <span className="font-bold text-white uppercase text-sm">{DRAW_LABELS[draw]}</span>
                                  </div>

                                  <div className="space-y-4">
                                      <div>
                                          <label className="text-[10px] text-brand-text-secondary uppercase font-bold">Número</label>
                                          <input 
                                              type="number" 
                                              value={timeMachineState[draw].number}
                                              onChange={(e) => setTimeMachineState(prev => ({...prev, [draw]: {...prev[draw], number: e.target.value.slice(0, 2)}}))}
                                              className="w-full bg-brand-primary border border-brand-border rounded-lg p-2 text-center font-mono font-bold text-white focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
                                              placeholder="--"
                                          />
                                      </div>
                                      
                                      <div className="flex items-center justify-between bg-brand-primary/50 p-2 rounded-lg border border-brand-border">
                                          <label className="text-[10px] text-brand-text-secondary uppercase font-bold">Bolita Roja</label>
                                          <input 
                                              type="checkbox" 
                                              checked={timeMachineState[draw].ball === 'roja'}
                                              onChange={(e) => setTimeMachineState(prev => ({...prev, [draw]: {...prev[draw], ball: e.target.checked ? 'roja' : 'blanca'}}))}
                                              className="w-5 h-5 accent-red-500 cursor-pointer"
                                          />
                                      </div>

                                      <div className={`transition-all duration-300 overflow-hidden ${timeMachineState[draw].ball === 'roja' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                           <label className="text-[10px] text-red-400 uppercase font-bold">Reventado</label>
                                           <input 
                                              type="number" 
                                              value={timeMachineState[draw].reventados}
                                              onChange={(e) => setTimeMachineState(prev => ({...prev, [draw]: {...prev[draw], reventados: e.target.value.slice(0, 2)}}))}
                                              className="w-full bg-red-900/10 border border-red-500/30 rounded-lg p-2 text-center font-mono font-bold text-red-100 focus:border-red-500 outline-none"
                                              placeholder="--"
                                          />
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>

                      {/* TEMPORAL STABILIZATION BUTTON */}
                      <div className="mt-8">
                          <button 
                            onClick={handleTimelineStabilize}
                            disabled={stabilizationState !== 'idle'}
                            className={`
                                w-full relative overflow-hidden py-5 rounded-xl font-black uppercase tracking-[0.2em] text-sm transition-all duration-300
                                ${stabilizationState === 'idle' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] text-white scale-100' : ''}
                                ${stabilizationState === 'stabilizing' ? 'bg-brand-tertiary text-cyan-400 border border-cyan-500/50 cursor-wait' : ''}
                                ${stabilizationState === 'complete' ? 'bg-green-500 text-white cursor-default' : ''}
                            `}
                          >
                              {/* Internal Progress Bar for Stabilizing */}
                              {stabilizationState === 'stabilizing' && (
                                  <div className="absolute inset-0 bg-cyan-900/30">
                                      <div className="h-full bg-cyan-500/20 w-full animate-progress-indeterminate"></div>
                                  </div>
                              )}
                              
                              <span className="relative z-10 flex items-center justify-center gap-3">
                                  {stabilizationState === 'idle' && <><SparklesIcon className="h-5 w-5"/> CONFIRMAR LÍNEA TEMPORAL</>}
                                  {stabilizationState === 'stabilizing' && <><RefreshIcon className="h-5 w-5 animate-spin"/> REESCRIBIENDO REALIDAD...</>}
                                  {stabilizationState === 'complete' && <><CheckCircleIcon className="h-5 w-5"/> LÍNEA ESTABILIZADA</>}
                              </span>
                          </button>
                      </div>
                  </div>
              </Card>
          </div>
      )}

      {/* ================= QUANTUM LEDGER FINANCE SYSTEM ================= */}
      {activeTab === 'finance' && (
          <div className="space-y-8 animate-fade-in-up">
              
              {/* WEEKLY NAVIGATOR (TIME TRAVEL) */}
              <div className="flex justify-center items-center">
                  <div className="bg-brand-secondary border border-brand-border rounded-full p-1 flex items-center gap-4 shadow-2xl">
                      <button onClick={() => handleWeekNav('prev')} className="p-2 rounded-full hover:bg-white/10 text-brand-text-secondary hover:text-white transition-colors">
                          <ChevronLeftIcon className="h-5 w-5"/>
                      </button>
                      
                      <div className="flex flex-col items-center px-4">
                          <div className="flex items-center gap-2 text-brand-accent font-bold uppercase tracking-widest text-xs">
                              <CalendarDaysIcon className="h-4 w-4"/>
                              {selectedWeekStats.label}
                          </div>
                          <div className="text-[10px] font-mono text-brand-text-secondary flex items-center gap-2">
                              {weeklyData.currentKey === selectedWeekKey ? (
                                  <span className="flex items-center gap-1 text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> LIVE FEED</span>
                              ) : (
                                  <span className="text-brand-text-secondary opacity-70">HISTORICAL RECORD</span>
                              )}
                          </div>
                      </div>

                      <button onClick={() => handleWeekNav('next')} className="p-2 rounded-full hover:bg-white/10 text-brand-text-secondary hover:text-white transition-colors" disabled={weeklyData.currentKey === selectedWeekKey}>
                          <ChevronRightIcon className="h-5 w-5"/>
                      </button>
                  </div>
                  {weeklyData.currentKey !== selectedWeekKey && (
                      <button onClick={handleJumpToCurrent} className="ml-4 text-[10px] font-bold uppercase text-brand-accent hover:text-white border border-brand-accent/30 hover:border-brand-accent rounded-full px-3 py-1 transition-all">
                          Volver a Hoy
                      </button>
                  )}
              </div>

              {/* 1. REAL CASH FLOW HUD (Total Overhaul) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: NET PROFIT (REAL CASH ON HAND) */}
                  <div className="relative bg-brand-secondary border-2 border-brand-gold rounded-2xl p-8 overflow-hidden shadow-[0_0_30px_rgba(234,179,8,0.1)] group">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                      <div className="relative z-10 text-center">
                          <div className="flex items-center justify-center gap-2 mb-4">
                               <h4 className="text-sm font-black text-brand-gold uppercase tracking-widest">GANANCIAS (NETO)</h4>
                          </div>
                          <div className={`text-4xl md:text-5xl font-black font-mono tracking-tighter ${selectedWeekStats.net >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                              {selectedWeekStats.net >= 0 ? '+' : ''}{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.net)}
                          </div>
                          <p className="text-xs text-brand-text-secondary mt-2 opacity-70 font-mono uppercase">
                              {weeklyData.currentKey === selectedWeekKey ? '(ACUMULADO SEMANA ACTUAL)' : '(CIERRE DE SEMANA)'}
                          </p>
                      </div>
                  </div>

                   {/* Card 2: CASH IN (DEPOSITS) */}
                   <div className="relative bg-brand-secondary border border-brand-border rounded-2xl p-6 overflow-hidden group hover:border-brand-success/50 transition-all duration-500">
                      <div className="relative z-10 flex justify-between items-end h-full">
                          <div>
                              <div className="flex items-center gap-2 mb-2">
                                   <ArrowTrendingUpIcon className="h-4 w-4 text-brand-success"/>
                                   <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest">Entradas Reales</h4>
                              </div>
                              <div className="text-3xl font-black text-white font-mono tracking-tight">
                                  {new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.cashIn)}
                              </div>
                              <div className="text-[10px] text-brand-success font-bold mt-1 flex items-center gap-1">
                                  <WalletIcon className="h-3 w-3"/> Dinero Recibido (Recargas)
                              </div>
                          </div>
                      </div>
                  </div>

                   {/* Card 3: CASH OUT (WITHDRAWALS) */}
                   <div className="relative bg-brand-secondary border border-brand-border rounded-2xl p-6 overflow-hidden group hover:border-brand-danger/50 transition-all duration-500">
                      <div className="relative z-10 flex justify-between items-end h-full">
                          <div>
                              <div className="flex items-center gap-2 mb-2">
                                   <ArrowTrendingDownIcon className="h-4 w-4 text-brand-danger"/>
                                   <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest">Salidas Reales</h4>
                              </div>
                              <div className="text-3xl font-black text-white font-mono tracking-tight">
                                  {new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.cashOut)}
                              </div>
                              <div className="text-[10px] text-brand-danger font-bold mt-1 flex items-center gap-1">
                                  <CreditCardIcon className="h-3 w-3"/> Dinero Pagado (Retiros)
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* NEW: PROFITABILITY STRIP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-brand-secondary/50 border border-brand-border p-4 rounded-xl flex items-center justify-between border-l-4 border-l-brand-gold">
                    <div>
                       <h4 className="text-[10px] font-black uppercase text-brand-text-secondary tracking-wider mb-1">Balance Semanal</h4>
                       <p className="text-xs font-mono text-white">
                         <span className="text-brand-success">ENTRADAS</span> - <span className="text-brand-danger">SALIDAS</span> = <span className="text-brand-gold">NETO</span>
                       </p>
                    </div>
                    <div className="text-right">
                       <div className="text-xl font-black text-white font-mono">{selectedWeekStats.profitMargin}%</div>
                       <div className="text-[9px] text-brand-text-secondary uppercase">Margen de Retorno</div>
                    </div>
                 </div>
                 <div className="bg-brand-secondary/50 border border-brand-border p-4 rounded-xl flex items-center justify-between border-l-4 border-l-brand-success">
                    <div>
                       <h4 className="text-[10px] font-black uppercase text-brand-text-secondary tracking-wider mb-1">Estado del Sistema</h4>
                       <p className="text-xs font-mono text-white flex items-center gap-2">
                          <CheckCircleIcon className="h-3 w-3 text-brand-success"/> {weeklyData.currentKey === selectedWeekKey ? 'REGISTRO ABIERTO' : 'REGISTRO CERRADO'}
                       </p>
                    </div>
                    <div className="text-right">
                       <div className={`text-xl font-black font-mono uppercase ${selectedWeekStats.net >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                           {selectedWeekStats.net >= 0 ? 'SUPERÁVIT' : 'DÉFICIT'}
                       </div>
                       <div className="text-[9px] text-brand-text-secondary uppercase">Salud Financiera</div>
                    </div>
                 </div>
              </div>

              {/* 2. FLUX CHART (Net Flow Visualizer) */}
              <div className="relative bg-brand-secondary/30 border border-brand-border rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <CpuIcon className="h-4 w-4 text-cyan-400"/> Flujo Diario (Semana Seleccionada)
                      </h3>
                  </div>
                  
                  <div className="w-full h-48 relative group">
                      <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                          <line x1="0" y1="25" x2="100" y2="25" stroke="#ffffff10" strokeWidth="0.2" strokeDasharray="2" />
                          
                          <defs>
                              <linearGradient id="fluxGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                              </linearGradient>
                          </defs>
                          <path 
                              d={`${generateSmoothPath(selectedWeekStats.chartData, 100, 50)} L 100,50 L 0,50 Z`} 
                              fill="url(#fluxGradient)" 
                              className="opacity-50 transition-all duration-1000"
                          />
                          <path 
                              d={generateSmoothPath(selectedWeekStats.chartData, 100, 50)} 
                              fill="none" 
                              stroke="#06b6d4" 
                              strokeWidth="0.8" 
                              className="drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]"
                              strokeLinecap="round"
                          />
                      </svg>
                      
                      <div className="absolute bottom-0 w-full flex justify-between px-1">
                          {selectedWeekStats.chartLabels.map((label, i) => (
                              <span key={i} className="text-[8px] text-brand-text-secondary font-mono">{label}</span>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* 3. USER DIRECTORY (Simplified for Quick Actions) */}
                  <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              <IdentificationIcon className="h-5 w-5 text-brand-accent"/> Directorio de Activos
                          </h3>
                          <div className="relative">
                              <input 
                                  type="text" 
                                  placeholder="BUSCAR CLIENTE..." 
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="bg-brand-primary border border-brand-border rounded-lg py-2 px-4 text-xs text-white focus:border-brand-accent outline-none w-48 transition-all focus:w-64 font-mono"
                              />
                          </div>
                      </div>

                      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                          {filteredUsers.map(user => (
                              <div 
                                key={user.id} 
                                className={`
                                    relative overflow-hidden rounded-xl border transition-all duration-300
                                    ${expandedUserId === user.id ? 'border-brand-accent bg-brand-secondary' : 'border-brand-border bg-brand-secondary/50 hover:bg-brand-secondary'}
                                `}
                              >
                                  <div 
                                    onClick={() => handleToggleUserCard(user.id)}
                                    className="p-4 flex items-center justify-between cursor-pointer group"
                                  >
                                      <div className="flex items-center gap-4">
                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm ${expandedUserId === user.id ? 'bg-brand-accent text-white' : 'bg-brand-primary text-brand-text-secondary'}`}>
                                              {user.name.charAt(0)}
                                          </div>
                                          <div>
                                              <div className="font-bold text-white text-sm">{user.name}</div>
                                              <div className="text-[10px] text-brand-text-secondary font-mono">{user.cedula || 'ID NO REGISTRADO'}</div>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-[10px] text-brand-text-secondary uppercase tracking-wider">Saldo Actual</div>
                                          <div className="font-mono font-bold text-white">
                                              {new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(user.balance)}
                                          </div>
                                      </div>
                                  </div>

                                  {/* Expanded Actions */}
                                  <div className={`transition-[max-height] duration-300 ease-out overflow-hidden ${expandedUserId === user.id ? 'max-h-[400px]' : 'max-h-0'}`}>
                                      <div className="p-4 border-t border-brand-border bg-black/20">
                                          <div className="bg-brand-primary rounded-xl p-4 border border-brand-border">
                                              <form onSubmit={(e) => handleSubmitFinance(e, user)}>
                                                  <div className="flex gap-2 mb-3">
                                                      <button 
                                                        type="button"
                                                        onClick={() => setTransactionMode('deposit')}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${transactionMode === 'deposit' ? 'bg-brand-success text-white' : 'bg-brand-secondary text-brand-text-secondary border border-brand-border'}`}
                                                      >
                                                          Recarga (Entrada)
                                                      </button>
                                                      <button 
                                                        type="button"
                                                        onClick={() => setTransactionMode('withdraw')}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${transactionMode === 'withdraw' ? 'bg-brand-danger text-white' : 'bg-brand-secondary text-brand-text-secondary border border-brand-border'}`}
                                                      >
                                                          Retiro (Salida)
                                                      </button>
                                                  </div>
                                                  
                                                  <div className="flex gap-2">
                                                      <div className="relative flex-1">
                                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary font-bold">₡</span>
                                                          <input 
                                                              type="text" 
                                                              value={amountInput}
                                                              onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9]/g, ''))}
                                                              placeholder="Monto..."
                                                              className="w-full bg-brand-secondary border border-brand-border rounded-lg py-2 pl-8 pr-4 text-white font-mono focus:border-brand-accent outline-none"
                                                          />
                                                      </div>
                                                      <button 
                                                        type="submit" 
                                                        className={`px-6 rounded-lg font-bold text-white transition-transform active:scale-95 ${transactionMode === 'deposit' ? 'bg-brand-success' : 'bg-brand-danger'}`}
                                                      >
                                                          <BoltIcon className="h-5 w-5"/>
                                                      </button>
                                                  </div>
                                              </form>
                                              
                                              <div className="mt-4 flex justify-between items-center pt-3 border-t border-brand-border/50">
                                                  <span className="text-[10px] text-brand-text-secondary">Acciones de cuenta:</span>
                                                  <button 
                                                    onClick={(e) => { e.stopPropagation(); initiatePasswordReset(user); }}
                                                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                                  >
                                                      <LockIcon className="h-3 w-3"/> Reset Clave
                                                  </button>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                          <button 
                            onClick={() => setShowRegisterModal(true)}
                            className="w-full py-3 rounded-xl border border-dashed border-brand-border text-brand-text-secondary hover:text-brand-accent hover:border-brand-accent hover:bg-brand-accent/5 transition-all text-xs font-bold uppercase flex items-center justify-center gap-2"
                          >
                              <UserPlusIcon className="h-4 w-4"/> Nuevo Cliente
                          </button>
                      </div>
                  </div>

                  {/* 4. INFINITE SCROLL LEDGER (Professional Stream - WEEKLY FILTERED) */}
                  <div className="bg-black border border-brand-border rounded-2xl overflow-hidden flex flex-col h-[650px] shadow-2xl">
                      {/* Terminal Header */}
                      <div className="bg-brand-secondary p-3 border-b border-brand-border flex justify-between items-center">
                          <div className="flex items-center gap-2">
                              <ClipboardCheckIcon className="h-4 w-4 text-brand-gold"/>
                              <span className="text-xs font-bold text-white uppercase tracking-wider">Transacciones ({selectedWeekStats.label})</span>
                          </div>
                          <div className="flex items-center gap-2">
                              {weeklyData.currentKey === selectedWeekKey ? (
                                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                              ) : (
                                  <div className="h-1.5 w-1.5 rounded-full bg-brand-text-secondary"></div>
                              )}
                              <span className="text-[10px] text-brand-text-secondary font-mono">
                                  {weeklyData.currentKey === selectedWeekKey ? 'LIVE' : 'HISTORY'}
                              </span>
                          </div>
                      </div>
                      
                      {/* The Stream Container */}
                      <div className="flex-1 overflow-y-auto bg-brand-primary/80 p-0 custom-scrollbar scroll-smooth relative">
                          {selectedWeekStats.txs.length > 0 ? (
                              <div className="flex flex-col divide-y divide-brand-border/30">
                                  {selectedWeekStats.txs.map((tx, idx) => (
                                      <div key={tx.id} className="p-3 hover:bg-brand-secondary/50 transition-colors group flex items-center justify-between animate-fade-in-up">
                                          <div className="flex items-center gap-3">
                                              <div className={`w-1 h-10 rounded-full ${
                                                  tx.type === 'deposit' ? 'bg-brand-success' : 
                                                  tx.type === 'withdraw' ? 'bg-brand-danger' : 
                                                  'bg-brand-accent'
                                              }`}></div>
                                              <div>
                                                  <div className="flex items-center gap-2">
                                                      <span className={`text-[10px] font-black uppercase px-1.5 rounded-sm ${
                                                          tx.type === 'deposit' ? 'bg-green-900/30 text-brand-success' : 
                                                          tx.type === 'withdraw' ? 'bg-red-900/30 text-brand-danger' : 
                                                          'bg-indigo-900/30 text-brand-accent'
                                                      }`}>
                                                          {tx.type === 'deposit' ? 'IN' : tx.type === 'withdraw' ? 'OUT' : 'INT'}
                                                      </span>
                                                      <span className="text-xs text-white font-bold font-mono">{tx.userName}</span>
                                                  </div>
                                                  <div className="text-[9px] text-brand-text-secondary font-mono mt-0.5">
                                                      {new Date(tx.date).toLocaleString()} • ID: {tx.id.split('_')[1]}
                                                  </div>
                                              </div>
                                          </div>
                                          
                                          <div className="text-right">
                                              <div className={`font-mono font-bold text-sm ${
                                                  tx.type === 'deposit' ? 'text-brand-success' : 
                                                  tx.type === 'withdraw' ? 'text-brand-danger' : 
                                                  'text-brand-text-secondary'
                                              }`}>
                                                  {tx.type === 'withdraw' ? '-' : '+'}{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(tx.amount)}
                                              </div>
                                              <div className="text-[8px] text-brand-text-secondary uppercase opacity-60">
                                                  {tx.type === 'purchase' ? 'Volumen' : 'Efectivo'}
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center opacity-30">
                                  <GlobeAltIcon className="h-12 w-12 text-brand-text-secondary mb-4 animate-pulse"/>
                                  <p className="text-xs font-mono text-brand-text-secondary">NO RECORDS FOUND FOR THIS WEEK</p>
                              </div>
                          )}
                      </div>
                      
                      {/* Terminal Footer */}
                      <div className="bg-brand-secondary p-2 border-t border-brand-border text-[9px] text-brand-text-secondary font-mono flex justify-between">
                          <span>RECORDS: {selectedWeekStats.txs.length}</span>
                          <span>WEEK_ID: {selectedWeekKey}</span>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- REGISTER MODAL --- */}
      {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-brand-primary/90 backdrop-blur-sm" onClick={() => setShowRegisterModal(false)}></div>
              <Card className="relative w-full max-w-md bg-brand-secondary border border-brand-border">
                  <h3 className="text-xl font-bold text-white mb-6">Nuevo Cliente</h3>
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                      <Input placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                      <Input placeholder="Cédula" value={newUser.cedula} onChange={e => setNewUser({...newUser, cedula: e.target.value})} required />
                      <Input placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                      <Input placeholder="Teléfono" type="tel" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} required />
                      <div className="flex gap-3 mt-6">
                          <Button type="button" variant="ghost" onClick={() => setShowRegisterModal(false)} className="flex-1">Cancelar</Button>
                          <Button type="submit" className="flex-1">Registrar</Button>
                      </div>
                  </form>
              </Card>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
