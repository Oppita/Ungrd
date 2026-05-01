import { createClient } from '@supabase/supabase-js';

let rawUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
if (rawUrl && !rawUrl.startsWith('http')) {
  rawUrl = 'https://' + rawUrl;
}
export const supabaseUrl = rawUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log("Supabase Diagnostics:");
console.log("URL Configured:", !!supabaseUrl, supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : 'Missing');
console.log("Key Configured:", !!supabaseAnonKey, supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'Missing');

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('falta-configurar');

if (!isSupabaseConfigured) {
  console.warn('Supabase no está configurado. La persistencia en la nube y la autenticación estarán desactivadas.');
} else {
  console.log('Supabase configurado correctamente a nivel de cliente.');
}

export const supabase = createClient(
  supabaseUrl || 'https://falta-configurar-url.supabase.co', 
  supabaseAnonKey || 'falta-configurar-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      lock: undefined, // Desactiva navigator.locks para evitar deadlocks
    }
  }
);
