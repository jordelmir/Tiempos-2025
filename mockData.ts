
import type { User, Transaction } from './types';
import { hashPasswordSync } from './utils/security';

// Default password hash for '123456' for testing purposes
const defaultHash = hashPasswordSync('123456');

export const mockUsers: User[] = [
  {
    id: 'usr_1',
    cedula: '112345678',
    name: 'Elena Rodríguez',
    email: 'elena.r@example.com',
    password: defaultHash,
    phone: '8888-1234',
    balance: 15000,
    role: 'owner', // Elena is the Admin
    tickets: [
      { id: 'tkt_1', number: '23', amount: 1000, purchaseDate: new Date(), draw: 'mediodia' },
      { id: 'tkt_2', number: '78', amount: 500, purchaseDate: new Date(), draw: 'noche' },
    ],
  },
  {
    id: 'usr_2',
    cedula: '223456789',
    name: 'Carlos Vargas',
    email: 'carlos.v@example.com',
    password: defaultHash,
    phone: '7777-5678',
    balance: 5000,
    role: 'client', 
    adminId: 'usr_1', // Belongs to Elena
    tickets: [
      { id: 'tkt_3', number: '05', amount: 2000, purchaseDate: new Date(), draw: 'tarde' },
    ],
  },
  {
    id: 'usr_3',
    cedula: '334567890',
    name: 'Ana Mora',
    email: 'ana.m@example.com',
    password: defaultHash,
    phone: '6666-9012',
    balance: 25000,
    role: 'client', 
    adminId: 'usr_1', // Belongs to Elena
    tickets: [],
  },
];

// Generate some history for the financial graph
const generateMockTransactions = (): Transaction[] => {
    const txs: Transaction[] = [];
    const now = new Date();
    
    // Add a few transactions for today
    txs.push({
        id: 'tx_1', userId: 'usr_2', userName: 'Carlos Vargas', type: 'purchase', amount: 2000, date: now, details: 'Compra Tiempos'
    });
    txs.push({
        id: 'tx_2', userId: 'usr_1', userName: 'Elena Rodríguez', type: 'purchase', amount: 1500, date: now, details: 'Compra Tiempos'
    });

    // Add some past transactions (last week)
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);
    
    txs.push({
        id: 'tx_3', userId: 'usr_2', userName: 'Carlos Vargas', type: 'withdraw', amount: 5000, date: lastWeek, details: 'Retiro de Ganancias'
    });
    txs.push({
        id: 'tx_4', userId: 'usr_3', userName: 'Ana Mora', type: 'deposit', amount: 20000, date: lastWeek, details: 'Recarga de Saldo'
    });

    return txs;
};

export const mockTransactions: Transaction[] = generateMockTransactions();
