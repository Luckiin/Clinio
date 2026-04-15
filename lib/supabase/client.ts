import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias.')
}

export function criarClienteSupabaseAnonimo() {
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
}

export function criarClienteSupabaseAdmin() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Variável SUPABASE_SERVICE_ROLE_KEY é obrigatória para operações administrativas.')
  }

  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
}
