
import React, { useState } from 'react';
import Button from './common/Button';
import Input from './common/Input';
import { 
  LockIcon, 
  MailIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ArrowTrendingUpIcon,
  PhoneIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  KeyIcon
} from './icons/Icons';
import type { User } from '../types';

interface AuthScreenProps {
  onLogin: (email: string, password: string, role: 'admin' | 'client') => void;
  onRegister: (userData: Partial<User>, role: 'admin' | 'client') => void;
  onVerifyIdentity?: (email: string, phone: string) => boolean;
  onVerifyCode?: (code: string) => boolean;
  onResetPassword?: (email: string, newPassword: string) => void;
  onOpenSecurity?: () => void;
}

type AuthView = 'login' | 'register' | 'recovery';

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
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

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
  };

  const handleSwitchView = (newView: AuthView) => {
      resetForm();
      setView(newView);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (view === 'login') {
        if (!email || !password) {
            setError('Por favor complete todos los campos.');
            return;
        }
        onLogin(email, password, role);
    } 
    else if (view === 'register') {
        if (!name || !phone || !email || !password) {
            setError('Por favor complete los datos de registro.');
            return;
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        onRegister({ name, email, phone, password, balance: 0, tickets: [] }, role);
    }
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
      if (!newPassword || newPassword.length < 6) {
          setError('La nueva contraseña debe tener al menos 6 caracteres.');
          return;
      }
      if (onResetPassword) {
          onResetPassword(email, newPassword);
          handleSwitchView('login');
      }
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(79,70,229,0.6)] mb-8">
             <span className="font-black text-white text-2xl">T</span>
          </div>
          <h1 className="text-7xl font-black tracking-tighter leading-tight mb-6">
            Gana<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-purple-400">Seguro.</span>
          </h1>
          <p className="text-xl text-brand-text-secondary max-w-md font-light leading-relaxed">
            Gestión profesional con seguridad de doble factor.
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer max-w-md" onClick={onOpenSecurity}>
             <LockIcon className="h-8 w-8 text-brand-success mb-4" />
             <div className="text-lg font-bold font-mono">TiemposPRO Shield™</div>
             <div className="text-sm text-brand-text-secondary">Seguridad Activa Activada</div>
        </div>
      </div>

      {/* Right Content - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 z-10">
         <div className="w-full max-w-[450px]">
            <div className="lg:hidden mb-8 text-center">
                <h1 className="text-4xl font-black tracking-tight">TIEMPOS<span className="text-brand-accent">PRO</span></h1>
            </div>

            <div className="bg-brand-secondary/80 backdrop-blur-2xl p-8 md:p-10 rounded-3xl border border-brand-border shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50"></div>
                
                {/* Role Switcher (Login/Register only) */}
                {view !== 'recovery' && (
                    <div className="flex justify-center mb-8">
                        <div className="bg-brand-tertiary p-1 rounded-xl inline-flex border border-brand-border">
                            <button onClick={() => setRole('client')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${role === 'client' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary'}`}>Jugador</button>
                            <button onClick={() => setRole('admin')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${role === 'admin' ? 'bg-brand-accent text-white' : 'text-brand-text-secondary'}`}>Admin</button>
                        </div>
                    </div>
                )}

                <div className="mb-8 text-center">
                   <h2 className="text-2xl font-bold text-white mb-2">
                       {view === 'login' ? 'Bienvenido' : view === 'register' ? 'Crear Cuenta' : 'Recuperación Segura'}
                   </h2>
                   <p className="text-brand-text-secondary text-sm">
                       {view === 'recovery' && recoveryStep === 1 ? 'Paso 1: Verificación de Identidad' : ''}
                       {view === 'recovery' && recoveryStep === 2 ? 'Paso 2: Código de Seguridad' : ''}
                       {view === 'recovery' && recoveryStep === 3 ? 'Paso 3: Nueva Contraseña' : ''}
                   </p>
                </div>

                {/* FORMS */}
                {view !== 'recovery' && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {view === 'register' && (
                            <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                                <Input id="name" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="bg-brand-primary/50" />
                                <Input id="phone" placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-brand-primary/50" />
                            </div>
                        )}
                        <Input id="email" type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} icon={<MailIcon className="h-5 w-5"/>} className="bg-brand-primary/50" />
                        <div className="relative">
                            <Input id="password" type={showPassword ? "text" : "password"} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} icon={<LockIcon className="h-5 w-5"/>} className="bg-brand-primary/50" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 -translate-y-1/2 right-4 text-brand-text-secondary hover:text-white">
                                {showPassword ? <EyeSlashIcon className="h-4 w-4"/> : <EyeIcon className="h-4 w-4"/>}
                            </button>
                        </div>
                        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center font-medium">{error}</div>}
                        <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest">{view === 'login' ? 'Ingresar' : 'Registrarse'}</Button>
                        {view === 'login' && (
                            <div className="text-center">
                                <button type="button" onClick={() => handleSwitchView('recovery')} className="text-xs text-brand-text-secondary hover:text-white underline">¿Olvidó su contraseña?</button>
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
                                <Input id="new_pass" type="password" placeholder="Nueva Contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} icon={<LockIcon className="h-5 w-5"/>} className="bg-brand-primary/50" />
                                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center font-medium">{error}</div>}
                                <Button type="submit" variant="success" className="w-full py-4 text-sm uppercase tracking-widest">Guardar Contraseña</Button>
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
