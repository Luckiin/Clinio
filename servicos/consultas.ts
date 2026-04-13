// ============================================================
// CLINIO - Repositório de Consultas
// Acesso ao banco de dados para operações com consultas
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import type {
  Consulta,
  ConsultaComRelacoes,
  FormularioNovaConsulta,
  StatusConsulta,
  PaginacaoParams,
} from '@/tipos'

/**
 * Busca todas as consultas de uma clínica com filtros opcionais
 */
export async function buscarConsultas(params: {
  clinica_id: string
  data_inicio?: string
  data_fim?: string
  medico_id?: string
  status?: StatusConsulta[]
  pagina?: number
  por_pagina?: number
}): Promise<{ dados: ConsultaComRelacoes[]; total: number }> {
  const supabase = criarClienteServidor()

  let consulta = supabase
    .from('consultas')
    .select(
      `
      *,
      paciente:pacientes(*),
      medico:medicos(*),
      sala:salas(*),
      tipo_consulta:tipos_consulta(*)
    `,
      { count: 'exact' }
    )
    .eq('clinica_id', params.clinica_id)
    .order('data_hora_inicio', { ascending: true })

  if (params.data_inicio) {
    consulta = consulta.gte('data_hora_inicio', params.data_inicio)
  }
  if (params.data_fim) {
    consulta = consulta.lte('data_hora_inicio', params.data_fim)
  }
  if (params.medico_id) {
    consulta = consulta.eq('medico_id', params.medico_id)
  }
  if (params.status && params.status.length > 0) {
    consulta = consulta.in('status', params.status)
  }

  // Paginação
  const porPagina = params.por_pagina || 50
  const pagina = params.pagina || 1
  const de = (pagina - 1) * porPagina
  consulta = consulta.range(de, de + porPagina - 1)

  const { data, error, count } = await consulta

  if (error) throw new Error(`Erro ao buscar consultas: ${error.message}`)

  return {
    dados: (data as ConsultaComRelacoes[]) || [],
    total: count || 0,
  }
}

/**
 * Busca as consultas de um dia específico para a agenda
 */
export async function buscarConsultasDoDia(
  clinicaId: string,
  data: string,
  medicoId?: string
): Promise<ConsultaComRelacoes[]> {
  const supabase = criarClienteServidor()
  const inicioDia = `${data}T00:00:00`
  const fimDia = `${data}T23:59:59`

  let consulta = supabase
    .from('consultas')
    .select(
      `
      *,
      paciente:pacientes(id, nome, telefone, foto_url),
      medico:medicos(id, nome, cor_agenda, especialidade),
      sala:salas(id, nome),
      tipo_consulta:tipos_consulta(id, nome, cor, duracao_minutos)
    `
    )
    .eq('clinica_id', clinicaId)
    .gte('data_hora_inicio', inicioDia)
    .lte('data_hora_inicio', fimDia)
    .not('status', 'in', '("cancelado")')
    .order('data_hora_inicio', { ascending: true })

  if (medicoId) {
    consulta = consulta.eq('medico_id', medicoId)
  }

  const { data: dados, error } = await consulta
  if (error) throw new Error(`Erro ao buscar consultas do dia: ${error.message}`)

  return (dados as ConsultaComRelacoes[]) || []
}

/**
 * Busca uma consulta específica pelo ID
 */
export async function buscarConsultaPorId(
  id: string,
  clinicaId: string
): Promise<ConsultaComRelacoes | null> {
  const supabase = criarClienteServidor()

  const { data, error } = await supabase
    .from('consultas')
    .select(
      `
      *,
      paciente:pacientes(*),
      medico:medicos(*),
      sala:salas(*),
      tipo_consulta:tipos_consulta(*)
    `
    )
    .eq('id', id)
    .eq('clinica_id', clinicaId)
    .single()

  if (error) return null
  return data as ConsultaComRelacoes
}

/**
 * Cria um novo agendamento
 */
export async function criarConsulta(
  clinicaId: string,
  formulario: FormularioNovaConsulta,
  criadoPor?: string
): Promise<Consulta> {
  const supabase = criarClienteServidor()

  // Calcular horário de fim com base na duração
  const inicio = new Date(formulario.data_hora_inicio)
  const fim = new Date(inicio.getTime() + formulario.duracao_minutos * 60 * 1000)

  const { data, error } = await supabase
    .from('consultas')
    .insert({
      clinica_id: clinicaId,
      paciente_id: formulario.paciente_id,
      medico_id: formulario.medico_id,
      sala_id: formulario.sala_id,
      tipo_consulta_id: formulario.tipo_consulta_id,
      data_hora_inicio: formulario.data_hora_inicio,
      data_hora_fim: fim.toISOString(),
      tipo: formulario.tipo,
      valor: formulario.valor,
      observacoes: formulario.observacoes,
      criado_por: criadoPor,
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar consulta: ${error.message}`)
  return data as Consulta
}

/**
 * Atualiza o status de uma consulta
 */
export async function atualizarStatusConsulta(
  id: string,
  clinicaId: string,
  novoStatus: StatusConsulta,
  opcoes?: {
    motivo_cancelamento?: string
  }
): Promise<void> {
  const supabase = criarClienteServidor()

  const atualizacao: Record<string, unknown> = {
    status: novoStatus,
    atualizado_em: new Date().toISOString(),
  }

  if (novoStatus === 'cancelado') {
    atualizacao.cancelado_em = new Date().toISOString()
    if (opcoes?.motivo_cancelamento) {
      atualizacao.motivo_cancelamento = opcoes.motivo_cancelamento
    }
  }

  if (novoStatus === 'confirmado') {
    atualizacao.confirmado_em = new Date().toISOString()
  }

  const { error } = await supabase
    .from('consultas')
    .update(atualizacao)
    .eq('id', id)
    .eq('clinica_id', clinicaId)

  if (error) throw new Error(`Erro ao atualizar status da consulta: ${error.message}`)
}

/**
 * Atualiza dados clínicos de uma consulta (prontuário)
 */
export async function atualizarDadosConsulta(
  id: string,
  clinicaId: string,
  dados: Partial<Pick<Consulta, 'anamnese' | 'diagnostico' | 'prescricao' | 'observacoes' | 'valor'>>
): Promise<void> {
  const supabase = criarClienteServidor()

  const { error } = await supabase
    .from('consultas')
    .update({ ...dados, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('clinica_id', clinicaId)

  if (error) throw new Error(`Erro ao atualizar consulta: ${error.message}`)
}

/**
 * Verifica conflitos de horário para um médico
 */
export async function verificarConflitosHorario(
  clinicaId: string,
  medicoId: string,
  dataHoraInicio: string,
  dataHoraFim: string,
  consultaIdExcluir?: string
): Promise<boolean> {
  const supabase = criarClienteServidor()

  let consulta = supabase
    .from('consultas')
    .select('id')
    .eq('clinica_id', clinicaId)
    .eq('medico_id', medicoId)
    .not('status', 'in', '("cancelado","faltou")')
    .or(
      `and(data_hora_inicio.lt.${dataHoraFim},data_hora_fim.gt.${dataHoraInicio})`
    )

  if (consultaIdExcluir) {
    consulta = consulta.neq('id', consultaIdExcluir)
  }

  const { data, error } = await consulta
  if (error) return false

  return (data?.length || 0) > 0
}

/**
 * Busca consultas próximas sem lembrete enviado (para automações)
 */
export async function buscarConsultasSemLembrete(
  horasAntecedencia: number
): Promise<ConsultaComRelacoes[]> {
  const supabase = criarClienteServidor()

  const agora = new Date()
  const limite = new Date(agora.getTime() + horasAntecedencia * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('consultas')
    .select(
      `
      *,
      paciente:pacientes(id, nome, telefone_whatsapp, email),
      medico:medicos(id, nome),
      clinica:clinicas(id, nome, configuracoes)
    `
    )
    .eq('lembrete_enviado', false)
    .in('status', ['agendado', 'confirmado'])
    .gte('data_hora_inicio', agora.toISOString())
    .lte('data_hora_inicio', limite.toISOString())

  if (error) return []
  return (data as ConsultaComRelacoes[]) || []
}

/**
 * Busca métricas de consultas para o dashboard
 */
export async function buscarMetricasConsultas(
  clinicaId: string,
  dataInicio: string,
  dataFim: string
): Promise<{
  total: number
  por_status: Record<string, number>
  taxa_comparecimento: number
}> {
  const supabase = criarClienteServidor()

  const { data, error } = await supabase
    .from('consultas')
    .select('status')
    .eq('clinica_id', clinicaId)
    .gte('data_hora_inicio', dataInicio)
    .lte('data_hora_inicio', dataFim)

  if (error || !data) {
    return { total: 0, por_status: {}, taxa_comparecimento: 0 }
  }

  const porStatus: Record<string, number> = {}
  data.forEach(({ status }) => {
    porStatus[status] = (porStatus[status] || 0) + 1
  })

  const total = data.length
  const compareceu = (porStatus['concluido'] || 0) + (porStatus['em_atendimento'] || 0)
  const taxaComparecimento = total > 0 ? (compareceu / total) * 100 : 0

  return {
    total,
    por_status: porStatus,
    taxa_comparecimento: Math.round(taxaComparecimento * 10) / 10,
  }
}
