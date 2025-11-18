
import React, { useState, useMemo } from 'react';
import type { User } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import { SearchIcon, AtSymbolIcon, PhoneIcon, UserCircleIcon, CreditCardIcon } from './icons/Icons';

interface AdminPanelProps {
  users: User[];
  onRecharge: (userId: string, amount: number) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, onRecharge }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return users.filter(
      user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)
    ).slice(0, 5); // Limit results for performance
  }, [searchTerm, users]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchTerm('');
  };

  const handleRechargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !rechargeAmount) return;
    const amount = parseInt(rechargeAmount, 10);
    if (isNaN(amount) || amount <= 0) {
        setFeedbackMessage('Por favor ingrese un monto válido.');
        setTimeout(() => setFeedbackMessage(''), 3000);
        return;
    }
    onRecharge(selectedUser.id, amount);
    
    // Update selected user state to reflect new balance immediately
    setSelectedUser(prev => prev ? {...prev, balance: prev.balance + amount} : null);

    setFeedbackMessage(`¡Recarga de ₡${amount} exitosa para ${selectedUser.name}!`);
    setRechargeAmount('');
    setTimeout(() => setFeedbackMessage(''), 3000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-brand-text-primary mb-6 text-center">Panel de Administrador</h2>
        <Card className="mb-8">
            <div className="relative">
                <Input
                    id="search"
                    label="Buscar Cliente por Email o Teléfono"
                    placeholder="ej: elena.r@example.com o 8888-1234"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<SearchIcon className="h-5 w-5 text-brand-text-secondary" />}
                />
                {filteredUsers.length > 0 && searchTerm && (
                    <ul className="absolute z-10 w-full mt-1 bg-brand-primary border border-brand-border rounded-md shadow-lg">
                        {filteredUsers.map(user => (
                            <li key={user.id} onClick={() => handleSelectUser(user)}
                                className="px-4 py-2 hover:bg-brand-accent hover:text-white cursor-pointer transition-colors">
                                {user.name} - {user.email}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Card>

        {selectedUser && (
            <Card>
                <h3 className="text-xl font-bold mb-4 text-brand-accent flex items-center gap-2"><UserCircleIcon className="h-6 w-6"/>Perfil del Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 border-b border-brand-border pb-4">
                    <p className="flex items-center gap-2"><strong className="text-brand-text-secondary">Nombre:</strong> {selectedUser.name}</p>
                    <p className="flex items-center gap-2 text-sm"><AtSymbolIcon className="h-5 w-5 text-brand-text-secondary"/> {selectedUser.email}</p>
                    <p className="flex items-center gap-2 text-sm"><PhoneIcon className="h-5 w-5 text-brand-text-secondary"/> {selectedUser.phone}</p>
                    <p className="flex items-center gap-2"><strong className="text-brand-text-secondary">Saldo Actual:</strong> <span className="font-bold text-brand-success text-lg">{formatCurrency(selectedUser.balance)}</span></p>
                </div>
                <form onSubmit={handleRechargeSubmit}>
                    <h4 className="text-lg font-semibold mb-3">Recargar Saldo</h4>
                    <div className="flex flex-col md:flex-row items-end gap-4">
                        <Input
                            id="recharge"
                            label="Monto de la Recarga (₡)"
                            type="number"
                            min="1"
                            placeholder="5000"
                            value={rechargeAmount}
                            onChange={(e) => setRechargeAmount(e.target.value)}
                            icon={<CreditCardIcon className="h-5 w-5 text-brand-text-secondary"/>}
                        />
                        <Button type="submit" variant="success" className="w-full md:w-auto" disabled={!rechargeAmount}>
                            Aplicar Recarga
                        </Button>
                    </div>
                </form>
            </Card>
        )}
        
        {feedbackMessage && (
             <div className="mt-4 text-center p-3 rounded-md bg-brand-success/20 text-brand-success font-semibold">
                {feedbackMessage}
             </div>
        )}
    </div>
  );
};

export default AdminPanel;
