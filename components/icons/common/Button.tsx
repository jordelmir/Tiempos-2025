
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseClasses = 'rounded-xl font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-brand-accent to-indigo-600 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 border border-transparent',
    secondary: 'bg-brand-tertiary text-white border border-brand-border hover:bg-brand-border hover:border-brand-text-secondary/30',
    success: 'bg-gradient-to-r from-brand-success to-emerald-600 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 border border-transparent',
    danger: 'bg-gradient-to-r from-red-600 to-brand-danger text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:-translate-y-0.5 border border-transparent',
    ghost: 'bg-transparent text-brand-text-secondary hover:text-white hover:bg-white/5',
  };

  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;