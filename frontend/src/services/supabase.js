import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en frontend/.env')
}

// Cliente con la anon key: solo para Auth. Los datos del CRM se piden al backend.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
