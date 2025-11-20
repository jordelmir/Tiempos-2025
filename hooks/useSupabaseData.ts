
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Transaction, DailyResult } from '../types';

export const useSupabaseData = (sessionUserId: string | null) => {
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbDailyResults, setDbDailyResults] = useState<DailyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track critical errors and stop polling/fetching
  const criticalErrorRef = useRef(false);

  // Optimistic update helper
  const optimisticUpdateResult = useCallback((newResult: DailyResult) => {
      setDbDailyResults(prev => {
          const others = prev.filter(r => !(r.date === newResult.date && r.draw === newResult.draw));
          return [...others, newResult];
      });
  }, []);

  // Main Fetch Function
  const fetchData = useCallback(async () => {
    // Guard: Stop fetching if we hit a critical DB configuration error
    if (criticalErrorRef.current) return;

    try {
      setError(null); 
      
      // 1. Profiles
      const { data: profiles, error: usersError } = await supabase.from('profiles').select('*');
      if (usersError) throw new Error(`Supabase Profiles Error: ${usersError.message}`);

      // 2. Tickets
      const { data: tickets, error: ticketsError } = await supabase.from('tickets').select('*');
      if (ticketsError) throw new Error(`Supabase Tickets Error: ${ticketsError.message}`);

      // 3. Transactions
      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (txError) throw new Error(`Supabase Transactions Error: ${txError.message}`);

      // 4. Daily Results
      const { data: results, error: resError } = await supabase
          .from('daily_results')
          .select('*')
          .order('date', { ascending: false })
          .limit(100);
      if (resError) throw new Error(`Supabase Results Error: ${resError.message}`);

      // --- DATA MAPPING ---

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
            status: t.status,
            purchaseDate: new Date(t.purchase_date)
        })) || []
      }));

      const mappedTxs: Transaction[] = (txs || []).map(t => ({
          id: t.id,
          userId: t.user_id,
          userName: profiles?.find(p => p.id === t.user_id)?.name || 'Desconocido',
          type: t.type as any,
          amount: Number(t.amount),
          date: new Date(t.created_at),
          details: t.details
      }));

      const mappedResults: DailyResult[] = (results || []).map(r => ({
          id: r.id,
          date: r.date,
          draw: r.draw_type as any,
          number: r.number,
          reventadosNumber: r.reventados_number,
          ballColor: r.ball_color as any
      }));

      setUsers(mappedUsers);
      setTransactions(mappedTxs);
      setDbDailyResults(mappedResults);
      
    } catch (error: any) {
      const msg = error.message || error.toString();
      console.error("DATA SYNC ERROR:", msg);
      
      // Check specifically for the recursion error to halt operations
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes("infinite recursion") || lowerMsg.includes("recursion") || lowerMsg.includes("policy")) {
          console.error("🚨 CRITICAL DATABASE ERROR: Recursive RLS Policy detected.");
          criticalErrorRef.current = true;
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [sessionUserId]); 

  // Setup Fetch & Realtime
  useEffect(() => {
    fetchData();

    const channel = supabase.channel('app-db-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            if(!criticalErrorRef.current) { console.log('🔔 DB Update: Profiles'); fetchData(); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
            if(!criticalErrorRef.current) { console.log('🔔 DB Update: Tickets'); fetchData(); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
            if(!criticalErrorRef.current) { console.log('🔔 DB Update: Transactions'); fetchData(); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_results' }, () => {
            if(!criticalErrorRef.current) { console.log('🔔 DB Update: Results'); fetchData(); }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [fetchData]); 

  return { users, transactions, dbDailyResults, loading, error, refresh: fetchData, optimisticUpdateResult };
};
