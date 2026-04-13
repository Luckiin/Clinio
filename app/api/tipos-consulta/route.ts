// ============================================================
// CLINIO - API: Tipos de Consulta
// GET  /api/tipos-consulta  → listar tipos
// POST /api/tipos-consulta  → criar novo tipo
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'

export async function GET(_req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const { data: tipos, error } = await supabase
      .from('tipos_consulta')
      .select('*')
      .eq('clinica_id', usuario.clinica_id)
      .eq('ativo', true)
      .order('nome')

    if (error) throw error

    return NextResponse.json({ tipos: tipos || [] })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id, perfil').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })
    if (usuario.perfil !== 'admin') {
      return NextResponse.json({ erro: 'Apenas administradores podem criar tipos de consulta' }, { status: 403 })
    }

    const corpo = await req.json()
    if (!corpo.nome || !corpo.duracao_minutos) {
      return NextResponse.json({ erro: 'nome e duracao_minutos são obrigatórios' }, { status: 400 })
    }

    const { data: tipo, error } = await supabase
      .from('tipos_consulta')
      .insert({
        clinica_id: usuario.clinica_id,
        nome: corpo.nome,
        descricao: corpo.descricao,
        duracao_minutos: corpo.duracao_minutos,
        valor_padrao: corpo.valor_padrao,
        cor: corpo.cor || '#3B82F6',
        ativo: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ tipo }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
