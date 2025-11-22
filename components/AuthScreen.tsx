
import React, { useState, useEffect } from 'react';
import Button from './common/Button';
import Input from './common/Input';
import Card from './common/Card';
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
  UserGroupIcon,
  BoltIcon,
  CpuIcon,
  GlobeAltIcon
} from './icons/Icons';
import type { User } from '../types';
import { analyzePasswordStrength, type PasswordStrength } from '../utils/security';

interface AuthScreenProps {
  onLogin: (email: string, password: string, role: 'admin' | 'client') => Promise<{ error: any; data: any }>;
  onRegister: (userData: Partial<User>, role: 'admin' | 'client') => Promise<{ error: any; data: any }>;
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

  // Wrapper for Submit with Real Validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic Input Validation
    if (view === 'login') {
        if (!email || !password) {
            setError('REQ: Todos los campos son obligatorios.');
            return;
        }
    } else if (view === 'register') {
        if (!name || !phone || !email || !password) {
            setError('REQ: Complete el formulario de registro.');
            return;
        }
        if (passStrength && !passStrength.isStrongEnough) {
            setError('SEC: Contraseña insuficiente.');
            return;
        }
    }

    // 1. Start Processing Animation
    setAuthStatus('processing');

    try {
        let result;
        
        // 2. Call Actual Supabase Function (Await Result)
        if (view === 'login') {
            result = await onLogin(email, password, role);
        } else {
            result = await onRegister({ name, email, phone, password, balance: 0, tickets: [] }, role);
        }

        // 3. Check Result Logic
        if (result.error) {
            // FAILED: Stop animation, show error
            setAuthStatus('idle');
            
            // Translate common Supabase errors
            let msg = result.error.message;
            if (msg.includes('Email not confirmed')) {
                msg = 'Cuenta pendiente de verificación. Revise su correo.';
            } else if (msg.includes('Invalid login credentials')) {
                msg = 'Credenciales inválidas. Acceso denegado.';
            } else if (msg.includes('User already registered')) {
                msg = 'Usuario ya registrado en la base de datos.';
            } else if (msg.includes('Password should be')) {
                msg = 'La contraseña no cumple los protocolos de seguridad.';
            }
            
            setError(`ERR: ${msg}`);
        } else if (result.data?.session) {
            // SUCCESS: Session Established
            setAuthStatus('success');
        } else if (result.data?.user && !result.data?.session) {
            // SUCCESS BUT NO SESSION: Email Verification Required
            setAuthStatus('idle');
            setError('INFO: Registro exitoso. Verifique su enlace de acceso en el correo.');
        } else {
            // Fallback
            setAuthStatus('idle');
            setError('ERR: Estado desconocido. Reinicie el sistema.');
        }

    } catch (err) {
        setAuthStatus('idle');
        setError("NET_ERR: Fallo de conexión con el servidor.");
    }
  };

  // --- RECOVERY HANDLERS ---
  const handleRecoveryStep1 = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!email || !phone) {
          setError('REQ: Identificación incompleta.');
          return;
      }
      if (onVerifyIdentity && onVerifyIdentity(email, phone)) {
          setRecoveryStep(2);
      } else {
          setError('ERR: No hay coincidencias en los registros.');
      }
  };

  const handleRecoveryStep2 = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (onVerifyCode && onVerifyCode(recoveryCodeInput)) {
          setRecoveryStep(3);
      } else {
          setError('ERR: Código de seguridad inválido.');
      }
  };

  const handleRecoveryStep3 = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      const analysis = analyzePasswordStrength(newPassword);
      
      if (!analysis.isStrongEnough) {
          setError('SEC: La contraseña no cumple los estándares.');
          return;
      }
      if (onResetPassword) {
          onResetPassword(email, newPassword);
          handleSwitchView('login');
      }
  };

  const renderStrengthMeter = (strength: PasswordStrength | null) => {
      if (!strength || !strength.feedback) return null;
      
      return (
          <div className="mt-3 animate-fade-in-up p-3 bg-black/30 rounded-lg border border-white/5">
              <div className="flex gap-1 h-1 mb-2">
                  <div className={`flex-1 rounded-full transition-all duration-500 ${strength.score >= 0 ? strength.color : 'bg-gray-800'}`}></div>
                  <div className={`flex-1 rounded-full transition-all duration-500 ${strength.score >= 2 ? strength.color : 'bg-gray-800'}`}></div>
                  <div className={`flex-1 rounded-full transition-all duration-500 ${strength.score >= 3 ? strength.color : 'bg-gray-800'}`}></div>
                  <div className={`flex-1 rounded-full transition-all duration-500 ${strength.score >= 4 ? strength.color : 'bg-gray-800'}`}></div>
              </div>
              <div className="flex items-start gap-2">
                 <CpuIcon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${strength.isStrongEnough ? 'text-brand-success' : 'text-brand-accent'}`} />
                 <p className="text-[10px] text-brand-text-secondary font-mono">
                     <span className={`${strength.isStrongEnough ? 'text-brand-success' : 'text-brand-accent'} font-bold uppercase`}>
                        {strength.isStrongEnough ? 'SEGURIDAD ÓPTIMA: ' : 'ANÁLISIS: '}
                     </span> 
                     {strength.feedback}
                 </p>
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#030508] relative overflow-hidden selection:bg-brand-accent selection:text-white">
      
      {/* --- BACKGROUND FX --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Moving Grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.07] animate-pulse-slow"></div>
        
        {/* Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-brand-accent/10 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-brand-cyan/10 rounded-full blur-[100px] animate-float" style={{animationDelay: '2s'}}></div>
        
        {/* Cyber Lines */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-brand-border to-transparent opacity-20"></div>
        <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-brand-border to-transparent opacity-20"></div>
      </div>

      <div className="relative w-full max-w-6xl flex flex-col md:flex-row items-stretch justify-center gap-12 p-6 md:p-12 z-10">
        
        {/* --- LEFT PANEL: BRANDING & INFO (Desktop Only) --- */}
        <div className="hidden md:flex flex-col justify-center w-1/2 space-y-10">
           <div>
               <div className="flex items-center gap-4 mb-4">
                   <div className="w-12 h-12 rounded-xl bg-brand-accent flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.5)] animate-pulse-slow">
                       <span className="font-black text-white text-2xl">T</span>
                   </div>
                   <div className="px-3 py-1 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan text-[10px] font-bold uppercase tracking-widest">
                       System v25.4
                   </div>
               </div>
               <h1 className="text-7xl font-black text-white tracking-tighter leading-none mb-4">
                  TIEMPOS
                  <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-cyan drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      PRO
                  </span>
               </h1>
               <p className="text-brand-text-secondary font-mono text-sm max-w-md border-l-2 border-brand-accent pl-4 py-2 bg-gradient-to-r from-brand-accent/5 to-transparent">
                  PLATAFORMA DE GESTIÓN FINANCIERA DE ALTA FRECUENCIA.<br/>
                  SEGURIDAD BANCARIA. DATOS EN TIEMPO REAL.
               </p>
           </div>

           {/* Status Widgets */}
           <div className="grid grid-cols-2 gap-4">
               <Card className="cursor-default" glowColor="from-brand-success/40 to-emerald-600/40" noPadding>
                   <div className="p-4">
                       <div className="flex items-center gap-2 mb-2 text-brand-success">
                           <ShieldCheckIcon className="h-5 w-5"/>
                           <span className="text-[10px] font-bold uppercase">Estado: Seguro</span>
                       </div>
                       <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                           <div className="h-full bg-brand-success w-full animate-pulse"></div>
                       </div>
                   </div>
               </Card>
               
               <div onClick={onOpenSecurity} className="cursor-pointer">
                   <Card glowColor="from-brand-accent/40 to-cyan-500/40" noPadding className="hover:border-brand-accent/50 transition-colors">
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-2 text-brand-accent group-hover:text-white transition-colors">
                                <BoltIcon className="h-5 w-5"/>
                                <span className="text-[10px] font-bold uppercase">Protocolo: Activo</span>
                            </div>
                            <p className="text-[10px] text-gray-500">Click para ver detalles de seguridad.</p>
                        </div>
                   </Card>
               </div>
           </div>
        </div>

        {/* --- RIGHT PANEL: AUTH FORM --- */}
        <div className="w-full md:w-[480px]">
            <Card className="h-auto relative" glowColor="from-brand-accent via-purple-600 to-brand-accent">
                {/* Success Overlay */}
                {authStatus === 'success' && (
                    <div className="absolute inset-0 z-50 bg-[#030508]/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in-up rounded-[1.4rem]">
                         <div className="w-24 h-24 rounded-full border-4 border-brand-success/30 flex items-center justify-center relative mb-6">
                             <div className="absolute inset-0 border-4 border-brand-success border-t-transparent rounded-full animate-spin"></div>
                             <CheckCircleIcon className="h-12 w-12 text-brand-success animate-bounce-in"/>
                         </div>
                         <h2 className="text-3xl font-black text-white uppercase tracking-widest animate-pulse">Acceso Concedido</h2>
                         <p className="text-brand-cyan font-mono text-xs mt-2">ESTABLECIENDO ENLACE SEGURO...</p>
                    </div>
                )}

                <div className="relative z-10">
                    {/* Header Mobile */}
                    <div className="md:hidden text-center mb-8">
                        <h1 className="text-4xl font-black text-white tracking-tighter">TIEMPOS<span className="text-brand-accent">PRO</span></h1>
                    </div>

                    {/* Header Desktop/Shared */}
                    <div className="mb-8 text-center">
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-1 flex items-center justify-center gap-2">
                            {view === 'login' && <><LockIcon className="h-5 w-5 text-brand-accent"/> Iniciar Sesión</>}
                            {view === 'register' && <><UserCircleIcon className="h-5 w-5 text-brand-success"/> Nuevo Registro</>}
                            {view === 'recovery' && <><RefreshIcon className="h-5 w-5 text-brand-gold"/> Recuperación</>}
                        </h2>
                        <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-brand-border to-transparent mx-auto"></div>
                    </div>

                    {/* Role Switcher (Cliente y Admin) - EFECTO DE LUZ AÑADIDO */}
                    {view !== 'recovery' && (
                        <div className="flex justify-center mb-8 relative">
                            {/* LUZ TRASERA SELECTOR */}
                            <div className="absolute -inset-3 bg-gradient-to-r from-brand-accent via-purple-500 to-brand-cyan rounded-full blur-xl opacity-20 animate-pulse-slow pointer-events-none"></div>
                            
                            <div className="bg-[#0B0F19] p-1 rounded-xl border border-white/10 flex relative overflow-hidden z-10 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                                <div 
                                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-brand-tertiary border border-brand-accent/50 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300 ease-out`}
                                    style={{ left: role === 'client' ? '4px' : 'calc(50%)' }}
                                ></div>
                                <button 
                                    onClick={() => handleRoleSwitch('client')}
                                    className={`relative z-10 px-8 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${role === 'client' ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <UserCircleIcon className="h-3 w-3"/> Cliente
                                </button>
                                <button 
                                    onClick={() => handleRoleSwitch('admin')}
                                    className={`relative z-10 px-8 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${role === 'admin' ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <CpuIcon className="h-3 w-3"/> Admin
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FORM */}
                    {view !== 'recovery' ? (
                        <form onSubmit={handleSubmit} className={`space-y-6 ${roleSwitchAnim ? 'animate-glitch' : ''}`}>
                            {view === 'register' && (
                                <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                                    {/* Inputs de Registro con Efecto Luz */}
                                    <div className="relative group">
                                        <div className="absolute -inset-0.5 bg-brand-accent/40 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                                        <Input id="name" placeholder="NOMBRE COMPLETO" value={name} onChange={(e) => setName(e.target.value)} className="font-mono text-sm bg-[#05080F] relative z-10" />
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute -inset-0.5 bg-brand-accent/40 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                                        <Input id="phone" placeholder="TELÉFONO" value={phone} onChange={(e) => setPhone(e.target.value)} className="font-mono text-sm bg-[#05080F] relative z-10" />
                                    </div>
                                </div>
                            )}
                            
                            {/* Input Correo Electrónico - EFECTO DE LUZ AÑADIDO */}
                            {/* z-20 añadido para asegurar que esté por encima del brillo de la contraseña si se solapan */}
                            <div className="relative group z-20">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-cyan to-brand-accent rounded-xl blur opacity-0 group-focus-within:opacity-80 transition duration-500"></div>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="CORREO ELECTRÓNICO" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    icon={<MailIcon className="h-4 w-4"/>} 
                                    className="font-mono text-sm bg-[#05080F] relative z-10"
                                />
                            </div>

                            {/* Input Contraseña - EFECTO DE LUZ TRASERA (AISLADO Y SUAVIZADO) */}
                            <div>
                                {/* Usamos 'group/pass' para aislar el foco solo a este bloque */}
                                <div className="relative group/pass z-0">
                                    {/* Capa 1: Luz Volumétrica (Reducida intensidad y spread) */}
                                    {/* Opacity reduced to 30 to be softer */}
                                    <div className="absolute -inset-6 bg-gradient-to-r from-brand-accent via-purple-600 to-brand-accent rounded-[2rem] blur-2xl opacity-0 group-focus-within/pass:opacity-30 transition duration-1000 group-focus-within/pass:duration-500 animate-pulse-slow"></div>
                                    
                                    {/* Capa 2: Definición de Borde Trasero */}
                                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-accent to-purple-600 rounded-xl blur-md opacity-0 group-focus-within/pass:opacity-100 transition duration-300"></div>
                                    
                                    {/* Input Flotante */}
                                    <Input 
                                        id="password" 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="CONTRASEÑA" 
                                        value={password} 
                                        onChange={(e) => handlePasswordChange(e.target.value)} 
                                        icon={<LockIcon className="h-4 w-4"/>} 
                                        className="font-mono text-sm bg-[#05080F] relative z-10 shadow-2xl"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-500 hover:text-white transition-colors z-20">
                                        {showPassword ? <EyeSlashIcon className="h-4 w-4"/> : <EyeIcon className="h-4 w-4"/>}
                                    </button>
                                </div>
                                {view === 'register' && renderStrengthMeter(passStrength)}
                            </div>

                            {/* Error Message - EFECTO DE LUZ ROJA AÑADIDO */}
                            {error && (
                                <div className="relative animate-shake-hard">
                                    <div className="absolute -inset-1 bg-red-600 rounded-lg blur opacity-40 animate-pulse"></div>
                                    <div className="relative z-10 p-3 bg-black/90 border border-red-500/50 rounded-lg flex items-start gap-3 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]">
                                        <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"/>
                                        <p className="text-[10px] font-mono text-red-400 leading-tight font-bold">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Iniciar Sistema Button - EFECTO DE LUZ MASIVA TRASERA */}
                            <div className="relative group mt-6">
                                <div className={`absolute -inset-1 ${role === 'admin' ? 'bg-gradient-to-r from-brand-accent to-purple-600' : 'bg-gradient-to-r from-brand-success to-emerald-600'} rounded-xl blur-lg opacity-30 group-hover:opacity-70 transition duration-500 animate-pulse-slow`}></div>
                                <Button 
                                    type="submit" 
                                    disabled={authStatus !== 'idle' || (view === 'register' && passStrength && !passStrength.isStrongEnough)}
                                    className="w-full py-4 relative z-10"
                                    size="lg"
                                    variant={role === 'admin' ? 'primary' : 'success'}
                                >
                                    {authStatus === 'processing' ? (
                                        <><RefreshIcon className="animate-spin"/> PROCESANDO...</>
                                    ) : (
                                        <>{view === 'login' ? 'INICIAR SISTEMA' : 'REGISTRAR DATOS'}</>
                                    )}
                                </Button>
                            </div>

                            {view === 'login' && (
                                <div className="text-center pt-2">
                                    <button type="button" onClick={() => handleSwitchView('recovery')} className="text-[10px] font-bold uppercase text-brand-text-secondary hover:text-white border-b border-transparent hover:border-white transition-all">
                                        // Olvidé mis credenciales
                                    </button>
                                </div>
                            )}
                        </form>
                    ) : (
                        /* RECOVERY VIEW */
                        <div className="animate-fade-in-up space-y-6">
                            <div className="p-4 bg-brand-gold/10 border border-brand-gold/30 rounded-xl flex gap-3">
                                <ShieldCheckIcon className="h-6 w-6 text-brand-gold flex-shrink-0"/>
                                <p className="text-xs text-brand-gold/80">
                                    Modo de recuperación activado. Siga los pasos para restablecer el acceso.
                                </p>
                            </div>

                            {recoveryStep === 1 && (
                                <form onSubmit={handleRecoveryStep1} className="space-y-4">
                                    <div className="relative group">
                                         <div className="absolute -inset-0.5 bg-brand-gold/30 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                                         <Input id="rec_email" type="email" placeholder="CORREO REGISTRADO" value={email} onChange={(e) => setEmail(e.target.value)} icon={<MailIcon className="h-4 w-4"/>} className="font-mono text-sm bg-[#05080F] relative z-10"/>
                                    </div>
                                    <div className="relative group">
                                         <div className="absolute -inset-0.5 bg-brand-gold/30 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                                         <Input id="rec_phone" type="tel" placeholder="TELÉFONO ASOCIADO" value={phone} onChange={(e) => setPhone(e.target.value)} icon={<PhoneIcon className="h-4 w-4"/>} className="font-mono text-sm bg-[#05080F] relative z-10"/>
                                    </div>
                                    
                                    {error && <div className="text-[10px] font-mono text-red-400 text-center bg-red-950/30 p-2 rounded border border-red-500/30">{error}</div>}
                                    <Button type="submit" className="w-full">VERIFICAR IDENTIDAD</Button>
                                </form>
                            )}

                            {/* Pasos 2 y 3 simplificados visualmente pero funcionales */}
                            {recoveryStep === 2 && (
                                <form onSubmit={handleRecoveryStep2} className="space-y-4">
                                    <p className="text-xs text-center text-brand-text-secondary">Ingrese el código enviado a <span className="text-white font-mono">{email}</span></p>
                                    <Input id="code" placeholder="0000" value={recoveryCodeInput} onChange={(e) => setRecoveryCodeInput(e.target.value)} className="font-mono text-center text-2xl tracking-[0.5em] bg-black/30" maxLength={4}/>
                                    {error && <div className="text-[10px] font-mono text-red-400 text-center bg-red-950/30 p-2 rounded border border-red-500/30">{error}</div>}
                                    <Button type="submit" className="w-full">CONFIRMAR CÓDIGO</Button>
                                </form>
                            )}

                            {recoveryStep === 3 && (
                                <form onSubmit={handleRecoveryStep3} className="space-y-4">
                                    <Input id="new_pass" type="password" placeholder="NUEVA CONTRASEÑA" value={newPassword} onChange={(e) => handleNewPasswordChange(e.target.value)} icon={<KeyIcon className="h-4 w-4"/>} className="font-mono text-sm bg-black/30"/>
                                    {renderStrengthMeter(passStrength)}
                                    {error && <div className="text-[10px] font-mono text-red-400 text-center bg-red-950/30 p-2 rounded border border-red-500/30">{error}</div>}
                                    <Button type="submit" variant="success" className="w-full">ACTUALIZAR CREDENCIALES</Button>
                                </form>
                            )}

                            <div className="text-center">
                                <button onClick={() => handleSwitchView('login')} className="text-[10px] font-bold uppercase text-gray-500 hover:text-white transition-colors">
                                    Cancelar Operación
                                </button>
                            </div>
                        </div>
                    )}

                    {view !== 'recovery' && (
                        <div className="mt-8 pt-6 border-t border-white/10 text-center">
                            <p className="text-xs text-brand-text-secondary font-mono">
                                {view === 'login' ? 'NO IDENTIFICADO' : 'YA REGISTRADO'}
                                <span className="mx-2 text-gray-600">|</span>
                                <button onClick={() => handleSwitchView(view === 'login' ? 'register' : 'login')} className="text-brand-accent hover:text-white font-bold uppercase tracking-wider transition-colors">
                                    {view === 'login' ? 'SOLICITAR ACCESO' : 'INGRESAR AHORA'}
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </Card>
        </div>

      </div>
    </div>
  );
};

export default AuthScreen;
