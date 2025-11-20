
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Transaction, DailyResult } from '../types';

// Utility to get local date ISO string matching the App's logic
const getSmartLocalISO = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset);
    return localDate.toISOString().split('T')[0];
};

export const useSupabaseData = (sessionUserId: string | null) => {
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbDailyResults, setDbDailyResults] = useState<DailyResult[]>([]);
  const [loading, setLoading] = useState(true);

  // OPTIMISTIC UPDATE HANDLER
  const optimisticUpdateResult = useCallback((newResult: DailyResult) => {
      setDbDailyResults(prev => {
          const others = prev.filter(r => !(r.date === newResult.date && r.draw === newResult.draw));
          return [...others, newResult];
      });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Profiles
      const { data: profiles, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) throw usersError;

      // 2. Fetch Tickets (Include status)
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*');

      if (ticketsError) throw ticketsError;

      // 3. Map Data
      const mappedUsers: User[] = (profiles || []).map(p => ({
        id: p.id,
        cedula: p.cedula || '',
        name: p.name || 'Usuario',
        email: p.email || '',
        password: '', 
        phone: p.phone || '',
        balance: Number(p.balance) || 0,
        role: p.role as 'admin' | 'client',
        tickets: tickets?.filter(t => t.user_id === p.id).map(t => ({
            id: t.id,
            number: t.number,
            amount: Number(t.amount),
            reventadosAmount: Number(t.reventados_amount),
            draw: t.draw_type as any,
            purchaseDate: new Date(t.purchase_date),
            status: t.status || 'pending' // Map status correctly from DB
        })) || []
      }));

      setUsers(mappedUsers);

      // 4. Fetch Transactions
      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      const mappedTxs: Transaction[] = (txs || []).map(t => ({
          id: t.id,
          userId: t.user_id,
          userName: profiles?.find(p => p.id === t.user_id)?.name || 'Desconocido',
          type: t.type as any,
          amount: Number(t.amount),
          date: new Date(t.created_at),
          details: t.details
      }));

      setTransactions(mappedTxs);

      // 5. Fetch Daily Results
      const todayLocalStr = getSmartLocalISO();
      
      const { data: results, error: resError } = await supabase
          .from('daily_results')
          .select('*')
          .gte('date', todayLocalStr); 
      
      if (!resError && results) {
          const mappedResults: DailyResult[] = results.map(r => ({
              date: (r.date || '').substring(0, 10), 
              draw: r.draw_type as any,
              number: r.number,
              reventadosNumber: r.reventados_number,
              ballColor: r.ball_color as any
          }));
          setDbDailyResults(mappedResults);
      }

      setLoading(false);

    } catch (error) {
      console.error("Error fetching Supabase data:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_results' }, () => fetchData())
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { users, transactions, dbDailyResults, loading, refresh: fetchData, optimisticUpdateResult };
};