
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Transaction, DailyResult, Ticket } from '../types';

export const useSupabaseData = (sessionUserId: string | null) => {
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [optimisticUsers, setOptimisticUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbDailyResults, setDbDailyResults] = useState<DailyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track critical errors and stop polling/fetching
  const criticalErrorRef = useRef(false);

  // Optimistic update helper for results
  const optimisticUpdateResult = useCallback((newResult: DailyResult) => {
      setDbDailyResults(prev => {
          const others = prev.filter(r => !(r.date === newResult.date && r.draw === newResult.draw));
          return [...others, newResult];
      });
  }, []);

  // Optimistic Add User Helper (For new users)
  const optimisticAddUser = useCallback((newUser: User) => {
      setOptimisticUsers(prev => {
          // Avoid duplicates in optimistic state
          if (prev.some(u => u.id === newUser.id)) return prev;
          return [newUser, ...prev];
      });
  }, []);

  // Optimistic Update Existing User Helper (For balance updates, blocking, etc.)
  const optimisticUpdateUser = useCallback((userId: string, patch: Partial<User>) => {
      setDbUsers(prev => prev.map(u => u.id === userId ? { ...u, ...patch } : u));
      // Also check optimistic users list in case the user is still provisional
      setOptimisticUsers(prev => prev.map(u => u.id === userId ? { ...u, ...patch } : u));
  }, []);

  // Optimistic Delete User Helper
  const optimisticDeleteUser = useCallback((userId: string) => {
      setDbUsers(prev => prev.filter(u => u.id !== userId));
      setOptimisticUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  // Derived users list: Merges DB users with Optimistic users securely
  const users = useMemo(() => {
      // 1. Get IDs present in DB
      const dbIds = new Set(dbUsers.map(u => u.id));
      
      // 2. Filter optimistic users: Keep only those NOT yet in DB
      const pendingUsers = optimisticUsers.filter(u => !dbIds.has(u.id));
      
      // 3. Merge lists
      const combined = [...pendingUsers, ...dbUsers];
      
      // 4. Sort: Newest created first
      combined.sort((a, b) => {
          // Safe date parsing handling strings, Date objects, or undefined
          const getDateVal = (d: Date | string | undefined) => {
              if (!d) return 0;
              const dateObj = new Date(d);
              return isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();
          };

          const timeA = getDateVal(a.createdAt);
          const timeB = getDateVal(b.createdAt);
          
          // Fallback for equal times or missing times
          if (timeA === timeB) {
              // If times are equal (or both 0), new/optimistic usually have real dates vs 0 for old db rows without dates
              // But if both are 0, sort by name
              return (b.name || '').localeCompare(a.name || '');
          }
          return timeB - timeA;
      });
      
      return combined;
  }, [dbUsers, optimisticUsers]);

  // Cleanup Effect: Remove optimistic users once they appear in DB
  useEffect(() => {
      if (dbUsers.length > 0 && optimisticUsers.length > 0) {
          const dbIds = new Set(dbUsers.map(u => u.id));
          const stillPending = optimisticUsers.filter(u => !dbIds.has(u.id));
          
          // Only update if the length changed to prevent infinite loops
          if (stillPending.length !== optimisticUsers.length) {
              setOptimisticUsers(stillPending);
          }
      }
  }, [dbUsers, optimisticUsers]);

  // Main Fetch Function
  const fetchData = useCallback(async () => {
    // Guard: Stop fetching if we hit a critical DB configuration error
    if (criticalErrorRef.current) return;

    try {
      setError(null); 
      
      // Use Promise.allSettled to prevent one failure from blocking all data
      const [profilesRes, ticketsRes, txsRes, resultsRes] = await Promise.allSettled([
          supabase.from('profiles').select('*'),
          supabase.from('tickets').select('*'),
          supabase.from('transactions').select('*').order('created_at', { ascending: false }),
          supabase.from('daily_results').select('*').order('date', { ascending: false }).limit(100)
      ]);

      // 1. Profiles
      let profiles: any[] = [];
      if (profilesRes.status === 'fulfilled' && profilesRes.value.data) {
          profiles = profilesRes.value.data;
      } else if (profilesRes.status === 'rejected') {
          console.error("Error fetching profiles:", profilesRes.reason);
      }

      // 2. Tickets
      let tickets: any[] = [];
      if (ticketsRes.status === 'fulfilled' && ticketsRes.value.data) {
          tickets = ticketsRes.value.data;
      }

      // 3. Transactions
      let txs: any[] = [];
      if (txsRes.status === 'fulfilled' && txsRes.value.data) {
          txs = txsRes.value.data;
      }

      // 4. Results
      let results: any[] = [];
      if (resultsRes.status === 'fulfilled' && resultsRes.value.data) {
          results = resultsRes.value.data;
      }

      // --- SAFE DATA MAPPING (NaN & Date Protection) ---
      
      const safeNum = (val: any) => {
          const num = Number(val);
          return isNaN(num) ? 0 : num;
      };

      const safeDate = (val: any) => {
          if (!val) return new Date();
          const d = new Date(val);
          return isNaN(d.getTime()) ? new Date() : d;
      };

      const mappedUsers: User[] = profiles.map(p => ({
        id: p.id,
        cedula: p.cedula || '',
        name: p.name || 'Usuario',
        email: p.email || '',
        password: '', 
        phone: p.phone || '',
        balance: safeNum(p.balance),
        role: p.role as 'owner' | 'seller' | 'client',
        blocked: p.blocked || false, 
        createdAt: p.created_at ? safeDate(p.created_at) : undefined,
        tickets: tickets.filter((t: any) => t.user_id === p.id).map((t: any) => ({
            id: t.id,
            number: t.number,
            amount: safeNum(t.amount),
            reventadosAmount: safeNum(t.reventados_amount),
            draw: t.draw_type as any,
            status: t.status,
            purchaseDate: safeDate(t.purchase_date)
        }))
      }));

      const mappedTxs: Transaction[] = txs.map(t => ({
          id: t.id,
          userId: t.user_id,
          userName: profiles.find(p => p.id === t.user_id)?.name || 'Desconocido',
          type: t.type as any,
          amount: safeNum(t.amount),
          date: safeDate(t.created_at),
          details: t.details
      }));

      const mappedResults: DailyResult[] = results.map(r => ({
          id: r.id,
          date: r.date,
          draw: r.draw_type as any,
          number: r.number,
          reventadosNumber: r.reventados_number,
          ballColor: r.ball_color as any
      }));

      setDbUsers(mappedUsers); 
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
    // Call immediately
    fetchData();

    const channel = supabase.channel('app-db-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            if(!criticalErrorRef.current) { fetchData(); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
            if(!criticalErrorRef.current) { fetchData(); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
            if(!criticalErrorRef.current) { fetchData(); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_results' }, () => {
            if(!criticalErrorRef.current) { fetchData(); }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [fetchData]); 

  return { users, transactions, dbDailyResults, loading, error, refresh: fetchData, optimisticUpdateResult, optimisticAddUser, optimisticUpdateUser, optimisticDeleteUser };
};
