
import { DrawType } from '../types';

// Simulador de Servicio de Correo Transaccional
// En producción, esto conectaría con una API (ej: SendGrid, AWS SES)

export interface EmailReceipt {
    id: string;
    timestamp: Date;
    recipient: string;
    subject: string;
    status: 'queued' | 'sent' | 'delivered';
}

export const sendWinnerNotification = async (
    email: string, 
    userName: string, 
    amount: number, 
    number: string, 
    draw: string, 
    isReventado: boolean
): Promise<EmailReceipt> => {
    
    // Simular latencia de red y proceso de encriptación de correo
    console.log(`[MAIL_SERVER] Iniciando protocolo SMTP seguro para: ${email}`);
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const receipt: EmailReceipt = {
                id: `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                timestamp: new Date(),
                recipient: email,
                subject: isReventado ? '⚠️ ALERTA DE PREMIO MAYOR - TIEMPOS PRO' : 'Confirmación de Ganador - TiemposPRO',
                status: 'delivered'
            };

            console.log(`%c[MAIL_SENT] 📨 Correo enviado exitosamente a ${email}`, 'color: #10B981; font-weight: bold; font-size: 12px');
            console.log(`Cuerpo: Estimado ${userName}, su número ${number} ha resultado ganador en el sorteo ${draw}. Premio acreditado: ₡${amount}`);

            resolve(receipt);
        }, 2500); // 2.5 segundos de "procesamiento" para realismo dramático
    });
};
