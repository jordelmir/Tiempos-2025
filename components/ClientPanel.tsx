
import React, { useState } from 'react';
import type { User, Ticket } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import { PlusIcon, TrashIcon, TicketIcon, ShoppingCartIcon, CheckCircleIcon } from './icons/Icons';

interface ClientPanelProps {
  user: User;
  onPurchase: (userId: string, tickets: Omit<Ticket, 'id' | 'purchaseDate'>[]) => void;
}

type NewTicket = Omit<Ticket, 'id' | 'purchaseDate'>;

const ClientPanel: React.FC<ClientPanelProps> = ({ user, onPurchase }) => {
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [cart, setCart] = useState<NewTicket[]>([]);
  const [error, setError] = useState('');

  const totalCost = cart.reduce((sum, item) => sum + item.amount, 0);

  const handleAddTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const num = parseInt(number, 10);
    const amnt = parseInt(amount, 10);

    if (isNaN(num) || num < 0 || num > 99) {
      setError('El número debe estar entre 00 y 99.');
      return;
    }
    if (isNaN(amnt) || amnt <= 0) {
      setError('El monto debe ser un número positivo.');
      return;
    }

    const formattedNumber = num.toString().padStart(2, '0');
    setCart([...cart, { number: formattedNumber, amount: amnt }]);
    setNumber('');
    setAmount('');
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };
  
  const handlePurchase = () => {
      if (totalCost > user.balance) {
          setError('No tiene saldo suficiente para esta compra.');
          return;
      }
      onPurchase(user.id, cart);
      setCart([]);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <h2 className="text-2xl font-bold mb-4 text-brand-accent">Comprar Tiempos</h2>
          <form onSubmit={handleAddTicket} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Input
              label="Número (00-99)"
              id="number"
              type="tel"
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="Ej: 23"
            />
            <Input
              label="Monto (₡)"
              id="amount"
              type="tel"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Ej: 1000"
            />
            <Button type="submit" className="sm:w-full">
              <PlusIcon className="h-5 w-5"/> Agregar
            </Button>
          </form>
          {error && <p className="text-brand-danger mt-3 text-sm">{error}</p>}
        </Card>

        <Card className="mt-8">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><TicketIcon className="h-6 w-6 text-brand-accent"/> Mis Números Comprados</h3>
            {user.tickets.length > 0 ? (
                 <div className="max-h-80 overflow-y-auto pr-2">
                    <ul className="space-y-3">
                        {user.tickets.slice().reverse().map(ticket => (
                            <li key={ticket.id} className="flex justify-between items-center bg-brand-primary p-3 rounded-lg border border-brand-border">
                                <span className="font-mono text-xl bg-brand-accent/20 text-brand-accent px-3 py-1 rounded-md">{ticket.number}</span>
                                <span className="font-semibold text-brand-text-primary">{formatCurrency(ticket.amount)}</span>
                                <span className="text-xs text-brand-text-secondary">{ticket.purchaseDate.toLocaleDateString()}</span>
                            </li>
                        ))}
                    </ul>
                 </div>
            ) : (
                <p className="text-brand-text-secondary text-center py-4">Aún no ha comprado números.</p>
            )}
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-24">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><ShoppingCartIcon className="h-6 w-6 text-brand-accent"/> Carrito de Compra</h3>
            {cart.length > 0 ? (
                <>
                    <div className="max-h-60 overflow-y-auto pr-2 mb-4">
                        <ul className="space-y-2">
                            {cart.map((item, index) => (
                                <li key={index} className="flex justify-between items-center bg-brand-primary p-2 rounded-md">
                                    <div>
                                        <span className="font-mono text-lg">{item.number}</span>
                                        <span className="text-brand-text-secondary ml-2">{formatCurrency(item.amount)}</span>
                                    </div>
                                    <button onClick={() => handleRemoveFromCart(index)} className="text-brand-danger hover:text-red-400">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="border-t border-brand-border pt-4 mt-4 space-y-3">
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total:</span>
                            <span>{formatCurrency(totalCost)}</span>
                        </div>
                        <Button onClick={handlePurchase} variant="success" className="w-full" disabled={totalCost > user.balance}>
                            <CheckCircleIcon className="h-5 w-5"/> Confirmar Compra
                        </Button>
                    </div>
                </>
            ) : (
                <p className="text-brand-text-secondary text-center py-4">Agregue números para comprar.</p>
            )}
        </Card>
      </div>
    </div>
  );
};

export default ClientPanel;
