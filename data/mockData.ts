
import type { User } from '../types';

export const mockUsers: User[] = [
  {
    id: 'usr_1',
    name: 'Elena Rodríguez',
    email: 'elena.r@example.com',
    phone: '8888-1234',
    balance: 15000,
    tickets: [
      { id: 'tkt_1', number: '23', amount: 1000, purchaseDate: new Date() },
      { id: 'tkt_2', number: '78', amount: 500, purchaseDate: new Date() },
    ],
  },
  {
    id: 'usr_2',
    name: 'Carlos Vargas',
    email: 'carlos.v@example.com',
    phone: '7777-5678',
    balance: 5000,
    tickets: [
      { id: 'tkt_3', number: '05', amount: 2000, purchaseDate: new Date() },
    ],
  },
  {
    id: 'usr_3',
    name: 'Ana Mora',
    email: 'ana.m@example.com',
    phone: '6666-9012',
    balance: 25000,
    tickets: [],
  },
];
