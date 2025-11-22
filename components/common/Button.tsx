
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseClasses = 'relative overflow-hidden rounded-xl font-bold font-mono uppercase tracking-wider transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 group';

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  const variantClasses = {
    primary: 'bg-brand-accent text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] border border-brand-accent/50 hover:bg-brand-accent/90',
    secondary: 'bg-brand-tertiary text-brand-text-primary border border-white/10 hover:border-white/30 hover:bg-white/5 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]',
    success: 'bg-brand-success text-black shadow-[0_0_30px_rgba(16,185,129,0.4)] border border-brand-success/50 hover:bg-brand-success/90',
    danger: 'bg-brand-danger text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] border border-brand-danger/50 hover:bg-brand-danger/90',
    ghost: 'bg-transparent text-brand-text-secondary hover:text-white hover:bg-white/5',
  };

  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {/* Scanner Effect */}
      <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 ease-in-out pointer-events-none skew-x-12"></div>
      
      {/* Inner Glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-t from-black/50 to-white/10 transition-opacity duration-300"></div>

      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};

export default Button;
