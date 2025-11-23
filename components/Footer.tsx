import React from 'react';

interface FooterProps {
    onOpenGodMode?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenGodMode }) => {
  return (
    <footer className="bg-brand-secondary border-t border-brand-border mt-12">
      <div className="container mx-auto px-4 py-6 text-center text-brand-text-secondary text-sm">
        <p className="mb-2">&copy; {new Date().getFullYear()} TiemposPRO. Todos los derechos reservados.</p>
        <div className="flex justify-center items-center gap-4 text-xs text-brand-text-secondary/70">
            <span 
                className="cursor-pointer hover:text-brand-accent transition-colors select-none" 
                onClick={onOpenGodMode}
                title="Access System Protocols"
            >
                Gestión Profesional
            </span>
            <span>•</span>
            <a 
              href="https://www.jps.go.cr/resultados/nuevos-tiempos-reventados" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-brand-accent transition-colors"
            >
              Verificar Fuente Oficial
            </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;