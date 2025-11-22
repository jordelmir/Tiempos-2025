
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  glowColor?: string; // Gradient classes e.g. "from-cyan-500 via-blue-500 to-purple-600"
}

const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false, glowColor }) => {
  // Default futuristic gradient
  // TRUCO VISUAL: Para asegurar luz en ambos lados, el gradiente debe empezar y terminar con colores fuertes.
  const glow = glowColor || 'from-brand-accent via-brand-cyan to-brand-accent';

  return (
    <div className={`relative group ${className.includes('col-span') ? '' : 'h-full'} z-0`}>
      
      {/* 
        LAYER 1: THE AMBIENT ATMOSPHERE (The "Thick" Backlight)
        Aumentado a -inset-8 (más grueso) para que salga claramente por los lados derecho e izquierdo.
      */}
      <div 
        className={`
          absolute -inset-1 md:-inset-8 bg-gradient-to-r ${glow} 
          rounded-[3rem] blur-2xl md:blur-3xl opacity-20 group-hover:opacity-50
          transition duration-1000 group-hover:duration-500
          animate-pulse-slow
          will-change-transform
        `}
      ></div>

      {/* 
        LAYER 2: THE PLASMA CORE (The "Meat" of the light)
        Define el contorno brillante inmediato.
      */}
      <div 
        className={`
          absolute -inset-[2px] bg-gradient-to-r ${glow} 
          rounded-[1.6rem] blur-md opacity-40 group-hover:opacity-90
          transition duration-700 group-hover:duration-200 
        `}
      ></div>

      {/* 
        LAYER 3: THE HOLOGRAPHIC BORDER
        Borde rotativo sutil.
      */}
      <div className="absolute -inset-[1px] rounded-[1.5rem] overflow-hidden z-0 opacity-0 group-hover:opacity-40 transition duration-500">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-conic-gradient animate-spin-slow opacity-30"></div>
      </div>

      {/* 
        MAIN CONTENT SURFACE (Obsidian Glass)
      */}
      <div
        className={`
          relative h-full z-10
          bg-[#05080F]/90 backdrop-blur-xl
          border border-white/10 group-hover:border-white/20
          rounded-[1.4rem]
          overflow-hidden
          transition-all duration-300
          shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]
          ${noPadding ? '' : 'p-6 md:p-8'} 
          ${className}
        `}
      >
        {/* Subtle Tech Grid Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.08] pointer-events-none mix-blend-overlay"></div>
        
        {/* Subtle Noise Texture for Realism */}
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none"></div>

        {/* Content Wrapper */}
        <div className="relative z-20">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Card;
