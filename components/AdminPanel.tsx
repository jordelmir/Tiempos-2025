
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
    IdentificationIcon
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

  const initiatePasswordReset = (user: User) => {
    if (window.confirm(`¿Estás seguro de resetear la contraseña para el usuario ${user.name}?`)) {
        onForceResetPassword(user.id);
        alert('Contraseña reseteada (Simulación).');
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
                     {/* Transaction Buttons */}
                     <div className="bg-brand-secondary p-1 rounded-xl flex gap-1 border border-white/5 shadow-lg">
                        <button onClick={() => setTransactionMode('deposit')} className={`flex-1 py-4 rounded-lg text-xs font-bold uppercase transition-all ${transactionMode === 'deposit' ? 'bg-brand-success text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                            Depósito
                        </button>
                        <button onClick={() => setTransactionMode('withdraw')} className={`flex-1 py-4 rounded-lg text-xs font-bold uppercase transition-all ${transactionMode === 'withdraw' ? 'bg-brand-danger text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                            Retiro
                        </button>
                     </div>

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
                     
                     <Button onClick={() => setShowRegisterModal(true)} variant="secondary" className="w-full border-dashed border-brand-accent/50 hover:border-brand-accent hover:bg-brand-accent/10">
                         <UserPlusIcon className="h-4 w-4"/> Nuevo Registro
                     </Button>
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
                                      <button onClick={() => initiatePasswordReset(user)} className="text-[10px] font-bold text-gray-500 hover:text-brand-gold transition-colors flex items-center gap-1">
                                          <KeyIcon className="h-3 w-3"/> PASS
                                      </button>
                                      
                                      <div className="flex gap-2">
                                          {/* BLOCK TOGGLE */}
                                          <button 
                                            onClick={() => handleBlockClick(user.id, !!user.blocked)} 
                                            disabled={processingUserId === user.id}
                                            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${user.blocked ? 'text-brand-success bg-brand-success/10' : 'text-gray-600 hover:text-white hover:bg-white/10'}`}
                                            title={user.blocked ? "Desbloquear" : "Bloquear"}
                                          >
                                              {processingUserId === user.id ? <RefreshIcon className="h-3 w-3 animate-spin"/> : (user.blocked ? <CheckCircleIcon className="h-3 w-3"/> : <LockIcon className="h-3 w-3"/>)}
                                          </button>
                                          
                                          {/* DELETE BUTTON */}
                                          {user.id !== currentUser.id && (
                                              <button 
                                                onClick={() => handleDeleteClick(user.id)} 
                                                disabled={processingUserId === user.id}
                                                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${deleteConfirmUserId === user.id ? 'bg-red-600 text-white animate-pulse' : 'text-gray-600 hover:text-red-500 hover:bg-red-500/10'}`}
                                                title="Eliminar (Doble click)"
                                              >
                                                  <TrashIcon className="h-3 w-3"/>
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
                 <div className="p-3 bg-brand-accent/20 rounded-xl border border-brand-accent/30">
                     <CpuIcon className="h-8 w-8 text-brand-accent"/>
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
                     return (
                        <Card key={draw} glowColor={draw === 'mediodia' ? 'from-orange-500/30 to-yellow-500/30' : draw === 'tarde' ? 'from-purple-500/30 to-pink-500/30' : 'from-blue-600/30 to-cyan-500/30'}>
                            <div className="flex justify-between items-start mb-8">
                                <h3 className="text-xl font-black text-white uppercase tracking-widest">{DRAW_LABELS[draw]}</h3>
                                <div className={`flex items-center gap-2 px-2 py-1 rounded border ${isOpen ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-brand-success/10 border-brand-success/30 text-brand-success'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-yellow-500 animate-pulse' : 'bg-brand-success'}`}></div>
                                    <span className="text-[9px] font-bold uppercase">{isOpen ? 'PENDIENTE' : 'CERRADO'}</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center py-8 relative">
                                {result?.number ? (
                                    <div className="relative">
                                        <div className={`absolute inset-0 blur-2xl opacity-40 ${result.ballColor === 'roja' ? 'bg-red-600' : 'bg-white'}`}></div>
                                        <div className="text-8xl font-black font-mono tracking-tighter text-white relative z-10 drop-shadow-2xl">
                                            {result.number}
                                        </div>
                                        {result.ballColor === 'roja' && <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded uppercase tracking-widest">Reventado</div>}
                                    </div>
                                ) : (
                                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                                        <span className="text-4xl text-white/10 font-black">--</span>
                                    </div>
                                )}
                            </div>

                            <Button className="w-full mt-8" variant={isOpen ? "primary" : "secondary"} onClick={() => openDrawManager(draw, result || { number: null, ballColor: null, reventadosNumber: null } as any)}>
                                <KeyIcon className="h-4 w-4"/> {isOpen ? 'INGRESAR RESULTADO' : 'MODIFICAR DATOS'}
                            </Button>
                        </Card>
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

      {/* Register Modal */}
      {showRegisterModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
              <div className="w-full max-w-md bg-[#0B101B] border border-white/10 rounded-3xl p-8 relative shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-zoom-in-fast">
                  <button onClick={() => setShowRegisterModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><UserCircleIcon className="h-6 w-6 text-brand-accent"/> Nuevo Agente</h2>
                  {registerStep === 'form' ? (
                      <form onSubmit={handleRegisterSubmit} className="space-y-4">
                          <div className="w-full group">
                              <label className="block text-xs uppercase tracking-wider font-bold text-brand-text-secondary mb-2">Nombre</label>
                              <input className="w-full bg-brand-secondary/50 border border-brand-border rounded-xl py-3 px-4 text-brand-text-primary focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all" placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}/>
                          </div>
                          <div className="w-full group">
                              <label className="block text-xs uppercase tracking-wider font-bold text-brand-text-secondary mb-2">Email</label>
                              <input type="email" className="w-full bg-brand-secondary/50 border border-brand-border rounded-xl py-3 px-4 text-brand-text-primary focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all" placeholder="Correo Electrónico" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}/>
                          </div>
                          <div className="w-full group">
                              <label className="block text-xs uppercase tracking-wider font-bold text-brand-text-secondary mb-2">Teléfono</label>
                              <input className="w-full bg-brand-secondary/50 border border-brand-border rounded-xl py-3 px-4 text-brand-text-primary focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all" placeholder="Teléfono" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})}/>
                          </div>
                          <div className="w-full group">
                              <label className="block text-xs uppercase tracking-wider font-bold text-brand-text-secondary mb-2">Cédula</label>
                              <input className="w-full bg-brand-secondary/50 border border-brand-border rounded-xl py-3 px-4 text-brand-text-primary focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all" placeholder="ID Nacional" value={newUser.cedula} onChange={e => setNewUser({...newUser, cedula: e.target.value})}/>
                          </div>

                          {registerError && <p className="text-red-500 text-xs">{registerError}</p>}
                          <Button type="submit" className="w-full mt-4">Registrar</Button>
                      </form>
                  ) : registerStep === 'processing' ? (
                      <div className="text-center py-10"><RefreshIcon className="h-10 w-10 animate-spin mx-auto text-brand-accent"/></div>
                  ) : (
                      <div className="text-center py-4">
                          <CheckCircleIcon className="h-16 w-16 text-brand-success mx-auto mb-4"/>
                          <p className="text-white font-bold mb-2">¡Usuario Creado!</p>
                          <div className="bg-black p-4 rounded-lg font-mono text-sm mb-4 border border-brand-accent/30 text-brand-accent">
                              PASS: {generatedPassword}
                          </div>
                          <p className="text-xs text-gray-500">Copia esta contraseña temporal.</p>
                          <Button onClick={() => setShowRegisterModal(false)} className="w-full mt-4">Cerrar</Button>
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminPanel;
