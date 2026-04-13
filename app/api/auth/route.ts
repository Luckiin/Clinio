// ============================================================
// CLINIO - API de Autenticação
// Rotas: POST /api/auth/entrar  POST /api/auth/sair
//        GET /api/auth/perfil   POST /api/auth/registrar
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'

/**
 * GET /api/auth/perfil
 * Retorna os dados do usuário autenticado com informações da clínica
 */
export async function GET() {
  try {
    const supabase = criarClienteServidor()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select(`
        *,
        clinica:clinicas(*)
      `)
      .eq('id', user.id)
      .single()

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ dados: usuario })
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}

/**
 * POST /api/auth
 * Ação baseada no parâmetro 'acao'
 */
export async function POST(requisicao: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const acao = requisicao.nextUrl.searchParams.get('acao')
    const corpo = await requisicao.json()

    if (acao === 'entrar') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: corpo.email,
        password: corpo.senha,
      })

      if (error) {
        return NextResponse.json(
          { erro: 'Email ou senha incorretos' },
          { status: 401 }
        )
      }

      // Atualizar último acesso
      await supabase
        .from('usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', data.user.id)

      return NextResponse.json({ dados: { usuario: data.user, sessao: data.session } })
    }

    if (acao === 'sair') {
      await supabase.auth.signOut()
      return NextResponse.json({ mensagem: 'Sessão encerrada com sucesso' })
    }

    if (acao === 'redefinir_senha') {
      if (!corpo.email) {
        return NextResponse.json({ erro: 'Email é obrigatório' }, { status: 400 })
      }

      await supabase.auth.resetPasswordForEmail(corpo.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_URL}/nova-senha`,
      })

      return NextResponse.json({
        mensagem: 'Se o email existir, você receberá as instruções para redefinição.',
      })
    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}
