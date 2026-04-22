import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jzbcmdqnrxofxtofbedo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YmNtZHFucnhvZnh0b2ZiZWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzUzODgsImV4cCI6MjA5MTE1MTM4OH0.VLdjhQkXH8ZvQE1YlONCBUbXm-dVdpVOFX5R7YcM2Eo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'motoya-auth',
    flowType: 'pkce',
  },
});
