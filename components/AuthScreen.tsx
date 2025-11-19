
import React, { useState } from 'react';
import Button from './common/Button';
import Input from './common/Input';
import { 
  LockIcon, 
  MailIcon, 
  UserCircleIcon, 
  PhoneIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ArrowTrendingUpIcon
} from './icons/Icons';
import type { User } from '../types';

interface AuthScreenProps {
  onLogin: (email: string, role: 'admin' | 'client') => void;
  onRegister: (userData: Partial<User>, role: 'admin' | 'client') => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'admin' | 'client'>('client');
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor complete todos los campos.');
      return;
    }

    if (isLogin) {
      onLogin(email, role);
    } else {
      if (!name || !phone) {
        setError('Por favor complete los datos de registro.');
        return;
      }
      onRegister({ name, email, phone, balance: 0, tickets: [] }, role);
    }
  };

  return (
    <div className="min-h-screen flex bg-brand-primary relative overflow-hidden text-white font-sans selection:bg-brand-accent selection:text-white">
      
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-brand-accent/10 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute top-[40%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-900/20 blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-emerald-900/10 blur-[80px]"></div>
      </div>

      {/* Left Content - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-16">
        <div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(79,70,229,0.6)] mb-8">
             <span className="font-black text-white text-2xl">T</span>
          </div>
          <h1 className="text-7xl font-black tracking-tighter leading-tight mb-6">
            Gana<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-purple-400">Al Instante.</span>
          </h1>
          <p className="text-xl text-brand-text-secondary max-w-md font-light leading-relaxed">
            La plataforma de gestión de sorteos más avanzada del mercado. Segura, rápida y confiable.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 max-w-md">
             <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
                 <ArrowTrendingUpIcon className="h-8 w-8 text-brand-success mb-4" />
                 <div className="text-3xl font-bold font-mono">98%</div>
                 <div className="text-sm text-brand-text-secondary">Probabilidad de Pago</div>
             </div>
             <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
                 <LockIcon className="h-8 w-8 text-brand-accent mb-4" />
                 <div className="text-3xl font-bold font-mono">256b</div>
                 <div className="text-sm text-brand-text-secondary">Encriptación Militar</div>
             </div>
        </div>
      </div>

      {/* Right Content - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 z-10">
         <div className="w-full max-w-[450px]">
            <div className="lg:hidden mb-8 text-center">
                <h1 className="text-4xl font-black tracking-tight">TIEMPOS<span className="text-brand-accent">PRO</span></h1>
            </div>

            <div className="bg-brand-secondary/80 backdrop-blur-2xl p-8 md:p-10 rounded-3xl border border-brand-border shadow-2xl relative overflow-hidden">
                {/* Top Glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50"></div>
                
                <div className="flex justify-center mb-8">
                    <div className="bg-brand-tertiary p-1 rounded-xl inline-flex border border-brand-border">
                        <button 
                            onClick={() => setRole('client')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${role === 'client' ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-white'}`}
                        >
                            Jugador
                        </button>
                        <button 
                            onClick={() => setRole('admin')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${role === 'admin' ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-white'}`}
                        >
                            Admin
                        </button>
                    </div>
                </div>

                <div className="mb-8 text-center">
                   <h2 className="text-2xl font-bold text-white mb-2">{isLogin ? 'Bienvenido' : 'Crear Cuenta'}</h2>
                   <p className="text-brand-text-secondary text-sm">Ingrese sus credenciales para continuar</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                            <Input
                                id="name"
                                placeholder="Nombre"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-brand-primary/50"
                            />
                            <Input
                                id="phone"
                                placeholder="Teléfono"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="bg-brand-primary/50"
                            />
                        </div>
                    )}

                    <Input
                        id="email"
                        type="email"
                        placeholder="Correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={<MailIcon className="h-5 w-5"/>}
                        className="bg-brand-primary/50"
                    />
                    
                    <div className="relative">
                         <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={<LockIcon className="h-5 w-5"/>}
                            className="bg-brand-primary/50"
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-1/2 -translate-y-1/2 right-4 text-brand-text-secondary hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeSlashIcon className="h-4 w-4"/> : <EyeIcon className="h-4 w-4"/>}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg text-center font-medium">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest shadow-xl shadow-brand-accent/20">
                        {isLogin ? 'Ingresar' : 'Registrarse'}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-brand-border text-center">
                    <p className="text-brand-text-secondary text-sm">
                        {isLogin ? '¿Nuevo aquí?' : '¿Ya tienes cuenta?'}
                        <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-brand-accent hover:text-white font-bold transition-colors">
                            {isLogin ? 'Crear cuenta gratis' : 'Iniciar Sesión'}
                        </button>
                    </p>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AuthScreen;
