
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-secondary border-t border-brand-border mt-12">
      <div className="container mx-auto px-4 py-6 text-center text-brand-text-secondary text-sm">
        <p>&copy; {new Date().getFullYear()} TiemposPRO. Todos los derechos reservados.</p>
        <p>Una aplicación de gestión profesional.</p>
      </div>
    </footer>
  );
};

export default Footer;
