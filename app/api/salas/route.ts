// ============================================================
// CLINIO - API: Salas de Atendimento
// GET  /api/salas  → listar salas da clínica
// POST /api/salas  → criar nova sala
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

    const { data: salas, error } = await supabase
      .from('salas')
      .select('*')
      .eq('clinica_id', usuario.clinica_id)
      .eq('ativa', true)
      .order('nome')

    if (error) throw error

    return NextResponse.json({ salas: salas || [] })
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
    if (usuario.perfil !== 'admin' && usuario.perfil !== 'recepcionista') {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const corpo = await req.json()
    if (!corpo.nome) {
      return NextResponse.json({ erro: 'Nome da sala é obrigatório' }, { status: 400 })
    }

    const { data: sala, error } = await supabase
      .from('salas')
      .insert({
        clinica_id: usuario.clinica_id,
        nome: corpo.nome,
        descricao: corpo.descricao,
        capacidade: corpo.capacidade ?? 1,
        cor: corpo.cor || '#6B7280',
        ativa: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ sala }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
