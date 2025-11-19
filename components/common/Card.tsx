
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false }) => {
  return (
    <div
      className={`
        bg-brand-secondary/80 backdrop-blur-xl 
        border border-brand-border 
        rounded-2xl shadow-2xl 
        ${noPadding ? '' : 'p-6 md:p-8'} 
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;