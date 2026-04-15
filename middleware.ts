// ============================================================
// CLINIO - Middleware de Autenticação
// Protege rotas do painel e redireciona usuários não autenticados
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(requisicao: NextRequest) {
  const caminhoAtual = requisicao.nextUrl.pathname

  // ── APIs públicas: liberar ANTES de qualquer chamada ao Supabase ──
  // Isso é crítico para webhooks externos (Meta, etc.) que não têm cookies
  const ehApiPublicaImediata =
    caminhoAtual.startsWith('/api/whatsapp/') ||      // webhooks WhatsApp
    caminhoAtual.startsWith('/api/agendamento-publico') ||
    caminhoAtual.startsWith('/api/agenda/slots') ||
    caminhoAtual.startsWith('/api/clinicas') ||       // cadastro de clínica
    caminhoAtual.startsWith('/api/auth')              // autenticação

  if (ehApiPublicaImediata) {
    return NextResponse.next({ request: { headers: requisicao.headers } })
  }

  let resposta = NextResponse.next({
    request: {
      headers: requisicao.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(nome: string) {
          return requisicao.cookies.get(nome)?.value
        },
        set(nome: string, valor: string, opcoes: Record<string, any>) {
          requisicao.cookies.set({ name: nome, value: valor, ...opcoes })
          resposta = NextResponse.next({
            request: { headers: requisicao.headers },
          })
          resposta.cookies.set({ name: nome, value: valor, ...opcoes })
        },
        remove(nome: string, opcoes: Record<string, any>) {
          requisicao.cookies.set({ name: nome, value: '', ...opcoes })
          resposta = NextResponse.next({
            request: { headers: requisicao.headers },
          })
          resposta.cookies.set({ name: nome, value: '', ...opcoes })
        },
      },
    }
  )

  // Verificar sessão atual
  const { data: { session } } = await supabase.auth.getSession()

  // ── Raiz do site: roteia sem parâmetros na URL ──────────────
  if (caminhoAtual === '/') {
    return NextResponse.redirect(
      new URL(session ? '/painel' : '/autenticacao/entrar', requisicao.url)
    )
  }

  // Rotas públicas que não precisam de autenticação
  const rotasPublicas = [
    '/autenticacao/entrar',
    '/autenticacao/registrar',
    '/autenticacao/recuperar-senha',
    '/autenticacao/nova-senha',
    '/registrar',
    '/recuperar-senha',
    '/agendamento',
  ]

  const ehRotaPublica = rotasPublicas.some((rota) =>
    caminhoAtual === rota || caminhoAtual.startsWith(rota + '/')
  )

  // (APIs já tratadas acima no bloco imediato)
  const ehApiPublica = false

  // Se não tem sessão e não é rota pública → redirecionar para login
  if (!session && !ehRotaPublica && !ehApiPublica && !caminhoAtual.startsWith('/api/auth')) {
    const urlLogin = new URL('/autenticacao/entrar', requisicao.url)
    // Só preserva destino se for uma rota específica (não o painel padrão)
    if (caminhoAtual !== '/painel') {
      urlLogin.searchParams.set('redirecionamento', caminhoAtual)
    }
    return NextResponse.redirect(urlLogin)
  }

  // Se tem sessão e está em página de entrada → redirecionar para painel
  const paginasEntrada = ['/autenticacao/entrar', '/autenticacao/registrar', '/registrar']
  if (session && paginasEntrada.includes(caminhoAtual)) {
    return NextResponse.redirect(new URL('/painel', requisicao.url))
  }

  return resposta
}

// Configurar em quais rotas o middleware deve ser aplicado
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
