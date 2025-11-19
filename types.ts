
export type DrawType = 'mediodia' | 'tarde' | 'noche';
export type BallColor = 'blanca' | 'roja';

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
  phone: string;
  balance: number;
  role: 'admin' | 'client'; // Added role property
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
