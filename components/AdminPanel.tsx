
import React, { useState, useMemo } from 'react';
import type { User, DailyResult, DrawType, BallColor, Transaction } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import { 
    SearchIcon, 
    AtSymbolIcon, 
    PhoneIcon, 
    UserCircleIcon, 
    CreditCardIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CheckCircleIcon,
    TicketIcon,
    SunIcon,
    SunsetIcon,
    MoonIcon,
    LinkIcon,
    FacebookIcon,
    YouTubeIcon,
    GlobeAltIcon,
    ClipboardIcon,
    CalendarIcon,
    RefreshIcon,
    UserPlusIcon,
    LockIcon
} from './icons/Icons';

interface AdminPanelProps {
  currentUser: User;
  users: User[]; // These are already filtered by App.tsx to only be "My Clients"
  dailyResults: DailyResult[];
  transactions: Transaction[];
  onRecharge: (userId: string, amount: number) => void;
  onWithdraw: (userId: string, amount: number) => void;
  onUpdateResult: (draw: DrawType, number: string | null, ballColor: BallColor | null, reventadosNumber: string | null) => void;
  onRegisterClient: (userData: Partial<User>) => void;
  onForceResetPassword: (userId: string) => void;
}

type TabView = 'finance' | 'draws' | 'reports';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    currentUser,
    users, 
    dailyResults, 
    transactions, 
    onRecharge, 
    onWithdraw, 
    onUpdateResult,
    onRegisterClient,
    onForceResetPassword
}) => {
  const [activeTab, setActiveTab] = useState<TabView>('finance');
  
  // Finance State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error' | '', msg: string}>({type: '', msg: ''});
  const [transactionMode, setTransactionMode] = useState<'deposit' | 'withdraw'>('deposit');

  // Register Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '' });

  // Draws State
  const [editingDraw, setEditingDraw] = useState<DrawType | null>(null);
  const [drawNumber, setDrawNumber] = useState('');
  const [drawBall, setDrawBall] = useState<BallColor>('blanca');
  const [drawRevNumber, setDrawRevNumber] = useState('');

  // Reports State
  const [weekOffset, setWeekOffset] = useState(0);

  const DRAW_LABELS: Record<DrawType, string> = {
    mediodia: 'MEDIODÍA',
    tarde: 'TARDE',
    noche: 'NOCHE'
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users.slice(0, 5); // Show recent if empty
    return users.filter(
      user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [searchTerm, users]);

  // --- Weekly Logic (Same as before) ---
  const getWeekRange = (offset: number) => {
      const now = new Date();
      const currentDay = now.getDay();
      const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() + (offset * 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      const startOfYear = new Date(monday.getFullYear(), 0, 1);
      const pastDays = Math.floor((monday.getTime() - startOfYear.getTime()) / 86400000);
      const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
      return { start: monday, end: sunday, weekNum, year: monday.getFullYear() };
  };

  const currentWeekInfo = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  const weeklyData = useMemo(() => {
      const { start, end } = currentWeekInfo;
      // Filter transactions based on visible users (My Clients)
      const myUserIds = new Set(users.map(u => u.id));
      const relevantTxs = transactions.filter(tx => {
          const d = new Date(tx.date);
          return d >= start && d <= end && myUserIds.has(tx.userId);
      });

      const totalSales = relevantTxs.filter(tx => tx.type === 'purchase').reduce((acc, tx) => acc + tx.amount, 0);
      const totalWithdrawals = relevantTxs.filter(tx => tx.type === 'withdraw').reduce((acc, tx) => acc + tx.amount, 0);
      const netRevenue = totalSales - totalWithdrawals;

      return {
          transactions: relevantTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          sales: totalSales,
          withdrawals: totalWithdrawals,
          net: netRevenue
      };
  }, [transactions, currentWeekInfo, users]);

  // --- Handlers ---

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchTerm('');
    setAmountInput('');
    setFeedbackMessage({type: '', msg: ''});
  };

  const handleSubmitFinance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !amountInput) return;
    
    const amount = parseInt(amountInput, 10);
    if (isNaN(amount) || amount <= 0) {
        showFeedback('error', 'Monto inválido');
        return;
    }

    if (transactionMode === 'withdraw') {
        if (amount > selectedUser.balance) {
            showFeedback('error', 'Saldo insuficiente');
            return;
        }
        onWithdraw(selectedUser.id, amount);
        setSelectedUser(prev => prev ? {...prev, balance: prev.balance - amount} : null);
        showFeedback('success', 'Retiro exitoso');
    } else {
        onRecharge(selectedUser.id, amount);
        setSelectedUser(prev => prev ? {...prev, balance: prev.balance + amount} : null);
        showFeedback('success', 'Recarga exitosa');
    }
    setAmountInput('');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newUser.name || !newUser.email || !newUser.phone) {
          alert("Todos los campos son obligatorios");
          return;
      }
      onRegisterClient(newUser);
      setShowRegisterModal(false);
      setNewUser({ name: '', email: '', phone: '' });
  };

  const handleForceReset = () => {
      if (!selectedUser) return;
      if (confirm(`¿Está seguro de restablecer la clave de ${selectedUser.name}? Se asignará '123456' temporalmente.`)) {
          onForceResetPassword(selectedUser.id);
      }
  };

  const handleEditDraw = (result: DailyResult) => {
      setEditingDraw(result.draw);
      setDrawNumber(result.number || '');
      setDrawBall(result.ballColor || 'blanca');
      setDrawRevNumber(result.reventadosNumber || '');
  };

  const handleSaveDraw = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingDraw) return;
      const finalNumber = drawNumber.trim() === '' ? null : drawNumber.padStart(2, '0');
      const finalRevNumber = (drawBall === 'roja' && drawRevNumber.trim() !== '') ? drawRevNumber.padStart(2, '0') : null;
      const finalBall = finalNumber ? drawBall : null;
      onUpdateResult(editingDraw, finalNumber, finalBall, finalRevNumber);
      setEditingDraw(null);
      showFeedback('success', 'Sorteo actualizado');
  };

  const showFeedback = (type: 'success' | 'error', msg: string) => {
      setFeedbackMessage({type, msg});
      setTimeout(() => setFeedbackMessage({type: '', msg: ''}), 4000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('es-CR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
  };

  const getDrawIcon = (type: DrawType, className: string = "h-5 w-5") => {
    switch(type) {
      case 'mediodia': return <SunIcon className={className} />;
      case 'tarde': return <SunsetIcon className={className} />;
      case 'noche': return <MoonIcon className={className} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
        {/* Register Modal */}
        {showRegisterModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/90 backdrop-blur-sm">
                <Card className="w-full max-w-md">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <UserPlusIcon className="h-6 w-6 text-brand-accent"/> Nuevo Cliente
                    </h3>
                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                        <Input placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                        <Input type="email" placeholder="Correo Electrónico" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                        <Input type="tel" placeholder="Teléfono" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} />
                        <div className="flex gap-3 mt-6">
                            <Button type="button" variant="secondary" onClick={() => setShowRegisterModal(false)} className="flex-1">Cancelar</Button>
                            <Button type="submit" className="flex-1">Crear Cliente</Button>
                        </div>
                    </form>
                </Card>
            </div>
        )}

        {/* Admin Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight mb-1">Panel de Control</h2>
                <p className="text-brand-text-secondary text-sm">Bienvenido, {currentUser.name} | Gestionando {users.length} clientes.</p>
            </div>
            
            <div className="bg-brand-secondary/80 border border-brand-border p-1 rounded-xl flex shadow-lg overflow-x-auto max-w-full">
                <button onClick={() => setActiveTab('finance')} className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'finance' ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-white'}`}>
                    <CreditCardIcon className="h-4 w-4"/> Finanzas
                </button>
                <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-white'}`}>
                    <ClipboardIcon className="h-4 w-4"/> Reportes
                </button>
                <button onClick={() => setActiveTab('draws')} className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'draws' ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-white'}`}>
                    <TicketIcon className="h-4 w-4"/> Sorteos
                </button>
            </div>
        </div>

        {/* TAB CONTENT: FINANCE */}
        {activeTab === 'finance' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* User Search Column */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="h-full border-t-4 border-t-brand-accent relative overflow-visible bg-brand-secondary/90">
                        <div className="flex justify-between items-start mb-6">
                             <div>
                                <h3 className="text-xl font-bold text-white mb-1">Mis Clientes</h3>
                                <p className="text-xs text-brand-text-secondary">Gestionar saldos y cuentas</p>
                             </div>
                             <button onClick={() => setShowRegisterModal(true)} className="p-2 bg-brand-accent/20 hover:bg-brand-accent text-brand-accent hover:text-white rounded-lg transition-colors" title="Registrar Nuevo Cliente">
                                 <UserPlusIcon className="h-5 w-5"/>
                             </button>
                        </div>
                        
                        <div className="relative z-20">
                            <Input
                                id="search"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-brand-primary h-14 text-lg shadow-inner border-brand-border"
                                icon={<SearchIcon className="h-5 w-5 text-brand-text-secondary" />}
                            />
                            <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {filteredUsers.map(user => (
                                    <button 
                                        key={user.id} 
                                        onClick={() => handleSelectUser(user)}
                                        className={`w-full px-5 py-4 text-left transition-all flex justify-between items-center group rounded-xl border ${selectedUser?.id === user.id ? 'bg-brand-tertiary border-brand-accent' : 'bg-transparent border-transparent hover:bg-brand-tertiary hover:border-brand-border'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center border border-brand-border text-brand-text-secondary">
                                                <UserCircleIcon className="h-6 w-6"/>
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{user.name}</div>
                                                <div className="text-xs text-brand-text-secondary">{user.email}</div>
                                            </div>
                                        </div>
                                        <span className="text-brand-success font-mono text-sm font-bold">{formatCurrency(user.balance)}</span>
                                    </button>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <p className="text-center text-sm text-brand-text-secondary py-4">No se encontraron clientes.</p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Transaction Console */}
                <div className="lg:col-span-7">
                    {selectedUser ? (
                        <Card className="border-0 bg-gradient-to-br from-brand-secondary to-brand-primary shadow-2xl ring-1 ring-white/10">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-brand-border pb-6 mb-6 gap-4">
                                <div className="flex items-center gap-4">
                                     <div className="w-16 h-16 rounded-2xl bg-brand-tertiary flex items-center justify-center border border-brand-border shadow-inner">
                                          <UserCircleIcon className="h-8 w-8 text-brand-accent"/>
                                     </div>
                                     <div>
                                         <h2 className="text-2xl font-bold text-white">{selectedUser.name}</h2>
                                         <div className="flex items-center gap-4 mt-1 text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
                                             <span className="flex items-center gap-1"><AtSymbolIcon className="h-3 w-3"/> {selectedUser.email}</span>
                                             <span className="flex items-center gap-1"><PhoneIcon className="h-3 w-3"/> {selectedUser.phone}</span>
                                         </div>
                                     </div>
                                </div>
                                <div className="text-right bg-brand-primary/50 px-6 py-3 rounded-xl border border-brand-border">
                                    <div className="text-[10px] text-brand-text-secondary uppercase font-bold">Saldo Actual</div>
                                    <div className="text-3xl font-mono font-bold text-brand-success">{formatCurrency(selectedUser.balance)}</div>
                                </div>
                            </div>

                            <div className="bg-brand-tertiary/30 p-2 rounded-xl mb-6 flex gap-2">
                                <button onClick={() => setTransactionMode('deposit')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${transactionMode === 'deposit' ? 'bg-brand-success text-white shadow-lg' : 'text-brand-text-secondary hover:bg-brand-primary'}`}>
                                    <ArrowTrendingUpIcon className="h-5 w-5"/> DEPOSITAR
                                </button>
                                <button onClick={() => setTransactionMode('withdraw')} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${transactionMode === 'withdraw' ? 'bg-brand-danger text-white shadow-lg' : 'text-brand-text-secondary hover:bg-brand-primary'}`}>
                                    <ArrowTrendingDownIcon className="h-5 w-5"/> RETIRAR
                                </button>
                            </div>

                            <form onSubmit={handleSubmitFinance} className="space-y-6">
                                <div className="relative">
                                    <input type="number" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="0.00" className="w-full bg-brand-primary border-2 border-brand-border rounded-xl py-5 pl-6 pr-24 text-3xl font-mono font-bold text-white focus:border-brand-accent focus:outline-none transition-colors" />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-brand-text-secondary font-bold">CRC</span>
                                </div>
                                <Button type="submit" disabled={!amountInput} variant={transactionMode === 'deposit' ? 'success' : 'danger'} className="w-full py-4 text-lg uppercase tracking-widest shadow-xl">
                                    Confirmar {transactionMode === 'deposit' ? 'Depósito' : 'Retiro'}
                                </Button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-brand-border flex justify-end">
                                <button onClick={handleForceReset} className="flex items-center gap-2 text-xs font-bold text-brand-text-secondary hover:text-red-400 transition-colors">
                                    <LockIcon className="h-4 w-4"/> Restablecer Clave (Admin)
                                </button>
                            </div>
                        </Card>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-brand-border border-dashed rounded-3xl bg-brand-secondary/20">
                            <UserCircleIcon className="h-24 w-24 mb-6 text-brand-text-secondary opacity-20"/>
                            <h3 className="text-xl font-bold text-white mb-2">Seleccione un Cliente</h3>
                            <p className="text-brand-text-secondary max-w-xs">Seleccione un cliente de la lista para realizar operaciones o gestionar su cuenta.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* TAB CONTENT: REPORTS (Weekly) */}
        {activeTab === 'reports' && (
             <div className="space-y-6">
                 <Card className="flex flex-col md:flex-row items-center justify-between gap-6 bg-brand-secondary/90" noPadding>
                     <div className="p-6 flex items-center gap-6 w-full md:w-auto">
                         <div className="bg-brand-accent/20 p-3 rounded-xl text-brand-accent hidden md:block">
                             <CalendarIcon className="h-8 w-8"/>
                         </div>
                         <div>
                             <h3 className="text-xl font-black text-white uppercase tracking-wide">Semana {currentWeekInfo.weekNum}</h3>
                             <p className="text-sm text-brand-text-secondary font-mono">
                                 {currentWeekInfo.start.toLocaleDateString('es-CR')} - {currentWeekInfo.end.toLocaleDateString('es-CR')} ({currentWeekInfo.year})
                             </p>
                         </div>
                     </div>
                     <div className="flex items-center gap-2 p-6 w-full md:w-auto justify-center">
                         <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-3 rounded-lg bg-brand-primary border border-brand-border hover:bg-brand-tertiary text-white transition-all"><ArrowTrendingDownIcon className="h-5 w-5 rotate-90"/></button>
                         <div className="px-4 py-2 bg-brand-primary border border-brand-border rounded-lg text-xs font-bold uppercase text-brand-text-secondary">{weekOffset === 0 ? 'Actual' : `${Math.abs(weekOffset)} Semanas Atrás`}</div>
                         <button onClick={() => setWeekOffset(prev => Math.min(prev + 1, 0))} disabled={weekOffset >= 0} className="p-3 rounded-lg bg-brand-primary border border-brand-border hover:bg-brand-tertiary text-white disabled:opacity-30"><ArrowTrendingDownIcon className="h-5 w-5 -rotate-90"/></button>
                     </div>
                 </Card>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <Card className="bg-gradient-to-br from-brand-secondary to-brand-primary border-l-4 border-l-brand-success">
                         <div className="flex justify-between items-start mb-4">
                             <div><p className="text-xs font-bold text-brand-text-secondary uppercase">Ventas Totales</p><h3 className="text-2xl font-mono font-bold text-brand-success mt-1">{formatCurrency(weeklyData.sales)}</h3></div>
                             <div className="bg-brand-success/10 p-2 rounded-lg"><ArrowTrendingUpIcon className="h-6 w-6 text-brand-success"/></div>
                         </div>
                     </Card>
                     <Card className="bg-gradient-to-br from-brand-secondary to-brand-primary border-l-4 border-l-brand-danger">
                         <div className="flex justify-between items-start mb-4">
                             <div><p className="text-xs font-bold text-brand-text-secondary uppercase">Retiros Pagados</p><h3 className="text-2xl font-mono font-bold text-brand-danger mt-1">{formatCurrency(weeklyData.withdrawals)}</h3></div>
                             <div className="bg-brand-danger/10 p-2 rounded-lg"><ArrowTrendingDownIcon className="h-6 w-6 text-brand-danger"/></div>
                         </div>
                     </Card>
                     <Card className={`bg-gradient-to-br from-brand-secondary to-brand-primary border-l-4 ${weeklyData.net >= 0 ? 'border-l-brand-accent' : 'border-l-brand-gold'}`}>
                         <div className="flex justify-between items-start mb-4">
                             <div><p className="text-xs font-bold text-brand-text-secondary uppercase">Neto Real</p><h3 className={`text-3xl font-mono font-bold mt-1 ${weeklyData.net >= 0 ? 'text-white' : 'text-brand-gold'}`}>{formatCurrency(weeklyData.net)}</h3></div>
                             <div className="bg-brand-accent/10 p-2 rounded-lg"><CreditCardIcon className={`h-6 w-6 ${weeklyData.net >= 0 ? 'text-brand-accent' : 'text-brand-gold'}`}/></div>
                         </div>
                     </Card>
                 </div>
                 
                 <Card className="overflow-hidden" noPadding>
                     <div className="p-6 border-b border-brand-border"><h3 className="text-xl font-bold text-white">Movimientos</h3></div>
                     <div className="overflow-x-auto">
                         <table className="w-full text-left border-collapse">
                             <thead>
                                 <tr className="bg-brand-tertiary/50 text-xs uppercase text-brand-text-secondary border-b border-brand-border">
                                     <th className="px-6 py-4 font-bold">Fecha</th>
                                     <th className="px-6 py-4 font-bold">Cliente</th>
                                     <th className="px-6 py-4 font-bold">Detalle</th>
                                     <th className="px-6 py-4 font-bold text-right">Monto</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-brand-border">
                                 {weeklyData.transactions.map((tx) => (
                                     <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                         <td className="px-6 py-4"><div className="text-sm text-white">{formatDate(tx.date)}</div></td>
                                         <td className="px-6 py-4"><span className="text-sm font-bold text-white">{tx.userName}</span></td>
                                         <td className="px-6 py-4 text-xs text-brand-text-secondary">{tx.details || '-'}</td>
                                         <td className={`px-6 py-4 text-right font-mono font-bold ${tx.type === 'withdraw' ? 'text-brand-danger' : 'text-brand-success'}`}>{tx.type === 'withdraw' ? '-' : '+'}{formatCurrency(tx.amount)}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 </Card>
             </div>
        )}

        {/* TAB CONTENT: DRAWS (Same as before) */}
        {activeTab === 'draws' && (
             <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dailyResults.map((result) => (
                        <Card key={result.draw} className={`relative group transition-all duration-300 ${editingDraw === result.draw ? 'ring-2 ring-brand-accent bg-brand-tertiary' : 'hover:bg-brand-tertiary/50'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl shadow-lg ${editingDraw === result.draw ? 'bg-brand-accent text-white' : 'bg-brand-primary text-brand-text-secondary'}`}>
                                        {getDrawIcon(result.draw, "h-6 w-6")}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">{DRAW_LABELS[result.draw]}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-2 h-2 rounded-full ${result.number ? 'bg-brand-success' : 'bg-brand-text-secondary'}`}></span>
                                            <span className="text-[10px] text-brand-text-secondary uppercase font-bold">{result.number ? 'Finalizado' : 'Pendiente'}</span>
                                        </div>
                                    </div>
                                </div>
                                {editingDraw !== result.draw && <Button onClick={() => handleEditDraw(result)} size="sm" variant="secondary">Gestionar</Button>}
                            </div>
                            {editingDraw === result.draw ? (
                                <form onSubmit={handleSaveDraw} className="bg-brand-primary/50 p-4 rounded-xl border border-brand-border animate-fade-in-up">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="space-y-1">
                                             <label className="text-[10px] uppercase font-bold text-brand-text-secondary">Número</label>
                                             <input type="number" value={drawNumber} onChange={(e) => setDrawNumber(e.target.value.slice(0, 2))} className="w-full bg-brand-secondary border border-brand-border rounded-lg py-2 text-center font-mono font-bold text-xl text-white focus:ring-2 focus:ring-brand-accent" placeholder="--" />
                                        </div>
                                        <div className="space-y-1">
                                             <label className="text-[10px] uppercase font-bold text-brand-text-secondary">Bolita</label>
                                             <select value={drawBall} onChange={(e) => setDrawBall(e.target.value as BallColor)} className="w-full bg-brand-secondary border border-brand-border rounded-lg py-2.5 px-2 text-sm font-bold text-white focus:ring-brand-accent">
                                                <option value="blanca">⚪ Blanca</option>
                                                <option value="roja">🔴 Roja</option>
                                             </select>
                                        </div>
                                    </div>
                                    {drawBall === 'roja' && (
                                        <div className="mb-4">
                                             <label className="text-[10px] uppercase font-bold text-red-400">Reventado</label>
                                             <input type="number" value={drawRevNumber} onChange={(e) => setDrawRevNumber(e.target.value.slice(0, 2))} className="w-full bg-red-900/20 border border-red-500/50 rounded-lg py-2 text-center font-mono font-bold text-xl text-white focus:ring-2 focus:ring-red-500" placeholder="--" />
                                        </div>
                                    )}
                                    <div className="flex gap-2 mt-4"><Button type="submit" variant="success" size="sm" className="w-full">Guardar</Button><Button type="button" onClick={() => setEditingDraw(null)} variant="ghost" size="sm">Cancelar</Button></div>
                                </form>
                            ) : (
                                <div className="mt-4 bg-brand-primary/30 rounded-lg p-3 flex justify-between items-center border border-brand-border/50">
                                    <span className="text-xs text-brand-text-secondary">Resultado:</span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-xl text-white">{result.number || '--'}</span>
                                        <span className="text-brand-border">|</span>
                                        {result.ballColor === 'roja' ? <span className="text-xs font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded">🔴 {result.reventadosNumber}</span> : <span className="text-xs font-bold text-brand-text-secondary">⚪ Blanca</span>}
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        )}
        
        {feedbackMessage.msg && (
             <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl flex items-center gap-4 z-50 shadow-2xl animate-bounce-in ${feedbackMessage.type === 'success' ? 'bg-brand-success text-white' : 'bg-brand-danger text-white'}`}>
                <div className="bg-white/20 p-2 rounded-full">{feedbackMessage.type === 'success' ? <CheckCircleIcon className="h-6 w-6"/> : <CreditCardIcon className="h-6 w-6"/>}</div>
                <div><h4 className="font-bold text-sm uppercase">{feedbackMessage.type === 'success' ? 'Éxito' : 'Error'}</h4><p className="text-sm opacity-90">{feedbackMessage.msg}</p></div>
             </div>
        )}
    </div>
  );
};

export default AdminPanel;
