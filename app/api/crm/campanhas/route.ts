import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import {
  listarCampanhasCRM,
  criarCampanhaCRM,
  buscarDestinatariosCampanha,
} from '@/servicos/crm'
import type { StatusCampanhaCRM, StatusPaciente, SexoPaciente } from '@/tipos'

// GET /api/crm/campanhas?status=...
export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const status = req.nextUrl.searchParams.get('status') as StatusCampanhaCRM | null
    const dados = await listarCampanhasCRM(usuario.clinica_id, status ?? undefined)
    return NextResponse.json({ dados })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

// POST /api/crm/campanhas
export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const corpo = await req.json()

    // Se for uma prévia de destinatários
    if (corpo.acao === 'preview_destinatarios') {
      const destinatarios = await buscarDestinatariosCampanha(usuario.clinica_id, {
        tags: corpo.filtro_tags,
        status: corpo.filtro_status as StatusPaciente[],
        diasSemConsulta: corpo.filtro_dias_sem_consulta,
        cidade: corpo.filtro_cidade,
        sexo: corpo.filtro_sexo as SexoPaciente,
        idadeMin: corpo.filtro_idade_min,
        idadeMax: corpo.filtro_idade_max,
      })
      return NextResponse.json({ dados: { total: destinatarios.length, amostra: destinatarios.slice(0, 10) } })
    }

    const { nome, descricao, tipo, canal, mensagem_template, agendada_para, ...filtros } = corpo

    if (!nome || !tipo || !canal || !mensagem_template) {
      return NextResponse.json({
        erro: 'Campos obrigatórios: nome, tipo, canal, mensagem_template',
      }, { status: 400 })
    }

    // Calcula total de destinatários
    const destinatarios = await buscarDestinatariosCampanha(usuario.clinica_id, {
      tags: filtros.filtro_tags,
      status: filtros.filtro_status as StatusPaciente[],
      diasSemConsulta: filtros.filtro_dias_sem_consulta,
      cidade: filtros.filtro_cidade,
      sexo: filtros.filtro_sexo as SexoPaciente,
      idadeMin: filtros.filtro_idade_min,
      idadeMax: filtros.filtro_idade_max,
    })

    const dados = await criarCampanhaCRM(usuario.clinica_id, user.id, {
      nome,
      descricao,
      tipo,
      canal,
      mensagem_template,
      agendada_para,
      status: agendada_para ? 'agendada' : 'rascunho',
      total_destinatarios: destinatarios.length,
      total_enviadas: 0,
      total_entregues: 0,
      total_lidas: 0,
      total_respostas: 0,
      ...filtros,
    })

    return NextResponse.json({ dados }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
