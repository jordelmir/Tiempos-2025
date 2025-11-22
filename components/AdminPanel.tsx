
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
    KeyIcon,
    PhoneIcon,
    MailIcon,
    TrashIcon
} from './icons/Icons';

interface AdminPanelProps {
  currentUser: User;
  users: User[]; 
  dailyResults: DailyResult[];
  historyResults: HistoryResult[]; 
  transactions: Transaction[];
  onRecharge: (userId: string, amount: number) => void;
  onWithdraw: (userId: string, amount: number) => void;
  onUpdateResult: (draw: DrawType, number: string | null, ballColor: BallColor | null, reventadosNumber: string | null) => Promise<boolean>;
  onUpdateHistory: (date: string, data: HistoryResult['results']) => void; 
  onRegisterClient: (userData: Partial<User>) => Promise<{ error: any; data: any }>;
  onForceResetPassword: (userId: string) => void;
  onToggleBlock: (userId: string, currentStatus: boolean) => Promise<boolean>;
  onDeleteUser: (userId: string) => Promise<boolean>;
}

type TabView = 'finance' | 'draws' | 'reports';

interface DrawConfirmationState {
    isActive: boolean;
    type: 'normal' | 'reventado' | null;
    step: 'input' | 'processing' | 'confirming' | 'complete' | 'error';
    drawType: DrawType | null;
    logs: string[];
}

interface ResetAnimState {
    isActive: boolean;
    userId: string | null;
    userName: string;
    step: 'idle' | 'scanning' | 'decrypting' | 'overwriting' | 'success';
}

const getWeekNumber = (d: Date): { year: number, week: number } => {
    if (!d || isNaN(d.getTime())) return { year: 0, week: 0 }; // Guard against Invalid Date
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
};

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
                        <span className="text-cyan-200 font-bold uppercase opacity-70">{(tx.userName || 'Anon').split(' ')[0]}</span>
                        <span className={tx.type === 'deposit' || tx.type === 'winnings' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                            {tx.type === 'withdraw' ? '-' : '+'}{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(tx.amount)}
                        </span>
                        <span className="text-cyan-900 opacity-30">///</span>
                    </div>
                ))}
                {/* Duplicate for seamless marquee loop */}
                 {recent.map((tx, i) => (
                    <div key={`dup-${tx.id}-${i}`} className="flex items-center gap-3 text-[10px] font-mono tracking-widest group cursor-default">
                        <span className={`w-2 h-2 rounded-full ${tx.type === 'deposit' || tx.type === 'winnings' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'} group-hover:animate-ping`}></span>
                        <span className="text-cyan-200 font-bold uppercase opacity-70">{(tx.userName || 'Anon').split(' ')[0]}</span>
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

const WeeklySparkline = ({ transactions, currentKey }: { transactions: Transaction[], currentKey: string }) => {
    const dailyNet = new Array(7).fill(0);
    const days = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    
    transactions.forEach(tx => {
        if (!tx.date || isNaN(new Date(tx.date).getTime())) return; // Guard
        const day = new Date(tx.date).getDay(); 
        if (tx.type === 'deposit') dailyNet[day] += (tx.amount || 0);
        if (tx.type === 'withdraw') dailyNet[day] -= (tx.amount || 0);
    });

    const maxVal = Math.max(...dailyNet.map(Math.abs), 1000);
    // Prevent NaN if val is NaN (though safe guarded above)
    const normalize = (val: number) => {
        if (isNaN(val)) return 50;
        return 50 - (val / maxVal) * 40;
    };
    
    const points = dailyNet.map((val, i) => `${i * 16.6},${normalize(val)}`).join(' ');

    return (
        <div className="w-full h-32 relative mt-6">
            <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none"></div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <line x1="0" y1="10" x2="100" y2="10" stroke="#1e293b" strokeWidth="0.2" />
                <line x1="0" y1="90" x2="100" y2="90" stroke="#1e293b" strokeWidth="0.2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#06b6d4" strokeWidth="0.2" strokeDasharray="2 2" className="opacity-50" />
                
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

                {dailyNet.map((val, i) => (
                    <g key={i} className="group hover:scale-110 transition-transform origin-center">
                        <circle cx={i * 16.6} cy={normalize(val)} r="1.5" className={`transition-all duration-300 ${val >= 0 ? 'fill-green-400 group-hover:fill-green-300' : 'fill-red-500 group-hover:fill-red-400'}`} />
                        <line x1={i*16.6} y1={normalize(val)} x2={i*16.6} y2="100" stroke={val >=0 ? '#4ade80' : '#f87171'} strokeWidth="0.2" className="opacity-0 group-hover:opacity-50 transition-opacity" />
                        <text x={i * 16.6} y="115" fontSize="6" fill="#64748b" textAnchor="middle" fontFamily="monospace">{days[i]}</text>
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
    onForceResetPassword,
    onToggleBlock,
    onDeleteUser
}) => {
  const [activeTab, setActiveTab] = useState<TabView>('finance'); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null); 
  const [amountInput, setAmountInput] = useState('');
  const [transactionMode, setTransactionMode] = useState<'deposit' | 'withdraw'>('deposit');
  
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(() => {
      const now = new Date();
      const { year, week } = getWeekNumber(now);
      return `${year}-W${week}`;
  });

  const [actionModal, setActionModal] = useState<{isOpen: boolean, type: ActionType, amount: number, details?: string}>({
      isOpen: false, type: 'deposit', amount: 0
  });
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerStep, setRegisterStep] = useState<'form' | 'processing' | 'success'>('form');
  const [newUser, setNewUser] = useState({ cedula: '', name: '', email: '', phone: '' });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [registerError, setRegisterError] = useState('');

  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null);

  const [editingDraw, setEditingDraw] = useState<DrawType | null>(null);
  const [drawNumber, setDrawNumber] = useState('');
  const [drawBall, setDrawBall] = useState<BallColor>('blanca');
  const [drawRevNumber, setDrawRevNumber] = useState('');
  
  const [confirmAnim, setConfirmAnim] = useState<DrawConfirmationState>({
      isActive: false,
      type: null,
      step: 'input',
      drawType: null,
      logs: []
  });

  const [resetAnim, setResetAnim] = useState<ResetAnimState>({
      isActive: false,
      userId: null,
      userName: '',
      step: 'idle'
  });

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
          // Guard against invalid dates
          if (!tx.date || isNaN(new Date(tx.date).getTime())) return;
          
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
              grouped[key].cashIn += (tx.amount || 0);
          } else if (tx.type === 'withdraw') {
              grouped[key].cashOut += (tx.amount || 0);
          }
          
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

  const handleWeekNav = (direction: 'prev' | 'next') => {
      const currentIndex = weeklyData.sortedKeys.indexOf(selectedWeekKey);
      if (currentIndex === -1) return;

      let newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= weeklyData.sortedKeys.length) newIndex = weeklyData.sortedKeys.length - 1;

      setSelectedWeekKey(weeklyData.sortedKeys[newIndex]);
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users; 
    return users.filter(
      user =>
        (user.cedula || '').includes(searchTerm) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.phone || '').includes(searchTerm) ||
        (user.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, users]);

  const handleToggleUserCard = (userId: string) => {
      setExpandedUserId(prev => prev === userId ? null : userId);
      setAmountInput('');
      setDeleteConfirmUserId(null);
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

  const handleBlockClick = async (userId: string, currentStatus: boolean) => {
      setProcessingUserId(userId);
      await onToggleBlock(userId, currentStatus);
      setProcessingUserId(null);
  };

  const handleDeleteClick = async (userId: string) => {
      if (deleteConfirmUserId === userId) {
          setProcessingUserId(userId);
          const success = await onDeleteUser(userId);
          setProcessingUserId(null);
          setDeleteConfirmUserId(null);
          if(success) setExpandedUserId(null);
      } else {
          setDeleteConfirmUserId(userId);
          setTimeout(() => {
              setDeleteConfirmUserId(prev => prev === userId ? null : prev);
          }, 3000);
      }
  };

  const generateSecurePassword = () => {
    const random = Math.random().toString(36).slice(-6).toUpperCase();
    return `Tiempos${random}!`;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterStep('processing');
    
    const tempPassword = generateSecurePassword();
    setGeneratedPassword(tempPassword);

    const userData = { ...newUser, password: tempPassword };

    const result = await onRegisterClient(userData);

    if (result.error) {
        setRegisterStep('form');
        setRegisterError(result.error.message || 'Error al crear usuario');
    } else {
        setRegisterStep('success');
    }
  };

  const handleCloseRegister = () => {
      setShowRegisterModal(false);
      setRegisterStep('form');
      setNewUser({ cedula: '', name: '', email: '', phone: '' });
      setGeneratedPassword('');
      setRegisterError('');
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

  const openDrawManager = (draw: DrawType, currentRes: DailyResult) => {
      setEditingDraw(draw);
      setDrawNumber(currentRes.number || '');
      setDrawBall(currentRes.ballColor || 'blanca');
      setDrawRevNumber(currentRes.reventadosNumber || '');
      setConfirmAnim({ isActive: true, type: null, step: 'input', drawType: draw, logs: [] });
  };

  const handleCloseDrawModal = () => {
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

  const handleConfirmDraw = async () => {
      if (!drawNumber) return;
      const isReventado = drawBall === 'roja';
      const type = isReventado ? 'reventado' : 'normal';

      setConfirmAnim(prev => ({ 
          ...prev, 
          type, 
          step: 'processing',
          logs: ['INITIATING_SECURE_HANDSHAKE...', 'LOCKING_INPUT_CHANNEL...', 'ENCRYPTING_PACKET_DATA...']
      }));

      await new Promise(resolve => setTimeout(resolve, 1000));

      setConfirmAnim(prev => ({ 
          ...prev, 
          step: 'confirming',
          logs: [...prev.logs, 'UPLINK_ESTABLISHED', 'AWAITING_LEDGER_CONFIRMATION...']
      }));

      const success = await onUpdateResult(
          editingDraw!, 
          drawNumber, 
          drawBall, 
          isReventado ? (drawRevNumber || drawNumber) : null
      );

      if (success) {
          setConfirmAnim(prev => ({ ...prev, step: 'complete' }));
          setTimeout(() => {
              handleCloseDrawModal();
          }, 2500);
      } else {
          setConfirmAnim(prev => ({ 
              ...prev, 
              step: 'error',
              logs: [...prev.logs, 'CRITICAL_FAILURE: DATABASE_REJECTED', 'ROLLING_BACK_TRANSACTION...']
          }));
          setTimeout(() => {
              setConfirmAnim(prev => ({ ...prev, step: 'input', logs: [] }));
          }, 3000);
      }
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

      {showRegisterModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
              
              <div className="relative w-full max-w-2xl bg-brand-secondary border-2 border-cyan-500/50 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden animate-zoom-in-fast flex flex-col md:flex-row">
                  
                  <div className="hidden md:flex w-1/3 bg-brand-primary/50 border-r border-cyan-900/50 flex-col justify-between p-6">
                       <div>
                           <div className="w-12 h-12 rounded bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center mb-4">
                               <UserPlusIcon className="h-6 w-6 text-cyan-400"/>
                           </div>
                           <h3 className="text-cyan-400 font-bold text-lg uppercase leading-tight">Nuevo<br/>Activo</h3>
                           <p className="text-[10px] text-cyan-700 mt-2 font-mono">SECURE_ENROLLMENT_PROTOCOL_v9</p>
                       </div>
                       <div className="space-y-2">
                           <div className="h-1 w-full bg-cyan-900/30 rounded-full overflow-hidden">
                               <div className="h-full bg-cyan-500/50 w-2/3 animate-pulse"></div>
                           </div>
                           <div className="h-1 w-full bg-cyan-900/30 rounded-full overflow-hidden">
                               <div className="h-full bg-cyan-500/30 w-1/2 animate-pulse"></div>
                           </div>
                       </div>
                  </div>

                  <div className="flex-1 p-8 relative">
                      <button onClick={handleCloseRegister} className="absolute top-4 right-4 text-cyan-900 hover:text-cyan-500 transition-colors">
                          <XCircleIcon className="h-6 w-6"/>
                      </button>

                      {registerStep === 'form' && (
                          <form onSubmit={handleRegisterSubmit} className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="col-span-2">
                                      <label className="text-[10px] text-cyan-500 uppercase font-bold tracking-widest mb-1 block">Nombre Completo</label>
                                      <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-black border border-cyan-900 rounded-lg p-3 text-white focus:border-cyan-400 outline-none transition-colors" placeholder="Ej: Juan Pérez" />
                                  </div>
                                  <div>
                                      <label className="text-[10px] text-cyan-500 uppercase font-bold tracking-widest mb-1 block">Cédula</label>
                                      <div className="relative">
                                          <IdentificationIcon className="absolute left-3 top-3 h-5 w-5 text-cyan-800"/>
                                          <input required type="text" value={newUser.cedula} onChange={e => setNewUser({...newUser, cedula: e.target.value})} className="w-full bg-black border border-cyan-900 rounded-lg p-3 pl-10 text-white focus:border-cyan-400 outline-none transition-colors" placeholder="1-1111-1111" />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-[10px] text-cyan-500 uppercase font-bold tracking-widest mb-1 block">Teléfono</label>
                                      <div className="relative">
                                          <PhoneIcon className="absolute left-3 top-3 h-5 w-5 text-cyan-800"/>
                                          <input required type="tel" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full bg-black border border-cyan-900 rounded-lg p-3 pl-10 text-white focus:border-cyan-400 outline-none transition-colors" placeholder="8888-8888" />
                                      </div>
                                  </div>
                                  <div className="col-span-2">
                                      <label className="text-[10px] text-cyan-500 uppercase font-bold tracking-widest mb-1 block">Correo Electrónico</label>
                                      <div className="relative">
                                          <MailIcon className="absolute left-3 top-3 h-5 w-5 text-cyan-800"/>
                                          <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-black border border-cyan-900 rounded-lg p-3 pl-10 text-white focus:border-cyan-400 outline-none transition-colors" placeholder="usuario@ejemplo.com" />
                                      </div>
                                  </div>
                              </div>

                              {registerError && (
                                  <div className="bg-red-900/20 border border-red-500/50 text-red-400 text-xs p-3 rounded">
                                      ⚠️ {registerError}
                                  </div>
                              )}

                              <div className="pt-4">
                                  <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest py-4 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2">
                                      <CpuIcon className="h-5 w-5"/> Iniciar Registro
                                  </button>
                              </div>
                          </form>
                      )}

                      {registerStep === 'processing' && (
                          <div className="flex flex-col items-center justify-center h-64 space-y-6 text-center">
                               <div className="relative w-20 h-20">
                                   <div className="absolute inset-0 border-4 border-cyan-900 rounded-full"></div>
                                   <div className="absolute inset-0 border-4 border-t-cyan-400 rounded-full animate-spin"></div>
                                   <CpuIcon className="absolute inset-0 m-auto h-8 w-8 text-cyan-400 animate-pulse"/>
                               </div>
                               <div>
                                   <h4 className="text-white font-bold uppercase tracking-widest animate-pulse">Encriptando Credenciales...</h4>
                                   <p className="text-xs text-cyan-700 font-mono mt-1">GENERATING_SECURE_HASH</p>
                               </div>
                          </div>
                      )}

                      {registerStep === 'success' && (
                          <div className="animate-fade-in-up text-center space-y-6">
                              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center border border-green-500">
                                  <CheckCircleIcon className="h-8 w-8 text-green-400"/>
                              </div>
                              
                              <div>
                                  <h3 className="text-2xl font-black text-white uppercase">¡Activo Registrado!</h3>
                                  <p className="text-sm text-brand-text-secondary mt-2">Copie las credenciales temporales.</p>
                              </div>

                              <div className="bg-black border border-cyan-900/50 rounded-xl p-4 text-left relative group">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                                  <p className="text-[10px] text-cyan-600 uppercase font-bold mb-1">Contraseña Generada</p>
                                  <p className="text-2xl font-mono text-white tracking-wider select-all">{generatedPassword}</p>
                                  <button 
                                    onClick={() => navigator.clipboard.writeText(generatedPassword)}
                                    className="absolute top-4 right-4 text-cyan-700 hover:text-cyan-400 transition-colors"
                                    title="Copiar"
                                  >
                                      <ClipboardCheckIcon className="h-5 w-5"/>
                                  </button>
                              </div>

                              <p className="text-xs text-yellow-500/80 bg-yellow-900/10 p-2 rounded border border-yellow-900/30">
                                  ⚠️ Entregue esta contraseña al usuario. Podrá cambiarla después.
                              </p>

                              <button onClick={handleCloseRegister} className="w-full bg-brand-tertiary hover:bg-brand-secondary border border-brand-border text-white py-3 rounded-lg transition-colors uppercase font-bold text-sm">
                                  Finalizar Misión
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

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

      <nav className="flex justify-center mb-8">
          <div className="bg-brand-secondary/80 backdrop-blur-md p-1.5 rounded-2xl border border-brand-border inline-flex gap-2 shadow-2xl relative group/nav">
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
                 </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 {(['mediodia', 'tarde', 'noche'] as DrawType[]).map((draw, idx) => {
                     const result = dailyResults.find(r => r.draw === draw) || { number: null, ballColor: null, reventadosNumber: null };
                     const hasResult = result.number !== null;
                     const isReventado = result.ballColor === 'roja';
                     
                     const theme = {
                         mediodia: { 
                             accent: 'text-fuchsia-400',
                             border: 'border-fuchsia-500/50',
                             glow: 'shadow-[0_0_50px_rgba(192,38,211,0.3)]',
                             bgGradient: 'from-fuchsia-900/40 to-purple-900/40',
                             icon: <SunIcon className="h-6 w-6 text-fuchsia-400"/>,
                             statusColor: 'bg-fuchsia-500',
                             title: 'MEDIODÍA'
                         },
                         tarde: { 
                             accent: 'text-orange-400',
                             border: 'border-orange-500/50',
                             glow: 'shadow-[0_0_50px_rgba(249,115,22,0.3)]',
                             bgGradient: 'from-orange-900/40 to-amber-900/40',
                             icon: <SunsetIcon className="h-6 w-6 text-orange-400"/>,
                             statusColor: 'bg-orange-500',
                             title: 'TARDE'
                         },
                         noche: { 
                             accent: 'text-cyan-400',
                             border: 'border-cyan-500/50',
                             glow: 'shadow-[0_0_50px_rgba(6,182,212,0.3)]',
                             bgGradient: 'from-cyan-900/40 to-blue-900/40',
                             icon: <MoonIcon className="h-6 w-6 text-cyan-400"/>,
                             statusColor: 'bg-cyan-500',
                             title: 'NOCHE'
                         }
                     }[draw];

                     return (
                        <div key={draw} className="relative group h-full perspective-1000" style={{animationDelay: `${idx * 150}ms`}}>
                            <div className={`absolute -inset-2 bg-gradient-to-b ${theme.bgGradient.replace('/40','/60')} rounded-[2rem] blur-xl opacity-40 group-hover:opacity-70 transition duration-700 animate-pulse-slow`}></div>
                            
                            <div className={`
                                relative min-h-[500px] h-full rounded-[2rem] border backdrop-blur-2xl bg-[#0b1221]/80 
                                ${isReventado ? 'border-red-500/60 shadow-[0_0_60px_rgba(220,38,38,0.4)]' : `${theme.border} ${theme.glow}`}
                                transition-all duration-500 flex flex-col overflow-hidden hover:-translate-y-2 hover:scale-[1.02]
                            `}>
                                
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
                                    
                                    <div className="flex flex-col items-end gap-1">
                                        <div className={`w-3 h-3 rounded-full ${hasResult ? (isReventado ? 'bg-red-500 animate-ping' : 'bg-green-500 shadow-[0_0_10px_#22c55e]') : 'bg-yellow-500 animate-pulse'}`}></div>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${hasResult ? 'border-green-500/30 text-green-400 bg-green-900/20' : 'border-yellow-500/30 text-yellow-400 bg-yellow-900/20'}`}>
                                            {hasResult ? (isReventado ? 'CRITICAL' : 'LOCKED') : 'PENDING'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-grow flex flex-col items-center justify-center relative z-10 py-4">
                                    {hasResult ? (
                                        <div className="relative animate-float">
                                            <div className={`w-40 h-40 rounded-full bg-gradient-to-b from-white/10 to-transparent border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-[0_0_40px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform duration-500 relative`}>
                                                <span className={`text-8xl font-black font-mono text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]`}>
                                                    {result.number}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center opacity-60">
                                            <div className="relative w-40 h-40 flex items-center justify-center">
                                                <div className={`absolute inset-4 border border-dashed ${theme.border} rounded-full animate-spin-slow`}></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                     <span className="text-4xl font-mono text-white/20">--</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 bg-black/40 backdrop-blur-md border-t border-white/5">
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
                                        {hasResult ? <RefreshIcon className="h-4 w-4"/> : <KeyIcon className="h-4 w-4"/>}
                                        {hasResult ? 'SYSTEM_OVERRIDE' : 'INPUT_DATA_ENTRY'}
                                    </button>
                                </div>
                            </div>
                        </div>
                     );
                 })}
             </div>
             
             {confirmAnim.isActive && (
                 <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                     <div className="relative w-full max-w-md bg-brand-primary border border-brand-accent rounded-2xl p-8">
                         <h3 className="text-white font-bold mb-4">Control de Sorteo</h3>
                         <input 
                            type="tel" 
                            value={drawNumber}
                            onChange={(e) => setDrawNumber(e.target.value)}
                            className="w-full bg-black border border-white/20 rounded p-4 text-center text-3xl font-mono text-white mb-4"
                            placeholder="00"
                            maxLength={2}
                         />
                         <div className="flex justify-center gap-4 mb-6">
                             <button onClick={() => setDrawBall('blanca')} className={`px-4 py-2 rounded border ${drawBall === 'blanca' ? 'bg-white text-black' : 'border-white/20'}`}>Blanca</button>
                             <button onClick={() => setDrawBall('roja')} className={`px-4 py-2 rounded border ${drawBall === 'roja' ? 'bg-red-600 border-red-600' : 'border-red-600/50 text-red-400'}`}>Reventada</button>
                         </div>
                         {drawBall === 'roja' && (
                             <input 
                                type="tel" 
                                value={drawRevNumber}
                                onChange={(e) => setDrawRevNumber(e.target.value)}
                                className="w-full bg-black border border-red-500/50 rounded p-2 text-center text-xl font-mono text-red-400 mb-4"
                                placeholder="Número Reventado"
                                maxLength={2}
                             />
                         )}
                         
                         {confirmAnim.step === 'processing' || confirmAnim.step === 'confirming' ? (
                             <div className="bg-black p-4 rounded font-mono text-xs text-green-400 h-32 overflow-y-auto">
                                 {confirmAnim.logs.map((l, i) => <div key={i}>{`> ${l}`}</div>)}
                             </div>
                         ) : (
                             <div className="flex gap-2">
                                 <Button onClick={handleCloseDrawModal} variant="secondary" className="flex-1">Cancelar</Button>
                                 <Button onClick={handleConfirmDraw} className="flex-1">Confirmar</Button>
                             </div>
                         )}
                     </div>
                 </div>
             )}
          </div>
      )}

      {activeTab === 'finance' && (
          <div className="animate-fade-in-up">
              <FinancialTicker transactions={transactions} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                  <Card className="lg:col-span-2" glowColor="from-cyan-500/20 to-blue-500/20">
                      <div className="flex justify-between items-center mb-6">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
                                  <CreditCardIcon className="h-6 w-6 text-cyan-400"/>
                              </div>
                              <h3 className="text-xl font-bold text-white uppercase">Resumen Semanal</h3>
                          </div>
                          <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/5">
                              <button onClick={() => handleWeekNav('prev')} className="p-1 hover:text-white text-gray-500 transition-colors"><ChevronLeftIcon className="h-4 w-4"/></button>
                              <span className="text-xs font-mono font-bold text-cyan-400 px-2">{selectedWeekStats.label}</span>
                              <button onClick={() => handleWeekNav('next')} className="p-1 hover:text-white text-gray-500 transition-colors"><ChevronRightIcon className="h-4 w-4"/></button>
                          </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                              <p className="text-[10px] text-brand-text-secondary uppercase">Entradas</p>
                              <p className="text-lg font-mono font-bold text-green-400">+{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.cashIn)}</p>
                          </div>
                          <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                              <p className="text-[10px] text-brand-text-secondary uppercase">Salidas</p>
                              <p className="text-lg font-mono font-bold text-red-400">-{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.cashOut)}</p>
                          </div>
                          <div className="bg-cyan-900/10 p-4 rounded-xl border border-cyan-500/20 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2 opacity-20">
                                  <CreditCardIcon className="h-8 w-8 text-cyan-400"/>
                              </div>
                              <p className="text-[10px] text-cyan-300 uppercase">Neto</p>
                              <p className={`text-2xl font-mono font-black ${selectedWeekStats.net >= 0 ? 'text-white' : 'text-red-400'}`}>
                                  {new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.net)}
                              </p>
                          </div>
                      </div>
                      <WeeklySparkline transactions={selectedWeekStats.txs} currentKey={selectedWeekKey} />
                  </Card>

                  <Card glowColor="from-purple-500/20 to-pink-500/20">
                      <div className="h-full flex flex-col justify-between">
                          <div>
                              <h3 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                                  <BoltIcon className="h-5 w-5 text-purple-400"/> Acciones Rápidas
                              </h3>
                              <p className="text-xs text-brand-text-secondary mb-6">Gestión directa de activos.</p>
                          </div>
                          <div className="space-y-3">
                              <Button onClick={() => setShowRegisterModal(true)} className="w-full bg-brand-tertiary hover:bg-brand-accent/20 border border-brand-border hover:border-brand-accent text-white justify-start">
                                  <UserPlusIcon className="h-5 w-5"/> Registrar Nuevo Cliente
                              </Button>
                              <Button className="w-full bg-brand-tertiary hover:bg-brand-accent/20 border border-brand-border hover:border-brand-accent text-white justify-start opacity-50 cursor-not-allowed">
                                  <GlobeAltIcon className="h-5 w-5"/> Reporte Global (Próximamente)
                              </Button>
                          </div>
                      </div>
                  </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-2 flex flex-col" glowColor="from-brand-accent/30 to-blue-600/30">
                      <div className="flex justify-between items-center mb-6 shrink-0">
                          <h3 className="text-xl font-bold text-white uppercase flex items-center gap-2">
                              <IdentificationIcon className="h-6 w-6 text-brand-accent"/> Directorio de Activos
                          </h3>
                          <div className="relative w-64">
                              <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-brand-text-secondary" />
                              <input 
                                  type="text" 
                                  placeholder="Buscar por nombre, cédula..." 
                                  className="w-full bg-black/40 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:border-brand-accent outline-none"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                              />
                          </div>
                      </div>

                      <div className="h-[400px] min-h-[400px] overflow-y-auto custom-scrollbar pr-2 space-y-3">
                          {filteredUsers.map(user => (
                              <div key={user.id} className={`bg-brand-primary/40 border ${expandedUserId === user.id ? 'border-brand-accent bg-brand-accent/5' : 'border-white/5'} rounded-xl overflow-hidden transition-all`}>
                                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => handleToggleUserCard(user.id)}>
                                      <div className="flex items-center gap-4">
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${user.blocked ? 'bg-red-900/50 text-red-400 border border-red-500/30' : 'bg-brand-tertiary text-white border border-white/10'}`}>
                                              {user.blocked ? <LockIcon className="h-4 w-4"/> : (user.name ? user.name.charAt(0) : '?')}
                                          </div>
                                          <div>
                                              <p className={`font-bold ${user.blocked ? 'text-red-400 line-through' : 'text-white'}`}>{user.name || 'Usuario'}</p>
                                              <p className="text-xs text-brand-text-secondary font-mono">{user.email}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-brand-success font-mono">{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(user.balance)}</span>
                                          <div className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${user.role === 'admin' ? 'bg-purple-900/30 border-purple-500/50 text-purple-400' : 'bg-blue-900/30 border-blue-500/50 text-blue-400'}`}>
                                              {user.role === 'admin' ? 'ADMIN' : 'USER'}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  {/* EXPANDED ACTIONS AREA */}
                                  {expandedUserId === user.id && (
                                      <div className="p-4 border-t border-white/5 bg-black/20 animate-fade-in-down">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                              
                                              {/* FINANCIAL ACTIONS */}
                                              <div className="space-y-3">
                                                  <p className="text-[10px] text-brand-text-secondary uppercase font-bold tracking-wider flex items-center gap-2">
                                                      <CreditCardIcon className="h-3 w-3"/> Gestión Financiera
                                                  </p>
                                                  <form onSubmit={(e) => handleSubmitFinance(e, user)} className="flex gap-2">
                                                      <div className="relative flex-grow">
                                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary font-bold">₡</span>
                                                          <input 
                                                              type="tel" 
                                                              placeholder="Monto" 
                                                              className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-8 pr-2 text-white text-sm focus:border-brand-accent outline-none"
                                                              value={amountInput}
                                                              onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9]/g, ''))}
                                                          />
                                                      </div>
                                                      <div className="flex gap-1">
                                                          <button 
                                                              type="submit" 
                                                              onClick={() => setTransactionMode('deposit')}
                                                              className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition-colors"
                                                              title="Recargar"
                                                          >
                                                              <ArrowTrendingUpIcon className="h-5 w-5"/>
                                                          </button>
                                                          <button 
                                                              type="submit" 
                                                              onClick={() => setTransactionMode('withdraw')}
                                                              className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg transition-colors"
                                                              title="Retirar"
                                                          >
                                                              <ArrowTrendingDownIcon className="h-5 w-5"/>
                                                          </button>
                                                      </div>
                                                  </form>
                                              </div>

                                              {/* SECURITY ACTIONS */}
                                              <div className="space-y-3">
                                                  <p className="text-[10px] text-brand-text-secondary uppercase font-bold tracking-wider flex items-center gap-2">
                                                      <ShieldCheckIcon className="h-3 w-3"/> Seguridad y Acceso
                                                  </p>
                                                  <div className="grid grid-cols-2 gap-2">
                                                      <button 
                                                          onClick={() => initiatePasswordReset(user)} 
                                                          className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 border border-yellow-600/30 rounded-lg py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                                                      >
                                                          <FingerPrintIcon className="h-3 w-3"/> Reset Pass
                                                      </button>
                                                      <button 
                                                          onClick={() => handleBlockClick(user.id, !!user.blocked)} 
                                                          className={`rounded-lg py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1 border ${user.blocked ? 'bg-green-600/20 hover:bg-green-600/40 text-green-500 border-green-600/30' : 'bg-orange-600/20 hover:bg-orange-600/40 text-orange-500 border-orange-600/30'}`}
                                                      >
                                                          <LockIcon className="h-3 w-3"/> {user.blocked ? 'Desbloquear' : 'Bloquear'}
                                                      </button>
                                                  </div>
                                                  
                                                  {/* Delete Button - Hidden for Current User */}
                                                  {user.id !== currentUser.id && (
                                                      <button 
                                                          type="button"
                                                          onClick={() => handleDeleteClick(user.id)}
                                                          className={`w-full rounded-lg py-2 text-xs font-bold transition-all flex items-center justify-center gap-2 border ${deleteConfirmUserId === user.id ? 'bg-red-600 text-white border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse' : 'bg-red-900/10 hover:bg-red-900/30 text-red-500 border-red-900/30'}`}
                                                      >
                                                          {deleteConfirmUserId === user.id ? (
                                                              processingUserId === user.id ? <RefreshIcon className="h-3 w-3 animate-spin"/> : <TrashIcon className="h-3 w-3"/>
                                                          ) : <TrashIcon className="h-3 w-3"/>}
                                                          {deleteConfirmUserId === user.id ? (processingUserId === user.id ? 'ELIMINANDO...' : '¿CONFIRMAR ELIMINACIÓN?') : 'Eliminar Usuario'}
                                                      </button>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          ))}
                          {filteredUsers.length === 0 && (
                              <div className="text-center py-8 text-brand-text-secondary">
                                  No se encontraron usuarios.
                              </div>
                          )}
                      </div>
                  </Card>

                  <Card glowColor="from-green-500/20 to-emerald-500/20">
                       <div className="flex items-center gap-3 mb-4">
                            <SparklesIcon className="h-5 w-5 text-green-400" />
                            <h3 className="font-bold text-white uppercase">Top Ganadores (Semanal)</h3>
                       </div>
                       <div className="space-y-3">
                           {/* Mock/Calculated Top Winners */}
                           {[...users].sort((a, b) => b.balance - a.balance).slice(0, 5).map((u, i) => (
                               <div key={u.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                                   <div className="flex items-center gap-3">
                                       <span className={`font-bold font-mono ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-brand-text-secondary'}`}>#{i+1}</span>
                                       <span className="text-gray-300">{u.name.split(' ')[0]}</span>
                                   </div>
                                   <span className="text-green-400 font-mono font-bold">
                                       {new Intl.NumberFormat('en-US', {notation: "compact", compactDisplay: "short"}).format(u.balance)}
                                   </span>
                               </div>
                           ))}
                       </div>
                  </Card>
              </div>
          </div>
      )}

      {activeTab === 'reports' && (
          <div className="animate-fade-in-up space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-end border-b border-brand-border pb-6">
                   <div>
                       <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                           <ClockIcon className="h-8 w-8 text-brand-accent" /> MÁQUINA DEL TIEMPO
                       </h2>
                       <p className="text-brand-text-secondary text-sm mt-2 max-w-lg">
                           Modifique la línea temporal de resultados pasados. 
                           <span className="text-red-400 font-bold ml-1">ADVERTENCIA: Esto alterará estadísticas históricas.</span>
                       </p>
                   </div>
                   <div className="bg-black/30 border border-brand-accent/30 rounded-xl p-4 flex items-center gap-4 mt-4 md:mt-0">
                       <CalendarDaysIcon className="h-6 w-6 text-brand-accent"/>
                       <div>
                           <label className="text-[10px] text-brand-text-secondary uppercase font-bold block mb-1">Fecha Objetivo</label>
                           <input 
                                type="date" 
                                value={historyDate}
                                onChange={handleDateChange}
                                className="bg-transparent text-white font-mono font-bold outline-none cursor-pointer"
                           />
                       </div>
                   </div>
              </div>

              {isTimeTraveling ? (
                  <div className="h-64 flex flex-col items-center justify-center space-y-4">
                      <div className="relative w-24 h-24">
                          <div className="absolute inset-0 border-4 border-brand-accent/20 rounded-full animate-ping"></div>
                          <div className="absolute inset-0 border-4 border-t-brand-accent rounded-full animate-spin"></div>
                          <ClockIcon className="absolute inset-0 m-auto h-10 w-10 text-brand-accent animate-pulse"/>
                      </div>
                      <p className="text-brand-accent font-mono text-sm tracking-widest">CALIBRANDO FLUJO TEMPORAL...</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {(['mediodia', 'tarde', 'noche'] as DrawType[]).map((draw) => (
                          <Card key={draw} glowColor={draw === 'mediodia' ? 'from-orange-500/20 to-yellow-500/20' : draw === 'tarde' ? 'from-purple-500/20 to-pink-500/20' : 'from-blue-500/20 to-cyan-500/20'}>
                              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                  {draw === 'mediodia' ? <SunIcon className="h-6 w-6 text-orange-400"/> : draw === 'tarde' ? <SunsetIcon className="h-6 w-6 text-purple-400"/> : <MoonIcon className="h-6 w-6 text-cyan-400"/>}
                                  <h3 className="text-xl font-black text-white uppercase">{DRAW_LABELS[draw]}</h3>
                              </div>

                              <div className="space-y-4">
                                  <div>
                                      <label className="text-xs text-brand-text-secondary uppercase font-bold mb-2 block">Número Ganador</label>
                                      <input 
                                          type="text" 
                                          maxLength={2}
                                          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-center text-2xl font-mono text-white focus:border-brand-accent outline-none"
                                          placeholder="--"
                                          value={timeMachineState[draw].number}
                                          onChange={(e) => setTimeMachineState({
                                              ...timeMachineState,
                                              [draw]: { ...timeMachineState[draw], number: e.target.value.replace(/[^0-9]/g, '').slice(0,2) }
                                          })}
                                      />
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                      <button 
                                          onClick={() => setTimeMachineState({...timeMachineState, [draw]: { ...timeMachineState[draw], ball: 'blanca', reventados: '' }})}
                                          className={`p-3 rounded-lg border text-xs font-bold uppercase flex flex-col items-center gap-2 transition-all ${timeMachineState[draw].ball === 'blanca' ? 'bg-white text-black border-white' : 'border-white/10 text-brand-text-secondary hover:border-white/30'}`}
                                      >
                                          <div className="w-4 h-4 rounded-full border border-black/20 bg-gray-100"></div>
                                          Blanca
                                      </button>
                                      <button 
                                          onClick={() => setTimeMachineState({...timeMachineState, [draw]: { ...timeMachineState[draw], ball: 'roja' }})}
                                          className={`p-3 rounded-lg border text-xs font-bold uppercase flex flex-col items-center gap-2 transition-all ${timeMachineState[draw].ball === 'roja' ? 'bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'border-white/10 text-brand-text-secondary hover:border-red-500/30 hover:text-red-400'}`}
                                      >
                                          <div className="w-4 h-4 rounded-full bg-red-500"></div>
                                          Reventada
                                      </button>
                                  </div>

                                  {timeMachineState[draw].ball === 'roja' && (
                                      <div className="animate-fade-in-up">
                                           <label className="text-xs text-red-400 uppercase font-bold mb-2 block flex items-center gap-2">
                                               <FireIcon className="h-3 w-3"/> Número Reventado
                                           </label>
                                           <input 
                                              type="text" 
                                              maxLength={2}
                                              className="w-full bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-center text-xl font-mono text-red-400 focus:border-red-400 outline-none shadow-[0_0_10px_rgba(220,38,38,0.1)]"
                                              placeholder={timeMachineState[draw].number || "--"}
                                              value={timeMachineState[draw].reventados}
                                              onChange={(e) => setTimeMachineState({
                                                  ...timeMachineState,
                                                  [draw]: { ...timeMachineState[draw], reventados: e.target.value.replace(/[^0-9]/g, '').slice(0,2) }
                                              })}
                                          />
                                      </div>
                                  )}
                              </div>
                          </Card>
                      ))}
                  </div>
              )}

              <div className="flex justify-end pt-6 border-t border-brand-border">
                   <Button 
                      onClick={handleTimelineStabilize} 
                      disabled={stabilizationState !== 'idle' || isTimeTraveling}
                      className={`w-full md:w-auto ${stabilizationState === 'complete' ? 'bg-green-600' : 'bg-brand-accent'}`}
                   >
                       {stabilizationState === 'idle' && <><BoltIcon className="h-5 w-5"/> ESTABILIZAR LÍNEA DE TIEMPO</>}
                       {stabilizationState === 'stabilizing' && <><RefreshIcon className="h-5 w-5 animate-spin"/> REESCRIBIENDO HISTORIA...</>}
                       {stabilizationState === 'complete' && <><CheckCircleIcon className="h-5 w-5"/> CAMBIOS APLICADOS</>}
                   </Button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
