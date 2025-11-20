
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

      {/* ================= DRAWS TAB (REDESIGNED) ================= */}
      {activeTab === 'draws' && (
          <div className="max-w-6xl mx-auto animate-fade-in-up">
             <div className="flex items-center justify-between mb-6">
                 <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                     <CpuIcon className="h-8 w-8 text-brand-accent"/> SISTEMA DE INGRESO MANUAL
                 </h2>
                 <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full border border-brand-border">
                     <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                     <span className="text-xs font-mono text-brand-text-secondary uppercase">CONTROL MANUAL ACTIVO</span>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {(['mediodia', 'tarde', 'noche'] as DrawType[]).map((draw, idx) => {
                     const result = dailyResults.find(r => r.draw === draw) || { number: null, ballColor: null, reventadosNumber: null };
                     const hasResult = result.number !== null;
                     
                     // Visual Styles based on Time
                     const theme = {
                         mediodia: { 
                             bg: 'from-orange-900/20 to-brand-secondary', 
                             border: 'border-orange-500/30', 
                             icon: <SunIcon className="h-8 w-8 text-orange-400"/>,
                             accent: 'text-orange-400'
                         },
                         tarde: { 
                             bg: 'from-purple-900/20 to-brand-secondary', 
                             border: 'border-purple-500/30', 
                             icon: <SunsetIcon className="h-8 w-8 text-purple-400"/>,
                             accent: 'text-purple-400'
                         },
                         noche: { 
                             bg: 'from-blue-900/20 to-brand-secondary', 
                             border: 'border-blue-500/30', 
                             icon: <MoonIcon className="h-8 w-8 text-blue-400"/>,
                             accent: 'text-blue-400'
                         }
                     }[draw];

                     return (
                        <div key={draw} className="relative group h-[420px]" style={{animationDelay: `${idx * 100}ms`}}>
                            {/* Holographic Border */}
                            <div className={`absolute -inset-0.5 rounded-3xl blur opacity-20 group-hover:opacity-60 transition duration-500 bg-gradient-to-b ${draw === 'mediodia' ? 'from-orange-500 to-transparent' : draw === 'tarde' ? 'from-purple-500 to-transparent' : 'from-blue-500 to-transparent'}`}></div>
                            
                            <Card className={`relative h-full flex flex-col bg-gradient-to-b ${theme.bg} border ${theme.border} backdrop-blur-xl shadow-2xl group-hover:scale-[1.02] transition-all duration-500`}>
                                
                                {/* Header */}
                                <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-xl bg-white/5 shadow-inner ${theme.accent}`}>
                                            {theme.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">{DRAW_LABELS[draw]}</h3>
                                            <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest opacity-70">
                                                {draw === 'mediodia' ? '12:55 PM' : draw === 'tarde' ? '4:30 PM' : '7:30 PM'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border backdrop-blur-sm ${hasResult ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-white/5 text-brand-text-secondary border-white/10'}`}>
                                        {hasResult ? 'CONFIRMADO' : 'PENDIENTE'}
                                    </span>
                                </div>
                                
                                {/* Main Display Area */}
                                <div className="flex-grow flex flex-col items-center justify-center relative">
                                    {hasResult ? (
                                        <div className="text-center animate-stamp">
                                            <div className="text-8xl font-black text-white font-mono tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] relative z-10">
                                                {result.number}
                                            </div>
                                            {/* Reventados Badge */}
                                            {result.ballColor === 'roja' && (
                                                <div className="absolute -top-6 -right-6 rotate-12 animate-pulse">
                                                     <div className="bg-red-600 text-white font-black text-xs px-3 py-1 rounded shadow-lg border border-red-400">
                                                         REVENTADO {result.reventadosNumber}
                                                     </div>
                                                </div>
                                            )}
                                            
                                            <div className="mt-6 flex items-center gap-3 justify-center bg-black/30 px-4 py-2 rounded-full border border-white/5">
                                                <span className={`w-3 h-3 rounded-full ${result.ballColor === 'roja' ? 'bg-red-500 shadow-[0_0_10px_red] animate-pulse' : 'bg-gray-300'}`}></span>
                                                <span className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider">
                                                    BOLITA {result.ballColor}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center opacity-30">
                                            <div className="text-6xl font-mono text-white font-black tracking-widest">--</div>
                                            <p className="text-xs font-mono mt-2">ESPERANDO INPUT</p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Footer */}
                                <div className="mt-auto pt-6">
                                    <Button 
                                        onClick={() => openDrawManager(draw, result as DailyResult)}
                                        className={`w-full py-4 text-xs font-bold uppercase tracking-widest border border-white/10 shadow-lg group-hover:shadow-brand-accent/20 transition-all ${hasResult ? 'bg-brand-tertiary hover:bg-brand-tertiary/80 text-brand-text-secondary' : 'bg-brand-accent hover:bg-brand-accent-hover text-white'}`}
                                    >
                                        {hasResult ? <><RefreshIcon className="h-4 w-4"/> CORREGIR DATO</> : <><KeyIcon className="h-4 w-4"/> DIGITAR GANADOR</>}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                     );
                 })}
             </div>

             {/* === CONSOLA DE CONTROL MODAL === */}
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
          <div className="max-w-4xl mx-auto space-y-8">
              {/* Report Content Remains Unchanged */}
              <Card className="relative overflow-hidden border-brand-accent/30">
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
                  <div className="mb-8 relative group">
                      <label className="block text-xs font-bold text-cyan-500 uppercase mb-2 tracking-wider">Fecha de Incursión</label>
                      <div className="relative">
                          <input type="date" value={historyDate} onChange={handleDateChange} className="w-full bg-brand-primary/80 border-2 border-cyan-900/50 text-white text-xl p-4 rounded-xl focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.4)] focus:outline-none transition-all font-mono uppercase z-10 relative"/>
                          <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-600 h-6 w-6 pointer-events-none z-20"/>
                      </div>
                  </div>
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
                                          <input type="number" value={timeMachineState[draw].number} onChange={(e) => setTimeMachineState(prev => ({...prev, [draw]: {...prev[draw], number: e.target.value.slice(0, 2)}}))} className="w-full bg-brand-primary border border-brand-border rounded-lg p-2 text-center font-mono font-bold text-white focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none" placeholder="--"/>
                                      </div>
                                      <div className="flex items-center justify-between bg-brand-primary/50 p-2 rounded-lg border border-brand-border">
                                          <label className="text-[10px] text-brand-text-secondary uppercase font-bold">Bolita Roja</label>
                                          <input type="checkbox" checked={timeMachineState[draw].ball === 'roja'} onChange={(e) => setTimeMachineState(prev => ({...prev, [draw]: {...prev[draw], ball: e.target.checked ? 'roja' : 'blanca'}}))} className="w-5 h-5 accent-red-500 cursor-pointer"/>
                                      </div>
                                      <div className={`transition-all duration-300 overflow-hidden ${timeMachineState[draw].ball === 'roja' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                           <label className="text-[10px] text-red-400 uppercase font-bold">Reventado</label>
                                           <input type="number" value={timeMachineState[draw].reventados} onChange={(e) => setTimeMachineState(prev => ({...prev, [draw]: {...prev[draw], reventados: e.target.value.slice(0, 2)}}))} className="w-full bg-red-900/10 border border-red-500/30 rounded-lg p-2 text-center font-mono font-bold text-red-100 focus:border-red-500 outline-none" placeholder="--"/>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="mt-8">
                          <button onClick={handleTimelineStabilize} disabled={stabilizationState !== 'idle'} className={`w-full relative overflow-hidden py-5 rounded-xl font-black uppercase tracking-[0.2em] text-sm transition-all duration-300 ${stabilizationState === 'idle' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] text-white scale-100' : ''} ${stabilizationState === 'stabilizing' ? 'bg-brand-tertiary text-cyan-400 border border-cyan-500/50 cursor-wait' : ''} ${stabilizationState === 'complete' ? 'bg-green-500 text-white cursor-default' : ''}`}>
                              {stabilizationState === 'stabilizing' && <div className="absolute inset-0 bg-cyan-900/30"><div className="h-full bg-cyan-500/20 w-full animate-progress-indeterminate"></div></div>}
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

      {activeTab === 'finance' && (
           <div className="space-y-8 animate-fade-in-up">
              {/* Finance Content Remains Unchanged */}
              <div className="flex justify-center items-center">
                  <div className="bg-brand-secondary border border-brand-border rounded-full p-1 flex items-center gap-4 shadow-2xl">
                      <button onClick={() => handleWeekNav('prev')} className="p-2 rounded-full hover:bg-white/10 text-brand-text-secondary hover:text-white transition-colors"><ChevronLeftIcon className="h-5 w-5"/></button>
                      <div className="flex flex-col items-center px-4">
                          <div className="flex items-center gap-2 text-brand-accent font-bold uppercase tracking-widest text-xs"><CalendarDaysIcon className="h-4 w-4"/>{selectedWeekStats.label}</div>
                          <div className="text-[10px] font-mono text-brand-text-secondary flex items-center gap-2">
                              {weeklyData.currentKey === selectedWeekKey ? (<span className="flex items-center gap-1 text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> LIVE FEED</span>) : (<span className="text-brand-text-secondary opacity-70">HISTORICAL RECORD</span>)}
                          </div>
                      </div>
                      <button onClick={() => handleWeekNav('next')} className="p-2 rounded-full hover:bg-white/10 text-brand-text-secondary hover:text-white transition-colors" disabled={weeklyData.currentKey === selectedWeekKey}><ChevronRightIcon className="h-5 w-5"/></button>
                  </div>
                  {weeklyData.currentKey !== selectedWeekKey && (<button onClick={handleJumpToCurrent} className="ml-4 text-[10px] font-bold uppercase text-brand-accent hover:text-white border border-brand-accent/30 hover:border-brand-accent rounded-full px-3 py-1 transition-all">Volver a Hoy</button>)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative bg-brand-secondary border-2 border-brand-gold rounded-2xl p-8 overflow-hidden shadow-[0_0_30px_rgba(234,179,8,0.1)] group">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                      <div className="relative z-10 text-center">
                          <div className="flex items-center justify-center gap-2 mb-4"><h4 className="text-sm font-black text-brand-gold uppercase tracking-widest">GANANCIAS (NETO)</h4></div>
                          <div className={`text-4xl md:text-5xl font-black font-mono tracking-tighter ${selectedWeekStats.net >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>{selectedWeekStats.net >= 0 ? '+' : ''}{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.net)}</div>
                          <p className="text-xs text-brand-text-secondary mt-2 opacity-70 font-mono uppercase">{weeklyData.currentKey === selectedWeekKey ? '(ACUMULADO SEMANA ACTUAL)' : '(CIERRE DE SEMANA)'}</p>
                      </div>
                  </div>
                   <div className="relative bg-brand-secondary border border-brand-border rounded-2xl p-6 overflow-hidden group hover:border-brand-success/50 transition-all duration-500">
                      <div className="relative z-10 flex justify-between items-end h-full">
                          <div>
                              <div className="flex items-center gap-2 mb-2"><ArrowTrendingUpIcon className="h-4 w-4 text-brand-success"/><h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest">Entradas Reales</h4></div>
                              <div className="text-3xl font-black text-white font-mono tracking-tight">{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.cashIn)}</div>
                              <div className="text-[10px] text-brand-success font-bold mt-1 flex items-center gap-1"><WalletIcon className="h-3 w-3"/> Dinero Recibido (Recargas)</div>
                          </div>
                      </div>
                  </div>
                   <div className="relative bg-brand-secondary border border-brand-border rounded-2xl p-6 overflow-hidden group hover:border-brand-danger/50 transition-all duration-500">
                      <div className="relative z-10 flex justify-between items-end h-full">
                          <div>
                              <div className="flex items-center gap-2 mb-2"><ArrowTrendingDownIcon className="h-4 w-4 text-brand-danger"/><h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest">Salidas Reales</h4></div>
                              <div className="text-3xl font-black text-white font-mono tracking-tight">{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(selectedWeekStats.cashOut)}</div>
                              <div className="text-[10px] text-brand-danger font-bold mt-1 flex items-center gap-1"><CreditCardIcon className="h-3 w-3"/> Dinero Pagado (Retiros)</div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-brand-secondary/50 border border-brand-border p-4 rounded-xl flex items-center justify-between border-l-4 border-l-brand-gold">
                    <div><h4 className="text-[10px] font-black uppercase text-brand-text-secondary tracking-wider mb-1">Balance Semanal</h4><p className="text-xs font-mono text-white"><span className="text-brand-success">ENTRADAS</span> - <span className="text-brand-danger">SALIDAS</span> = <span className="text-brand-gold">NETO</span></p></div>
                    <div className="text-right"><div className="text-xl font-black text-white font-mono">{selectedWeekStats.profitMargin}%</div><div className="text-[9px] text-brand-text-secondary uppercase">Margen de Retorno</div></div>
                 </div>
                 <div className="bg-brand-secondary/50 border border-brand-border p-4 rounded-xl flex items-center justify-between border-l-4 border-l-brand-success">
                    <div><h4 className="text-[10px] font-black uppercase text-brand-text-secondary tracking-wider mb-1">Estado del Sistema</h4><p className="text-xs font-mono text-white flex items-center gap-2"><CheckCircleIcon className="h-3 w-3 text-brand-success"/> {weeklyData.currentKey === selectedWeekKey ? 'REGISTRO ABIERTO' : 'REGISTRO CERRADO'}</p></div>
                    <div className="text-right"><div className={`text-xl font-black font-mono uppercase ${selectedWeekStats.net >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>{selectedWeekStats.net >= 0 ? 'SUPERÁVIT' : 'DÉFICIT'}</div><div className="text-[9px] text-brand-text-secondary uppercase">Salud Financiera</div></div>
                 </div>
              </div>

              {/* User Directory and Transactions List */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2"><IdentificationIcon className="h-5 w-5 text-brand-accent"/> Directorio de Activos</h3>
                          <div className="relative"><input type="text" placeholder="BUSCAR CLIENTE..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-brand-primary border border-brand-border rounded-lg py-2 px-4 text-xs text-white focus:border-brand-accent outline-none w-48 transition-all focus:w-64 font-mono"/></div>
                      </div>
                      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                          {filteredUsers.map(user => (
                              <div key={user.id} className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${expandedUserId === user.id ? 'border-brand-accent bg-brand-secondary' : 'border-brand-border bg-brand-secondary/50 hover:bg-brand-secondary'}`}>
                                  <div onClick={() => handleToggleUserCard(user.id)} className="p-4 flex items-center justify-between cursor-pointer group">
                                      <div className="flex items-center gap-4">
                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm ${expandedUserId === user.id ? 'bg-brand-accent text-white' : 'bg-brand-primary text-brand-text-secondary'}`}>{user.name.charAt(0)}</div>
                                          <div><div className="font-bold text-white text-sm">{user.name}</div><div className="text-[10px] text-brand-text-secondary font-mono">{user.cedula || 'ID NO REGISTRADO'}</div></div>
                                      </div>
                                      <div className="text-right"><div className="text-[10px] text-brand-text-secondary uppercase tracking-wider">Saldo Actual</div><div className="font-mono font-bold text-white">{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(user.balance)}</div></div>
                                  </div>
                                  <div className={`transition-[max-height] duration-300 ease-out overflow-hidden ${expandedUserId === user.id ? 'max-h-[400px]' : 'max-h-0'}`}>
                                      <div className="p-4 border-t border-brand-border bg-black/20">
                                          <div className="bg-brand-primary rounded-xl p-4 border border-brand-border">
                                              <form onSubmit={(e) => handleSubmitFinance(e, user)}>
                                                  <div className="flex gap-2 mb-3">
                                                      <button type="button" onClick={() => setTransactionMode('deposit')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${transactionMode === 'deposit' ? 'bg-brand-success text-white' : 'bg-brand-secondary text-brand-text-secondary border border-brand-border'}`}>Recarga (Entrada)</button>
                                                      <button type="button" onClick={() => setTransactionMode('withdraw')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${transactionMode === 'withdraw' ? 'bg-brand-danger text-white' : 'bg-brand-secondary text-brand-text-secondary border border-brand-border'}`}>Retiro (Salida)</button>
                                                  </div>
                                                  <div className="flex gap-2">
                                                      <div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary font-bold">₡</span><input type="text" value={amountInput} onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Monto..." className="w-full bg-brand-secondary border border-brand-border rounded-lg py-2 pl-8 pr-4 text-white font-mono focus:border-brand-accent outline-none"/></div>
                                                      <button type="submit" className={`px-6 rounded-lg font-bold text-white transition-transform active:scale-95 ${transactionMode === 'deposit' ? 'bg-brand-success' : 'bg-brand-danger'}`}><BoltIcon className="h-5 w-5"/></button>
                                                  </div>
                                              </form>
                                              <div className="mt-4 flex justify-between items-center pt-3 border-t border-brand-border/50">
                                                  <span className="text-[10px] text-brand-text-secondary">Acciones de cuenta:</span>
                                                  <button onClick={(e) => { e.stopPropagation(); initiatePasswordReset(user); }} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 hover:bg-red-500/20 transition-colors"><LockIcon className="h-3 w-3"/> Reset Clave</button>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                          <button onClick={() => setShowRegisterModal(true)} className="w-full py-3 rounded-xl border border-dashed border-brand-border text-brand-text-secondary hover:text-brand-accent hover:border-brand-accent hover:bg-brand-accent/5 transition-all text-xs font-bold uppercase flex items-center justify-center gap-2"><UserPlusIcon className="h-4 w-4"/> Nuevo Cliente</button>
                      </div>
                  </div>
                  {/* Transactions Feed */}
                  <div className="bg-black border border-brand-border rounded-2xl overflow-hidden flex flex-col h-[650px] shadow-2xl">
                      <div className="bg-brand-secondary p-3 border-b border-brand-border flex justify-between items-center">
                          <div className="flex items-center gap-2"><ClipboardCheckIcon className="h-4 w-4 text-brand-gold"/><span className="text-xs font-bold text-white uppercase tracking-wider">Transacciones ({selectedWeekStats.label})</span></div>
                          <div className="flex items-center gap-2">{weeklyData.currentKey === selectedWeekKey ? (<div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>) : (<div className="h-1.5 w-1.5 rounded-full bg-brand-text-secondary"></div>)}<span className="text-[10px] text-brand-text-secondary font-mono">{weeklyData.currentKey === selectedWeekKey ? 'LIVE' : 'HISTORY'}</span></div>
                      </div>
                      <div className="flex-1 overflow-y-auto bg-brand-primary/80 p-0 custom-scrollbar scroll-smooth relative">
                          {selectedWeekStats.txs.length > 0 ? (
                              <div className="flex flex-col divide-y divide-brand-border/30">
                                  {selectedWeekStats.txs.map((tx, idx) => (
                                      <div key={tx.id} className="p-3 hover:bg-brand-secondary/50 transition-colors group flex items-center justify-between animate-fade-in-up">
                                          <div className="flex items-center gap-3">
                                              <div className={`w-1 h-10 rounded-full ${tx.type === 'deposit' ? 'bg-brand-success' : tx.type === 'withdraw' ? 'bg-brand-danger' : 'bg-brand-accent'}`}></div>
                                              <div>
                                                  <div className="flex items-center gap-2"><span className={`text-[10px] font-black uppercase px-1.5 rounded-sm ${tx.type === 'deposit' ? 'bg-green-900/30 text-brand-success' : tx.type === 'withdraw' ? 'bg-red-900/30 text-brand-danger' : 'bg-indigo-900/30 text-brand-accent'}`}>{tx.type === 'deposit' ? 'IN' : tx.type === 'withdraw' ? 'OUT' : 'INT'}</span><span className="text-xs text-white font-bold font-mono">{tx.userName}</span></div>
                                                  <div className="text-[9px] text-brand-text-secondary font-mono mt-0.5">{new Date(tx.date).toLocaleString()} • ID: {tx.id.split('_')[1]}</div>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className={`font-mono font-bold text-sm ${tx.type === 'deposit' ? 'text-brand-success' : tx.type === 'withdraw' ? 'text-brand-danger' : 'text-brand-text-secondary'}`}>{tx.type === 'withdraw' ? '-' : '+'}{new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(tx.amount)}</div>
                                              <div className="text-[8px] text-brand-text-secondary uppercase opacity-60">{tx.type === 'purchase' ? 'Volumen' : 'Efectivo'}</div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center opacity-30"><GlobeAltIcon className="h-12 w-12 text-brand-text-secondary mb-4 animate-pulse"/><p className="text-xs font-mono text-brand-text-secondary">NO RECORDS FOUND FOR THIS WEEK</p></div>
                          )}
                      </div>
                      <div className="bg-brand-secondary p-2 border-t border-brand-border text-[9px] text-brand-text-secondary font-mono flex justify-between"><span>RECORDS: {selectedWeekStats.txs.length}</span><span>WEEK_ID: {selectedWeekKey}</span></div>
                  </div>
              </div>
          </div>
      )}

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
