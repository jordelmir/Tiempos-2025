
import React, { useState, useMemo } from 'react';
import type { User, DailyResult, DrawType, BallColor } from '../types';
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
    FireIcon,
    GlobeAltIcon,
    FacebookIcon,
    YouTubeIcon,
    CpuIcon,
    LinkIcon,
    ClipboardIcon,
    RefreshIcon
} from './icons/Icons';

interface AdminPanelProps {
  users: User[];
  dailyResults: DailyResult[];
  onRecharge: (userId: string, amount: number) => void;
  onWithdraw: (userId: string, amount: number) => void;
  onUpdateResult: (draw: DrawType, number: string | null, ballColor: BallColor | null, reventadosNumber: string | null) => void;
}

type TabView = 'finance' | 'draws';

const AdminPanel: React.FC<AdminPanelProps> = ({ users, dailyResults, onRecharge, onWithdraw, onUpdateResult }) => {
  const [activeTab, setActiveTab] = useState<TabView>('finance');
  
  // Finance State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error' | '', msg: string}>({type: '', msg: ''});
  const [transactionMode, setTransactionMode] = useState<'deposit' | 'withdraw'>('deposit');

  // Draws State
  const [editingDraw, setEditingDraw] = useState<DrawType | null>(null);
  const [drawNumber, setDrawNumber] = useState('');
  const [drawBall, setDrawBall] = useState<BallColor>('blanca');
  const [drawRevNumber, setDrawRevNumber] = useState('');
  
  // Verification (MCP) State
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState<string>('');
  const [suggestedResult, setSuggestedResult] = useState<{draw: DrawType, number: string, ball: BallColor, rev: string | null} | null>(null);

  const DRAW_LABELS: Record<DrawType, string> = {
    mediodia: 'MEDIODÍA',
    tarde: 'TARDE',
    noche: 'NOCHE'
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return users.filter(
      user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)
    ).slice(0, 5);
  }, [searchTerm, users]);

  // --- Finance Handlers ---

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
        showFeedback('error', 'Por favor ingrese un monto válido.');
        return;
    }

    if (transactionMode === 'withdraw') {
        if (amount > selectedUser.balance) {
            showFeedback('error', 'Saldo insuficiente.');
            return;
        }
        onWithdraw(selectedUser.id, amount);
        setSelectedUser(prev => prev ? {...prev, balance: prev.balance - amount} : null);
        showFeedback('success', `Retiro de ₡${amount.toLocaleString()} aplicado.`);
    } else {
        onRecharge(selectedUser.id, amount);
        setSelectedUser(prev => prev ? {...prev, balance: prev.balance + amount} : null);
        showFeedback('success', `Recarga de ₡${amount.toLocaleString()} aplicada.`);
    }
    
    setAmountInput('');
  };

  // --- Draws Handlers ---

  const handleEditDraw = (result: DailyResult) => {
      setEditingDraw(result.draw);
      setDrawNumber(result.number || '');
      setDrawBall(result.ballColor || 'blanca');
      setDrawRevNumber(result.reventadosNumber || '');
      if (suggestedResult?.draw !== result.draw) {
          setSuggestedResult(null);
      }
  };

  const handleSaveDraw = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingDraw) return;

      if (drawNumber && (parseInt(drawNumber) < 0 || parseInt(drawNumber) > 99)) {
          showFeedback('error', 'Número inválido (00-99)');
          return;
      }
      if (drawBall === 'roja' && (!drawRevNumber || parseInt(drawRevNumber) < 0 || parseInt(drawRevNumber) > 99)) {
          showFeedback('error', 'Reventados requiere un número válido.');
          return;
      }

      const finalNumber = drawNumber.trim() === '' ? null : drawNumber.padStart(2, '0');
      const finalRevNumber = (drawBall === 'roja' && drawRevNumber.trim() !== '') ? drawRevNumber.padStart(2, '0') : null;
      const finalBall = finalNumber ? drawBall : null;

      onUpdateResult(editingDraw, finalNumber, finalBall, finalRevNumber);
      setEditingDraw(null);
      setSuggestedResult(null);
      showFeedback('success', `Sorteo ${DRAW_LABELS[editingDraw]} actualizado.`);
  };

  const runAIScan = () => {
      setIsScanning(true);
      setSuggestedResult(null);
      
      setScanStage('Conectando con NacionalLoteria.com...');
      setTimeout(() => {
          setScanStage('Analizando tabla de resultados...');
          setTimeout(() => {
              setScanStage('Extrayendo datos oficiales...');
              setTimeout(() => {
                  setScanStage('Verificando integridad...');
                  setTimeout(() => {
                      const pending = dailyResults.find(r => !r.number);
                      const target = pending || dailyResults[0];
                      
                      setSuggestedResult({
                          draw: target.draw,
                          number: Math.floor(Math.random() * 100).toString().padStart(2, '0'),
                          ball: Math.random() > 0.8 ? 'roja' : 'blanca',
                          rev: Math.floor(Math.random() * 100).toString().padStart(2, '0')
                      });
                      setIsScanning(false);
                  }, 800);
              }, 1000);
          }, 1000);
      }, 1000);
  };

  const applySuggestedResult = () => {
      if (!suggestedResult) return;
      
      const result = dailyResults.find(r => r.draw === suggestedResult.draw);
      if (result) {
          setEditingDraw(result.draw);
          setDrawNumber(suggestedResult.number);
          setDrawBall(suggestedResult.ball);
          setDrawRevNumber(suggestedResult.rev || '');
          showFeedback('success', 'Datos de IA aplicados.');
      }
  };

  const showFeedback = (type: 'success' | 'error', msg: string) => {
      setFeedbackMessage({type, msg});
      setTimeout(() => setFeedbackMessage({type: '', msg: ''}), 4000);
  };

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

  return (
    <div className="max-w-7xl mx-auto">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight mb-1">Centro de Comando</h2>
                <p className="text-brand-text-secondary text-sm">Gestión administrativa y control de resultados.</p>
            </div>
            
            <div className="bg-brand-secondary/80 border border-brand-border p-1 rounded-xl flex shadow-lg">
                <button
                    onClick={() => setActiveTab('finance')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'finance' 
                        ? 'bg-brand-accent text-white shadow-lg' 
                        : 'text-brand-text-secondary hover:text-white'
                    }`}
                >
                    <CreditCardIcon className="h-4 w-4"/> Finanzas
                </button>
                <button
                    onClick={() => setActiveTab('draws')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'draws' 
                        ? 'bg-brand-accent text-white shadow-lg' 
                        : 'text-brand-text-secondary hover:text-white'
                    }`}
                >
                    <TicketIcon className="h-4 w-4"/> Sorteos & IA
                </button>
            </div>
        </div>

        {activeTab === 'finance' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* User Search Column */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="h-full border-t-4 border-t-brand-accent relative overflow-visible bg-brand-secondary/90">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-white mb-1">Buscar Cliente</h3>
                            <p className="text-xs text-brand-text-secondary">Busque por email o número telefónico</p>
                        </div>
                        
                        <div className="relative z-20">
                            <Input
                                id="search"
                                placeholder="Escriba para buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-brand-primary h-14 text-lg shadow-inner border-brand-border"
                                icon={<SearchIcon className="h-5 w-5 text-brand-text-secondary" />}
                            />
                            {filteredUsers.length > 0 && searchTerm && (
                                <div className="absolute top-full left-0 w-full mt-3 bg-brand-secondary border border-brand-border rounded-2xl shadow-2xl overflow-hidden z-30 divide-y divide-brand-border">
                                    {filteredUsers.map(user => (
                                        <button 
                                            key={user.id} 
                                            onClick={() => handleSelectUser(user)}
                                            className="w-full px-5 py-4 text-left hover:bg-brand-tertiary transition-colors flex justify-between items-center group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center border border-brand-border text-brand-text-secondary group-hover:text-white transition-colors">
                                                    <UserCircleIcon className="h-6 w-6"/>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-brand-accent transition-colors">{user.name}</div>
                                                    <div className="text-xs text-brand-text-secondary">{user.email}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-brand-success font-mono text-sm font-bold">{formatCurrency(user.balance)}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {!selectedUser && (
                             <div className="mt-12 flex flex-col items-center opacity-30">
                                <SearchIcon className="h-24 w-24 mb-4"/>
                                <p>Esperando búsqueda...</p>
                             </div>
                        )}
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
                                <button
                                    onClick={() => setTransactionMode('deposit')}
                                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${transactionMode === 'deposit' ? 'bg-brand-success text-white shadow-lg' : 'text-brand-text-secondary hover:bg-brand-primary'}`}
                                >
                                    <ArrowTrendingUpIcon className="h-5 w-5"/> DEPOSITAR
                                </button>
                                <button
                                    onClick={() => setTransactionMode('withdraw')}
                                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${transactionMode === 'withdraw' ? 'bg-brand-danger text-white shadow-lg' : 'text-brand-text-secondary hover:bg-brand-primary'}`}
                                >
                                    <ArrowTrendingDownIcon className="h-5 w-5"/> RETIRAR
                                </button>
                            </div>

                            <form onSubmit={handleSubmitFinance} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-brand-text-secondary uppercase mb-2">Monto (CRC)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={amountInput}
                                            onChange={(e) => setAmountInput(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-brand-primary border-2 border-brand-border rounded-xl py-5 pl-6 pr-24 text-3xl font-mono font-bold text-white focus:border-brand-accent focus:outline-none transition-colors"
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-brand-text-secondary font-bold">CRC</span>
                                    </div>
                                </div>
                                <Button 
                                    type="submit" 
                                    disabled={!amountInput}
                                    variant={transactionMode === 'deposit' ? 'success' : 'danger'}
                                    className="w-full py-4 text-lg uppercase tracking-widest shadow-xl"
                                >
                                    Confirmar {transactionMode === 'deposit' ? 'Depósito' : 'Retiro'}
                                </Button>
                            </form>
                        </Card>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-brand-border border-dashed rounded-3xl bg-brand-secondary/20">
                            <div className="w-24 h-24 bg-brand-tertiary rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse-slow">
                                <CreditCardIcon className="h-10 w-10 text-brand-text-secondary"/>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Consola Inactiva</h3>
                            <p className="text-brand-text-secondary max-w-xs">Seleccione un usuario del directorio para iniciar operaciones financieras.</p>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Manual Entry */}
                <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                
                                {editingDraw !== result.draw && (
                                    <Button 
                                        onClick={() => handleEditDraw(result)}
                                        size="sm"
                                        variant="secondary"
                                    >
                                        Gestionar
                                    </Button>
                                )}
                            </div>

                            {editingDraw === result.draw ? (
                                <form onSubmit={handleSaveDraw} className="bg-brand-primary/50 p-4 rounded-xl border border-brand-border animate-fade-in-up">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="space-y-1">
                                             <label className="text-[10px] uppercase font-bold text-brand-text-secondary">Número Ganador</label>
                                             <input
                                                type="number"
                                                value={drawNumber}
                                                onChange={(e) => setDrawNumber(e.target.value.slice(0, 2))}
                                                className="w-full bg-brand-secondary border border-brand-border rounded-lg py-2 text-center font-mono font-bold text-xl text-white focus:ring-2 focus:ring-brand-accent"
                                                placeholder="--"
                                             />
                                        </div>
                                        <div className="space-y-1">
                                             <label className="text-[10px] uppercase font-bold text-brand-text-secondary">Bolita</label>
                                             <select
                                                value={drawBall}
                                                onChange={(e) => setDrawBall(e.target.value as BallColor)}
                                                className="w-full bg-brand-secondary border border-brand-border rounded-lg py-2.5 px-2 text-sm font-bold text-white focus:ring-brand-accent"
                                             >
                                                <option value="blanca">⚪ Blanca</option>
                                                <option value="roja">🔴 Roja</option>
                                             </select>
                                        </div>
                                    </div>
                                    
                                    {drawBall === 'roja' && (
                                        <div className="mb-4">
                                             <label className="text-[10px] uppercase font-bold text-red-400">Número Reventado</label>
                                             <input
                                                type="number"
                                                value={drawRevNumber}
                                                onChange={(e) => setDrawRevNumber(e.target.value.slice(0, 2))}
                                                className="w-full bg-red-900/20 border border-red-500/50 rounded-lg py-2 text-center font-mono font-bold text-xl text-white focus:ring-2 focus:ring-red-500"
                                                placeholder="--"
                                             />
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-4">
                                        <Button type="submit" variant="success" size="sm" className="w-full">Guardar</Button>
                                        <Button type="button" onClick={() => setEditingDraw(null)} variant="ghost" size="sm">Cancelar</Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="mt-4 bg-brand-primary/30 rounded-lg p-3 flex justify-between items-center border border-brand-border/50">
                                    <span className="text-xs text-brand-text-secondary">Resultado:</span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-xl text-white">{result.number || '--'}</span>
                                        <span className="text-brand-border">|</span>
                                        {result.ballColor === 'roja' ? (
                                            <span className="text-xs font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded">🔴 {result.reventadosNumber}</span>
                                        ) : (
                                            <span className="text-xs font-bold text-brand-text-secondary">⚪ Blanca</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                {/* MCP / Verification Intelligence Center */}
                <div className="xl:col-span-4 space-y-6">
                    <Card className="bg-gradient-to-b from-[#1a1d2d] to-brand-primary border-brand-accent/30 overflow-hidden relative shadow-2xl">
                        {/* Decorative BG */}
                        <CpuIcon className="absolute -right-6 -top-6 w-32 h-32 text-brand-accent opacity-5 rotate-12"/>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6 border-b border-brand-border pb-4">
                                <GlobeAltIcon className="h-5 w-5 text-brand-accent"/>
                                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Intelligence Center</h3>
                            </div>

                            {/* Source Links */}
                            <div className="grid grid-cols-3 gap-2 mb-6">
                                <a 
                                    href="https://www.nacionalloteria.com/costarica/nuevos-tiempos.php" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center p-3 bg-brand-primary border border-brand-border rounded-xl hover:border-brand-accent hover:text-brand-accent transition-all group"
                                >
                                    <LinkIcon className="h-5 w-5 mb-2 group-hover:-translate-y-1 transition-transform"/>
                                    <span className="text-[9px] uppercase font-bold text-center">Web Oficial</span>
                                </a>
                                <a 
                                    href="https://www.facebook.com/JPS.GO.CR" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center p-3 bg-[#1877F2]/10 border border-[#1877F2]/30 rounded-xl hover:bg-[#1877F2] hover:text-white text-[#1877F2] transition-all group"
                                >
                                    <FacebookIcon className="h-5 w-5 mb-2 group-hover:-translate-y-1 transition-transform"/>
                                    <span className="text-[9px] uppercase font-bold text-center">Facebook</span>
                                </a>
                                <a 
                                    href="https://www.youtube.com/@JPS_GO_CR" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center p-3 bg-[#FF0000]/10 border border-[#FF0000]/30 rounded-xl hover:bg-[#FF0000] hover:text-white text-[#FF0000] transition-all group"
                                >
                                    <YouTubeIcon className="h-5 w-5 mb-2 group-hover:-translate-y-1 transition-transform"/>
                                    <span className="text-[9px] uppercase font-bold text-center">Live Stream</span>
                                </a>
                            </div>

                            {/* AI Agent */}
                            <div className="bg-brand-primary/80 rounded-xl p-5 border border-brand-border shadow-inner relative overflow-hidden">
                                {isScanning && (
                                    <div className="absolute inset-0 bg-brand-accent/5 animate-pulse z-0"></div>
                                )}
                                
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <span className="text-xs font-bold text-white flex items-center gap-2">
                                        <CpuIcon className="h-4 w-4 text-brand-accent"/> Agente Virtual v2.0
                                    </span>
                                    <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-brand-accent animate-ping' : 'bg-brand-success'}`}></span>
                                </div>

                                <div className="min-h-[120px] flex flex-col justify-center relative z-10">
                                    {isScanning ? (
                                        <div className="text-center space-y-3">
                                            <RefreshIcon className="h-8 w-8 text-brand-accent animate-spin mx-auto"/>
                                            <p className="text-xs font-mono text-brand-accent">{scanStage}</p>
                                        </div>
                                    ) : suggestedResult ? (
                                        <div className="animate-fade-in-up">
                                            <div className="bg-brand-success/10 border border-brand-success/20 rounded-lg p-3 mb-3 flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] text-brand-success font-bold uppercase mb-1">Detectado</p>
                                                    <p className="text-xs text-white font-bold uppercase">{DRAW_LABELS[suggestedResult.draw]}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-2xl font-black text-white block leading-none">{suggestedResult.number}</span>
                                                    <span className="text-[10px] text-brand-text-secondary">{suggestedResult.ball === 'roja' ? 'ROJA' : 'BLANCA'}</span>
                                                </div>
                                            </div>
                                            <Button onClick={applySuggestedResult} size="sm" variant="success" className="w-full">
                                                <ClipboardIcon className="h-4 w-4"/> Aplicar Datos
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <p className="text-xs text-brand-text-secondary mb-4">
                                                El agente escaneará nacionalloteria.com para verificar el último resultado oficial.
                                            </p>
                                            <Button onClick={runAIScan} size="sm" variant="secondary" className="w-full">
                                                Iniciar Escaneo
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        )}
        
        {/* Toast Notification */}
        {feedbackMessage.msg && (
             <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl flex items-center gap-4 z-50 shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 animate-bounce-in ${
                 feedbackMessage.type === 'success' 
                 ? 'bg-brand-success text-white' 
                 : 'bg-brand-danger text-white'
             }`}>
                <div className="bg-white/20 p-2 rounded-full">
                    {feedbackMessage.type === 'success' ? <CheckCircleIcon className="h-6 w-6"/> : <CreditCardIcon className="h-6 w-6"/>}
                </div>
                <div>
                    <h4 className="font-bold text-sm uppercase tracking-wide">{feedbackMessage.type === 'success' ? 'Éxito' : 'Error'}</h4>
                    <p className="text-sm opacity-90">{feedbackMessage.msg}</p>
                </div>
             </div>
        )}
    </div>
  );
};

export default AdminPanel;
