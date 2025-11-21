
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
    CalendarDaysIcon,
    XCircleIcon,
    KeyIcon
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

// --- ANIMATION STATE INTERFACES ---
interface DrawConfirmationState {
    isActive: boolean;
    type: 'normal' | 'reventado' | null;
    step: 'input' | 'processing' | 'confirming' | 'complete';
    drawType: DrawType | null;
    logs: string[];
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

// --- HELPER: TICKER COMPONENT ---
const FinancialTicker = ({ transactions }: { transactions: Transaction[] }) => {
    const recent = transactions.slice(0, 15);
    if (recent.length === 0) return null;

    return (
        <div className="w-full bg-[#020617] border-y border-cyan-900/30 overflow-hidden relative h-10 flex items-center mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.05)]">
            <div className="absolute left-0 z-10 bg-gradient-to-r from-brand-primary to-transparent h-full w-24"></div>
            <div className="absolute right-0 z-10 bg-gradient-to-l from-brand-primary to-transparent h-full w-24"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-5 pointer-events-none"></div>
            
            <div className="flex animate-marquee whitespace-nowrap gap-12 items-center pl-4">
                {recent.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 text-[10px] font-mono tracking-widest group cursor-default">
                        <span className={`w-2 h-2 rounded-full ${tx.type === 'deposit' || tx.type === 'winnings' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'} group-hover:animate-ping`}></span>
                        <span className="text-cyan-200 font-bold uppercase opacity-70">{tx.userName.split(' ')[0]}</span>
                        <span className={tx.type === 'deposit' || tx.type === 'winnings' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                            {tx.type === 'withdraw' ? '-' : '+'}{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(tx.amount)}
                        </span>
                        <span className="text-cyan-900 opacity-30">///</span>
                    </div>
                ))}
                 {/* Duplicate for seamless loop */}
                 {recent.map((tx) => (
                    <div key={`dup-${tx.id}`} className="flex items-center gap-3 text-[10px] font-mono tracking-widest group cursor-default">
                        <span className={`w-2 h-2 rounded-full ${tx.type === 'deposit' || tx.type === 'winnings' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'} group-hover:animate-ping`}></span>
                        <span className="text-cyan-200 font-bold uppercase opacity-70">{tx.userName.split(' ')[0]}</span>
                        <span className={tx.type === 'deposit' || tx.type === 'winnings' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                            {tx.type === 'withdraw' ? '-' : '+'}{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(tx.amount)}
                        </span>
                        <span className="text-cyan-900 opacity-30">///</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- HELPER: MINI CHART ---
const WeeklySparkline = ({ transactions, currentKey }: { transactions: Transaction[], currentKey: string }) => {
    // Calculate daily net
    const dailyNet = new Array(7).fill(0);
    const days = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    
    transactions.forEach(tx => {
        const day = new Date(tx.date).getDay(); // 0 = Sun, 6 = Sat
        if (tx.type === 'deposit') dailyNet[day] += tx.amount;
        if (tx.type === 'withdraw') dailyNet[day] -= tx.amount;
    });

    const maxVal = Math.max(...dailyNet.map(Math.abs), 1000);
    const normalize = (val: number) => 50 - (val / maxVal) * 40; // Center at 50
    
    const points = dailyNet.map((val, i) => `${i * 16.6},${normalize(val)}`).join(' ');

    return (
        <div className="w-full h-32 relative mt-6">
            <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none"></div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                {/* Grid Lines */}
                <line x1="0" y1="10" x2="100" y2="10" stroke="#1e293b" strokeWidth="0.2" />
                <line x1="0" y1="90" x2="100" y2="90" stroke="#1e293b" strokeWidth="0.2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#06b6d4" strokeWidth="0.2" strokeDasharray="2 2" className="opacity-50" />
                
                {/* The Line */}
                <polyline 
                    points={points} 
                    fill="none" 
                    stroke="url(#neonGradient)" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                />
                <defs>
                    <linearGradient id="neonGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="50%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                </defs>

                {/* Data Points */}
                {dailyNet.map((val, i) => (
                    <g key={i} className="group hover:scale-110 transition-transform origin-center">
                        <circle cx={i * 16.6} cy={normalize(val)} r="1.5" className={`transition-all duration-300 ${val >= 0 ? 'fill-green-400 group-hover:fill-green-300' : 'fill-red-500 group-hover:fill-red-400'}`} />
                        <line x1={i*16.6} y1={normalize(val)} x2={i*16.6} y2="100" stroke={val >=0 ? '#4ade80' : '#f87171'} strokeWidth="0.2" className="opacity-0 group-hover:opacity-50 transition-opacity" />
                        <text x={i * 16.6} y="115" fontSize="6" fill="#64748b" textAnchor="middle" fontFamily="monospace">{days[i]}</text>
                        {/* Tooltip Value */}
                        <text x={i * 16.6} y={normalize(val) - 5} fontSize="5" fill="white" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity font-mono bg-black">
                            {new Intl.NumberFormat('en-US', {notation: "compact", compactDisplay: "short"}).format(val)}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
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
  const [activeTab, setActiveTab] = useState<TabView>('draws'); 
  
  // Finance State
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null); 
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
      drawType: null,
      logs: []
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

  const DRAW_TIMES: Record<DrawType, string> = {
    mediodia: '12:55 PM',
    tarde: '4:30 PM',
    noche: '7:30 PM'
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
          // Winnings are internal balance transfers in this simple model, 
          // but could be tracked as liability if needed.
          
          grouped[key].txs.push(tx);
      });

      if (!grouped[currentKey]) {
          grouped[currentKey] = {
              cashIn: 0, cashOut: 0, net: 0, txs: [],
              label: `Semana ${currentWeek.week} - ${currentWeek.year}`,
              isCurrent: true
          };
      }

      Object.keys(grouped).forEach(key => {
          grouped[key].net = grouped[key].cashIn - grouped[key].cashOut;
          grouped[key].txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });

      const sortedKeys = Object.keys(grouped).sort((a, b) => {
          const [yA, wA] = a.split('-W').map(Number);
          const [yB, wB] = b.split('-W').map(Number);
          return yB === yA ? wB - wA : yB - yA;
      }).slice(0, 52);

      return { grouped, sortedKeys, currentKey };
  }, [transactions]);

  // --- FINANCE STATS FOR SELECTED WEEK ---
  const selectedWeekStats = useMemo(() => {
      const data = weeklyData.grouped[selectedWeekKey];
      if (!data) {
          return { 
              cashIn: 0, cashOut: 0, net: 0, txs: [], 
              label: 'Semana No Encontrada', profitMargin: "0.0",
              chartData: [], chartLabels: []
          };
      }

      const profitMargin = data.cashIn > 0 
          ? ((data.net / data.cashIn) * 100).toFixed(1) 
          : "0.0";

      return { 
          cashIn: data.cashIn, cashOut: data.cashOut, net: data.net, txs: data.txs,
          label: data.label, profitMargin
      };
  }, [weeklyData, selectedWeekKey]);

  // --- NAVIGATION HANDLERS ---
  const handleWeekNav = (direction: 'prev' | 'next') => {
      const currentIndex = weeklyData.sortedKeys.indexOf(selectedWeekKey);
      if (currentIndex === -1) return;

      let newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= weeklyData.sortedKeys.length) newIndex = weeklyData.sortedKeys.length - 1;

      setSelectedWeekKey(weeklyData.sortedKeys[newIndex]);
  };

  const handleJumpToCurrent = () => {
      setSelectedWeekKey(weeklyData.currentKey);
  }

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

  const handleToggleUserCard = (userId: string) => {
      setExpandedUserId(prev => prev === userId ? null : userId);
      setAmountInput('');
  };

  const handleSubmitFinance = (e: React.FormEvent, user: User) => {
    e.preventDefault();
    if (!amountInput) return;
    const amount = parseInt(amountInput);
    if (isNaN(amount) || amount <= 0) return;

    if (transactionMode === 'withdraw' && user.balance < amount) {
        setActionModal({ isOpen: true, type: 'error', amount, details: 'Saldo insuficiente' });
        return;
    }

    if (transactionMode === 'deposit') onRecharge(user.id, amount);
    else onWithdraw(user.id, amount);

    setActionModal({ isOpen: true, type: transactionMode, amount, details: `Cliente: ${user.name}` });
    setAmountInput('');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegisterClient(newUser);
    setShowRegisterModal(false);
    setNewUser({ cedula: '', name: '', email: '', phone: '' });
  };

  const initiatePasswordReset = (user: User) => {
      setResetAnim({
          isActive: true, userId: user.id, userName: user.name, step: 'idle'
      });
  };

  const confirmResetPassword = () => {
      if (!resetAnim.userId) return;
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

  // --- DRAW MANAGEMENT HANDLERS ---

  const openDrawManager = (draw: DrawType, currentRes: DailyResult) => {
      setEditingDraw(draw);
      setDrawNumber(currentRes.number || '');
      setDrawBall(currentRes.ballColor || 'blanca');
      setDrawRevNumber(currentRes.reventadosNumber || '');
      setConfirmAnim({ isActive: true, type: null, step: 'input', drawType: draw, logs: [] });
  };

  const handleCloseDrawModal = () => {
      console.log("Forcing modal close and reset...");
      setConfirmAnim({ 
          isActive: false, 
          type: null, 
          step: 'input', 
          drawType: null,
          logs: []
      });
      setEditingDraw(null);
      setDrawNumber('');
      setDrawBall('blanca');
      setDrawRevNumber('');
  };

  const handleConfirmDraw = () => {
      if (!drawNumber) return;
      const isReventado = drawBall === 'roja';
      const type = isReventado ? 'reventado' : 'normal';

      setConfirmAnim(prev => ({ 
          ...prev, 
          type, 
          step: 'processing',
          logs: ['INITIATING_MANUAL_OVERRIDE...', 'LOCKING_INPUT_CHANNEL...', 'ENCRYPTING_PACKET...']
      }));

      setTimeout(() => {
          setConfirmAnim(prev => ({ 
              ...prev, 
              step: 'confirming',
              logs: [...prev.logs, 'MANUAL_ENTRY_VERIFIED', 'BROADCASTING_TO_LEDGER...']
          }));
          setTimeout(() => {
              onUpdateResult(
                  editingDraw!, 
                  drawNumber, 
                  drawBall, 
                  isReventado ? (drawRevNumber || drawNumber) : null
              );
              setConfirmAnim(prev => ({ ...prev, step: 'complete' }));
              
              setTimeout(() => {
                  handleCloseDrawModal();
              }, 2000);
          }, 1500);
      }, 1200);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      setHistoryDate(newDate);
      setIsTimeTraveling(true);
      
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

  return (
    <div className="space-y-8 relative min-h-[80vh]">
      <ActionModal 
        isOpen={actionModal.isOpen} 
        type={actionModal.type} 
        amount={actionModal.amount} 
        details={actionModal.details}
        onClose={() => setActionModal({...actionModal, isOpen: false})} 
      />

      {/* --- RESET ANIMATION --- */}
      {resetAnim.isActive && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl">
               <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse-slow"></div>
              </div>
              <div className="relative w-full max-w-lg p-8 bg-brand-secondary/50 border border-brand-border rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                  {resetAnim.step === 'idle' && (
                      <div className="text-center space-y-6 animate-fade-in-up">
                          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/50 mb-4">
                              <ExclamationTriangleIcon className="h-10 w-10 text-red-500 animate-pulse" />
                          </div>
                          <h2 className="text-2xl font-black text-white uppercase tracking-widest">Confirmar Reset</h2>
                          <p className="text-sm text-brand-text-secondary">Está a punto de iniciar el protocolo de restablecimiento de credenciales para:</p>
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
                          <p className="text-sm text-brand-text-secondary">Las credenciales han sido reiniciadas correctamente.</p>
                          <div className="bg-brand-tertiary p-6 rounded-xl border border-brand-accent/30 relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent animate-shimmer"></div>
                              <p className="text-xs text-brand-text-secondary uppercase mb-2">Nueva Contraseña Temporal</p>
                              <p className="text-3xl font-black text-white font-mono tracking-wider select-all cursor-text hover:text-brand-accent transition-colors">Ganador2025$$</p>
                              <p className="text-[10px] text-brand-text-secondary mt-2 opacity-60">Informe al usuario inmediatamente.</p>
                          </div>
                          <Button onClick={closeResetModal} className="w-full bg-brand-success hover:bg-emerald-600 text-white border-none shadow-lg">Finalizar Proceso</Button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- DRAW CONFIRM ANIMATION / OVERLAY --- */}
      {confirmAnim.isActive && confirmAnim.step !== 'input' && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-2xl overflow-hidden">
              {/* Background effects */}
              <div className={`absolute inset-0 opacity-20 ${confirmAnim.type === 'reventado' ? 'bg-red-900 animate-pulse-slow' : 'bg-blue-900 animate-pulse'}`}></div>
              <div className="absolute inset-0 z-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              <div className="absolute w-full h-0.5 bg-white/30 top-0 z-10 animate-scan-line"></div>

              <div className="relative z-20 text-center p-8 max-w-lg w-full">
                  
                  {confirmAnim.step === 'processing' && (
                      <div className="animate-fade-in-up">
                          <div className="relative w-24 h-24 mx-auto mb-6">
                              <div className={`absolute inset-0 border-4 border-t-transparent rounded-full animate-spin ${confirmAnim.type === 'reventado' ? 'border-red-500' : 'border-brand-accent'}`}></div>
                              <div className="absolute inset-2 border-2 border-b-transparent rounded-full animate-spin-slow opacity-50 border-white"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                  <KeyIcon className="h-8 w-8 text-white animate-pulse"/>
                              </div>
                          </div>
                          <div className="font-mono text-xs text-brand-text-secondary space-y-1 mb-4 h-20 overflow-hidden">
                              {confirmAnim.logs.map((log, i) => (
                                  <div key={i} className="animate-fade-in-up text-left pl-10"><span className="text-brand-accent">{'>'}</span> {log}</div>
                              ))}
                          </div>
                      </div>
                  )}

                  {confirmAnim.step === 'confirming' && (
                      <div className="animate-zoom-in-fast">
                          <h2 className="text-4xl font-black text-white uppercase tracking-widest mb-2">
                              {confirmAnim.type === 'reventado' ? 'ALERTA ROJA' : 'CONFIRMADO'}
                          </h2>
                          <p className="text-sm text-brand-text-secondary font-mono animate-pulse">ESCRIBIENDO EN BLOCKCHAIN...</p>
                          <div className="mt-8 h-1 w-full bg-brand-tertiary rounded-full overflow-hidden">
                              <div className={`h-full animate-progress-indeterminate ${confirmAnim.type === 'reventado' ? 'bg-red-600' : 'bg-brand-accent'}`}></div>
                          </div>
                      </div>
                  )}

                  {confirmAnim.step === 'complete' && (
                      <div className="animate-stamp transform scale-125">
                          <CheckCircleIcon className={`h-32 w-32 mx-auto mb-6 drop-shadow-[0_0_25px_rgba(255,255,255,0.5)] ${confirmAnim.type === 'reventado' ? 'text-yellow-400' : 'text-brand-success'}`}/>
                          <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                              {confirmAnim.type === 'reventado' ? 'EVENTO REGISTRADO' : 'RESULTADO FINAL'}
                          </h2>
                          <p className="text-xs font-mono text-brand-text-secondary mt-2">MANUAL_OVERRIDE_ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- MAIN NAVIGATION --- */}
      <nav className="flex justify-center mb-8">
          <div className="bg-brand-secondary/80 backdrop-blur-md p-1.5 rounded-2xl border border-brand-border inline-flex gap-2 shadow-2xl relative group/nav">
              {/* Nav Backlight */}
              <div className="absolute -inset-0.5 bg-brand-accent/30 rounded-2xl blur opacity-20 group-hover/nav:opacity-50 transition duration-500"></div>
              
              <button onClick={() => setActiveTab('draws')} className={`relative z-10 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${activeTab === 'draws' ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'text-brand-text-secondary hover:text-white hover:bg-white/5'}`}>
                  <BoltIcon className="h-4 w-4" /> Sorteos
              </button>
              <button onClick={() => setActiveTab('reports')} className={`relative z-10 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'text-brand-text-secondary hover:text-white hover:bg-white/5'}`}>
                  <ClockIcon className="h-4 w-4" /> Máquina del Tiempo
              </button>
              <button onClick={() => setActiveTab('finance')} className={`relative z-10 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${activeTab === 'finance' ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'text-brand-text-secondary hover:text-white hover:bg-white/5'}`}>
                  <CreditCardIcon className="h-4 w-4" /> Quantum Ledger
              </button>
          </div>
      </nav>

      {/* ================= DRAWS TAB (REDESIGNED - LIGHTWEIGHT FUTURISTIC) ================= */}
      {activeTab === 'draws' && (
          <div className="max-w-7xl mx-auto animate-fade-in-up">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4 border-b border-white/5 pb-6 relative">
                 <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent blur-3xl -z-10"></div>
                 <div>
                     <h2 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3 drop-shadow-xl">
                         <div className="relative">
                            <CpuIcon className="h-10 w-10 text-cyan-400 z-10 relative animate-pulse"/>
                            <div className="absolute inset-0 bg-cyan-400 blur-lg opacity-50 animate-pulse"></div>
                         </div>
                         EVENT MONITORING <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">STATION</span>
                     </h2>
                     <p className="text-[10px] text-brand-text-secondary font-mono mt-2 ml-1 tracking-widest flex items-center gap-3">
                         <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> REALTIME_NODE: CONNECTED</span>
                         <span className="opacity-30">|</span>
                         <span>UPTIME: 99.99%</span>
                     </p>
                 </div>
                 <div className="flex items-center gap-4">
                     {/* Network Widget */}
                     <div className="flex items-center gap-3 bg-[#0b1221]/80 px-4 py-2 rounded-full border border-cyan-500/20 backdrop-blur-md shadow-lg shadow-cyan-900/20">
                         <GlobeAltIcon className="h-4 w-4 text-cyan-500 animate-spin-slow"/>
                         <span className="text-xs font-mono text-cyan-300">NET_SPEED: 120ms</span>
                     </div>
                 </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 {(['mediodia', 'tarde', 'noche'] as DrawType[]).map((draw, idx) => {
                     const result = dailyResults.find(r => r.draw === draw) || { number: null, ballColor: null, reventadosNumber: null };
                     const hasResult = result.number !== null;
                     const isReventado = result.ballColor === 'roja';
                     
                     // --- NEW THEME CONFIGURATION (AS REQUESTED) ---
                     // Mediodia: Purple (Mystic)
                     // Tarde: Orange (Sunset)
                     // Noche: Cyan (Futuristic)
                     const theme = {
                         mediodia: { 
                             accent: 'text-fuchsia-400',
                             border: 'border-fuchsia-500/50',
                             glow: 'shadow-[0_0_50px_rgba(192,38,211,0.3)]', // Thicker glow
                             bgGradient: 'from-fuchsia-900/40 to-purple-900/40',
                             icon: <SunIcon className="h-6 w-6 text-fuchsia-400"/>,
                             statusColor: 'bg-fuchsia-500',
                             title: 'MEDIODÍA'
                         },
                         tarde: { 
                             accent: 'text-orange-400',
                             border: 'border-orange-500/50',
                             glow: 'shadow-[0_0_50px_rgba(249,115,22,0.3)]', // Thicker glow
                             bgGradient: 'from-orange-900/40 to-amber-900/40',
                             icon: <SunsetIcon className="h-6 w-6 text-orange-400"/>,
                             statusColor: 'bg-orange-500',
                             title: 'TARDE'
                         },
                         noche: { 
                             accent: 'text-cyan-400',
                             border: 'border-cyan-500/50',
                             glow: 'shadow-[0_0_50px_rgba(6,182,212,0.3)]', // Thicker glow
                             bgGradient: 'from-cyan-900/40 to-blue-900/40',
                             icon: <MoonIcon className="h-6 w-6 text-cyan-400"/>,
                             statusColor: 'bg-cyan-500',
                             title: 'NOCHE'
                         }
                     }[draw];

                     return (
                        <div key={draw} className="relative group h-full perspective-1000" style={{animationDelay: `${idx * 150}ms`}}>
                            {/* === THICKER BACKLIGHT GLOW === */}
                            <div className={`absolute -inset-2 bg-gradient-to-b ${theme.bgGradient.replace('/40','/60')} rounded-[2rem] blur-xl opacity-40 group-hover:opacity-70 transition duration-700 animate-pulse-slow`}></div>
                            
                            {/* Floating Particles (CSS Only) */}
                            <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
                                <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full opacity-50 animate-float" style={{animationDuration: '4s'}}></div>
                                <div className="absolute bottom-20 right-10 w-1 h-1 bg-white rounded-full opacity-30 animate-float" style={{animationDuration: '6s', animationDelay: '1s'}}></div>
                            </div>

                            {/* Main Glass Module */}
                            <div className={`
                                relative min-h-[500px] h-full rounded-[2rem] border backdrop-blur-2xl bg-[#0b1221]/80 
                                ${isReventado ? 'border-red-500/60 shadow-[0_0_60px_rgba(220,38,38,0.4)]' : `${theme.border} ${theme.glow}`}
                                transition-all duration-500 flex flex-col overflow-hidden hover:-translate-y-2 hover:scale-[1.02]
                            `}>
                                
                                {/* Decorative Tech Lines */}
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                                <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-transparent via-white/20 to-transparent"></div>
                                <div className={`absolute top-0 left-10 w-[1px] h-20 bg-gradient-to-b ${theme.bgGradient.split(' ')[0].replace('from-', 'from-white/30')} to-transparent`}></div>

                                {/* Header Section */}
                                <div className="p-8 flex justify-between items-start relative z-10 bg-gradient-to-b from-white/5 to-transparent">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-xl border border-white/10 bg-black/50 ${theme.accent} shadow-lg backdrop-blur-md`}>
                                                {theme.icon}
                                            </div>
                                            <h3 className={`text-2xl font-black text-white uppercase tracking-widest drop-shadow-md`}>{theme.title}</h3>
                                        </div>
                                        <p className="text-[10px] text-brand-text-secondary font-mono tracking-widest pl-1 flex items-center gap-2">
                                            <ClockIcon className="h-3 w-3 opacity-50"/>
                                            TARGET: <span className="text-white font-bold">{DRAW_TIMES[draw]}</span>
                                        </p>
                                    </div>
                                    
                                    {/* Status Badge */}
                                    <div className="flex flex-col items-end gap-1">
                                        <div className={`w-3 h-3 rounded-full ${hasResult ? (isReventado ? 'bg-red-500 animate-ping' : 'bg-green-500 shadow-[0_0_10px_#22c55e]') : 'bg-yellow-500 animate-pulse'}`}></div>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${hasResult ? 'border-green-500/30 text-green-400 bg-green-900/20' : 'border-yellow-500/30 text-yellow-400 bg-yellow-900/20'}`}>
                                            {hasResult ? (isReventado ? 'CRITICAL' : 'LOCKED') : 'PENDING'}
                                        </span>
                                    </div>
                                </div>

                                {/* Center Stage (Holographic Display) */}
                                <div className="flex-grow flex flex-col items-center justify-center relative z-10 py-4">
                                    {/* Background Grid/Rays */}
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0,transparent_60%)] pointer-events-none"></div>
                                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-tr ${theme.bgGradient} rounded-full blur-[80px] opacity-30 animate-pulse-slow`}></div>

                                    {hasResult ? (
                                        isReventado ? (
                                            /* === DUAL PLANETARY SYSTEM (REVENTADO + NORMAL) === */
                                            <div className="relative w-full flex flex-col items-center animate-float">
                                                
                                                {/* 1. The Main Event: RED GIANT (Reventado) */}
                                                <div className="relative z-20 group/red">
                                                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-900 flex items-center justify-center shadow-[0_0_60px_rgba(220,38,38,0.6)] border-4 border-red-400 relative overflow-hidden animate-scale-pulse">
                                                        {/* Surface Texture */}
                                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>
                                                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent rounded-full"></div>
                                                        
                                                        <span className="relative z-10 text-7xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] font-mono">
                                                            {result.reventadosNumber || result.number}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Fire Icon Badge */}
                                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-950 border border-red-500 text-red-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg z-30 whitespace-nowrap">
                                                        <FireIcon className="h-3 w-3 animate-pulse"/> REVENTADO
                                                    </div>
                                                </div>

                                                {/* 2. The Satellite: WHITE MOON (Normal Number) */}
                                                <div className="absolute top-0 right-6 md:right-12 animate-spin-slow z-10" style={{animationDuration: '20s'}}>
                                                    <div className="relative group/white">
                                                        <div className="w-20 h-20 rounded-full bg-gradient-to-b from-gray-100 to-gray-300 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] border-2 border-white/50">
                                                            <span className="text-2xl font-black text-gray-800 font-mono">{result.number}</span>
                                                        </div>
                                                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-gray-400 uppercase tracking-wider bg-black/50 px-2 rounded">
                                                            REGULAR
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        ) : (
                                            /* === SINGLE NORMAL RESULT (Big Hologram) === */
                                            <div className="relative animate-float">
                                                <div className={`w-40 h-40 rounded-full bg-gradient-to-b from-white/10 to-transparent border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-[0_0_40px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform duration-500 relative`}>
                                                    {/* Inner Glow Ring */}
                                                    <div className={`absolute inset-2 rounded-full border ${theme.border} opacity-50`}></div>
                                                    
                                                    <span className={`text-8xl font-black font-mono text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]`}>
                                                        {result.number}
                                                    </span>
                                                </div>
                                                <div className="mt-8 text-center">
                                                    <div className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] border border-white/10 bg-black/40 text-gray-300 shadow-lg`}>
                                                        RESULTADO ESTÁNDAR
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        /* PENDING: Advanced Radar Scan */
                                        <div className="flex flex-col items-center opacity-60">
                                            <div className="relative w-40 h-40 flex items-center justify-center">
                                                <div className={`absolute inset-0 border border-white/10 rounded-full animate-ping`} style={{animationDuration: '3s'}}></div>
                                                <div className="absolute inset-0 border border-white/5 rounded-full"></div>
                                                <div className={`absolute inset-4 border border-dashed ${theme.border} rounded-full animate-spin-slow`}></div>
                                                
                                                {/* Scanning Ray */}
                                                <div className="absolute inset-0 rounded-full overflow-hidden">
                                                    <div className="absolute top-1/2 left-1/2 w-1/2 h-1/2 bg-gradient-to-br from-white/20 to-transparent origin-top-left animate-spin" style={{animationDuration: '2s'}}></div>
                                                </div>
                                                
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                     <span className="text-4xl font-mono text-white/20">--</span>
                                                </div>
                                            </div>
                                            <div className="mt-8 flex items-center gap-3 bg-black/30 px-4 py-2 rounded-full border border-white/5">
                                                <span className="w-2 h-2 bg-brand-text-secondary rounded-full animate-pulse"></span>
                                                <p className="text-xs font-mono text-brand-text-secondary uppercase tracking-widest">AWAITING_SIGNAL</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Tech Footer / Controls */}
                                <div className="p-6 bg-black/40 backdrop-blur-md border-t border-white/5">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[9px] text-gray-500 uppercase font-mono flex items-center gap-2">
                                            <FingerPrintIcon className="h-3 w-3"/> 
                                            HASH: <span className={`${theme.accent} opacity-70`}>{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                                        </span>
                                        <CpuIcon className={`h-4 w-4 ${theme.accent} opacity-50`}/>
                                    </div>
                                    <button 
                                        onClick={() => openDrawManager(draw, result as DailyResult)}
                                        className={`
                                            w-full py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 border group/btn overflow-hidden relative
                                            ${hasResult 
                                                ? 'bg-transparent border-white/10 text-gray-400 hover:border-white/30 hover:text-white hover:bg-white/5' 
                                                : `bg-gradient-to-r ${theme.bgGradient} border-white/10 text-white hover:shadow-lg`
                                            }
                                        `}
                                    >
                                        {/* Button hover shine */}
                                        <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover/btn:animate-shimmer"></div>
                                        
                                        {hasResult ? (
                                            <>
                                                <RefreshIcon className="h-4 w-4"/> SYSTEM_OVERRIDE
                                            </>
                                        ) : (
                                            <>
                                                <KeyIcon className="h-4 w-4"/> INPUT_DATA_ENTRY
                                            </>
                                        )}
                                    </button>
                                </div>

                            </div>
                        </div>
                     );
                 })}
             </div>

             {/* === CONSOLA DE CONTROL MODAL (UNCHANGED BUT RE-RENDERED HERE FOR CONTEXT) === */}
             {confirmAnim.isActive && confirmAnim.step === 'input' && (
                 <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                     <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" onClick={handleCloseDrawModal}></div>
                     
                     <div className="relative w-full max-w-lg bg-brand-primary border border-brand-accent/50 shadow-[0_0_100px_rgba(79,70,229,0.15)] rounded-3xl overflow-hidden animate-bounce-in">
                         
                         {/* Terminal Header */}
                         <div className="relative px-8 py-6 border-b border-white/10 bg-gradient-to-r from-brand-secondary to-brand-primary flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-brand-accent/10 rounded-lg flex items-center justify-center border border-brand-accent/30">
                                     <CpuIcon className="h-6 w-6 text-brand-accent"/> 
                                 </div>
                                 <div>
                                     <h2 className="text-lg font-black text-white uppercase tracking-wider">INGRESO MANUAL</h2>
                                     <p className="text-[10px] text-brand-accent font-mono flex items-center gap-2">
                                         <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                                         {DRAW_LABELS[confirmAnim.drawType!]} :: WRITE_ACCESS
                                     </p>
                                 </div>
                             </div>
                             <button 
                                type="button"
                                onClick={handleCloseDrawModal} 
                                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-brand-text-secondary hover:text-white transition-colors z-50 cursor-pointer"
                             >
                                 <XCircleIcon className="h-8 w-8 text-white hover:text-red-500 transition-colors"/>
                             </button>
                         </div>

                         <div className="p-8 space-y-8 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                             
                             {/* Number Input - Big & Center */}
                             <div className="space-y-2 text-center">
                                 <label className="text-xs font-bold text-brand-text-secondary uppercase tracking-[0.2em]">Número Ganador (00-99)</label>
                                 <div className="relative w-48 mx-auto">
                                     <input 
                                         type="tel" 
                                         value={drawNumber}
                                         onChange={(e) => setDrawNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                                         className="w-full bg-brand-secondary/50 border-2 border-brand-border rounded-2xl text-center text-7xl font-black text-white py-4 focus:border-brand-accent focus:shadow-[0_0_40px_rgba(79,70,229,0.3)] focus:outline-none transition-all duration-300 font-mono placeholder-brand-text-secondary/20"
                                         placeholder="00"
                                         autoFocus
                                     />
                                     <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-30 pointer-events-none">
                                         <div className="w-1 h-1 bg-white rounded-full"></div>
                                         <div className="w-1 h-1 bg-white rounded-full"></div>
                                         <div className="w-1 h-1 bg-white rounded-full"></div>
                                     </div>
                                 </div>
                             </div>

                             {/* Ball Color Selector */}
                             <div className="bg-black/20 p-1 rounded-xl border border-white/5 flex relative">
                                 {/* Sliding Selector Background */}
                                 <div 
                                     className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 shadow-lg ${drawBall === 'roja' ? 'left-[calc(50%)] bg-red-600' : 'left-1 bg-gray-200'}`}
                                 ></div>
                                 
                                 <button 
                                    onClick={() => setDrawBall('blanca')} 
                                    className={`flex-1 py-3 relative z-10 text-xs font-black uppercase tracking-widest transition-colors ${drawBall === 'blanca' ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-white'}`}
                                 >
                                     Blanca
                                 </button>
                                 <button 
                                    onClick={() => setDrawBall('roja')} 
                                    className={`flex-1 py-3 relative z-10 text-xs font-black uppercase tracking-widest transition-colors ${drawBall === 'roja' ? 'text-white' : 'text-brand-text-secondary hover:text-red-400'}`}
                                 >
                                     Roja
                                 </button>
                             </div>

                             {/* Reventados Input (Conditional) */}
                             <div className={`overflow-hidden transition-all duration-500 ease-in-out ${drawBall === 'roja' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                 <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-xl mt-2 animate-shake-hard relative">
                                     <div className="absolute top-0 left-0 w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(220,38,38,0.05)_10px,rgba(220,38,38,0.05)_20px)] pointer-events-none"></div>
                                     
                                     <div className="flex items-center justify-between mb-2 relative z-10">
                                         <div className="flex items-center gap-2 text-red-400">
                                             <FireIcon className="h-4 w-4 animate-pulse"/>
                                             <span className="text-xs font-bold uppercase">Reventado</span>
                                         </div>
                                         <span className="text-[9px] bg-red-500 text-white px-2 py-0.5 rounded font-bold">x200</span>
                                     </div>
                                     <input 
                                         type="tel" 
                                         value={drawRevNumber}
                                         onChange={(e) => setDrawRevNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                                         className="w-full bg-black/40 border border-red-500/50 rounded-lg text-center text-3xl font-black text-red-100 py-3 focus:border-red-500 focus:shadow-[0_0_20px_red] focus:outline-none font-mono relative z-10"
                                         placeholder={drawNumber || "--"}
                                     />
                                     <p className="text-[9px] text-red-400/70 text-center mt-2 font-mono">* Dejar vacío si es igual al número principal</p>
                                 </div>
                             </div>

                             {/* Actions */}
                             <Button 
                                onClick={handleConfirmDraw}
                                disabled={!drawNumber}
                                className={`w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95 ${drawBall === 'roja' ? 'bg-gradient-to-r from-red-600 to-orange-700 hover:from-red-500 hover:to-orange-600 text-white' : 'bg-gradient-to-r from-brand-accent to-cyan-700 hover:from-brand-accent-hover hover:to-cyan-600 text-white'}`}
                             >
                                 {drawBall === 'roja' ? (
                                     <span className="flex items-center justify-center gap-2"><ExclamationTriangleIcon className="h-5 w-5"/> CONFIRMAR EVENTO</span>
                                 ) : (
                                     <span className="flex items-center justify-center gap-2"><CheckCircleIcon className="h-5 w-5"/> ESTABLECER RESULTADO</span>
                                 )}
                             </Button>
                         </div>
                     </div>
                 </div>
             )}
          </div>
      )}
      
      {/* FINANCE AND REPORT TABS */}
      {activeTab === 'reports' && (
          <div className="max-w-6xl mx-auto animate-fade-in-up">
              <div className="relative bg-[#030712] rounded-3xl border border-cyan-500/30 shadow-[0_0_100px_rgba(6,182,212,0.1)] overflow-hidden group">
                  {/* Dynamic Background Grid */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:50px_50px] opacity-50 pointer-events-none"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                  
                  <div className="relative z-10 p-8 lg:p-12">
                      
                      {/* HEADER SECTION */}
                      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12 border-b border-white/5 pb-8">
                          <div className="flex items-center gap-6">
                              <div className="relative">
                                  <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
                                  <div className="relative w-24 h-24 bg-black rounded-2xl border border-cyan-500/50 flex items-center justify-center shadow-2xl">
                                      <ClockIcon className="h-12 w-12 text-cyan-400 animate-[spin_10s_linear_infinite]" />
                                      <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
                                  </div>
                              </div>
                              <div>
                                  <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
                                      CHRONO<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">SYS</span>
                                      <span className="block text-sm text-cyan-600 font-mono tracking-[0.3em] mt-2">TEMPORAL OVERRIDE v4.0</span>
                                  </h2>
                              </div>
                          </div>

                          {/* DATE INPUT MODULE */}
                          <div className="relative group">
                              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
                              <div className="relative bg-[#0B0F19] border border-cyan-500/30 rounded-xl p-4 flex flex-col min-w-[200px]">
                                  <label className="text-[9px] text-cyan-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                                      <CalendarIcon className="h-3 w-3" /> Target Date
                                  </label>
                                  <input 
                                      type="date" 
                                      value={historyDate} 
                                      onChange={handleDateChange} 
                                      className="bg-transparent text-white text-2xl font-mono font-bold focus:outline-none uppercase cursor-pointer"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* SLOT MACHINE INTERFACE */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                          {(['mediodia', 'tarde', 'noche'] as DrawType[]).map((draw) => {
                              const isActive = timeMachineState[draw].number.length > 0;
                              const isRed = timeMachineState[draw].ball === 'roja';
                              
                              return (
                                  <div key={draw} className="relative group">
                                      {/* Hover Glow */}
                                      <div className={`absolute inset-0 rounded-2xl transition-opacity duration-500 blur-xl opacity-0 group-hover:opacity-30 ${isRed ? 'bg-red-600' : 'bg-cyan-600'}`}></div>
                                      
                                      <div className="relative bg-[#0e121e] border border-white/10 rounded-2xl p-1 overflow-hidden h-full hover:border-white/20 transition-colors">
                                          {/* Inner Frame */}
                                          <div className="bg-[#080c15] rounded-xl p-6 h-full flex flex-col gap-6">
                                              
                                              {/* Draw Header */}
                                              <div className="flex justify-between items-center">
                                                  <div className="flex items-center gap-3">
                                                      <div className={`p-2 rounded-lg bg-white/5 ${draw === 'mediodia' ? 'text-orange-400' : draw === 'tarde' ? 'text-purple-400' : 'text-blue-400'}`}>
                                                          {draw === 'mediodia' ? <SunIcon className="h-5 w-5"/> : draw === 'tarde' ? <SunsetIcon className="h-5 w-5"/> : <MoonIcon className="h-5 w-5"/>}
                                                      </div>
                                                      <span className="text-sm font-black text-white uppercase tracking-wider">{DRAW_LABELS[draw]}</span>
                                                  </div>
                                                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse' : 'bg-gray-800'}`}></div>
                                              </div>

                                              {/* The Main Number Display/Input */}
                                              <div className="relative group/input">
                                                  <div className={`absolute inset-0 bg-gradient-to-b ${isActive ? (isRed ? 'from-red-900/20' : 'from-cyan-900/20') : 'from-transparent'} to-transparent rounded-xl transition-colors`}></div>
                                                  <input 
                                                      type="number" 
                                                      value={timeMachineState[draw].number} 
                                                      onChange={(e) => setTimeMachineState(prev => ({...prev, [draw]: {...prev[draw], number: e.target.value.slice(0, 2)}}))}
                                                      placeholder="--"
                                                      className={`
                                                          w-full bg-transparent border-2 rounded-xl py-4 text-center text-6xl font-black font-mono outline-none transition-all z-10 relative
                                                          ${isActive 
                                                              ? (isRed ? 'border-red-500/40 text-red-100 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'border-cyan-500/40 text-cyan-100 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]') 
                                                              : 'border-white/5 text-gray-700 placeholder-gray-800'}
                                                      `}
                                                  />
                                                  <div className="absolute bottom-2 left-0 w-full text-center text-[9px] text-gray-600 font-mono uppercase tracking-widest pointer-events-none">
                                                      Input Sequence
                                                  </div>
                                              </div>

                                              {/* Control Board */}
                                              <div className="bg-white/5 rounded-lg p-3 space-y-4 border border-white/5">
                                                  {/* Ball Toggle Switch */}
                                                  <div 
                                                      onClick={() => setTimeMachineState(prev => ({...prev, [draw]: {...prev[draw], ball: isRed ? 'blanca' : 'roja'}}))}
                                                      className={`cursor-pointer flex items-center justify-between p-2 rounded border transition-all duration-300 ${isRed ? 'bg-red-900/20 border-red-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                                  >
                                                      <div className="flex items-center gap-2">
                                                          <div className={`w-3 h-3 rounded-full ${isRed ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-gray-500'}`}></div>
                                                          <span className={`text-[10px] font-bold uppercase ${isRed ? 'text-red-400' : 'text-gray-400'}`}>
                                                              {isRed ? 'Reventado' : 'Normal'}
                                                          </span>
                                                      </div>
                                                      <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isRed ? 'bg-red-600' : 'bg-gray-700'}`}>
                                                          <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${isRed ? 'translate-x-4' : ''}`}></div>
                                                      </div>
                                                  </div>

                                                  {/* Hidden Reventados Input */}
                                                  <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isRed ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                      <div className="relative">
                                                          <div className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-red-500 text-xs">X</div>
                                                          <input 
                                                              type="number" 
                                                              value={timeMachineState[draw].reventados}
                                                              onChange={(e) => setTimeMachineState(prev => ({...prev, [draw]: {...prev[draw], reventados: e.target.value.slice(0, 2)}}))}
                                                              placeholder="Multiplicador"
                                                              className="w-full bg-black/50 border border-red-500/30 rounded px-3 py-2 pl-7 text-right text-sm font-mono text-red-200 focus:border-red-500 outline-none"
                                                          />
                                                      </div>
                                                  </div>
                                              </div>

                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      {/* ACTIVATION TRIGGER */}
                      <div className="relative group">
                          {stabilizationState === 'idle' && (
                              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient-x"></div>
                          )}
                          <button 
                              onClick={handleTimelineStabilize}
                              disabled={stabilizationState !== 'idle'}
                              className={`
                                  relative w-full overflow-hidden rounded-xl py-6 px-8 flex items-center justify-center gap-4 transition-all duration-300
                                  ${stabilizationState === 'idle' 
                                      ? 'bg-[#0B0F19] border border-cyan-500/50 text-cyan-400 hover:text-white' 
                                      : (stabilizationState === 'stabilizing' ? 'bg-cyan-900 border-cyan-400' : 'bg-green-600 border-green-500')}
                              `}
                          >
                              {stabilizationState === 'idle' && (
                                  <>
                                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10"></div>
                                      <BoltIcon className="h-6 w-6 animate-pulse" />
                                      <span className="font-black uppercase tracking-[0.3em] text-lg z-10">Confirmar Evento Temporal</span>
                                  </>
                              )}
                              {stabilizationState === 'stabilizing' && (
                                  <>
                                      <RefreshIcon className="h-6 w-6 animate-spin text-cyan-200" />
                                      <span className="font-black uppercase tracking-[0.3em] text-lg text-cyan-200 z-10">Sincronizando...</span>
                                  </>
                              )}
                              {stabilizationState === 'complete' && (
                                  <>
                                      <CheckCircleIcon className="h-6 w-6 text-white" />
                                      <span className="font-black uppercase tracking-[0.3em] text-lg text-white z-10">Cambio Exitoso</span>
                                  </>
                              )}
                          </button>
                      </div>

                  </div>
              </div>
          </div>
      )}

      {activeTab === 'finance' && (
           <div className="max-w-7xl mx-auto animate-fade-in-up">
              
              {/* === SECTION 1: REAL-TIME TICKER (RE-STYLED) === */}
              <FinancialTicker transactions={selectedWeekStats.txs} />

              {/* === SECTION 2: QUANTUM DASHBOARD HEADER === */}
              <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-8 border-b border-cyan-900/30 pb-6">
                   <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-[#0b1221] rounded-xl border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)] relative overflow-hidden group">
                                <div className="absolute -inset-1 bg-cyan-500 rounded-xl blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
                                <div className="absolute inset-0 bg-cyan-400/10 animate-pulse"></div>
                                <CpuIcon className="h-6 w-6 text-cyan-400 relative z-10"/>
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-white tracking-tighter uppercase">
                                    QUANTUM <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">LEDGER</span>
                                </h2>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-600 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    <span>SYSTEM_ONLINE</span>
                                    <span className="opacity-30">|</span>
                                    <span>NODE: {weeklyData.currentKey === selectedWeekKey ? 'LIVE_STREAM' : 'ARCHIVED_DATA'}</span>
                                </div>
                            </div>
                        </div>
                   </div>

                  <div className="bg-[#0b1221] border border-cyan-900/50 rounded-xl p-1.5 flex items-center gap-4 shadow-lg backdrop-blur-md relative group">
                      <div className="absolute -inset-0.5 bg-cyan-600 rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
                      <div className="relative flex items-center gap-4 z-10">
                        <button onClick={() => handleWeekNav('prev')} className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center hover:bg-cyan-900/30 text-cyan-500 transition-colors border border-white/5 hover:border-cyan-500/30">
                            <ChevronLeftIcon className="h-5 w-5"/>
                        </button>
                        
                        <div className="flex flex-col items-center px-6 min-w-[180px]">
                            <div className="text-[10px] text-cyan-600 font-bold uppercase tracking-widest mb-0.5">Target Sector</div>
                            <div className="flex items-center gap-2 text-white font-black font-mono text-sm">
                                <CalendarDaysIcon className="h-4 w-4 text-cyan-400"/>
                                {selectedWeekStats.label}
                            </div>
                        </div>
                        
                        <button onClick={() => handleWeekNav('next')} className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center hover:bg-cyan-900/30 text-cyan-500 transition-colors border border-white/5 hover:border-cyan-500/30 disabled:opacity-30" disabled={weeklyData.currentKey === selectedWeekKey}>
                            <ChevronRightIcon className="h-5 w-5"/>
                        </button>
                        
                        {weeklyData.currentKey !== selectedWeekKey && (
                            <button onClick={handleJumpToCurrent} className="ml-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 text-[10px] font-bold uppercase rounded-lg hover:bg-cyan-500 hover:text-black transition-all">
                                JUMP TO PRESENT
                            </button>
                        )}
                      </div>
                  </div>
              </div>

              {/* === SECTION 3: LIQUIDITY FLOW CHART & STATS === */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                  
                  {/* MAIN CHART CARD - CYBERPUNK STYLE */}
                  <div className="lg:col-span-2 relative bg-[#030712] border border-cyan-800/30 rounded-3xl p-8 overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.05)] group">
                      <div className="absolute -inset-1 bg-cyan-500 rounded-3xl blur opacity-0 group-hover:opacity-10 transition duration-500"></div>
                      
                      {/* Decorative Corners */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>
                      
                      <div className="relative z-10 flex justify-between items-start">
                          <div>
                              <h4 className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                  <div className="w-1 h-1 bg-cyan-500 rounded-full"></div> NET FLOW ANALYSIS
                              </h4>
                              <div className={`text-5xl font-black font-mono tracking-tighter ${selectedWeekStats.net >= 0 ? 'text-white text-shadow-neon-cyan' : 'text-red-500 text-shadow-neon-red'}`}>
                                  {selectedWeekStats.net >= 0 ? '+' : ''}{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.net)}
                              </div>
                          </div>
                          <div className="text-right bg-[#0b1221] p-3 rounded-xl border border-white/5">
                               <div className={`text-2xl font-black font-mono ${parseFloat(selectedWeekStats.profitMargin) >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                   {selectedWeekStats.profitMargin}%
                               </div>
                               <div className="text-[9px] text-gray-500 uppercase tracking-wide">Yield Rate</div>
                          </div>
                      </div>
                      
                      {/* CHART */}
                      <div className="relative z-10">
                        <WeeklySparkline transactions={selectedWeekStats.txs} currentKey={selectedWeekKey} />
                      </div>
                  </div>

                  {/* MINI STATS STACK - ENERGY CORES */}
                  <div className="space-y-4">
                       {/* CASH IN */}
                       <div className="bg-gradient-to-br from-[#062c22] to-black border border-green-900/50 p-6 rounded-2xl relative overflow-hidden group hover:border-green-500/50 transition-all shadow-lg">
                            {/* Glow Backlight */}
                            <div className="absolute -inset-0.5 bg-green-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
                            
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                <ArrowTrendingUpIcon className="h-16 w-16 text-green-500"/>
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold text-green-400/70 uppercase tracking-widest">TOTAL INJECTION</span>
                                </div>
                                <div className="text-3xl font-black text-green-400 font-mono tracking-tight">
                                    {new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.cashIn)}
                                </div>
                                <div className="mt-2 h-1 w-full bg-green-900/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-3/4 animate-pulse"></div>
                                </div>
                            </div>
                       </div>

                       {/* CASH OUT */}
                       <div className="bg-gradient-to-br from-[#2f0b0b] to-black border border-red-900/50 p-6 rounded-2xl relative overflow-hidden group hover:border-red-500/50 transition-all shadow-lg">
                            {/* Glow Backlight */}
                            <div className="absolute -inset-0.5 bg-red-600 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>

                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                <ArrowTrendingDownIcon className="h-16 w-16 text-red-500"/>
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold text-red-400/70 uppercase tracking-widest">TOTAL EXTRACTION</span>
                                </div>
                                <div className="text-3xl font-black text-red-500 font-mono tracking-tight">
                                    {new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.cashOut)}
                                </div>
                                <div className="mt-2 h-1 w-full bg-red-900/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 w-1/2 animate-pulse"></div>
                                </div>
                            </div>
                       </div>
                  </div>
              </div>

              {/* === SECTION 4: ASSET DIRECTORY & LEDGER === */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* LEFT: USER CARDS (GRID LAYOUT) */}
                  <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between bg-[#030712] p-4 rounded-xl border border-white/5 relative group">
                          <div className="absolute -inset-0.5 bg-cyan-600 rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
                          <div className="relative z-10 flex justify-between w-full items-center">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                                <IdentificationIcon className="h-5 w-5 text-cyan-400"/> Asset Directory
                            </h3>
                            <div className="relative group/search">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-4 w-4 text-cyan-700 group-focus-within/search:text-cyan-400"/>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="SEARCH_QUERY..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="bg-black border border-cyan-900/50 rounded-lg py-2 pl-10 pr-4 text-xs text-cyan-100 focus:border-cyan-500 outline-none w-48 transition-all focus:w-64 font-mono placeholder-cyan-900 uppercase"
                                />
                            </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                          {filteredUsers.map(user => (
                              <div key={user.id} className={`relative group overflow-visible rounded-xl transition-all duration-300 ${expandedUserId === user.id ? 'col-span-1 sm:col-span-2' : ''}`}>
                                  {/* User Card Glow */}
                                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-0 group-hover:opacity-40 transition duration-500 ${expandedUserId === user.id ? 'opacity-50' : ''}`}></div>

                                  <div className={`relative z-10 h-full rounded-xl border overflow-hidden ${expandedUserId === user.id ? 'border-cyan-500 bg-cyan-900/10 shadow-[0_0_30px_rgba(6,182,212,0.1)]' : 'border-white/10 bg-[#0b1221] hover:border-cyan-500/50 hover:bg-[#0f172a]'}`}>
                                      {/* Corner Accent */}
                                      <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-cyan-500/20 group-hover:border-t-cyan-500 transition-all"></div>

                                      {/* CARD HEADER / SUMMARY */}
                                      <div onClick={() => handleToggleUserCard(user.id)} className="p-5 cursor-pointer relative z-10">
                                          <div className="flex justify-between items-start">
                                              <div className="flex items-center gap-4">
                                                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-lg border ${expandedUserId === user.id ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-black text-gray-500 border-white/10'}`}>
                                                      {user.name.charAt(0)}
                                                  </div>
                                                  <div>
                                                      <div className="font-bold text-white text-sm uppercase tracking-wide group-hover:text-cyan-300 transition-colors">{user.name}</div>
                                                      <div className="text-[9px] text-gray-500 font-mono bg-black px-1.5 py-0.5 rounded inline-block border border-white/5 mt-1">ID: {user.cedula || 'NULL'}</div>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Available Liquidity</div>
                                                  <div className={`font-mono font-black text-lg ${user.balance > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                                                      {new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(user.balance)}
                                                  </div>
                                              </div>
                                          </div>
                                      </div>

                                      {/* EXPANDED ACTION PANEL */}
                                      <div className={`transition-all duration-300 ease-out overflow-hidden bg-black/50 ${expandedUserId === user.id ? 'max-h-[400px] opacity-100 border-t border-cyan-500/30' : 'max-h-0 opacity-0'}`}>
                                          <div className="p-5">
                                              <form onSubmit={(e) => handleSubmitFinance(e, user)} className="space-y-4">
                                                  <div className="grid grid-cols-2 gap-3">
                                                      <button 
                                                        type="button" 
                                                        onClick={() => setTransactionMode('deposit')} 
                                                        className={`py-3 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex flex-col items-center gap-2 ${transactionMode === 'deposit' ? 'bg-green-900/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-transparent border-white/10 text-gray-500 hover:bg-white/5'}`}
                                                      >
                                                          <ArrowTrendingUpIcon className="h-5 w-5"/> INJECT (DEPOSIT)
                                                      </button>
                                                      <button 
                                                        type="button" 
                                                        onClick={() => setTransactionMode('withdraw')} 
                                                        className={`py-3 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex flex-col items-center gap-2 ${transactionMode === 'withdraw' ? 'bg-red-900/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-transparent border-white/10 text-gray-500 hover:bg-white/5'}`}
                                                      >
                                                          <ArrowTrendingDownIcon className="h-5 w-5"/> EXTRACT (WITHDRAW)
                                                      </button>
                                                  </div>

                                                  <div className="relative group/input">
                                                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                          <span className="text-cyan-500 font-mono font-bold">₡</span>
                                                      </div>
                                                      <input 
                                                        type="text" 
                                                        value={amountInput} 
                                                        onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9]/g, ''))} 
                                                        placeholder="0.00" 
                                                        className="w-full bg-black border border-white/10 rounded-xl py-4 pl-10 pr-16 text-white font-mono text-lg focus:border-cyan-500 outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                                                      />
                                                      <button type="submit" className={`absolute right-2 top-2 bottom-2 px-4 rounded-lg font-bold text-white transition-all active:scale-95 ${transactionMode === 'deposit' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
                                                          <BoltIcon className="h-5 w-5"/>
                                                      </button>
                                                  </div>

                                                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                                      <span className="text-[9px] text-gray-500 uppercase">Security Protocol</span>
                                                      <button onClick={(e) => { e.stopPropagation(); initiatePasswordReset(user); }} className="text-[9px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1 rounded border border-red-500/30 hover:bg-red-500/10 transition-colors">
                                                          <LockIcon className="h-3 w-3"/> RESET ACCESS
                                                      </button>
                                                  </div>
                                              </form>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}

                          {/* ADD NEW CLIENT CARD */}
                          <button onClick={() => setShowRegisterModal(true)} className="relative group overflow-visible rounded-xl">
                              {/* Button Glow */}
                              <div className="absolute -inset-0.5 bg-cyan-500 rounded-xl blur opacity-0 group-hover:opacity-40 transition duration-500"></div>
                              <div className="relative border border-dashed border-white/10 p-8 flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-cyan-400 hover:border-cyan-500 hover:bg-cyan-500/5 transition-all rounded-xl bg-[#0b1221]">
                                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center group-hover:scale-110 transition-transform border border-white/10 group-hover:border-cyan-500 shadow-lg">
                                      <UserPlusIcon className="h-6 w-6"/>
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-widest">Register New Asset</span>
                              </div>
                          </button>
                      </div>
                  </div>

                  {/* RIGHT: TRANSACTION LEDGER FEED */}
                  <div className="bg-black border border-cyan-900/50 rounded-3xl overflow-hidden flex flex-col h-[650px] shadow-2xl relative group">
                       {/* Ledger Glow */}
                      <div className="absolute -inset-1 bg-cyan-600 rounded-3xl blur opacity-0 group-hover:opacity-10 transition duration-500"></div>

                      {/* Scan Line */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent z-20 animate-scan-line opacity-50"></div>
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#000_3px)] opacity-20 pointer-events-none z-10"></div>
                      
                      <div className="bg-[#0b1221] p-4 border-b border-cyan-900/30 flex justify-between items-center z-10 relative">
                          <div className="flex items-center gap-2">
                              <div className="bg-cyan-900/20 p-1.5 rounded text-cyan-400 border border-cyan-500/30">
                                  <ClipboardCheckIcon className="h-4 w-4"/>
                              </div>
                              <span className="text-xs font-black text-white uppercase tracking-wider">Ledger Feed</span>
                          </div>
                          <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded border border-white/5">
                              <div className={`h-1.5 w-1.5 rounded-full ${weeklyData.currentKey === selectedWeekKey ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                              <span className="text-[9px] text-gray-400 font-mono">{weeklyData.currentKey === selectedWeekKey ? 'SYNCED' : 'ARCHIVED'}</span>
                          </div>
                      </div>

                      <div className="flex-1 overflow-y-auto bg-[#050911] p-0 custom-scrollbar scroll-smooth relative z-0">
                          {selectedWeekStats.txs.length > 0 ? (
                              <div className="flex flex-col divide-y divide-white/5">
                                  {selectedWeekStats.txs.map((tx, idx) => (
                                      <div key={tx.id} className="p-3 hover:bg-white/5 transition-colors group/item flex items-center justify-between animate-fade-in-up relative" style={{animationDelay: `${idx * 50}ms`}}>
                                          {/* List Item Glow on Hover */}
                                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover/item:opacity-100 transition duration-300 pointer-events-none"></div>
                                          
                                          <div className="flex items-center gap-3 relative z-10">
                                              <span className="text-[10px] font-mono text-gray-600 group-hover/item:text-cyan-500 transition-colors">
                                                  {idx.toString().padStart(3, '0')}
                                              </span>
                                              <div>
                                                  <div className="flex items-center gap-2">
                                                      <span className={`text-[9px] font-black uppercase px-1 rounded-sm border ${
                                                          tx.type === 'deposit' ? 'bg-green-900/20 border-green-500/30 text-green-400' : 
                                                          tx.type === 'withdraw' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 
                                                          tx.type === 'winnings' ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400' : 
                                                          'bg-indigo-900/20 border-indigo-500/30 text-indigo-400'
                                                      }`}>
                                                          {tx.type === 'deposit' ? 'INJ' : tx.type === 'withdraw' ? 'EXT' : tx.type === 'winnings' ? 'WIN' : 'ORD'}
                                                      </span>
                                                      <span className="text-xs text-gray-300 font-bold font-mono tracking-tight group-hover/item:text-white transition-colors">{tx.userName}</span>
                                                  </div>
                                                  <div className="text-[9px] text-gray-600 font-mono mt-0.5 flex gap-2">
                                                      <span>{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                      <span className="hidden sm:inline">ID:{tx.id.split('-')[0]}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="text-right relative z-10">
                                              <div className={`font-mono font-bold text-sm ${tx.type === 'deposit' || tx.type === 'winnings' ? 'text-green-400' : tx.type === 'withdraw' ? 'text-red-400' : 'text-gray-400'}`}>
                                                  {tx.type === 'withdraw' ? '-' : '+'}{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(tx.amount)}
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center opacity-30">
                                  <GlobeAltIcon className="h-16 w-16 text-gray-700 mb-4 animate-pulse-slow"/>
                                  <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">NULL_SECTOR_DATA</p>
                              </div>
                          )}
                      </div>
                      
                      {/* FOOTER SUMMARY */}
                      <div className="bg-[#0b1221] p-3 border-t border-cyan-900/30 text-[9px] text-cyan-600 font-mono flex justify-between z-10 relative">
                          <span>BLOCK_DEPTH: {selectedWeekStats.txs.length}</span>
                          <span>HASH: {Math.random().toString(36).substr(2, 12).toUpperCase()}</span>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRegisterModal(false)}></div>
              <Card className="relative w-full max-w-md bg-[#0b1221] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)]" glowColor="from-cyan-500/30 to-blue-500/30">
                  <div className="mb-6 text-center relative z-10">
                      <div className="w-12 h-12 mx-auto bg-cyan-900/20 rounded-full border border-cyan-500/50 flex items-center justify-center mb-3">
                          <UserPlusIcon className="h-6 w-6 text-cyan-400"/>
                      </div>
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">New Asset Registration</h3>
                  </div>
                  <form onSubmit={handleRegisterSubmit} className="space-y-4 relative z-10">
                      <Input placeholder="FULL NAME" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required className="bg-black border-white/10 text-white font-mono uppercase focus:border-cyan-500"/>
                      <Input placeholder="ID / CEDULA" value={newUser.cedula} onChange={e => setNewUser({...newUser, cedula: e.target.value})} required className="bg-black border-white/10 text-white font-mono uppercase focus:border-cyan-500"/>
                      <Input placeholder="EMAIL ADDRESS" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required className="bg-black border-white/10 text-white font-mono uppercase focus:border-cyan-500"/>
                      <Input placeholder="PHONE NUMBER" type="tel" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} required className="bg-black border-white/10 text-white font-mono uppercase focus:border-cyan-500"/>
                      
                      <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                          <Button type="button" variant="ghost" onClick={() => setShowRegisterModal(false)} className="flex-1 text-gray-400 hover:text-white">CANCEL</Button>
                          <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-black font-black border-none shadow-[0_0_15px_rgba(6,182,212,0.4)]">CONFIRM ENTRY</Button>
                      </div>
                  </form>
              </Card>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
