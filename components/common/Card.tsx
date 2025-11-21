
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  glowColor?: string; // Optional prop to override default accent glow
}

const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false, glowColor }) => {
  // Default glow based on brand accent, can be overridden
  const glowClass = glowColor || 'from-brand-accent/40 via-purple-500/40 to-brand-accent/40';

  return (
    <div className={`relative group ${className.includes('col-span') ? '' : 'h-full'}`}>
      {/* THE BACKLIGHT GLOW EFFECT */}
      <div 
        className={`
          absolute -inset-0.5 rounded-2xl blur-lg opacity-20 group-hover:opacity-60 transition duration-500
          bg-gradient-to-r ${glowClass} pointer-events-none
        `}
      ></div>

      {/* Main Card Content */}
      <div
        className={`
          relative h-full
          bg-brand-secondary/90 backdrop-blur-xl 
          border border-brand-border group-hover:border-brand-border/50
          rounded-2xl shadow-2xl 
          transition-all duration-300
          ${noPadding ? '' : 'p-6 md:p-8'} 
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
};

export default Card;
