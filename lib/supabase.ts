
import { createClient } from '@supabase/supabase-js';

// --- Get Supabase credentials from environment variables ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- Validate environment variables ---
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// --- Initialize and export the Supabase client ---
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DBProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  cedula: string;
  role: 'admin' | 'client';
  balance: number;
}
