// ============================================================
// CLINIO - API de Slots Disponíveis na Agenda
// Rota: GET /api/agenda/slots
// Usada tanto internamente quanto pelo portal público de agendamento
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { gerarSlotsDisponiveis } from '@/servicos/agenda'

/**
 * GET /api/agenda/slots
 * Retorna horários disponíveis para agendamento
 * Parâmetros: medico_id, data, duracao_minutos, clinica_id (para público)
 */
export async function GET(requisicao: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const params = requisicao.nextUrl.searchParams

    const medicoId = params.get('medico_id')
    const data = params.get('data')
    const duracaoMinutos = parseInt(params.get('duracao_minutos') || '30')
    const clinicaIdPublico = params.get('clinica_id')

    if (!medicoId || !data) {
      return NextResponse.json(
        { erro: 'Parâmetros medico_id e data são obrigatórios' },
        { status: 400 }
      )
    }

    let clinicaId: string

    // Verificar se é requisição autenticada ou pública
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Usuário autenticado
      const { data: usuario } = await supabase
        .from('usuarios').select('clinica_id').eq('id', user.id).single()
      if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })
      clinicaId = usuario.clinica_id
    } else if (clinicaIdPublico) {
      // Acesso público (portal de agendamento)
      clinicaId = clinicaIdPublico
    } else {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    // Buscar dados do médico para horário de trabalho
    const { data: medico } = await supabase
      .from('medicos')
      .select('horarios_trabalho, duracao_padrao, nome')
      .eq('id', medicoId)
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .single()

    if (!medico) {
      return NextResponse.json({ erro: 'Médico não encontrado' }, { status: 404 })
    }

    // Determinar o dia da semana
    const dataObj = new Date(`${data}T12:00:00`)
    const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
    const diaSemana = diasSemana[dataObj.getDay()] as keyof typeof medico.horarios_trabalho

    const horarioTrabalho = (medico.horarios_trabalho as any)?.[diaSemana]

    if (!horarioTrabalho || !horarioTrabalho.ativo) {
      return NextResponse.json({
        dados: [],
        mensagem: 'Médico não atende neste dia',
      })
    }

    const slots = await gerarSlotsDisponiveis(
      clinicaId,
      medicoId,
      data,
      duracaoMinutos || medico.duracao_padrao,
      { inicio: horarioTrabalho.inicio, fim: horarioTrabalho.fim }
    )

    // Adicionar nome do médico nos slots
    const slotsComMedico = slots.map((s) => ({ ...s, medico_nome: medico.nome }))

    return NextResponse.json({ dados: slotsComMedico })
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}
