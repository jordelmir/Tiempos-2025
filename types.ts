
export type DrawType = 'mediodia' | 'tarde' | 'noche';
export type BallColor = 'blanca' | 'roja';
export type TransactionType = 'purchase' | 'withdraw' | 'deposit' | 'winnings';

export interface Ticket {
  id: string;
  number: string; // 00-99
  amount: number; // Regular amount
  reventadosAmount?: number; // Optional Reventados amount
  purchaseDate: Date;
  draw: DrawType;
  status: 'pending' | 'paid' | 'lost'; // Nuevo campo vital para controlar pagos
}

export interface User {
  id: string;
  cedula?: string; // National ID (CR Format)
  name: string;
  email: string;
  password: string; // Hashed password
  phone: string;
  balance: number;
  role: 'admin' | 'client';
  adminId?: string; // ID of the admin who manages this user
  tickets: Ticket[];
}

export interface DailyResult {
  date: string;
  draw: DrawType;
  number: string | null; // null if not yet played
  reventadosNumber: string | null; // New field for Reventados number
  ballColor: BallColor | null;
}

export interface DrawResult {
    number: string;
    reventadosNumber: string;
    ball: BallColor;
}

export interface HistoryResult {
    date: string;
    results: {
        mediodia: DrawResult;
        tarde: DrawResult;
        noche: DrawResult;
    };
    source?: 'api' | 'manual'; // Track origin of data to prevent overwrites
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  type: TransactionType;
  amount: number;
  date: Date;
  details?: string; // e.g., "Ticket #123" or "Retiro en efectivo"
}