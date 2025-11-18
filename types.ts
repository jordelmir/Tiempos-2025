
export interface Ticket {
  id: string;
  number: string; // 00-99
  amount: number;
  purchaseDate: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  tickets: Ticket[];
}
