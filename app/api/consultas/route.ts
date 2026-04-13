// ============================================================
// CLINIO - API de Consultas
// Rotas: GET /api/consultas  POST /api/consultas
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { buscarConsultas, criarConsulta, verificarConflitosHorario } from '@/servicos/consultas'
import { validarFormularioConsulta } from '@/lib/validadores'
import type { FormularioNovaConsulta } from '@/tipos'

/**
 * GET /api/consultas
 * Retorna lista paginada de consultas com filtros
 */
export async function GET(requisicao: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    // Obter clinica_id do usuário logado
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })
    }

    const params = requisicao.nextUrl.searchParams
    const dataInicio = params.get('data_inicio') || undefined
    const dataFim = params.get('data_fim') || undefined
    const medicoId = params.get('medico_id') || undefined
    const statusParam = params.get('status')
    const pagina = parseInt(params.get('pagina') || '1')
    const porPagina = parseInt(params.get('por_pagina') || '50')

    const { dados, total } = await buscarConsultas({
      clinica_id: usuario.clinica_id,
      data_inicio: dataInicio,
      data_fim: dataFim,
      medico_id: medicoId,
      status: statusParam ? [statusParam as any] : undefined,
      pagina,
      por_pagina: porPagina,
    })

    return NextResponse.json({
      dados,
      total,
      pagina,
      por_pagina: porPagina,
    })
  } catch (erro: any) {
    console.error('[API Consultas] Erro no GET:', erro)
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}

/**
 * POST /api/consultas
 * Cria um novo agendamento
 */
export async function POST(requisicao: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id, perfil')
      .eq('id', user.id)
      .single()

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })
    }

    const corpo: FormularioNovaConsulta = await requisicao.json()

    // Validar campos obrigatórios
    const erros = validarFormularioConsulta({
      paciente_id: corpo.paciente_id,
      medico_id: corpo.medico_id,
      data_hora_inicio: corpo.data_hora_inicio,
      duracao_minutos: corpo.duracao_minutos,
    })

    if (erros.length > 0) {
      return NextResponse.json({ erro: erros.join(', ') }, { status: 400 })
    }

    // Verificar conflitos de horário
    const inicio = new Date(corpo.data_hora_inicio)
    const fim = new Date(inicio.getTime() + corpo.duracao_minutos * 60 * 1000)

    const temConflito = await verificarConflitosHorario(
      usuario.clinica_id,
      corpo.medico_id,
      inicio.toISOString(),
      fim.toISOString()
    )

    if (temConflito) {
      return NextResponse.json(
        { erro: 'Conflito de horário: médico já possui consulta neste período' },
        { status: 409 }
      )
    }

    // Criar a consulta
    const consulta = await criarConsulta(usuario.clinica_id, corpo, user.id)

    return NextResponse.json({ dados: consulta }, { status: 201 })
  } catch (erro: any) {
    console.error('[API Consultas] Erro no POST:', erro)
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}
