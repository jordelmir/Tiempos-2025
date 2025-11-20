
import { createClient } from '@supabase/supabase-js';

// Credenciales proporcionadas
const supabaseUrl = 'https://gballkiujnepmmbbmhhq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYWxsa2l1am5lcG1tYmJtaGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0Nzc2NjMsImV4cCI6MjA3OTA1MzY2M30.YGetSUqOD30FxMN3rEFxjdW0OYhvZDfn5Scm4gbRpp0';

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
