
export type DrawType = 'mediodia' | 'tarde' | 'noche';
export type BallColor = 'blanca' | 'roja';
export type TransactionType = 'purchase' | 'withdraw' | 'deposit';

export interface Ticket {
  id: string;
  number: string; // 00-99
  amount: number; // Regular amount
  reventadosAmount?: number; // Optional Reventados amount
  purchaseDate: Date;
  draw: DrawType;
}

export interface User {
  id: string;
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

export interface HistoryResult {
    date: string;
    results: {
        mediodia: { number: string, reventadosNumber: string, ball: BallColor };
        tarde: { number: string, reventadosNumber: string, ball: BallColor };
        noche: { number: string, reventadosNumber: string, ball: BallColor };
    };
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
