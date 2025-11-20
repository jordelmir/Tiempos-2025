
import React, { useEffect, useState } from 'react';
import Button from './common/Button';
import { FireIcon, TicketIcon, CheckCircleIcon, MailIcon } from './icons/Icons';

interface WinnerModalProps {
  winType: 'regular' | 'reventados' | null;
  amount: number;
  ticketNumber: string;
  userEmail: string;
  onClose: () => void;
}

const WinnerModal: React.FC<WinnerModalProps> = ({ winType, amount, ticketNumber, userEmail, onClose }) => {
  const [show, setShow] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'sending' | 'sent'>('sending');
  
  // Particle system state
  const [particles, setParticles] = useState<{id: number, x: number, y: number, color: string, size: number}[]>([]);

  useEffect(() => {
    if (winType) {
      setShow(true);
      setEmailStatus('sending');
      
      // Simulate email dispatch confirmation lag
      setTimeout(() => {
          setEmailStatus('sent');
      }, 1200);

      // Generate particles
      const newParticles = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: winType === 'reventados' 
            ? (Math.random() > 0.5 ? '#EF4444' : '#FCD34D') // Red/Gold
            : (Math.random() > 0.5 ? '#10B981' : '#6366F1'), // Green/Indigo
        size: Math.random() * 10 + 5
      }));
      setParticles(newParticles);
    } else {
      setShow(false);
    }
  }, [winType]);

  if (!show || !winType) return null;

  const isReventados = winType === 'reventados';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden">
      
      {/* 1. Dynamic Backdrop */}
      <div className={`absolute inset-0 transition-all duration-1000 ${isReventados ? 'bg-red-900/90' : 'bg-brand-primary/90'} backdrop-blur-xl`}>
         {/* Radial Glare */}
         <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] rounded-full opacity-30 ${isReventados ? 'bg-gradient-radial from-red-500 to-transparent animate-pulse-slow' : 'bg-gradient-radial from-brand-accent to-transparent animate-spin-slow'}`}></div>
      </div>

      {/* 2. Particles FX */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         {particles.map(p => (
             <div 
                key={p.id}
                className="absolute rounded-full opacity-60 animate-float"
                style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    backgroundColor: p.color,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    animationDuration: `${Math.random() * 3 + 2}s`,
                    animationDelay: `${Math.random() * 2}s`
                }}
             ></div>
         ))}
      </div>

      {/* 3. Main Card Container */}
      <div className={`relative w-full max-w-lg mx-4 transform transition-all duration-500 ${isReventados ? 'animate-shake-hard' : 'animate-zoom-in-fast'}`}>
          
          {/* Glowing Border Effect */}
          <div className={`absolute -inset-1 rounded-3xl blur-lg opacity-75 ${isReventados ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-red-600 animate-glitch' : 'bg-gradient-to-r from-green-400 via-brand-accent to-blue-500'}`}></div>

          <div className={`relative bg-brand-secondary border-2 ${isReventados ? 'border-red-500' : 'border-brand-success'} rounded-3xl p-8 md:p-12 text-center shadow-2xl overflow-hidden`}>
              
              {/* Header Icon */}
              <div className="flex justify-center mb-6 relative z-10">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${isReventados ? 'bg-red-600 border-red-400 shadow-[0_0_50px_rgba(239,68,68,0.6)] animate-scale-pulse' : 'bg-brand-success border-white shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce-in'}`}>
                      {isReventados ? (
                          <FireIcon className="h-12 w-12 text-yellow-300 animate-pulse" />
                      ) : (
                          <CheckCircleIcon className="h-12 w-12 text-white" />
                      )}
                  </div>
              </div>

              {/* Main Text */}
              <div className="relative z-10 space-y-2">
                  <h2 className={`text-lg font-bold uppercase tracking-[0.2em] ${isReventados ? 'text-red-400' : 'text-brand-text-secondary'}`}>
                      {isReventados ? '¡IMPACTO CRÍTICO!' : '¡FELICIDADES!'}
                  </h2>
                  
                  <h1 className={`text-5xl md:text-6xl font-black italic tracking-tighter leading-none mb-4 ${isReventados ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-600 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]' : 'text-white drop-shadow-lg'}`}>
                      {isReventados ? 'REVENTADO' : 'GANADOR'}
                  </h1>
                  
                  <div className="flex justify-center items-center gap-2 mb-6">
                      <span className="text-sm text-brand-text-secondary font-mono uppercase">Número Jugado</span>
                      <span className="bg-white text-brand-primary font-black text-xl px-3 py-1 rounded-lg shadow-lg">
                          {ticketNumber}
                      </span>
                  </div>
              </div>

              {/* Prize Display */}
              <div className={`relative z-10 py-4 px-6 rounded-xl mb-6 border ${isReventados ? 'bg-gradient-to-r from-red-900/50 to-black border-red-500/50' : 'bg-brand-tertiary border-brand-border'}`}>
                   <p className="text-xs font-bold text-brand-text-secondary uppercase mb-1">Premio Total Acreditado</p>
                   <p className={`text-4xl md:text-5xl font-mono font-black ${isReventados ? 'text-yellow-400' : 'text-brand-success'}`}>
                       {formatCurrency(amount)}
                   </p>
              </div>

              {/* --- EMAIL SENT NOTIFICATION --- */}
              <div className="relative z-10 mb-6 flex justify-center">
                  <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-500 ${emailStatus === 'sent' ? 'bg-brand-success/10 border-brand-success/30 text-brand-success' : 'bg-brand-tertiary border-brand-border text-brand-text-secondary'}`}>
                      <div className="relative">
                          <MailIcon className="h-4 w-4" />
                          {emailStatus === 'sending' && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-accent rounded-full animate-ping"></span>
                          )}
                      </div>
                      <div className="text-left">
                          <p className="text-[10px] font-bold uppercase tracking-wider">
                              {emailStatus === 'sent' ? 'Comprobante Digital Enviado' : 'Generando Certificado...'}
                          </p>
                          {emailStatus === 'sent' && (
                              <p className="text-[9px] opacity-70 lowercase font-mono">{userEmail}</p>
                          )}
                      </div>
                      {emailStatus === 'sent' && <CheckCircleIcon className="h-4 w-4 animate-bounce-in" />}
                  </div>
              </div>

              {/* Footer Button */}
              <div className="relative z-10">
                  <Button 
                    onClick={() => { setShow(false); setTimeout(onClose, 300); }} 
                    className={`w-full py-4 uppercase tracking-widest text-sm font-black shadow-xl ${isReventados ? 'bg-gradient-to-r from-red-600 to-yellow-600 hover:from-red-500 hover:to-yellow-500 text-white' : 'bg-gradient-to-r from-brand-success to-emerald-600 text-white'}`}
                  >
                      {isReventados ? '¡RECLAMAR FORTUNA!' : 'EXCELENTE, CONTINUAR'}
                  </Button>
                  <p className="text-[10px] text-brand-text-secondary mt-4 opacity-60">
                      El saldo ha sido agregado a tu cuenta automáticamente.
                  </p>
              </div>

              {/* Background Deco Elements */}
              {isReventados && (
                  <>
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-600 rounded-full blur-[80px] opacity-20 animate-pulse"></div>
                  </>
              )}
          </div>
      </div>
    </div>
  );
};

export default WinnerModal;
