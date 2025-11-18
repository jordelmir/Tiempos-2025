
import React, { useState } from 'react';
import Button from './common/Button';
import Input from './common/Input';
import { 
  LockIcon, 
  MailIcon, 
  UserCircleIcon, 
  PhoneIcon, 
  EyeIcon, 
  EyeSlashIcon 
} from './icons/Icons';
import type { User } from '../types';

interface AuthScreenProps {
  onLogin: (email: string, role: 'admin' | 'client') => void;
  onRegister: (userData: Partial<User>) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'admin' | 'client'>('client');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }

    if (isLogin) {
      onLogin(email, role);
    } else {
      if (!name || !phone) {
        setError('Por favor complete todos los datos de registro.');
        return;
      }
      onRegister({
        name,
        email,
        phone,
        balance: 0,
        tickets: []
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-brand-primary overflow-hidden">
      {/* Left Side - Visual Experience */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-brand-secondary items-center justify-center overflow-hidden">
        {/* Abstract Background Animation */}
        <div className="absolute inset-0 bg-[#0a0e14]">
           <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-accent/20 blur-[120px] animate-pulse"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/20 blur-[120px]"></div>
           
           {/* Floating Elements */}
           <div className="absolute top-1/4 left-1/4 w-24 h-24 border border-brand-accent/20 rounded-full flex items-center justify-center animate-bounce duration-[3000ms]">
              <span className="text-brand-accent font-mono text-xs">MEDIODÍA</span>
           </div>
           <div className="absolute bottom-1/3 right-1/4 w-32 h-32 border border-brand-success/20 rounded-full flex items-center justify-center animate-bounce duration-[5000ms]">
              <span className="text-brand-success font-mono text-xs">TARDE</span>
           </div>
        </div>

        <div className="relative z-10 p-12 text-center max-w-lg">
          <h1 className="text-6xl font-black text-white mb-6 tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-success">TIEMPOS</span>
            <br/>PRO
          </h1>
          <p className="text-brand-text-secondary text-xl font-light leading-relaxed">
            La plataforma más segura y avanzada para gestionar tus sorteos diarios. Resultados al instante, seguridad garantizada.
          </p>
          
          <div className="mt-12 grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
               <div className="text-2xl font-bold text-white">99.9%</div>
               <div className="text-xs text-brand-text-secondary mt-1">Uptime</div>
            </div>
             <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
               <div className="text-2xl font-bold text-white">24/7</div>
               <div className="text-xs text-brand-text-secondary mt-1">Soporte</div>
            </div>
             <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
               <div className="text-2xl font-bold text-white">100%</div>
               <div className="text-xs text-brand-text-secondary mt-1">Seguro</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
         <div className="max-w-md w-full">
           
           <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-black text-white tracking-tighter">
                <span className="text-brand-accent">TIEMPOS</span>PRO
              </h1>
           </div>

           <div className="bg-brand-secondary/50 backdrop-blur-xl p-8 rounded-2xl border border-brand-border shadow-2xl">
              
              {/* Role Toggle */}
              <div className="flex justify-center mb-8">
                <div className="bg-brand-primary p-1 rounded-lg inline-flex border border-brand-border">
                  <button 
                    onClick={() => setRole('client')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${role === 'client' ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}
                  >
                    Cliente
                  </button>
                  <button 
                    onClick={() => setRole('admin')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${role === 'admin' ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}
                  >
                    Administrador
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">
                {isLogin ? 'Bienvenido de nuevo' : 'Crear Cuenta'}
              </h2>
              <p className="text-brand-text-secondary text-sm mb-8">
                {isLogin 
                  ? `Ingresa a tu panel de ${role === 'admin' ? 'administrador' : 'jugador'}.` 
                  : 'Regístrate para comenzar a ganar.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {!isLogin && (
                  <>
                    <Input
                      id="name"
                      placeholder="Nombre Completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      icon={<UserCircleIcon className="h-5 w-5 text-brand-text-secondary" />}
                    />
                    <Input
                      id="phone"
                      placeholder="Teléfono"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      icon={<PhoneIcon className="h-5 w-5 text-brand-text-secondary" />}
                    />
                  </>
                )}

                <Input
                  id="email"
                  placeholder="Correo Electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<MailIcon className="h-5 w-5 text-brand-text-secondary" />}
                />

                <div className="relative">
                  <Input
                    id="password"
                    placeholder="Contraseña"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<LockIcon className="h-5 w-5 text-brand-text-secondary" />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-text-secondary hover:text-brand-text-primary transition-colors z-10"
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>

                {error && (
                  <div className="text-brand-danger text-sm text-center bg-brand-danger/10 p-2 rounded border border-brand-danger/20">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full py-3 text-lg shadow-lg shadow-brand-accent/20 mt-4">
                  {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-brand-text-secondary text-sm">
                  {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
                  <button 
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                    }}
                    className="text-brand-accent hover:text-brand-accent-hover font-bold transition-colors"
                  >
                    {isLogin ? "Regístrate aquí" : "Inicia Sesión"}
                  </button>
                </p>
              </div>

              {isLogin && (
                <div className="mt-4 text-center">
                   <button className="text-xs text-brand-text-secondary hover:text-brand-text-primary underline">
                     ¿Olvidaste tu contraseña?
                   </button>
                </div>
              )}

           </div>
         </div>
      </div>
    </div>
  );
};

export default AuthScreen;
