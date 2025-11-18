
export type DrawType = 'mediodia' | 'tarde' | 'noche';

export interface Ticket {
  id: string;
  number: string; // 00-99
  amount: number;
  purchaseDate: Date;
  draw: DrawType;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  tickets: Ticket[];
}

export interface DailyResult {
  date: string;
  draw: DrawType;
  number: string | null; // null if not yet played
}
