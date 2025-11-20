
import React, { useEffect, useState } from 'react';
import Button from './common/Button';
import { CheckCircleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, TicketIcon, FireIcon, BoltIcon, CpuIcon, ShieldCheckIcon, XCircleIcon } from './common/Icons';

export type ActionType = 'deposit' | 'withdraw' | 'purchase' | 'error';

interface ActionModalProps {
  isOpen: boolean;
  type: ActionType;
  amount: number;
  details?: string; 
  isReventados?: boolean; // New Flag for Custom Animation
  onClose: () => void;
}

const ActionModal: React.FC<ActionModalProps> = ({ isOpen, type, amount, details, isReventados = false, onClose }) => {
  const [step, setStep] = useState<'processing' | 'success' | 'rejected'>('processing');
  const [terminalText, setTerminalText] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep('processing');
      setTerminalText([]);
      
      const isError = type === 'error';

      // Terminal Effect Sequence
      const msgs = isError ? [
          "INITIATING_SECURE_HANDSHAKE...",
          "ANALYZING_LEDGER_LIQUIDITY...",
          "VERIFYING_USER_BALANCE...",
          "CRITICAL_EXCEPTION_THROWN...",
          "TRANSACTION_ABORTED."
      ] : [
          "INITIATING_SECURE_HANDSHAKE...",
          "VERIFYING_LEDGER_INTEGRITY...",
          isReventados ? "CRITICAL_EVENT_DETECTED [REVENTADOS]..." : "ALLOCATING_BLOCKCHAIN_ID...",
          "CRYPTOGRAPHIC_SIGNATURE_MATCH...",
          "TRANSACTION_COMMITTED."
      ];

      msgs.forEach((msg, idx) => {
          setTimeout(() => {
              setTerminalText(prev => [...prev, msg]);
          }, idx * (isError ? 200 : 300)); // Faster fail for errors
      });

      const timer = setTimeout(() => {
        setStep(isError ? 'rejected' : 'success');
      }, isError ? 1200 : 1800); // Quicker timeout for rejection
      return () => clearTimeout(timer);
    }
  }, [isOpen, isReventados, type]);

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(val);
  };

  // Base Config
  const baseConfig = {
    deposit: {
      color: 'text-brand-success',
      bgColor: 'bg-brand-success',
      borderColor: 'border-brand-success',
      gradient: 'from-brand-success to-emerald-800',
      icon: <ArrowTrendingUpIcon className="h-16 w-16 text-white animate-bounce" />,
      title: 'ACREDITANDO FONDOS',
      successTitle: 'RECARGA EXITOSA',
    },
    withdraw: {
      color: 'text-brand-danger',
      bgColor: 'bg-brand-danger',
      borderColor: 'border-brand-danger',
      gradient: 'from-red-600 to-red-900',
      icon: <ArrowTrendingDownIcon className="h-16 w-16 text-white animate-bounce" />,
      title: 'PROCESANDO RETIRO',
      successTitle: 'RETIRO COMPLETADO',
    },
    purchase: {
      color: 'text-brand-accent',
      bgColor: 'bg-brand-accent',
      borderColor: 'border-brand-accent',
      gradient: 'from-brand-accent to-purple-900',
      icon: <TicketIcon className="h-16 w-16 text-white animate-pulse" />,
      title: 'EMITIENDO TICKET',
      successTitle: 'JUGADA CONFIRMADA',
    },
    error: {
      color: 'text-red-500',
      bgColor: 'bg-red-600',
      borderColor: 'border-red-500',
      gradient: 'from-red-900 to-black',
      icon: <XCircleIcon className="h-16 w-16 text-red-500 animate-pulse" />,
      title: 'ANALIZANDO LIQUIDEZ',
      successTitle: 'TRANSACCIÓN RECHAZADA', // Used for rejected state
    }
  };

  const currentConfig = baseConfig[type];

  // DYNAMIC RENDERING FOR PURCHASE (NORMAL vs REVENTADOS)
  const isPurchase = type === 'purchase';
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Dynamic Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-xl transition-colors duration-500 ${type === 'error' ? 'bg-red-950/95' : (isReventados ? 'bg-red-950/90' : 'bg-brand-primary/95')}`} 
        onClick={(step === 'success' || step === 'rejected') ? onClose : undefined}
      >
         {/* Background Grid Effect */}
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
         {/* Warning Stripes for Error */}
         {type === 'error' && (
             <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(255,0,0,0.1)_20px,rgba(255,0,0,0.1)_40px)] animate-pulse-slow pointer-events-none"></div>
         )}
      </div>
      
      <div className={`relative w-full max-w-md mx-4 transition-all duration-500 ${isReventados && step === 'success' ? 'animate-shake-hard' : ''} ${step === 'rejected' ? 'animate-shake-hard' : ''}`}>
        
        {/* PROCESSING STATE OVERLAY */}
        {step === 'processing' && (
             <div className="absolute inset-0 rounded-3xl z-0 overflow-hidden">
                 <div className={`w-full h-full absolute top-0 bg-gradient-to-b ${type === 'error' ? 'from-red-600/30' : (isReventados ? 'from-red-500/20' : 'from-brand-accent/20')} to-transparent animate-pulse`}></div>
                 <div className="w-full h-1 bg-white/30 absolute top-0 animate-scan-line"></div>
             </div>
        )}

        <div className={`
            relative border-2 rounded-3xl p-8 shadow-2xl overflow-hidden transition-all duration-500 transform 
            ${(step === 'success' || step === 'rejected') ? 'scale-100 opacity-100' : 'scale-95 opacity-90'}
            ${type === 'error' 
                ? 'bg-black border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.6)]' 
                : (isReventados 
                    ? 'bg-black border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]' 
                    : `bg-brand-secondary ${step === 'success' ? currentConfig.borderColor : 'border-brand-border'}`)
            }
        `}>
            
            {/* === PROCESSING STATE === */}
            {step === 'processing' && (
                <div className="flex flex-col items-center justify-center py-8 relative z-10">
                    <div className="relative mb-8">
                        {/* Spinner Ring */}
                        <div className={`w-28 h-28 rounded-full border-4 border-t-transparent border-b-transparent ${type === 'error' ? 'border-red-600' : (isReventados ? 'border-red-500' : currentConfig.borderColor)} animate-spin`}></div>
                        <div className={`absolute inset-2 rounded-full border-2 border-l-transparent border-r-transparent ${type === 'error' ? 'border-red-400' : (isReventados ? 'border-yellow-500' : 'border-white/30')} animate-spin-slow`}></div>
                        
                        <div className="absolute inset-0 flex items-center justify-center">
                            {type === 'error' ? <BoltIcon className="h-10 w-10 text-red-600 animate-pulse"/> : (isReventados ? <FireIcon className="h-10 w-10 text-red-500 animate-pulse"/> : currentConfig.icon)}
                        </div>
                    </div>
                    
                    <h2 className={`text-xl font-black tracking-[0.2em] uppercase mb-4 animate-pulse ${type === 'error' ? 'text-red-500' : (isReventados ? 'text-red-500' : 'text-white')}`}>
                        {isReventados ? 'CRITICAL OVERDRIVE' : currentConfig.title}
                    </h2>

                    {/* Terminal Output */}
                    <div className="w-full bg-black/50 rounded-lg p-3 font-mono text-[10px] text-left h-24 overflow-hidden border border-white/10">
                        {terminalText.map((t, i) => (
                            <div key={i} className={`${type === 'error' ? 'text-red-500 font-bold' : (isReventados ? 'text-red-400' : 'text-brand-accent')} mb-1`}>
                                <span className="opacity-50 mr-2">{`>`}</span>{t}
                            </div>
                        ))}
                        <div className="animate-pulse">_</div>
                    </div>
                </div>
            )}

            {/* === SUCCESS / REJECTED STATE === */}
            {(step === 'success' || step === 'rejected') && (
                <div className="flex flex-col items-center animate-fade-in-up relative z-10">
                    
                    {/* --- REJECTED / ERROR ANIMATION --- */}
                    {step === 'rejected' ? (
                         <div className="mb-6 relative animate-bounce-in">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-red-600/20 rounded-full blur-xl animate-pulse"></div>
                            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-900 to-black flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.8)] border-4 border-red-600 relative overflow-hidden">
                                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
                                 <XCircleIcon className="h-16 w-16 text-red-500 animate-pulse" />
                            </div>
                        </div>
                    ) : isReventados ? (
                    /* --- REVENTADOS HIGH TIER --- */
                         <div className="mb-6 relative animate-stamp">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-red-500/30 rounded-full blur-xl animate-pulse"></div>
                            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-600 to-yellow-600 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.6)] border-4 border-red-400 relative overflow-hidden">
                                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-30"></div>
                                 <FireIcon className="h-14 w-14 text-white animate-shake-hard" />
                            </div>
                        </div>
                    ) : (
                    /* --- STANDARD SECURE --- */
                        <div className="mb-6 relative animate-stamp">
                             <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${currentConfig.gradient} flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]`}>
                                  {type === 'deposit' && <ArrowTrendingUpIcon className="h-12 w-12 text-white" />}
                                  {type === 'withdraw' && <ArrowTrendingDownIcon className="h-12 w-12 text-white" />}
                                  {type === 'purchase' && <TicketIcon className="h-12 w-12 text-white" />}
                             </div>
                             <div className={`absolute inset-0 rounded-full ${currentConfig.borderColor} border-2 animate-ping opacity-50`}></div>
                        </div>
                    )}

                    <h2 className={`text-3xl font-black uppercase tracking-tighter mb-1 ${step === 'rejected' ? 'text-red-500 glitch-text' : (isReventados ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-red-600 drop-shadow-sm animate-pulse' : currentConfig.color)}`}>
                        {step === 'rejected' ? 'ACCESO DENEGADO' : (isReventados ? 'JUGADA MAESTRA' : currentConfig.successTitle)}
                    </h2>
                    
                    <div className={`text-xs font-bold uppercase tracking-widest mb-6 px-4 py-1 rounded-full border flex items-center gap-2 ${step === 'rejected' ? 'bg-red-950 border-red-600 text-red-400' : (isReventados ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-brand-primary/50 border-brand-border text-white')}`}>
                        {step === 'rejected' ? <BoltIcon className="h-3 w-3 text-red-500"/> : (isReventados ? <BoltIcon className="h-3 w-3 text-yellow-400"/> : <ShieldCheckIcon className="h-3 w-3 text-brand-success"/>)}
                        <span>ID: {Math.floor(Math.random() * 1000000).toString(16).toUpperCase()}</span>
                    </div>

                    {/* Holographic Receipt / Error Box */}
                    <div className={`w-full border border-dashed p-6 rounded-lg mb-6 relative overflow-hidden group ${step === 'rejected' ? 'bg-red-950/50 border-red-600/50' : (isReventados ? 'bg-red-950/30 border-red-500/30' : 'bg-brand-tertiary/30 border-brand-text-secondary/30')}`}>
                        <div className={`absolute inset-0 bg-gradient-to-r ${step === 'rejected' ? 'from-transparent via-red-500/10 to-transparent' : 'from-transparent via-white/5 to-transparent'} -translate-x-full animate-shimmer group-hover:animate-none`}></div>
                        
                        {step === 'rejected' ? (
                             <div className="text-center">
                                 <p className="text-xs text-red-400 uppercase font-bold mb-2">Razón del bloqueo</p>
                                 <p className="text-xl text-white font-mono font-black">FONDOS INSUFICIENTES</p>
                                 <p className="text-[10px] text-red-300 mt-2 font-mono">LIQUIDITY_CHECK_FAILED</p>
                             </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-brand-text-secondary uppercase">Monto Total</span>
                                    <span className={`text-3xl font-mono font-black ${isReventados ? 'text-yellow-400' : currentConfig.color}`}>
                                        {formatCurrency(amount)}
                                    </span>
                                </div>
                                {details && (
                                    <div className={`flex justify-between items-center border-t pt-2 ${isReventados ? 'border-red-500/20' : 'border-brand-border/30'}`}>
                                        <span className="text-[10px] text-brand-text-secondary">Detalle</span>
                                        <span className="text-xs text-white font-bold">{details}</span>
                                    </div>
                                )}
                            </>
                        )}

                        {isReventados && step !== 'rejected' && (
                             <div className="mt-3 text-center">
                                 <span className="text-[10px] font-black text-red-400 uppercase bg-red-900/40 px-2 py-1 rounded border border-red-500/30 animate-pulse">
                                     ⚠️ POTENCIAL x200 ACTIVADO
                                 </span>
                             </div>
                        )}
                    </div>

                    <Button 
                        onClick={onClose} 
                        className={`w-full uppercase tracking-widest shadow-lg border-none hover:brightness-110 font-black py-4 ${step === 'rejected' ? 'bg-red-700 hover:bg-red-600 text-white' : (isReventados ? 'bg-gradient-to-r from-red-600 to-yellow-600 hover:from-red-500 hover:to-yellow-500 text-white' : `${currentConfig.bgColor} text-white`)}`}
                    >
                        {step === 'rejected' ? 'ENTENDIDO, CANCELAR' : (isReventados ? 'CONFIRMAR ALTO RIESGO' : 'ACEPTAR')}
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
