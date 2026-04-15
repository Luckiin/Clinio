// ============================================================
// CLINIO - Middleware de Autenticação
// Protege rotas do painel e redireciona usuários não autenticados
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(requisicao: NextRequest) {
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

  const caminhoAtual = requisicao.nextUrl.pathname

  // Rotas públicas que não precisam de autenticação
  const rotasPublicas = [
    '/autenticacao/entrar',
    '/autenticacao/registrar',
    '/autenticacao/recuperar-senha',
    '/autenticacao/nova-senha',
    '/registrar',          // página de cadastro de nova clínica
    '/recuperar-senha',
    '/agendamento',
  ]

  const ehRotaPublica = rotasPublicas.some((rota) =>
    caminhoAtual === rota || caminhoAtual.startsWith(rota + '/')
  )

  // APIs públicas
  const ehApiPublica = caminhoAtual.startsWith('/api/agendamento-publico') ||
                       caminhoAtual.startsWith('/api/agenda/slots') ||
                       caminhoAtual.startsWith('/api/clinicas')    // cadastro de clínica

  // Se não tem sessão e não é rota pública, redirecionar para login
  if (!session && !ehRotaPublica && !ehApiPublica && !caminhoAtual.startsWith('/api/auth')) {
    const urlLogin = new URL('/autenticacao/entrar', requisicao.url)
    urlLogin.searchParams.set('redirecionamento', caminhoAtual)
    return NextResponse.redirect(urlLogin)
  }

  // Se tem sessão e está tentando acessar páginas de entrada, redirecionar para painel
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
