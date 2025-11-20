
import React from 'react';
import { LockIcon, CheckCircleIcon, EyeSlashIcon, CpuIcon, ShieldCheckIcon } from './icons/Icons';
import Card from './common/Card';
import Button from './common/Button';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Add shield icon locally if not in main icons file yet
const ShieldCheckIconLocal = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
);

const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-primary/90 backdrop-blur-sm" onClick={onClose}></div>
      
      <Card className="relative w-full max-w-2xl bg-brand-secondary border border-brand-accent/30 shadow-[0_0_50px_rgba(79,70,229,0.2)] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="absolute top-4 right-4">
            <button onClick={onClose} className="text-brand-text-secondary hover:text-white">
                ✕
            </button>
        </div>

        <div className="mb-8 text-center">
            <div className="w-16 h-16 mx-auto bg-brand-accent/10 rounded-full flex items-center justify-center mb-4 border border-brand-accent/30">
                <ShieldCheckIconLocal className="h-8 w-8 text-brand-accent"/>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wide">Centro de Seguridad</h2>
            <p className="text-brand-text-secondary text-sm">Protección activa de grado bancario</p>
        </div>

        <div className="space-y-6">
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-brand-primary/50 p-4 rounded-xl border border-brand-border hover:border-brand-accent/50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <LockIcon className="h-5 w-5 text-brand-success"/>
                        <h3 className="font-bold text-white text-sm">Encriptación Local</h3>
                    </div>
                    <p className="text-xs text-brand-text-secondary">
                        Todos sus datos se almacenan cifrados. Incluso si alguien accede a su dispositivo, no podrá leer su información financiera.
                    </p>
                </div>
                <div className="bg-brand-primary/50 p-4 rounded-xl border border-brand-border hover:border-brand-accent/50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <EyeSlashIcon className="h-5 w-5 text-brand-accent"/>
                        <h3 className="font-bold text-white text-sm">Anti-Rastreo</h3>
                    </div>
                    <p className="text-xs text-brand-text-secondary">
                        Sistema de limpieza automática de memoria y ofuscación de datos para prevenir lectura por scripts maliciosos.
                    </p>
                </div>
                <div className="bg-brand-primary/50 p-4 rounded-xl border border-brand-border hover:border-brand-accent/50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <CpuIcon className="h-5 w-5 text-brand-gold"/>
                        <h3 className="font-bold text-white text-sm">Sesión Inteligente</h3>
                    </div>
                    <p className="text-xs text-brand-text-secondary">
                        Desconexión automática por inactividad (15 min) y detección de anomalías en el inicio de sesión.
                    </p>
                </div>
                <div className="bg-brand-primary/50 p-4 rounded-xl border border-brand-border hover:border-brand-accent/50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircleIcon className="h-5 w-5 text-blue-400"/>
                        <h3 className="font-bold text-white text-sm">Integridad de Datos</h3>
                    </div>
                    <p className="text-xs text-brand-text-secondary">
                        Validación estricta de cada transacción para evitar manipulaciones o inyecciones de código (XSS).
                    </p>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="border-t border-brand-border pt-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    Preguntas Frecuentes
                </h3>
                
                <div className="space-y-4">
                    <details className="group bg-brand-tertiary/30 rounded-lg border border-brand-border open:border-brand-accent/30 transition-all">
                        <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-white">
                            <span className="text-sm">¿Es seguro guardar mi saldo aquí?</span>
                            <span className="transition group-open:rotate-180 text-brand-accent">▼</span>
                        </summary>
                        <div className="border-t border-brand-border p-4 text-xs text-brand-text-secondary leading-relaxed">
                            Absolutamente. Utilizamos algoritmos de cifrado para asegurar que su saldo solo sea visible y modificable por usted y la administración autorizada. El sistema mantiene un libro mayor inmutable de transacciones.
                        </div>
                    </details>

                    <details className="group bg-brand-tertiary/30 rounded-lg border border-brand-border open:border-brand-accent/30 transition-all">
                        <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-white">
                            <span className="text-sm">¿Qué pasa si olvido cerrar sesión?</span>
                            <span className="transition group-open:rotate-180 text-brand-accent">▼</span>
                        </summary>
                        <div className="border-t border-brand-border p-4 text-xs text-brand-text-secondary leading-relaxed">
                            Nuestro sistema de <b>Auto-Kill</b> detecta inactividad. Si no interactúa con la aplicación por 15 minutos, cerraremos su sesión automáticamente para proteger sus fondos.
                        </div>
                    </details>

                    <details className="group bg-brand-tertiary/30 rounded-lg border border-brand-border open:border-brand-accent/30 transition-all">
                        <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-white">
                            <span className="text-sm">¿Cómo protegen contra hackers?</span>
                            <span className="transition group-open:rotate-180 text-brand-accent">▼</span>
                        </summary>
                        <div className="border-t border-brand-border p-4 text-xs text-brand-text-secondary leading-relaxed">
                            Implementamos defensas en capas:
                            <ul className="list-disc pl-4 mt-2 space-y-1">
                                <li>Limitación de intentos de acceso (Anti-Brute Force).</li>
                                <li>Sanitización de entradas (Anti-XSS).</li>
                                <li>Cifrado de almacenamiento local.</li>
                                <li>Validación de roles de usuario estricta.</li>
                            </ul>
                        </div>
                    </details>
                </div>
            </div>

            <div className="pt-4">
                <Button variant="secondary" onClick={onClose} className="w-full">
                    Entendido, cerrar
                </Button>
            </div>
        </div>
      </Card>
    </div>
  );
};

export default SecurityModal;
