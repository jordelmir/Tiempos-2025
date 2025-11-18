
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, id, icon, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-brand-text-secondary mb-1">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{icon}</div>}
        <input
          id={id}
          className={`w-full bg-brand-primary border border-brand-border rounded-md py-2 text-brand-text-primary placeholder-brand-text-secondary focus:ring-brand-accent focus:border-brand-accent ${icon ? 'pl-10' : 'px-3'}`}
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;
