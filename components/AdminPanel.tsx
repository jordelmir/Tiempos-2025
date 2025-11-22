
import React, { useState, useMemo, useEffect } from 'react';
import type { User, DailyResult, DrawType, BallColor, Transaction, HistoryResult, Ticket } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import ActionModal, { ActionType } from './ActionModal';
import { 
    SearchIcon, 
    CreditCardIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CheckCircleIcon,
    BoltIcon,
    ClockIcon,
    UserPlusIcon,
    LockIcon,
    WalletIcon,
    CpuIcon,
    SparklesIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    TrashIcon,
    KeyIcon,
    RefreshIcon,
    UserCircleIcon,
    IdentificationIcon,
    ExclamationTriangleIcon,
    MailIcon,
    PhoneIcon,
    ClipboardIcon,
    ClipboardCheckIcon
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
  onPurchase: (userId: string, tickets: Omit<Ticket, 'id' | 'purchaseDate'>[]) => Promise<{success: boolean, message?: string}>;
}

type TabView = 'finance' | 'draws' | 'reports';

interface DrawConfirmationState {
    isActive: boolean;
    type: 'normal' | 'reventado' | null;
    step: 'input' | 'processing' | 'confirming' | 'complete' | 'error';
    drawType: DrawType | null;
    logs: string[];
}

const getWeekNumber = (d: Date): { year: number, week: number } => {
    if (!d || isNaN(d.getTime())) return { year: 0, week: 0 };
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
        <div className="w-full bg-[#020617] border-y border-brand-accent/20 overflow-hidden relative h-8 flex items-center mb-6 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.05)]">
            <div className="absolute left-0 z-10 bg-gradient-to-r from-brand-primary to-transparent h-full w-20"></div>
            <div className="absolute right-0 z-10 bg-gradient-to-l from-brand-primary to-transparent h-full w-20"></div>
            
            <div className="flex animate-marquee whitespace-nowrap gap-12 items-center pl-4">
                {[...recent, ...recent].map((tx, i) => (
                    <div key={`${tx.id}-${i}`} className="flex items-center gap-3 text-[10px] font-mono tracking-widest group cursor-default opacity-70 hover:opacity-100 transition-opacity">
                        <span className={`w-1.5 h-1.5 rounded-sm rotate-45 ${tx.type === 'deposit' || tx.type === 'winnings' ? 'bg-brand-success' : 'bg-brand-danger'}`}></span>
                        <span className="text-brand-text-secondary font-bold uppercase">{(tx.userName || 'UNK').split(' ')[0]}</span>
                        <span className={tx.type === 'deposit' || tx.type === 'winnings' ? 'text-brand-success font-black' : 'text-brand-danger font-black'}>
                            {tx.type === 'withdraw' ? '-' : '+'}{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(tx.amount)}
                        </span>
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
        if (!tx.date || isNaN(new Date(tx.date).getTime())) return; 
        const day = new Date(tx.date).getDay(); 
        if (tx.type === 'deposit') dailyNet[day] += (tx.amount || 0);
        if (tx.type === 'withdraw') dailyNet[day] -= (tx.amount || 0);
    });

    const maxVal = Math.max(...dailyNet.map(Math.abs), 1000);
    const normalize = (val: number) => {
        if (isNaN(val)) return 50;
        return 50 - (val / maxVal) * 40;
    };
    
    const points = dailyNet.map((val, i) => `${i * 16.6},${normalize(val)}`).join(' ');

    return (
        <div className="w-full h-40 relative mt-4 bg-[#050910] rounded-xl border border-white/5 p-4 overflow-hidden group shadow-inner">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
             <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-brand-accent/5 to-transparent"></div>
             
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible relative z-10">
                <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeWidth="0.2" strokeDasharray="2 2" />
                
                <path 
                    d={`M0,100 L0,${normalize(dailyNet[0])} ${dailyNet.map((val, i) => `L${i * 16.6},${normalize(val)}`).join(' ')} L100,${normalize(dailyNet[6])} L100,100 Z`}
                    fill="url(#areaGradient)"
                    opacity="0.3"
                />

                <polyline 
                    points={points} 
                    fill="none" 
                    stroke="url(#neonGradient)" 
                    strokeWidth="1" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_5px_rgba(99,102,241,0.8)]"
                />
                <defs>
                    <linearGradient id="neonGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#06B6D4" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>

                {dailyNet.map((val, i) => (
                    <g key={i} className="group/point">
                        <circle cx={i * 16.6} cy={normalize(val)} r="1.5" className={`transition-all duration-300 ${val >= 0 ? 'fill-brand-cyan' : 'fill-brand-danger'} group-hover/point:r-2`} />
                        <text x={i * 16.6} y="110" fontSize="5" fill="#64748B" textAnchor="middle" fontFamily="monospace" fontWeight="bold">{days[i]}</text>
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
    transactions, 
    onRecharge, 
    onWithdraw, 
    onUpdateResult, 
    onUpdateHistory,
    onRegisterClient,
    onForceResetPassword,
    onToggleBlock,
    onDeleteUser,
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
  
  // --- REGISTER MODAL STATE ---
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerStep, setRegisterStep] = useState<'form' | 'processing' | 'success'>('form');
  const [newUser, setNewUser] = useState({ cedula: '', name: '', email: '', phone: '' });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [isCopied, setIsCopied] = useState(false);

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

  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]); 
  const [timeMachineState, setTimeMachineState] = useState({
      mediodia: { number: '', ball: 'blanca' as BallColor, reventados: '' },
      tarde: { number: '', ball: 'blanca' as BallColor, reventados: '' },
      noche: { number: '', ball: 'blanca' as BallColor, reventados: '' }
  });
  const [stabilizationState, setStabilizationState] = useState<'idle' | 'stabilizing' | 'complete'>('idle');

  const DRAW_LABELS: Record<DrawType, string> = {
    mediodia: 'MEDIODÍA',
    tarde: 'TARDE',
    noche: 'NOCHE'
  };

  // --- DATA PROCESSING ---
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
                  label: `S${week}`,
                  isCurrent: key === currentKey
              };
          }

          if (tx.type === 'deposit') grouped[key].cashIn += (tx.amount || 0);
          else if (tx.type === 'withdraw') grouped[key].cashOut += (tx.amount || 0);
          
          grouped[key].txs.push(tx);
      });

      if (!grouped[currentKey]) {
          grouped[currentKey] = {
              cashIn: 0, cashOut: 0, net: 0, txs: [],
              label: `S${currentWeek.week}`,
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
      if (!data) return { cashIn: 0, cashOut: 0, net: 0, txs: [], label: 'N/A', profitMargin: "0.0" };
      const profitMargin = data.cashIn > 0 ? ((data.net / data.cashIn) * 100).toFixed(1) : "0.0";
      return { cashIn: data.cashIn, cashOut: data.cashOut, net: data.net, txs: data.txs, label: data.label, profitMargin };
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
    setExpandedUserId(null); 
  };

  const handleBlockClick = async (userId: string, currentStatus: boolean) => {
      setProcessingUserId(userId);
      await onToggleBlock(userId, currentStatus);
      setProcessingUserId(null);
  };

  const handleDeleteClick = async (userId: string) => {
      if (deleteConfirmUserId === userId) {
          setProcessingUserId(userId);
          await onDeleteUser(userId);
          setProcessingUserId(null);
          setDeleteConfirmUserId(null);
      } else {
          setDeleteConfirmUserId(userId);
          setTimeout(() => setDeleteConfirmUserId(null), 3000);
      }
  };

  const generateSecurePassword = () => `Tiempos${Math.random().toString(36).slice(-6).toUpperCase()}!`;

  const resetRegisterForm = () => {
      setNewUser({ cedula: '', name: '', email: '', phone: '' });
      setRegisterStep('form');
      setRegisterError('');
      setGeneratedPassword('');
      setIsCopied(false);
  };

  const handleCloseRegisterModal = () => {
      setShowRegisterModal(false);
      setTimeout(resetRegisterForm, 300); // Wait for animation to close
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterStep('processing');
    const tempPassword = generateSecurePassword();
    setGeneratedPassword(tempPassword);
    const result = await onRegisterClient({ ...newUser, password: tempPassword });
    if (result.error) {
        setRegisterStep('form');
        setRegisterError(result.error.message || 'Error al crear usuario');
    } else {
        setRegisterStep('success');
    }
  };

  const handleCopyPassword = () => {
      navigator.clipboard.writeText(generatedPassword);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  const initiatePasswordReset = (user: User) => {
    if (window.confirm(`¿⚠️ ATENCIÓN: Estás seguro de restablecer la contraseña para ${user.name}? Se enviará un enlace de recuperación al correo: ${user.email}.`)) {
        onForceResetPassword(user.id);
        alert('✅ Comando de restablecimiento enviado correctamente. Verifique la bandeja de entrada del usuario.');
    }
  };

  const openDrawManager = (draw: DrawType, result: DailyResult) => {
    setEditingDraw(draw);
    setDrawNumber(result.number || '');
    setDrawBall(result.ballColor || 'blanca');
    setDrawRevNumber(result.reventadosNumber || '');
    setConfirmAnim({
        isActive: true,
        type: 'normal',
        step: 'input',
        drawType: draw,
        logs: []
    });
  };

  const handleCloseDrawModal = () => {
      setConfirmAnim(prev => ({...prev, isActive: false}));
      setEditingDraw(null);
  };

  const handleConfirmDraw = async () => {
      if(!editingDraw) return;
      setConfirmAnim(prev => ({ ...prev, step: 'processing', logs: ['Iniciando conexión segura...', 'Validando permisos de administrador...', 'Escribiendo resultado en la cadena...'] }));
      await new Promise(r => setTimeout(r, 1500));
      const success = await onUpdateResult(editingDraw, drawNumber, drawBall, drawBall === 'roja' ? drawRevNumber : null);
      if(success) {
          setConfirmAnim(prev => ({ ...prev, step: 'complete', logs: [...prev.logs, '¡RESULTADO CONFIRMADO!'] }));
          setTimeout(handleCloseDrawModal, 1000);
      } else {
          setConfirmAnim(prev => ({ ...prev, step: 'error', logs: [...prev.logs, 'ERROR: Transacción fallida.'] }));
      }
  };

  // --- GLOBAL STATS ---
  const totalSystemBalance = users.reduce((acc, u) => acc + u.balance, 0);
  const activeUsers = users.filter(u => !u.blocked).length;

  return (
    <div className="space-y-8 relative min-h-[85vh] font-sans text-brand-text-primary pb-20">
      <ActionModal isOpen={actionModal.isOpen} type={actionModal.type} amount={actionModal.amount} details={actionModal.details} onClose={() => setActionModal({...actionModal, isOpen: false})} />

      {/* --- COMMAND CENTER HEADER --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0B101B]/80 backdrop-blur-md border border-brand-accent/20 p-4 rounded-xl relative overflow-hidden group shadow-lg">
              <div className="absolute inset-0 bg-brand-accent/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></div>
              <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest mb-1 flex items-center gap-2">
                  <UserPlusIcon className="h-3 w-3"/> Usuarios Activos
              </p>
              <p className="text-2xl font-black font-mono text-white tracking-tighter">{activeUsers}<span className="text-xs text-gray-500 ml-1">/ {users.length}</span></p>
          </div>
          <div className="bg-[#0B101B]/80 backdrop-blur-md border border-brand-success/20 p-4 rounded-xl relative overflow-hidden group shadow-lg">
              <div className="absolute inset-0 bg-brand-success/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></div>
              <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest mb-1 flex items-center gap-2">
                  <WalletIcon className="h-3 w-3"/> Liquidez Total
              </p>
              <p className="text-2xl font-black font-mono text-brand-success tracking-tighter">
                  {new Intl.NumberFormat('en-US', {notation: "compact", compactDisplay: "short"}).format(totalSystemBalance)}
              </p>
          </div>
          <div className="bg-[#0B101B]/80 backdrop-blur-md border border-brand-cyan/20 p-4 rounded-xl relative overflow-hidden group md:col-span-2 shadow-lg">
             <div className="flex justify-between items-center h-full">
                 <div>
                     <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest mb-1 flex items-center gap-2">
                        <CpuIcon className="h-3 w-3 animate-pulse"/> Core Status
                     </p>
                     <div className="flex items-center gap-2">
                         <span className="w-2 h-2 bg-brand-success rounded-full animate-pulse"></span>
                         <span className="text-xs font-mono text-brand-success font-bold">ONLINE - v3.0.2</span>
                     </div>
                 </div>
                 {/* Server Rack Visual */}
                 <div className="hidden md:flex gap-1 items-end h-8 opacity-50">
                     {[60, 80, 40, 90, 50, 70, 40, 60, 80, 30].map((h, i) => (
                         <div key={i} style={{height: `${h}%`}} className="w-1.5 bg-brand-cyan rounded-t-sm animate-pulse" />
                     ))}
                 </div>
             </div>
          </div>
      </div>

      {/* --- HOLOGRAPHIC NAVIGATION RAIL --- */}
      <nav className="sticky top-20 z-40 flex justify-center mb-10">
          <div className="bg-[#050910]/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] inline-flex relative overflow-hidden">
              <div 
                  className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-brand-accent to-purple-600 transition-all duration-300 ease-out shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                  style={{
                      left: activeTab === 'finance' ? '6px' : activeTab === 'draws' ? 'calc(33.33% + 6px)' : 'calc(66.66% + 6px)',
                      width: 'calc(33.33% - 12px)'
                  }}
              ></div>

              {[
                  { id: 'finance', label: 'FINANZAS', icon: CreditCardIcon },
                  { id: 'draws', label: 'SORTEOS', icon: BoltIcon },
                  { id: 'reports', label: 'TIME_MAC', icon: ClockIcon }
              ].map((tab) => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabView)}
                      className={`relative z-10 w-32 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 group ${activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                      <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'animate-bounce-in' : ''}`}/>
                      <span className="text-[9px] font-black font-mono tracking-widest">{tab.label}</span>
                  </button>
              ))}
          </div>
      </nav>

      {/* --- FINANCE VIEW --- */}
      {activeTab === 'finance' && (
           <div className="animate-fade-in-up">
              <FinancialTicker transactions={transactions} />
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                  {/* Left Column: Charts & Stats (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                      <Card glowColor="from-brand-cyan/20 to-brand-accent/20" className="h-full">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-3">
                                  <ArrowTrendingUpIcon className="h-6 w-6 text-brand-cyan"/> Flujo de Caja
                              </h3>
                              <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/5">
                                  <button onClick={() => handleWeekNav('prev')} className="p-2 hover:bg-white/5 rounded text-gray-400 hover:text-white"><ChevronLeftIcon className="h-4 w-4"/></button>
                                  <span className="text-xs font-mono font-bold text-brand-cyan px-4 uppercase">{selectedWeekStats.label}</span>
                                  <button onClick={() => handleWeekNav('next')} className="p-2 hover:bg-white/5 rounded text-gray-400 hover:text-white"><ChevronRightIcon className="h-4 w-4"/></button>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-2">
                              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Entradas</p>
                                  <p className="text-lg font-mono font-black text-brand-success">+{new Intl.NumberFormat('en-US', {notation: "compact"}).format(selectedWeekStats.cashIn)}</p>
                              </div>
                              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Salidas</p>
                                  <p className="text-lg font-mono font-black text-brand-danger">-{new Intl.NumberFormat('en-US', {notation: "compact"}).format(selectedWeekStats.cashOut)}</p>
                              </div>
                              <div className="bg-brand-accent/10 p-4 rounded-xl border border-brand-accent/20 relative overflow-hidden">
                                  <div className="absolute inset-0 bg-brand-accent/10 animate-pulse-slow"></div>
                                  <p className="text-[9px] text-brand-accent uppercase tracking-widest mb-1 relative z-10">Neto</p>
                                  <p className="text-lg font-mono font-black text-white relative z-10">{new Intl.NumberFormat('en-US', {notation: "compact"}).format(selectedWeekStats.net)}</p>
                              </div>
                          </div>
                          <WeeklySparkline transactions={selectedWeekStats.txs} currentKey={selectedWeekKey} />
                      </Card>
                  </div>

                  {/* Right Column: Actions & Top Winner (4 cols) */}
                  <div className="lg:col-span-4 flex flex-col gap-6">
                     {/* Top Winner Card - FIXED HEIGHT & LAYOUT */}
                     <div className="flex-grow min-h-[200px] relative group">
                         <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 to-orange-600/20 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                         <div className="relative h-full bg-[#050910] border border-brand-gold/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent"></div>
                             <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-gold to-orange-600 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-float">
                                 <SparklesIcon className="h-8 w-8 text-white"/>
                             </div>
                             <h3 className="text-white font-bold uppercase mb-1 tracking-widest text-xs">Top Ganador</h3>
                             {users.length > 0 && (
                                 <>
                                    <p className="text-2xl font-black text-brand-gold drop-shadow-md truncate w-full px-4">
                                        {[...users].sort((a,b) => b.balance - a.balance)[0].name.split(' ')[0]}
                                    </p>
                                    <p className="text-sm font-mono text-gray-400 mt-1">
                                        ₡{[...users].sort((a,b) => b.balance - a.balance)[0].balance.toLocaleString()}
                                    </p>
                                 </>
                             )}
                         </div>
                     </div>
                     
                     {/* BUTTON - NUEVO JUGADOR (EMERALD GEMSTONE EDITION -> BLACK NEON CORE) */}
                     <button
                        onClick={() => setShowRegisterModal(true)}
                        className="relative w-full h-32 group isolate" 
                     >
                        {/* 1. THICKER GEMSTONE GLOW (Backlight - Maintained) */}
                        <div className="absolute -inset-3 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 rounded-[2rem] blur-2xl opacity-40 group-hover:opacity-100 transition duration-500 animate-pulse-slow -z-10"></div>
                        
                        {/* 2. OUTER RIM (The Gemstone Edge) */}
                        <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-400 via-white to-teal-400 rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition duration-300 -z-10"></div>

                        {/* 3. MAIN CONTAINER (BLACK NEON CORE) */}
                        {/* Changed bg from #022c22 to #020202 (Black) for high contrast */}
                        <div className="relative h-full w-full bg-[#020202] rounded-2xl border border-emerald-500/30 group-hover:border-emerald-400/80 overflow-hidden flex items-center justify-between px-6 z-10 shadow-[inset_0_0_20px_rgba(0,0,0,1)] transition-colors duration-300">
                                
                                {/* Background Texture - Darker now */}
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-40 mix-blend-color-dodge"></div>
                                
                                {/* Internal Neon Pulse (The "Black Neon" feel) */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>

                                {/* TEXT SECTION */}
                                <div className="relative z-20 flex flex-col items-start gap-1 flex-1 min-w-0 pr-4">
                                {/* High contrast text */}
                                <span className="text-xl md:text-2xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(16,185,129,0.8)] leading-none truncate w-full group-hover:text-emerald-300 transition-colors">
                                    NUEVO JUGADOR
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping box-content border border-emerald-900"></span>
                                        <span className="text-[9px] font-mono text-emerald-500/70 tracking-widest font-bold group-hover:text-emerald-400 transition-colors">
                                            /// INITIALIZE_CORE
                                        </span>
                                </div>
                                </div>
                                
                                {/* ICON SECTION - Floating Orb */}
                                <div className="relative z-20 flex-shrink-0">
                                <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 group-hover:opacity-60 transition-opacity rounded-full"></div>
                                <div className="w-14 h-14 rounded-xl bg-black border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3 group-hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] group-hover:bg-emerald-950">
                                    <UserPlusIcon className="h-7 w-7"/>
                                </div>
                                </div>
                        </div>
                     </button>
                  </div>
              </div>
              
              {/* USER DIRECTORY GRID (RE-ENGINEERED FOR STABILITY) */}
              <div className="mt-8">
                  <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4">
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                          <span className="w-2 h-8 bg-brand-accent rounded-sm"></span>
                          Directorio de Usuarios
                      </h2>
                      <div className="relative group w-full md:w-72">
                          <div className="absolute -inset-0.5 bg-brand-accent/30 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                          <input 
                              type="text" 
                              placeholder="BUSCAR POR ID / NOMBRE..." 
                              className="relative w-full bg-black border border-white/10 rounded-lg pl-10 pr-4 py-3 text-xs text-white focus:border-brand-accent outline-none font-mono uppercase placeholder:normal-case"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          <SearchIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-500"/>
                      </div>
                  </div>
                  
                  {/* THE GRID FIX: strict grid-cols and h-full cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
                      {filteredUsers.map(user => (
                          <div key={user.id} className="relative group/card h-full">
                              {/* Hover Glow Effect */}
                              <div className={`absolute -inset-[1px] rounded-xl bg-gradient-to-b ${user.blocked ? 'from-red-900 to-black' : 'from-brand-cyan/50 to-brand-accent/50'} opacity-0 group-hover/card:opacity-100 transition duration-500 blur-sm`}></div>
                              
                              <div className="relative h-full bg-[#050910] border border-white/5 rounded-xl overflow-hidden flex flex-col transition-all duration-300 group-hover/card:border-transparent shadow-xl">
                                  {/* Header Section */}
                                  <div className="p-5 flex items-start justify-between gap-3 bg-white/[0.02]">
                                      <div className="flex-1 min-w-0"> {/* min-w-0 ensures truncate works in flex child */}
                                          <div className="flex items-center gap-2 mb-1">
                                              <h4 className={`font-bold uppercase tracking-wide text-sm truncate ${user.blocked ? 'text-red-500 line-through' : 'text-white'}`}>
                                                  {user.name}
                                              </h4>
                                              {user.blocked && <span className="text-[9px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded font-bold">BLOQ</span>}
                                          </div>
                                          <div className="flex flex-col gap-0.5 text-[10px] text-gray-500 font-mono">
                                              <span className="flex items-center gap-1"><IdentificationIcon className="h-3 w-3"/> {user.cedula || 'N/A'}</span>
                                              <span>{user.email}</span>
                                          </div>
                                      </div>
                                      <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-sm border ${user.role === 'admin' ? 'bg-purple-900/20 border-purple-500/30 text-purple-400' : 'bg-brand-tertiary border-white/10 text-gray-400'}`}>
                                          {user.name.charAt(0)}
                                      </div>
                                  </div>

                                  {/* Body Section: Balance & Input */}
                                  <div className="p-5 pt-2 flex-grow flex flex-col justify-between">
                                      <div className="mb-4">
                                          <div className="text-[10px] text-brand-text-secondary uppercase tracking-widest mb-1">Saldo Disponible</div>
                                          <div className="text-2xl font-black font-mono text-white truncate">
                                              ₡{user.balance.toLocaleString()}
                                          </div>
                                      </div>

                                      {/* Quick Action Input */}
                                      <form onSubmit={(e) => handleSubmitFinance(e, user)} className="flex gap-2 mt-auto">
                                          <div className="relative flex-grow">
                                              <input 
                                                  type="tel" 
                                                  placeholder="Monto..." 
                                                  className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-xs text-white outline-none focus:border-brand-accent font-mono focus:bg-black transition-colors"
                                                  onClick={() => setExpandedUserId(user.id)}
                                                  onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9]/g, ''))}
                                                  value={expandedUserId === user.id ? amountInput : ''}
                                              />
                                          </div>
                                          <button type="submit" onClick={() => setTransactionMode('deposit')} className="w-8 h-8 bg-brand-success/10 hover:bg-brand-success border border-brand-success/30 text-brand-success hover:text-black rounded flex items-center justify-center transition-colors" title="Depositar"><ArrowTrendingUpIcon className="h-3 w-3"/></button>
                                          <button type="submit" onClick={() => setTransactionMode('withdraw')} className="w-8 h-8 bg-brand-danger/10 hover:bg-brand-danger border border-brand-danger/30 text-brand-danger hover:text-white rounded flex items-center justify-center transition-colors" title="Retirar"><ArrowTrendingDownIcon className="h-3 w-3"/></button>
                                      </form>
                                  </div>

                                  {/* Footer Section: Admin Controls */}
                                  <div className="px-5 py-3 bg-black/40 border-t border-white/5 flex justify-between items-center gap-2">
                                      <button 
                                        onClick={() => initiatePasswordReset(user)} 
                                        className="text-[9px] font-bold text-amber-500 hover:text-amber-300 transition-colors flex items-center gap-1.5 bg-amber-900/10 hover:bg-amber-900/30 px-3 py-1.5 rounded border border-amber-500/20 hover:border-amber-500/50"
                                      >
                                          <KeyIcon className="h-3 w-3"/> RESTABLECER CONTRASEÑA
                                      </button>
                                      
                                      <div className="flex gap-2 items-center">
                                          {/* BLOCK TOGGLE */}
                                          <button 
                                            onClick={() => handleBlockClick(user.id, !!user.blocked)} 
                                            disabled={processingUserId === user.id}
                                            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${user.blocked ? 'text-brand-success bg-brand-success/10' : 'text-gray-600 hover:text-white hover:bg-white/10'}`}
                                            title={user.blocked ? "Desbloquear" : "Bloquear"}
                                          >
                                              {processingUserId === user.id ? <RefreshIcon className="h-3 w-3 animate-spin"/> : (user.blocked ? <CheckCircleIcon className="h-3 w-3"/> : <LockIcon className="h-3 w-3"/>)}
                                          </button>
                                          
                                          {/* DANGER ZONE - DELETE BUTTON */}
                                          {user.id !== currentUser.id && (
                                              <button 
                                                onClick={() => handleDeleteClick(user.id)} 
                                                disabled={processingUserId === user.id}
                                                className={`
                                                    relative h-7 rounded flex items-center justify-center transition-all duration-300 overflow-hidden
                                                    ${deleteConfirmUserId === user.id 
                                                        ? 'bg-red-600 text-white w-24 shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse' 
                                                        : 'text-gray-600 hover:text-red-500 hover:bg-red-500/10 w-7'}
                                                `}
                                                title={deleteConfirmUserId === user.id ? "CONFIRMAR ELIMINACIÓN" : "Eliminar Usuario"}
                                              >
                                                  {deleteConfirmUserId === user.id ? (
                                                      <div className="flex items-center gap-1 text-[9px] font-black uppercase whitespace-nowrap px-2">
                                                          <ExclamationTriangleIcon className="h-3 w-3"/> Confirmar
                                                      </div>
                                                  ) : (
                                                      <TrashIcon className="h-3 w-3"/>
                                                  )}
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
           </div>
      )}

      {/* --- DRAWS MONITOR VIEW --- */}
      {activeTab === 'draws' && (
          <div className="animate-fade-in-up">
             <div className="flex items-center gap-4 mb-8">
                 <div className="p-3 bg-brand-accent/20 rounded-xl border border-brand-accent/30 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                     <CpuIcon className="h-8 w-8 text-brand-accent animate-pulse"/>
                 </div>
                 <div>
                     <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Monitor de Sorteos</h2>
                     <p className="text-xs text-gray-500 font-mono">CONTROL DE RESULTADOS CENTRALIZADO</p>
                 </div>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {(['mediodia', 'tarde', 'noche'] as DrawType[]).map(draw => {
                     const result = dailyResults.find(r => r.draw === draw);
                     const isOpen = !result?.number;
                     
                     // Intense backlight config
                     const intenseGlow = draw === 'mediodia' 
                        ? 'from-orange-500 via-yellow-500 to-orange-600' 
                        : draw === 'tarde' 
                            ? 'from-purple-600 via-pink-500 to-purple-700' 
                            : 'from-blue-600 via-cyan-500 to-blue-700';

                     return (
                        <div key={draw} className="relative group hover:scale-[1.02] transition-transform duration-500">
                             {/* EXTRA BACKLIGHT GLOW LAYER */}
                             <div className={`absolute -inset-4 bg-gradient-to-r ${intenseGlow} rounded-[2rem] blur-2xl opacity-30 group-hover:opacity-60 transition duration-700 animate-pulse-slow`}></div>

                            <Card glowColor={intenseGlow} className="relative z-10">
                                <div className="flex justify-between items-start mb-8">
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest drop-shadow-md">{DRAW_LABELS[draw]}</h3>
                                    <div className={`flex items-center gap-2 px-2 py-1 rounded border ${isOpen ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-brand-success/10 border-brand-success/30 text-brand-success'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-yellow-500 animate-pulse' : 'bg-brand-success'}`}></div>
                                        <span className="text-[9px] font-bold uppercase">{isOpen ? 'PENDIENTE' : 'CERRADO'}</span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col items-center justify-center py-8 relative">
                                    {result?.number ? (
                                        <div className="relative">
                                            <div className={`absolute inset-0 blur-3xl opacity-60 ${result.ballColor === 'roja' ? 'bg-red-600' : 'bg-white'}`}></div>
                                            <div className="text-8xl font-black font-mono tracking-tighter text-white relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
                                                {result.number}
                                            </div>
                                            {result.ballColor === 'roja' && <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded uppercase tracking-widest shadow-[0_0_10px_#EF4444] animate-pulse">Reventado</div>}
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-spin-slow"></div>
                                            <span className="text-4xl text-white/10 font-black">--</span>
                                        </div>
                                    )}
                                </div>

                                <Button className="w-full mt-8" variant={isOpen ? "primary" : "secondary"} onClick={() => openDrawManager(draw, result || { number: null, ballColor: null, reventadosNumber: null } as any)}>
                                    <KeyIcon className="h-4 w-4"/> {isOpen ? 'INGRESAR RESULTADO' : 'MODIFICAR DATOS'}
                                </Button>
                            </Card>
                        </div>
                     )
                 })}
             </div>
             
             {/* Draw Edit Modal */}
             {confirmAnim.isActive && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                     <div className="bg-[#0B101B] p-8 rounded-2xl border border-brand-accent w-full max-w-md animate-zoom-in-fast relative overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.3)]">
                         <h3 className="text-xl font-bold text-white mb-6 uppercase border-b border-white/10 pb-4">
                             {confirmAnim.step === 'input' ? `Editar ${DRAW_LABELS[confirmAnim.drawType!]}` : 'Procesando...'}
                         </h3>
                         
                         {confirmAnim.step === 'input' && (
                             <div className="space-y-6">
                                 <div>
                                     <label className="text-xs uppercase text-gray-500 font-bold block mb-2">Número Ganador</label>
                                     <input type="tel" maxLength={2} value={drawNumber} onChange={e => setDrawNumber(e.target.value)} className="w-full bg-black border border-white/20 rounded-xl p-4 text-center text-4xl font-mono text-white outline-none focus:border-brand-accent"/>
                                 </div>
                                 <div className="flex gap-4">
                                     <button onClick={() => setDrawBall('blanca')} className={`flex-1 p-4 rounded-xl border font-bold uppercase transition-all ${drawBall === 'blanca' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-white/10'}`}>Blanca</button>
                                     <button onClick={() => setDrawBall('roja')} className={`flex-1 p-4 rounded-xl border font-bold uppercase transition-all ${drawBall === 'roja' ? 'bg-red-600 text-white border-red-600' : 'bg-transparent text-gray-500 border-white/10'}`}>Roja</button>
                                 </div>
                                 {drawBall === 'roja' && (
                                      <div>
                                         <label className="text-xs uppercase text-red-500 font-bold block mb-2">Num Reventado</label>
                                         <input type="tel" maxLength={2} value={drawRevNumber} onChange={e => setDrawRevNumber(e.target.value)} className="w-full bg-red-900/20 border border-red-500/50 rounded-xl p-3 text-center text-2xl font-mono text-red-500 outline-none"/>
                                     </div>
                                 )}
                                 <div className="flex gap-4 pt-4">
                                     <Button variant="secondary" onClick={handleCloseDrawModal} className="flex-1">Cancelar</Button>
                                     <Button variant="success" onClick={handleConfirmDraw} className="flex-1">Confirmar</Button>
                                 </div>
                             </div>
                         )}

                         {confirmAnim.step !== 'input' && (
                             <div className="font-mono text-xs text-brand-accent space-y-2 h-40 overflow-y-auto">
                                 {confirmAnim.logs.map((log, i) => (
                                     <div key={i}>{`> ${log}`}</div>
                                 ))}
                                 <div className="animate-pulse">_</div>
                             </div>
                         )}
                     </div>
                 </div>
             )}
          </div>
      )}

      {/* --- TIME MACHINE VIEW --- */}
      {activeTab === 'reports' && (
          <div className="animate-fade-in-up">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-24 h-24 bg-brand-accent/10 rounded-full flex items-center justify-center border-4 border-brand-accent/20 mb-6 relative">
                      <ClockIcon className="h-12 w-12 text-brand-accent animate-spin-slow"/>
                      <div className="absolute inset-0 rounded-full border border-brand-accent/50 animate-ping opacity-20"></div>
                  </div>
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Máquina del Tiempo</h2>
                  <p className="text-gray-500 max-w-md mb-8">Modifique la línea temporal de resultados pasados. Advertencia: Esto afectará los reportes históricos.</p>
                  
                  <div className="bg-black/50 p-2 rounded-xl border border-white/10 inline-flex items-center gap-4 mb-12">
                      <span className="text-xs font-bold uppercase text-gray-500 ml-2">FECHA OBJETIVO:</span>
                      <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} className="bg-transparent text-white font-mono font-bold outline-none uppercase p-2"/>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                       {(['mediodia', 'tarde', 'noche'] as DrawType[]).map(draw => (
                           <div key={draw} className="bg-[#0B101B] p-6 rounded-2xl border border-white/10 hover:border-brand-accent/50 transition-colors group">
                               <h3 className="text-gray-500 font-bold uppercase text-xs mb-4 group-hover:text-brand-accent">{DRAW_LABELS[draw]}</h3>
                               <input 
                                  value={timeMachineState[draw].number} 
                                  onChange={(e) => setTimeMachineState({...timeMachineState, [draw]: {...timeMachineState[draw], number: e.target.value.slice(0,2)}})}
                                  className="w-full bg-black border border-white/10 rounded-lg p-4 text-center text-3xl font-mono text-white outline-none focus:border-white/50 mb-2"
                                  placeholder="--"
                               />
                               <div className="flex justify-center gap-2">
                                   <button 
                                      onClick={() => setTimeMachineState({...timeMachineState, [draw]: {...timeMachineState[draw], ball: 'blanca'}})}
                                      className={`w-3 h-3 rounded-full border ${timeMachineState[draw].ball === 'blanca' ? 'bg-white border-white' : 'bg-transparent border-gray-600'}`}
                                   />
                                   <button 
                                      onClick={() => setTimeMachineState({...timeMachineState, [draw]: {...timeMachineState[draw], ball: 'roja'}})}
                                      className={`w-3 h-3 rounded-full border ${timeMachineState[draw].ball === 'roja' ? 'bg-red-600 border-red-600' : 'bg-transparent border-gray-600'}`}
                                   />
                               </div>
                           </div>
                       ))}
                  </div>

                  <Button onClick={() => {
                      setStabilizationState('stabilizing');
                      setTimeout(() => {
                           const formatted = { mediodia: timeMachineState.mediodia, tarde: timeMachineState.tarde, noche: timeMachineState.noche };
                           // Mock save
                           onUpdateHistory(new Date(historyDate + 'T12:00:00').toLocaleDateString(), formatted as any);
                           setStabilizationState('complete');
                           setTimeout(() => setStabilizationState('idle'), 2000);
                      }, 1500);
                  }} className="mt-12 w-64" disabled={stabilizationState !== 'idle'}>
                      {stabilizationState === 'idle' ? 'ESTABILIZAR LÍNEA' : (stabilizationState === 'stabilizing' ? 'REESCRIBIENDO...' : 'COMPLETADO')}
                  </Button>
              </div>
          </div>
      )}

      {/* Register Modal - ULTIMATE CYBER TECH REDESIGN */}
      {showRegisterModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              {/* Backdrop blur */}
              <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={handleCloseRegisterModal}></div>
              
              <div className="relative w-full max-w-lg group animate-zoom-in-fast isolate">
                  {/* Neon Tech Border Wrappers */}
                  <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-brand-cyan rounded-tl-3xl z-30"></div>
                  <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-brand-cyan rounded-br-3xl z-30"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-brand-accent/50 rounded-tr-xl z-30"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-brand-accent/50 rounded-bl-xl z-30"></div>

                  {/* MASSIVE BACKLIGHT GLOW (Lights coming from behind - OUTSIDE THE BOX) */}
                  <div className="absolute -inset-20 bg-gradient-to-r from-blue-600/40 via-cyan-600/40 to-violet-700/40 rounded-[4rem] blur-[80px] opacity-80 animate-pulse-slow pointer-events-none -z-10"></div>
                  
                  {/* Inner container */}
                  <div className="relative bg-[#020408] border border-brand-cyan/30 rounded-3xl p-8 shadow-[0_0_100px_rgba(6,182,212,0.4)] overflow-hidden z-10">
                      {/* Tech Grid Background Overlay */}
                      <div className="absolute inset-0 bg-grid-pattern opacity-[0.1] pointer-events-none"></div>
                      {/* Scan Line Effect */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-cyan to-transparent opacity-50 animate-scan-line pointer-events-none"></div>
                      
                      {/* Close Button */}
                      <button onClick={handleCloseRegisterModal} className="absolute top-5 right-5 text-gray-500 hover:text-white hover:rotate-90 transition-all z-40 bg-black/50 rounded-full p-2 border border-white/10 hover:border-brand-cyan">✕</button>
                      
                      {/* Header */}
                      <div className="relative z-10 mb-10 pb-6 border-b border-white/10">
                          <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="absolute -inset-4 bg-brand-cyan/20 rounded-full blur-xl animate-pulse"></div>
                                    <div className="w-14 h-14 rounded-xl bg-black border border-brand-cyan/50 flex items-center justify-center shadow-[inset_0_0_30px_rgba(6,182,212,0.3)]">
                                        <UserPlusIcon className="h-7 w-7 text-brand-cyan"/>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none italic">
                                        NUEVO <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">JUGADOR</span>
                                    </h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="w-1.5 h-1.5 bg-brand-success rounded-full animate-ping"></span>
                                        <p className="text-[10px] font-mono text-brand-cyan tracking-[0.2em] uppercase opacity-80">System_Provisioning_Mode</p>
                                    </div>
                                </div>
                          </div>
                      </div>

                      {registerStep === 'form' ? (
                          <form onSubmit={handleRegisterSubmit} className="space-y-6 relative z-10" autoComplete="off">
                              
                              {/* INPUT: NOMBRE */}
                              <div className="group relative">
                                  <label className="text-[9px] font-mono font-bold text-brand-cyan uppercase tracking-widest mb-2 block pl-1">IDENTITY_NAME</label>
                                  <div className="relative bg-black/80 border border-white/10 rounded-xl flex items-center overflow-hidden group-focus-within:border-brand-cyan/80 group-focus-within:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all">
                                      <div className="pl-4 pr-3 text-gray-600 group-focus-within:text-brand-cyan transition-colors">
                                          <UserCircleIcon className="h-5 w-5"/>
                                      </div>
                                      <input 
                                          className="w-full bg-transparent border-none text-sm font-bold text-white placeholder-gray-700 focus:ring-0 focus:outline-none py-4 pl-0 transition-all outline-none font-mono uppercase" 
                                          placeholder="NOMBRE COMPLETO" 
                                          value={newUser.name} 
                                          onChange={e => setNewUser({...newUser, name: e.target.value})}
                                          autoComplete="off"
                                          style={{ WebkitBoxShadow: "0 0 0 1000px #030508 inset", WebkitTextFillColor: "white", caretColor: "#06B6D4" }}
                                      />
                                      {/* Animated Bottom Border */}
                                      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-cyan transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500"></div>
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  {/* INPUT: EMAIL - DARK PURPLE / INDIGO */}
                                  <div className="group relative">
                                      <label className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest mb-2 block pl-1">DIGITAL_MAIL</label>
                                      <div className="relative bg-black/80 border border-white/10 rounded-xl flex items-center overflow-hidden group-focus-within:border-indigo-500/80 group-focus-within:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all">
                                          <div className="pl-3 pr-2 text-gray-600 group-focus-within:text-indigo-400 transition-colors">
                                              <MailIcon className="h-4 w-4"/>
                                          </div>
                                          <input 
                                              type="email"
                                              className="w-full bg-transparent border-none text-xs font-bold text-white placeholder-gray-700 focus:ring-0 focus:outline-none py-4 pl-0 transition-all outline-none font-mono" 
                                              placeholder="CORREO" 
                                              value={newUser.email} 
                                              onChange={e => setNewUser({...newUser, email: e.target.value})}
                                              autoComplete="off"
                                              style={{ WebkitBoxShadow: "0 0 0 1000px #030508 inset", WebkitTextFillColor: "white", caretColor: "#6366F1" }}
                                          />
                                          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-500 transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500"></div>
                                      </div>
                                  </div>

                                  {/* INPUT: PHONE - ELECTRIC BLUE */}
                                  <div className="group relative">
                                      <label className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest mb-2 block pl-1">COMM_LINK</label>
                                      <div className="relative bg-black/80 border border-white/10 rounded-xl flex items-center overflow-hidden group-focus-within:border-blue-500/80 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all">
                                          <div className="pl-3 pr-2 text-gray-600 group-focus-within:text-blue-400 transition-colors">
                                              <PhoneIcon className="h-4 w-4"/>
                                          </div>
                                          <input 
                                              className="w-full bg-transparent border-none text-xs font-bold text-white placeholder-gray-700 focus:ring-0 focus:outline-none py-4 pl-0 transition-all outline-none font-mono" 
                                              placeholder="TELÉFONO" 
                                              value={newUser.phone} 
                                              onChange={e => setNewUser({...newUser, phone: e.target.value})}
                                              autoComplete="off"
                                              style={{ WebkitBoxShadow: "0 0 0 1000px #030508 inset", WebkitTextFillColor: "white", caretColor: "#3B82F6" }}
                                          />
                                          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500"></div>
                                      </div>
                                  </div>
                              </div>

                              {/* INPUT: CEDULA - GOLD */}
                              <div className="group relative">
                                  <label className="text-[9px] font-mono font-bold text-brand-gold uppercase tracking-widest mb-2 block pl-1">CITIZEN_ID</label>
                                  <div className="relative bg-black/80 border border-white/10 rounded-xl flex items-center overflow-hidden group-focus-within:border-brand-gold/80 group-focus-within:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all">
                                      <div className="pl-4 pr-3 text-gray-600 group-focus-within:text-brand-gold transition-colors">
                                          <IdentificationIcon className="h-5 w-5"/>
                                      </div>
                                      <input 
                                          className="w-full bg-transparent border-none text-sm font-bold text-white placeholder-gray-700 focus:ring-0 focus:outline-none py-4 pl-0 transition-all outline-none font-mono" 
                                          placeholder="IDENTIFICACIÓN" 
                                          value={newUser.cedula} 
                                          onChange={e => setNewUser({...newUser, cedula: e.target.value})}
                                          autoComplete="off"
                                          style={{ WebkitBoxShadow: "0 0 0 1000px #030508 inset", WebkitTextFillColor: "white", caretColor: "#F59E0B" }}
                                      />
                                      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-gold transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500"></div>
                                  </div>
                              </div>

                              {registerError && (
                                  <div className="bg-red-950/50 border border-red-500/30 p-3 rounded-lg flex items-center gap-3 animate-shake-hard shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500"/>
                                      <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wide">{registerError}</span>
                                  </div>
                              )}

                              {/* TECH EXECUTE BUTTON - REACTOR CORE STYLE */}
                              <button 
                                type="submit" 
                                className="group/btn relative w-full py-6 rounded-xl overflow-hidden transition-all duration-300 active:scale-95 hover:shadow-[0_0_80px_rgba(59,130,246,0.4)] mt-6 border border-blue-500/30 hover:border-blue-400/60"
                              >
                                  <div className="absolute inset-0 bg-[#020617] z-0"></div>
                                  <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>
                                  
                                  {/* Core Glow */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 opacity-60 group-hover/btn:opacity-90 transition-opacity duration-500"></div>

                                  {/* Sliding Energy */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out z-10"></div>

                                  <div className="relative z-30 flex items-center justify-center gap-4">
                                      <CpuIcon className="h-5 w-5 text-blue-400 animate-pulse"/>
                                      <div className="flex flex-col items-start leading-none">
                                          <span className="text-sm font-black text-white uppercase tracking-[0.25em] group-hover/btn:text-blue-200 transition-colors drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">
                                              EJECUTAR REGISTRO
                                          </span>
                                          <span className="text-[8px] font-mono text-gray-500 group-hover/btn:text-blue-300/50">/// INICIAR PROTOCOLO DE ALTA</span>
                                      </div>
                                  </div>
                              </button>
                          </form>
                      ) : registerStep === 'processing' ? (
                          <div className="text-center py-12 relative z-10">
                               <div className="w-24 h-24 mx-auto relative mb-8">
                                   <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                                   <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
                                   <div className="absolute inset-4 rounded-full bg-blue-500/10 animate-pulse flex items-center justify-center">
                                       <CpuIcon className="h-8 w-8 text-blue-500"/>
                                   </div>
                               </div>
                               <p className="text-white font-black uppercase text-xl animate-pulse tracking-widest mb-2">Procesando Datos</p>
                               <p className="text-blue-400 font-mono text-xs">/// ENCRIPTANDO CON LLAVE AES-256...</p>
                          </div>
                      ) : (
                          <div className="text-center py-2 relative z-10 animate-fade-in-up">
                              {/* Success Icon Halo */}
                              <div className="relative w-24 h-24 mx-auto mb-6">
                                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                                  <div className="relative w-full h-full bg-[#050910] rounded-full flex items-center justify-center border-2 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.4)]">
                                      <CheckCircleIcon className="h-10 w-10 text-blue-500 animate-bounce-in"/>
                                  </div>
                              </div>

                              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">¡JUGADOR VINCULADO!</h3>
                              <p className="text-gray-500 font-mono text-xs mb-8 uppercase tracking-widest">Credenciales Generadas Exitosamente</p>
                              
                              {/* CREDENTIAL HOLO-CARD UI - DARK MODE */}
                              <div className="bg-[#020408] p-6 rounded-2xl border border-white/10 mb-8 relative group overflow-hidden shadow-2xl mx-2">
                                  {/* Holo Effect */}
                                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-900/10 to-transparent pointer-events-none"></div>
                                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600"></div>
                                  
                                  <div className="flex justify-between items-end mb-4 border-b border-white/5 pb-2">
                                      <span className="text-[9px] text-blue-400 uppercase font-mono tracking-widest">ACCESS_KEY_GENERATED</span>
                                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded bg-blue-900/20">
                                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div> ACTIVE
                                      </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/5 relative overflow-hidden group-hover:border-blue-500/30 transition-colors">
                                      <div className="flex items-center gap-3 relative z-10">
                                          <div className="p-2 bg-brand-gold/10 rounded-lg text-brand-gold">
                                            <KeyIcon className="h-5 w-5"/>
                                          </div>
                                          <div className="flex flex-col items-start">
                                              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Contraseña Temporal</span>
                                              <span className="font-bold text-xl tracking-wider text-white font-mono drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{generatedPassword}</span>
                                          </div>
                                      </div>
                                      
                                      {/* ONE CLICK COPY BUTTON */}
                                      <button 
                                        onClick={handleCopyPassword}
                                        className={`relative z-10 px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider border ${isCopied ? 'bg-blue-600 text-white border-blue-500' : 'bg-black text-white border-white/20 hover:border-blue-400 hover:bg-blue-900/20'}`}
                                      >
                                          {isCopied ? <ClipboardCheckIcon className="h-4 w-4"/> : <ClipboardIcon className="h-4 w-4"/>}
                                          {isCopied ? 'COPIADO' : 'COPIAR'}
                                      </button>
                                  </div>
                                  
                                  <div className="mt-4 flex items-center gap-2 opacity-50">
                                      <div className="flex-1 h-px bg-white/20"></div>
                                      <p className="text-[8px] text-gray-400 font-mono text-center">
                                          COPIE ESTA LLAVE ANTES DE CERRAR
                                      </p>
                                      <div className="flex-1 h-px bg-white/20"></div>
                                  </div>
                              </div>

                              <Button onClick={handleCloseRegisterModal} variant="secondary" className="w-full border-white/10 hover:bg-white/5 py-4">
                                  FINALIZAR PROCESO
                              </Button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminPanel;
