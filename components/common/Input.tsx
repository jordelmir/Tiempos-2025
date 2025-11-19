
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, id, icon, className = '', ...props }) => {
  return (
    <div className="w-full group">
      {label && (
        <label htmlFor={id} className="block text-xs uppercase tracking-wider font-bold text-brand-text-secondary mb-2 group-focus-within:text-brand-accent transition-colors">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-secondary group-focus-within:text-brand-accent transition-colors">{icon}</div>}
        <input
          id={id}
          className={`
            w-full bg-brand-secondary/50 border border-brand-border rounded-xl 
            py-3 text-brand-text-primary placeholder-brand-text-secondary/50
            focus:ring-2 focus:ring-brand-accent focus:border-transparent focus:bg-brand-secondary
            transition-all duration-200
            ${icon ? 'pl-11 pr-4' : 'px-4'}
            ${className}
          `}
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;
