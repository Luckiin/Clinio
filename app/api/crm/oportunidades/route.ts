import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { listarOportunidades, criarOportunidade, atualizarOportunidade } from '@/servicos/crm'
import type { StatusOportunidade, PrioridadeOportunidade } from '@/tipos'

// GET /api/crm/oportunidades?paciente_id=...&status=...
export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const pacienteId = req.nextUrl.searchParams.get('paciente_id') ?? undefined
    const status = req.nextUrl.searchParams.get('status') as StatusOportunidade | null
    const prioridade = req.nextUrl.searchParams.get('prioridade') as PrioridadeOportunidade | null
    const limite = req.nextUrl.searchParams.get('limite')

    const dados = await listarOportunidades(usuario.clinica_id, {
      pacienteId,
      status: status ?? undefined,
      prioridade: prioridade ?? undefined,
      limite: limite ? parseInt(limite) : undefined,
    })
    return NextResponse.json({ dados })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

// POST /api/crm/oportunidades
export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const corpo = await req.json()
    const { paciente_id, tipo_oportunidade, descricao, data_retorno_prevista, prioridade, valor_estimado } = corpo

    if (!paciente_id || !tipo_oportunidade || !descricao) {
      return NextResponse.json({ erro: 'Campos obrigatórios: paciente_id, tipo_oportunidade, descricao' }, { status: 400 })
    }

    const dados = await criarOportunidade(usuario.clinica_id, {
      paciente_id,
      usuario_responsavel_id: user.id,
      tipo_oportunidade,
      descricao,
      data_retorno_prevista,
      prioridade: prioridade ?? 'media',
      valor_estimado,
    })
    return NextResponse.json({ dados }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

// PATCH /api/crm/oportunidades?id=...
export async function PATCH(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    const corpo = await req.json()
    const dados = await atualizarOportunidade(usuario.clinica_id, id, corpo)
    return NextResponse.json({ dados })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
