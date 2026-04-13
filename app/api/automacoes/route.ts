import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { AUTOMACOES_PADRAO } from '@/servicos/motorAutomacoes'

// GET /api/automacoes — lista automações da clínica
export async function GET(req: NextRequest) {
  try {
    const supabase = await criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: membro } = await supabase
      .from('membros_equipe')
      .select('clinica_id')
      .eq('usuario_id', user.id)
      .single()

    if (!membro) return NextResponse.json({ erro: 'Clínica não encontrada' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const ativo = searchParams.get('ativo')
    const evento = searchParams.get('evento')

    let query = supabase
      .from('automacoes')
      .select(`
        *,
        evento:evento_gatilho,
        execucoes_automacoes(count)
      `)
      .eq('clinica_id', membro.clinica_id)
      .order('criado_em', { ascending: true })

    if (ativo !== null) query = query.eq('ativo', ativo === 'true')
    if (evento) query = query.eq('evento_gatilho', evento)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ automacoes: data })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}

// POST /api/automacoes — cria nova automação
export async function POST(req: NextRequest) {
  try {
    const supabase = await criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: membro } = await supabase
      .from('membros_equipe')
      .select('clinica_id, perfil')
      .eq('usuario_id', user.id)
      .single()

    if (!membro) return NextResponse.json({ erro: 'Clínica não encontrada' }, { status: 403 })

    const corpo = await req.json()
    const { nome, descricao, evento, condicoes, acoes, delay_horas, ativo } = corpo

    if (!nome || !evento || !acoes?.length) {
      return NextResponse.json(
        { erro: 'nome, evento e acoes são obrigatórios' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('automacoes')
      .insert({
        clinica_id: membro.clinica_id,
        nome,
        descricao,
        evento_gatilho: evento,
        condicoes: condicoes ?? {},
        acoes,
        delay_horas: delay_horas ?? 0,
        ativo: ativo ?? true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ automacao: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
