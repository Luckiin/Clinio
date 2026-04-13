// ============================================================
// CLINIO - Cliente Supabase (Navegador)
// Seguro para uso em Client Components ('use client')
// ============================================================

import { createBrowserClient } from '@supabase/ssr'

// Variáveis de ambiente obrigatórias
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_CHAVE_ANONIMA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_CHAVE_ANONIMA) {
  throw new Error(
    'Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias'
  )
}

// ============================================================
// Cliente para uso no navegador (Client Components)
// ============================================================
export function criarClienteNavegador() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_CHAVE_ANONIMA)
}
