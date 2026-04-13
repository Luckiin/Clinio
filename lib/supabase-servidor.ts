// ============================================================
// CLINIO - Cliente Supabase (Servidor)
// APENAS para Server Components, Route Handlers e Server Actions
// NÃO importar em Client Components ('use client')
// ============================================================

import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

// Variáveis de ambiente obrigatórias
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_CHAVE_ANONIMA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_CHAVE_ANONIMA) {
  throw new Error(
    'Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias'
  )
}

// ============================================================
// Cliente para uso no servidor (Server Components, Route Handlers)
// ============================================================
export function criarClienteServidor() {
  const gerenciadorCookies = cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_CHAVE_ANONIMA, {
    cookies: {
      get(nome: string) {
        return gerenciadorCookies.get(nome)?.value
      },
      set(nome: string, valor: string, opcoes: CookieOptions) {
        try {
          gerenciadorCookies.set({ name: nome, value: valor, ...opcoes })
        } catch {
          // Ignorar erros em Server Components de leitura
        }
      },
      remove(nome: string, opcoes: CookieOptions) {
        try {
          gerenciadorCookies.set({ name: nome, value: '', ...opcoes })
        } catch {
          // Ignorar erros em Server Components de leitura
        }
      },
    },
  })
}

// ============================================================
// Cliente administrativo (ignora RLS - uso interno/migrations)
// ============================================================
export function criarClienteAdmin() {
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!chaveServico) {
    throw new Error('Variável SUPABASE_SERVICE_ROLE_KEY é obrigatória para operações administrativas')
  }
  return createBrowserClient(SUPABASE_URL, chaveServico)
}
