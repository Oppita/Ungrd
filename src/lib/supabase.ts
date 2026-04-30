// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured =
  supabaseUrl.length > 15 &&
  supabaseAnonKey.length > 20 &&
  !supabaseUrl.includes('falta-configurar');

console.log("Supabase Configuración:");
console.log("- URL configurada:", isSupabaseConfigured ? "✅ Sí" : "❌ No");
console.log("- URL:", supabaseUrl ? supabaseUrl.substring(0, 25) + "..." : "MISSING");

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase no está configurado correctamente');
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: undefined, // Evita timeouts en Render
      },
      global: {
        headers: {
          'X-Client-Info': 'srr-app',
        },
      },
    });
  }

  return supabaseInstance;
};

// Cliente principal (con fallback seguro)
export const supabase: SupabaseClient = (() => {
  if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase no configurado. Modo local activado (solo almacenamiento en localStorage).');
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: null, error: new Error('Supabase no configurado') }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
        upsert: () => ({ data: null, error: null }),
      }),
    } as unknown as SupabaseClient;
  }

  return getSupabase();
})();

export const safeGetSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
  } catch (err) {
    console.warn("Error getting session:", err);
    return null;
  }
};
