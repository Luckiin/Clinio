// ============================================================
// CLINIO - Serviço de Agenda
// Lógica de negócio: agendamento, slots disponíveis,
// reagendamento, controle de presença, ocupação
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import type { ConsultaComRelacoes, EventoAgenda, SlotDisponivel } from '@/tipos'
import { processarEncaixeAutomatico } from '@/servicos/listaEspera'

// ─── Converter consultas para formato de eventos ─────────────
export function converterConsultasParaEventos(
  consultas: ConsultaComRelacoes[]
): EventoAgenda[] {
  return consultas.map((c) => ({
    id: c.id,
    titulo: c.paciente?.nome || 'Paciente',
    inicio: new Date(c.data_hora_inicio),
    fim: new Date(c.data_hora_fim),
    status: c.status,
    medicoId: c.medico_id,
    medicoCor: c.medico?.cor_agenda || '#3B82F6',
    medicoNome: c.medico?.nome,
    salaId: c.sala_id,
    pacienteNome: c.paciente?.nome,
    pacienteTelefone: c.paciente?.telefone,
    tipoConsultaNome: c.tipo_consulta?.nome,
    probabilidadeFalta: c.previsao_falta?.probabilidade,
  }))
}

// ─── Gerar slots disponíveis para agendamento ────────────────
export async function gerarSlotsDisponiveis(
  clinicaId: string,
  opcoes: {
    medicoId?: string
    data: string       // YYYY-MM-DD
    duracaoMin?: number
    tipoConsultaId?: string
  }
): Promise<SlotDisponivel[]> {
  const supabase = criarClienteServidor()

  const HORA_INICIO = 7   // 07:00
  const HORA_FIM = 20     // 20:00

  // Buscar consultas existentes no dia
  const { data: consultasExistentes } = await supabase
    .from('consultas')
    .select('data_hora_inicio, data_hora_fim, medico_id, sala_id')
    .eq('clinica_id', clinicaId)
    .gte('data_hora_inicio', `${opcoes.data}T00:00:00`)
    .lte('data_hora_inicio', `${opcoes.data}T23:59:59`)
    .not('status', 'in', '("cancelado","faltou")')

  // Buscar bloqueios do dia
  const { data: bloqueios } = await supabase
    .from('bloqueios_agenda')
    .select('data_hora_inicio, data_hora_fim, medico_id, sala_id, motivo')
    .eq('clinica_id', clinicaId)
    .lte('data_hora_inicio', `${opcoes.data}T23:59:59`)
    .gte('data_hora_fim', `${opcoes.data}T00:00:00`)

  // Buscar médicos disponíveis
  let queryMedicos = supabase
    .from('medicos')
    .select('id, nome, cor_agenda, duracao_padrao_consulta')
    .eq('clinica_id', clinicaId)
    .eq('ativo', true)

  if (opcoes.medicoId) {
    queryMedicos = queryMedicos.eq('id', opcoes.medicoId)
  }

  const { data: medicos } = await queryMedicos
  const slots: SlotDisponivel[] = []

  for (const medico of medicos || []) {
    const duracaoMedico = opcoes.duracaoMin || medico.duracao_padrao_consulta || 30

    for (let hora = HORA_INICIO; hora < HORA_FIM; hora++) {
      for (const min of [0, 30]) {
        const inicio = new Date(`${opcoes.data}T${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`)
        const fim = new Date(inicio.getTime() + duracaoMedico * 60 * 1000)

        if (fim.getHours() >= HORA_FIM && fim.getMinutes() > 0) break

        const inicioISO = inicio.toISOString()
        const fimISO = fim.toISOString()

        const temConflito = (consultasExistentes || []).some((c) => {
          if (c.medico_id !== medico.id) return false
          return c.data_hora_inicio < fimISO && c.data_hora_fim > inicioISO
        })

        const temBloqueio = (bloqueios || []).some((b) => {
          if (b.medico_id && b.medico_id !== medico.id) return false
          return b.data_hora_inicio < fimISO && b.data_hora_fim > inicioISO
        })

        if (!temConflito && !temBloqueio) {
          slots.push({
            inicio: inicioISO,
            fim: fimISO,
            medicoId: medico.id,
            medicoNome: medico.nome,
            duracao: duracaoMedico,
          })
        }
      }
    }
  }

  return slots.sort((a, b) => a.inicio.localeCompare(b.inicio))
}

// ─── Agendar consulta (com validação de conflitos) ───────────
export async function agendarConsulta(dados: {
  clinicaId: string
  pacienteId: string
  medicoId: string
  salaId?: string
  tipoConsultaId?: string
  dataHoraInicio: string
  dataHoraFim: string
  valor?: number
  observacoes?: string
  origem?: string
}): Promise<ConsultaComRelacoes> {
  const supabase = criarClienteServidor()

  // Verificar conflitos de médico
  const { data: conflitos } = await supabase
    .from('consultas')
    .select('id, data_hora_inicio, data_hora_fim')
    .eq('clinica_id', dados.clinicaId)
    .eq('medico_id', dados.medicoId)
    .lt('data_hora_inicio', dados.dataHoraFim)
    .gt('data_hora_fim', dados.dataHoraInicio)
    .not('status', 'in', '("cancelado","faltou")')

  if (conflitos && conflitos.length > 0) {
    throw new Error('Conflito de horário: o médico já possui uma consulta neste período')
  }

  // Verificar conflito de sala
  if (dados.salaId) {
    const { data: conflitoSala } = await supabase
      .from('consultas')
      .select('id')
      .eq('clinica_id', dados.clinicaId)
      .eq('sala_id', dados.salaId)
      .lt('data_hora_inicio', dados.dataHoraFim)
      .gt('data_hora_fim', dados.dataHoraInicio)
      .not('status', 'in', '("cancelado","faltou")')

    if (conflitoSala && conflitoSala.length > 0) {
      throw new Error('Sala indisponível neste horário')
    }
  }

  const { data, error } = await supabase
    .from('consultas')
    .insert({
      clinica_id: dados.clinicaId,
      paciente_id: dados.pacienteId,
      medico_id: dados.medicoId,
      sala_id: dados.salaId,
      tipo_consulta_id: dados.tipoConsultaId,
      data_hora_inicio: dados.dataHoraInicio,
      data_hora_fim: dados.dataHoraFim,
      valor: dados.valor,
      observacoes: dados.observacoes,
      status: 'agendado',
      origem: dados.origem || 'manual',
    })
    .select(`
      *,
      paciente:pacientes(id, nome, telefone, email, foto_url),
      medico:medicos(id, nome, cor_agenda, especialidade),
      sala:salas(id, nome),
      tipo_consulta:tipos_consulta(id, nome, duracao_minutos, cor)
    `)
    .single()

  if (error) throw error
  return data as ConsultaComRelacoes
}

// ─── Reagendar consulta ──────────────────────────────────────
export async function reagendarConsulta(
  consultaId: string,
  novoInicio: string,
  novoFim: string
): Promise<ConsultaComRelacoes> {
  const supabase = criarClienteServidor()

  const { data: atual } = await supabase
    .from('consultas')
    .select('clinica_id, medico_id, sala_id, data_hora_inicio, data_hora_fim')
    .eq('id', consultaId)
    .single()

  if (!atual) throw new Error('Consulta não encontrada')

  const { data: conflitos } = await supabase
    .from('consultas')
    .select('id')
    .eq('clinica_id', atual.clinica_id)
    .eq('medico_id', atual.medico_id)
    .neq('id', consultaId)
    .lt('data_hora_inicio', novoFim)
    .gt('data_hora_fim', novoInicio)
    .not('status', 'in', '("cancelado","faltou")')

  if (conflitos && conflitos.length > 0) {
    throw new Error('Conflito de horário no novo período')
  }

  await supabase.from('historico_consultas').insert({
    consulta_id: consultaId,
    acao: 'reagendada',
    dados_anteriores: { data_hora_inicio: atual.data_hora_inicio, data_hora_fim: atual.data_hora_fim },
    dados_novos: { data_hora_inicio: novoInicio, data_hora_fim: novoFim },
  })

  const { data, error } = await supabase
    .from('consultas')
    .update({
      data_hora_inicio: novoInicio,
      data_hora_fim: novoFim,
      status: 'agendado',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', consultaId)
    .select(`
      *,
      paciente:pacientes(id, nome, telefone, email, foto_url),
      medico:medicos(id, nome, cor_agenda, especialidade),
      sala:salas(id, nome),
      tipo_consulta:tipos_consulta(id, nome, duracao_minutos, cor)
    `)
    .single()

  if (error) throw error
  return data as ConsultaComRelacoes
}

// ─── Cancelar consulta + disparar encaixe automático ─────────
export async function cancelarConsulta(
  consultaId: string,
  motivo?: string
): Promise<{ consulta: ConsultaComRelacoes; encaixe: { candidatos: number; notificados: number } }> {
  const supabase = criarClienteServidor()

  const { data: consultaAtual } = await supabase
    .from('consultas')
    .select('clinica_id, medico_id, sala_id, tipo_consulta_id, data_hora_inicio, data_hora_fim, status')
    .eq('id', consultaId)
    .single()

  if (!consultaAtual) throw new Error('Consulta não encontrada')

  const { data, error } = await supabase
    .from('consultas')
    .update({
      status: 'cancelado',
      motivo_cancelamento: motivo,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', consultaId)
    .select(`
      *,
      paciente:pacientes(id, nome, telefone, email, foto_url),
      medico:medicos(id, nome, cor_agenda, especialidade),
      sala:salas(id, nome),
      tipo_consulta:tipos_consulta(id, nome, duracao_minutos, cor)
    `)
    .single()

  if (error) throw error

  await supabase.from('historico_consultas').insert({
    consulta_id: consultaId,
    acao: 'cancelada',
    dados_anteriores: { status: consultaAtual.status },
    dados_novos: { status: 'cancelado', motivo },
  })

  // Encaixe automático
  const resultadoEncaixe = await processarEncaixeAutomatico(
    consultaAtual.clinica_id,
    {
      id: consultaId,
      medicoId: consultaAtual.medico_id,
      data_hora_inicio: consultaAtual.data_hora_inicio,
      data_hora_fim: consultaAtual.data_hora_fim,
      tipoConsultaId: consultaAtual.tipo_consulta_id,
    }
  ).catch(() => ({ candidatos: [], notificados: 0 }))

  return {
    consulta: data as ConsultaComRelacoes,
    encaixe: {
      candidatos: resultadoEncaixe.candidatos.length,
      notificados: resultadoEncaixe.notificados,
    },
  }
}

// ─── Registrar presença do paciente ──────────────────────────
export async function registrarPresenca(
  consultaId: string,
  compareceu: boolean
): Promise<ConsultaComRelacoes> {
  const supabase = criarClienteServidor()
  const novoStatus = compareceu ? 'em_atendimento' : 'faltou'

  const { data, error } = await supabase
    .from('consultas')
    .update({
      status: novoStatus,
      chegou_em: compareceu ? new Date().toISOString() : null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', consultaId)
    .select(`
      *,
      paciente:pacientes(id, nome, telefone, email, foto_url),
      medico:medicos(id, nome, cor_agenda, especialidade),
      sala:salas(id, nome),
      tipo_consulta:tipos_consulta(id, nome, duracao_minutos, cor)
    `)
    .single()

  if (error) throw error

  await supabase.from('historico_consultas').insert({
    consulta_id: consultaId,
    acao: compareceu ? 'check_in' : 'falta_registrada',
    dados_novos: { status: novoStatus },
  })

  return data as ConsultaComRelacoes
}

// ─── Calcular taxa de ocupação da agenda ─────────────────────
export async function calcularTaxaOcupacao(
  clinicaId: string,
  data: string,
  medicoId?: string
): Promise<{
  total_slots: number
  slots_ocupados: number
  taxa_ocupacao: number
  por_medico: Record<string, { total: number; ocupados: number; taxa: number }>
}> {
  const supabase = criarClienteServidor()
  const SLOTS_POR_DIA = 26 // 07:00–20:00 em blocos de 30 min

  let query = supabase
    .from('consultas')
    .select('medico_id, data_hora_inicio, data_hora_fim')
    .eq('clinica_id', clinicaId)
    .gte('data_hora_inicio', `${data}T00:00:00`)
    .lte('data_hora_inicio', `${data}T23:59:59`)
    .not('status', 'in', '("cancelado","faltou")')

  if (medicoId) query = query.eq('medico_id', medicoId)

  const { data: consultas } = await query

  let queryMedicos = supabase
    .from('medicos')
    .select('id')
    .eq('clinica_id', clinicaId)
    .eq('ativo', true)
  if (medicoId) queryMedicos = queryMedicos.eq('id', medicoId)

  const { data: medicos } = await queryMedicos

  const porMedico: Record<string, { total: number; ocupados: number; taxa: number }> = {}

  for (const m of medicos || []) {
    const consultasMedico = (consultas || []).filter((c) => c.medico_id === m.id)
    const slotsOcupados = consultasMedico.reduce((acc, c) => {
      const dur = Math.round(
        (new Date(c.data_hora_fim).getTime() - new Date(c.data_hora_inicio).getTime()) / 1800000
      )
      return acc + Math.max(1, dur)
    }, 0)

    porMedico[m.id] = {
      total: SLOTS_POR_DIA,
      ocupados: Math.min(slotsOcupados, SLOTS_POR_DIA),
      taxa: Math.round((Math.min(slotsOcupados, SLOTS_POR_DIA) / SLOTS_POR_DIA) * 100),
    }
  }

  const totalMedicos = medicos?.length || 1
  const totalSlots = SLOTS_POR_DIA * totalMedicos
  const totalOcupados = Object.values(porMedico).reduce((s, m) => s + m.ocupados, 0)

  return {
    total_slots: totalSlots,
    slots_ocupados: totalOcupados,
    taxa_ocupacao: Math.round((totalOcupados / totalSlots) * 100),
    por_medico: porMedico,
  }
}

// ─── Verificar consultas não confirmadas ─────────────────────
export async function verificarConsultasNaoConfirmadas(
  clinicaId: string,
  horasAntecedencia = 24
): Promise<ConsultaComRelacoes[]> {
  const supabase = criarClienteServidor()

  const limite = new Date(Date.now() + horasAntecedencia * 3600 * 1000).toISOString()
  const agora = new Date().toISOString()

  const { data, error } = await supabase
    .from('consultas')
    .select(`
      *,
      paciente:pacientes(id, nome, telefone, email),
      medico:medicos(id, nome)
    `)
    .eq('clinica_id', clinicaId)
    .eq('status', 'agendado')
    .gte('data_hora_inicio', agora)
    .lte('data_hora_inicio', limite)
    .is('lembrete_enviado_em', null)

  if (error) throw error
  return (data || []) as ConsultaComRelacoes[]
}
