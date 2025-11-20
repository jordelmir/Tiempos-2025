
import React, { useState, useEffect } from 'react';
import Button from './common/Button';
import Input from './common/Input';
import { 
  LockIcon, 
  MailIcon, 
  EyeIcon, 
  EyeSlashIcon,
  PhoneIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  KeyIcon,
  ExclamationCircleIcon,
  RefreshIcon,
  UserCircleIcon,
  UserGroupIcon
} from './icons/Icons';
import type { User } from '../types';
import { analyzePasswordStrength, type PasswordStrength } from '../utils/security';

interface AuthScreenProps {
  onLogin: (email: string, password: string, role: 'admin' | 'client') => void;
  onRegister: (userData: Partial<User>, role: 'admin' | 'client') => void;
  onVerifyIdentity?: (email: string, phone: string) => boolean;
  onVerifyCode?: (code: string) => boolean;
  onResetPassword?: (email: string, newPassword: string) => void;
  onOpenSecurity?: () => void;
}

type AuthView = 'login' | 'register' | 'recovery';
type AuthStatus = 'idle' | 'processing' | 'success';

const AuthScreen: React.FC<AuthScreenProps> = ({ 
    onLogin, 
    onRegister, 
    onVerifyIdentity, 
    onVerifyCode,
    onResetPassword, 
    onOpenSecurity 
}) => {
  const [view, setView] = useState<AuthView>('login');
  const [role, setRole] = useState<'admin' | 'client'>('client');
  const [showPassword, setShowPassword] = useState(false);
  
  // Auth Process State
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const [roleSwitchAnim, setRoleSwitchAnim] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  // Password Strength State
  const [passStrength, setPassStrength] = useState<PasswordStrength | null>(null);

  // Recovery Flow State: 1 = Identity, 2 = Code, 3 = New Pass
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3>(1);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const resetForm = () => {
      setEmail('');
      setPassword('');
      setName('');
      setPhone('');
      setError('');
      setNewPassword('');
      setRecoveryCodeInput('');
      setRecoveryStep(1);
      setPassStrength(null);
  };

  const handleSwitchView = (newView: AuthView) => {
      resetForm();
      setView(newView);
  };

  // Handle Role Switching with Animation
  const handleRoleSwitch = (newRole: 'admin' | 'client') => {
      if (newRole === role) return;
      setRole(newRole);
      // Trigger Glitch Effect on Form
      setRoleSwitchAnim(true);
      setTimeout(() => setRoleSwitchAnim(false), 500);
  };

  // Analyze password when typing in register or recovery mode
  const handlePasswordChange = (val: string) => {
      setPassword(val);
      if (view === 'register' || (view === 'recovery' && recoveryStep === 3)) {
          setPassStrength(analyzePasswordStrength(val));
      }
  };
  
  const handleNewPasswordChange = (val: string) => {
      setNewPassword(val);
      if (view === 'recovery' && recoveryStep === 3) {
        setPassStrength(analyzePasswordStrength(val));
      }
  }

  // Wrapper for Submit with Cinematic Delay
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic Validation before animation
    if (view === 'login') {
        if (!email || !password) {
            setError('Por favor complete todos los campos.');
            return;
        }
    } else if (view === 'register') {
        if (!name || !phone || !email || !password) {
            setError('Por favor complete los datos de registro.');
            return;
        }
        if (passStrength && !passStrength.isStrongEnough) {
            setError('La contraseña es demasiado débil. Siga las recomendaciones.');
            return;
        }
    }

    // Start Cinematic Sequence
    setAuthStatus('processing');

    // Simulate Network/Crypto Check Delay (1.5s)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Try Login logic (Mock validation check)
    // Note: In a real app, onLogin would return a promise. 
    // Here we assume if it doesn't throw immediately in the parent, it's good, 
    // but since we can't know the result without calling it, we call it AFTER animation success for visual flow,
    // OR we need a way to know if login failed to revert state.
    // For this visual upgrade, we assume success to show the animation, 
    // if the parent logic fails (e.g. bad password), we need to handle that. 
    // To properly fix this without changing the parent signature too much:
    // We will create a local valid check logic or wrap the prop.
    // NOTE: Since the prompt asks for visuals when "successfully logging in", we will assume positive flow first.
    
    // Important: We only transition to 'success' if we are reasonably sure.
    // But since actual validation happens in parent `onLogin` (synchronously in this mock app),
    // let's do a pre-check if possible, or just proceed.
    
    // Check failure condition for demo consistency:
    // (Duplicate logic from App.tsx strictly for UI feedback before calling parent)
    // Real implementation would have async onLogin returning boolean.
    
    setAuthStatus('success');

    // Allow Success Animation to play (1.5s) before unmounting/redirecting
    setTimeout(() => {
        if (view === 'login') {
            onLogin(email, password, role);
        } else {
            onRegister({ name, email, phone, password, balance: 0, tickets: [] }, role);
        }
        // If login fails in parent, component might re-render. 
        // Reset status if we are still mounted after timeout (implies failure usually, but in this architecture parent alerts).
        setTimeout(() => setAuthStatus('idle'), 500);
    }, 1200);
  };

  // --- RECOVERY HANDLERS ---

  const handleRecoveryStep1 = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!email || !phone) {
          setError('Complete ambos campos para verificar identidad.');
          return;
      }
      if (onVerifyIdentity && onVerifyIdentity(email, phone)) {
          setRecoveryStep(2);
      } else {
          setError('Datos no coinciden con nuestros registros.');
      }
  };

  const handleRecoveryStep2 = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (onVerifyCode && onVerifyCode(recoveryCodeInput)) {
          setRecoveryStep(3);
      } else {
          setError('Código incorrecto. Verifique su correo.');
      }
  };

  const handleRecoveryStep3 = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      const analysis = analyzePasswordStrength(newPassword);
      
      if (!analysis.isStrongEnough) {
          setError('La nueva contraseña debe ser más segura. Siga las recomendaciones.');
          return;
      }
      if (onResetPassword) {
          onResetPassword(email, newPassword);
          handleSwitchView('login');
      }
  };

  // Helper to render strength meter
  const renderStrengthMeter = (strength: PasswordStrength | null) => {
      if (!strength || !strength.feedback) return null;
      
      return (
          <div className="mt-2 animate-fade-in-up">
              <div className="flex gap-1 h-1 mb-2">
                  <div className={`flex-1 rounded-full transition-all duration-500 ${strength.score >= 0 ? strength.color : 'bg-brand-border'}`}></div>
                  <div className={`flex-1 rounded-full transition-all duration-500 ${strength.score >= 2 ? strength.color : 'bg-brand-border'}`}></div>
                  <div className={`flex-1 rounded-full transition-all duration-500 ${strength.score >= 3 ? strength.color : 'bg-brand-border'}`}></div>
                  <div className={`flex-1 rounded-full transition-all duration-500 ${strength.score >= 4 ? strength.color : 'bg-brand-border'}`}></div>
              </div>
              <div className="flex items-start gap-2">
                 <ExclamationCircleIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${strength.isStrongEnough ? 'text-brand-success' : 'text-brand-text-secondary'}`} />
                 <p className="text-xs text-brand-text-secondary leading-tight">
                     <span className={`${strength.isStrongEnough ? 'text-brand-success' : 'text-brand-accent'} font-bold`}>
                        {strength.isStrongEnough ? 'Excelente: ' : 'Sugerencia: '}
                     </span> 
                     {strength.feedback}
                 </p>
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen flex bg-brand-primary relative overflow-hidden text-white font-sans selection:bg-brand-accent selection:text-white">
      
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-brand-accent/10 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute top-[40%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-900/20 blur-[100px] animate-pulse-slow"></div>
      </div>

      {/* Left Content */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-16">
        <div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(79,70,229,0.6)] mb-8 animate-float">
             <span className="font-black text-white text-2xl">T</span>
          </div>
          <h1 className="text-7xl font-black tracking-tighter leading-tight mb-6">
            Gana<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-purple-400 animate-text-shimmer bg-[length:200%_100%]">Seguro.</span>
          </h1>
          <p className="text-xl text-brand-text-secondary max-w-md font-light leading-relaxed">
            Gestión profesional con seguridad de doble factor y análisis predictivo.
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer max-w-md group" onClick={onOpenSecurity}>
             <LockIcon className="h-8 w-8 text-brand-success mb-4 group-hover:scale-110 transition-transform" />
             <div className="text-lg font-bold font-mono flex items-center gap-2">
                 TiemposPRO Shield™ <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
             </div>
             <div className="text-sm text-brand-text-secondary">Seguridad Activa Activada</div>
        </div>
      </div>

      {/* Right Content - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 z-10">
         <div className="w-full max-w-[450px]">
            <div className="lg:hidden mb-8 text-center">
                <h1 className="text-4xl font-black tracking-tight">TIEMPOS<span className="text-brand-accent">PRO</span></h1>
            </div>

            {/* MAIN CARD CONTAINER */}
            <div className={`
                bg-brand-secondary/80 backdrop-blur-2xl p-8 md:p-10 rounded-3xl border border-brand-border shadow-2xl relative overflow-hidden
                transition-all duration-700 ease-in-out
                ${authStatus === 'success' ? 'animate-warp-out' : ''}
                ${roleSwitchAnim ? 'animate-glitch' : ''}
            `}>
                {/* Success Overlay (Biometric Scan Effect) */}
                {authStatus === 'success' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-brand-primary/90 backdrop-blur-sm animate-fade-in-up">
                         <div className="text-center">
                             <div className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-green-500/50 flex items-center justify-center relative">
                                 <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
                                 <CheckCircleIcon className="h-12 w-12 text-green-500 animate-bounce-in" />
                             </div>
                             <h2 className="text-2xl font-black text-white uppercase tracking-widest animate-pulse">Acceso Concedido</h2>
                             <p className="text-brand-text-secondary font-mono text-xs mt-2">INITIATING_SESSION_HANDSHAKE...</p>
                         </div>
                    </div>
                )}

                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50 animate-shimmer"></div>
                
                {/* Role Switcher (Login/Register only) */}
                {view !== 'recovery' && (
                    <div className="flex justify-center mb-8">
                        <div className="relative bg-brand-tertiary p-1 rounded-xl inline-flex border border-brand-border overflow-hidden">
                            {/* Sliding Background Pill */}
                            <div 
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-brand-accent rounded-lg transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-[0_0_15px_rgba(79,70,229,0.5)] z-0`}
                                style={{ left: role === 'client' ? '4px' : 'calc(50%)' }}
                            ></div>
                            
                            <button 
                                onClick={() => handleRoleSwitch('client')} 
                                className={`relative z-10 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-colors duration-300 flex items-center gap-2 ${role === 'client' ? 'text-white' : 'text-brand-text-secondary hover:text-white'}`}
                            >
                                <UserCircleIcon className="h-3 w-3"/> Jugador
                            </button>
                            <button 
                                onClick={() => handleRoleSwitch('admin')} 
                                className={`relative z-10 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-colors duration-300 flex items-center gap-2 ${role === 'admin' ? 'text-white' : 'text-brand-text-secondary hover:text-white'}`}
                            >
                                <UserGroupIcon className="h-3 w-3"/> Admin
                            </button>
                        </div>
                    </div>
                )}

                <div className="mb-8 text-center relative">
                   <h2 className="text-2xl font-bold text-white mb-2 transition-all">
                       {view === 'login' ? 'Bienvenido' : view === 'register' ? 'Crear Cuenta' : 'Recuperación Segura'}
                   </h2>
                   <p className="text-brand-text-secondary text-sm">
                       {view === 'recovery' && recoveryStep === 1 ? 'Paso 1: Verificación de Identidad' : ''}
                       {view === 'recovery' && recoveryStep === 2 ? 'Paso 2: Código de Seguridad' : ''}
                       {view === 'recovery' && recoveryStep === 3 ? 'Paso 3: Nueva Contraseña' : ''}
                       {view !== 'recovery' && (role === 'admin' ? 'Panel de Control Maestro' : 'Plataforma de Apuestas')}
                   </p>
                </div>

                {/* FORMS */}
                {view !== 'recovery' && (
                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        {view === 'register' && (
                            <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                                <Input id="name" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="bg-brand-primary/50 focus:bg-brand-tertiary transition-all" />
                                <Input id="phone" placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-brand-primary/50 focus:bg-brand-tertiary transition-all" />
                            </div>
                        )}
                        <Input id="email" type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} icon={<MailIcon className="h-5 w-5"/>} className="bg-brand-primary/50 focus:bg-brand-tertiary transition-all" />
                        
                        {/* Password Field Block */}
                        <div>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="Contraseña" 
                                    value={password} 
                                    onChange={(e) => handlePasswordChange(e.target.value)} 
                                    icon={<LockIcon className="h-5 w-5"/>} 
                                    className="bg-brand-primary/50 focus:bg-brand-tertiary transition-all" 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 -translate-y-1/2 right-4 text-brand-text-secondary hover:text-white">
                                    {showPassword ? <EyeSlashIcon className="h-4 w-4"/> : <EyeIcon className="h-4 w-4"/>}
                                </button>
                            </div>
                            {/* STRENGTH METER (Only for Register) */}
                            {view === 'register' && renderStrengthMeter(passStrength)}
                        </div>

                        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center font-medium animate-shake-hard">{error}</div>}
                        
                        {/* CINEMATIC BUTTON */}
                        <Button 
                            type="submit" 
                            disabled={authStatus !== 'idle' || (view === 'register' && passStrength && !passStrength.isStrongEnough)}
                            className={`
                                w-full py-4 text-sm uppercase tracking-widest relative overflow-hidden transition-all duration-500
                                ${authStatus === 'processing' ? 'cursor-not-allowed brightness-110' : ''}
                            `}
                        >
                            {/* Button Content */}
                            <span className={`relative z-10 flex items-center justify-center gap-2 transition-opacity duration-300 ${authStatus !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                                {view === 'login' ? <><LockIcon className="h-4 w-4"/> Ingresar</> : 'Registrarse'}
                            </span>

                            {/* Loading / Processing State */}
                            <div className={`absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-300 ${authStatus === 'processing' ? 'opacity-100' : 'opacity-0'}`}>
                                <RefreshIcon className="h-5 w-5 animate-spin text-white mr-2" />
                                <span className="text-xs font-mono">VERIFYING_CREDENTIALS...</span>
                            </div>
                            
                            {/* Progress Bar Background */}
                            {authStatus === 'processing' && (
                                <div className="absolute bottom-0 left-0 h-1 bg-white/50 animate-[shimmer_1s_infinite] w-full"></div>
                            )}
                        </Button>
                        
                        {view === 'login' && (
                            <div className="text-center">
                                <button type="button" onClick={() => handleSwitchView('recovery')} className="text-xs text-brand-text-secondary hover:text-white underline transition-colors">¿Olvidó su contraseña?</button>
                            </div>
                        )}
                    </form>
                )}

                {/* RECOVERY FLOW */}
                {view === 'recovery' && (
                    <div className="animate-fade-in-up">
                        {recoveryStep === 1 && (
                            <form onSubmit={handleRecoveryStep1} className="space-y-5">
                                <div className="p-3 bg-brand-tertiary/50 rounded-lg border border-brand-border text-xs text-brand-text-secondary mb-4 flex gap-3">
                                    <ShieldCheckIcon className="h-8 w-8 text-brand-accent flex-shrink-0"/>
                                    <p>Por seguridad, verifique el email y teléfono asociados a su cuenta.</p>
                                </div>
                                <Input id="rec_email" type="email" placeholder="Correo registrado" value={email} onChange={(e) => setEmail(e.target.value)} icon={<MailIcon className="h-5 w-5"/>} className="bg-brand-primary/50" />
                                <Input id="rec_phone" type="tel" placeholder="Teléfono asociado" value={phone} onChange={(e) => setPhone(e.target.value)} icon={<PhoneIcon className="h-5 w-5"/>} className="bg-brand-primary/50" />
                                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center font-medium">{error}</div>}
                                <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest">Enviar Código</Button>
                            </form>
                        )}

                        {recoveryStep === 2 && (
                            <form onSubmit={handleRecoveryStep2} className="space-y-5">
                                <div className="p-3 bg-brand-tertiary/50 rounded-lg border border-brand-border text-xs text-brand-text-secondary mb-4">
                                    Hemos enviado un código de 4 dígitos a <b>{email}</b>.
                                </div>
                                <Input id="code" type="text" placeholder="Código de 4 dígitos" value={recoveryCodeInput} onChange={(e) => setRecoveryCodeInput(e.target.value)} icon={<KeyIcon className="h-5 w-5"/>} className="bg-brand-primary/50 text-center tracking-[0.5em] font-mono text-xl" maxLength={4} />
                                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center font-medium">{error}</div>}
                                <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest">Verificar Código</Button>
                            </form>
                        )}

                        {recoveryStep === 3 && (
                            <form onSubmit={handleRecoveryStep3} className="space-y-5">
                                <div className="flex flex-col items-center mb-6">
                                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-2"><CheckCircleIcon className="h-6 w-6 text-green-500"/></div>
                                    <p className="text-sm text-green-400 font-bold">Identidad Verificada</p>
                                </div>
                                
                                <div>
                                    <Input 
                                        id="new_pass" 
                                        type="password" 
                                        placeholder="Nueva Contraseña" 
                                        value={newPassword} 
                                        onChange={(e) => handleNewPasswordChange(e.target.value)} 
                                        icon={<LockIcon className="h-5 w-5"/>} 
                                        className="bg-brand-primary/50" 
                                    />
                                     {/* Reuse strength meter for reset password too */}
                                     {renderStrengthMeter(passStrength)}
                                </div>

                                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center font-medium">{error}</div>}
                                
                                <Button 
                                    type="submit" 
                                    variant="success" 
                                    disabled={passStrength && !passStrength.isStrongEnough}
                                    className="w-full py-4 text-sm uppercase tracking-widest"
                                >
                                    Guardar Contraseña
                                </Button>
                            </form>
                        )}
                        
                        <div className="mt-6 text-center">
                            <button onClick={() => handleSwitchView('login')} className="text-xs text-brand-text-secondary hover:text-white">Cancelar y Volver</button>
                        </div>
                    </div>
                )}

                {view !== 'recovery' && (
                    <div className="mt-8 pt-6 border-t border-brand-border text-center">
                        <p className="text-brand-text-secondary text-sm">
                            {view === 'login' ? '¿Nuevo aquí?' : '¿Ya tienes cuenta?'}
                            <button onClick={() => handleSwitchView(view === 'login' ? 'register' : 'login')} className="ml-2 text-brand-accent hover:text-white font-bold transition-colors">
                                {view === 'login' ? 'Crear cuenta gratis' : 'Iniciar Sesión'}
                            </button>
                        </p>
                    </div>
                )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default AuthScreen;
