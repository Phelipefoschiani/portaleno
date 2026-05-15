/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Credenciais do Supabase não encontradas. Certifique-se de configurar as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Secrets.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
