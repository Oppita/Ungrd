import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const geminiApiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  const apiKey = process.env.API_KEY || env.API_KEY || '';
  
  const rawSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const rawSupabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'ignore-missing-deps',
        resolveId(id) {
          if (['prop-types', 'react-is'].includes(id)) {
            return { id, external: true };
          }
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.SUPABASE_URL': JSON.stringify(rawSupabaseUrl),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(rawSupabaseKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(rawSupabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(rawSupabaseKey),
    },
    optimizeDeps: {
      include: ['prop-types', 'react-is', 'react-simple-maps', 'recharts'],
    },
    build: {
      rollupOptions: {
        external: ['prop-types', 'react-is'],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify – file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
