// ============================================================
// CLINIO - API: Encaixe Automático
// GET  /api/agenda/encaixe?consulta_id=  → buscar candidatos
// POST /api/agenda/encaixe               → confirmar encaixe
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { buscarCandidatosEncaixe, encaixarCandidato } from '@/servicos/listaEspera'

export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const consultaId = req.nextUrl.searchParams.get('consulta_id')
    if (!consultaId) {
      return NextResponse.json({ erro: 'consulta_id obrigatório' }, { status: 400 })
    }

    const { data: consulta } = await supabase
      .from('consultas')
      .select('medico_id, data_hora_inicio, data_hora_fim, tipo_consulta_id')
      .eq('id', consultaId)
      .single()

    if (!consulta) return NextResponse.json({ erro: 'Consulta não encontrada' }, { status: 404 })

    const candidatos = await buscarCandidatosEncaixe(usuario.clinica_id, {
      medicoId: consulta.medico_id,
      data_hora_inicio: consulta.data_hora_inicio,
      data_hora_fim: consulta.data_hora_fim,
      tipoConsultaId: consulta.tipo_consulta_id,
    })

    return NextResponse.json({ candidatos })
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
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const corpo = await req.json()
    // corpo: { item_lista_id, medico_id, data_hora_inicio, data_hora_fim, sala_id?, tipo_consulta_id? }

    if (!corpo.item_lista_id || !corpo.medico_id || !corpo.data_hora_inicio || !corpo.data_hora_fim) {
      return NextResponse.json({ erro: 'Campos obrigatórios: item_lista_id, medico_id, data_hora_inicio, data_hora_fim' }, { status: 400 })
    }

    // Buscar paciente_id do item da lista
    const { data: itemLista } = await supabase
      .from('lista_espera')
      .select('paciente_id')
      .eq('id', corpo.item_lista_id)
      .single()

    if (!itemLista) return NextResponse.json({ erro: 'Item da lista não encontrado' }, { status: 404 })

    const novaConsulta = await encaixarCandidato(corpo.item_lista_id, {
      clinicaId: usuario.clinica_id,
      pacienteId: itemLista.paciente_id,
      medicoId: corpo.medico_id,
      dataHoraInicio: corpo.data_hora_inicio,
      dataHoraFim: corpo.data_hora_fim,
      tipoConsultaId: corpo.tipo_consulta_id,
      salaId: corpo.sala_id,
    })

    return NextResponse.json({ consulta: novaConsulta }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
