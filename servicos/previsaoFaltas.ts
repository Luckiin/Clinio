// ============================================================
// CLINIO - Serviço de Previsão de Faltas (IA)
// Algoritmo para prever probabilidade de falta em consultas
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import type { FatoresPrevisao, PrevisaoFalta } from '@/tipos'

/**
 * Calcula a probabilidade de falta para uma consulta
 * Usa um modelo simples baseado em regras e histórico
 */
export function calcularProbabilidadeFalta(fatores: FatoresPrevisao): number {
  let probabilidade = 0.15 // Probabilidade base de 15%

  // === Fator: Histórico de faltas do paciente ===
  // Cada falta anterior aumenta a probabilidade
  if (fatores.historico_faltas >= 3) probabilidade += 0.30
  else if (fatores.historico_faltas === 2) probabilidade += 0.20
  else if (fatores.historico_faltas === 1) probabilidade += 0.10

  // === Fator: Dias até a consulta ===
  // Consultas muito à frente têm maior probabilidade de cancelamento
  if (fatores.dias_ate_consulta > 14) probabilidade += 0.10
  else if (fatores.dias_ate_consulta > 7) probabilidade += 0.05
  else if (fatores.dias_ate_consulta === 0) probabilidade -= 0.05 // Dia da consulta

  // === Fator: Dia da semana ===
  // Segundas e sextas têm mais faltas (início/fim de semana)
  if (fatores.dia_semana === 1 || fatores.dia_semana === 5) probabilidade += 0.05
  // Finais de semana têm mais faltas
  if (fatores.dia_semana === 0 || fatores.dia_semana === 6) probabilidade += 0.08

  // === Fator: Horário ===
  // Horários extremos têm mais faltas (muito cedo ou tarde)
  const hora = parseInt(fatores.horario.split(':')[0])
  if (hora < 8 || hora >= 18) probabilidade += 0.08
  else if (hora >= 12 && hora < 14) probabilidade += 0.05 // Horário de almoço

  // === Fator: Confirmação ===
  // Paciente que confirmou tem menor probabilidade de faltar
  if (fatores.confirmado) probabilidade -= 0.15

  // === Fator: Distância ===
  if (fatores.distancia) {
    if (fatores.distancia > 20) probabilidade += 0.08
    else if (fatores.distancia > 10) probabilidade += 0.04
  }

  // Garantir que a probabilidade fique entre 0 e 1
  return Math.max(0, Math.min(1, probabilidade))
}

/**
 * Classifica o risco de falta
 */
export function classificarRiscoFalta(probabilidade: number): {
  nivel: 'baixo' | 'medio' | 'alto'
  descricao: string
  cor: string
} {
  if (probabilidade >= 0.6) {
    return { nivel: 'alto', descricao: 'Alto risco de falta', cor: '#EF4444' }
  } else if (probabilidade >= 0.35) {
    return { nivel: 'medio', descricao: 'Risco moderado de falta', cor: '#F59E0B' }
  } else {
    return { nivel: 'baixo', descricao: 'Baixo risco de falta', cor: '#10B981' }
  }
}

/**
 * Gera previsões de falta para as consultas de amanhã
 */
export async function gerarPrevisoesFaltasAmanha(clinicaId: string): Promise<void> {
  const supabase = criarClienteServidor()

  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  const dataAmanha = amanha.toISOString().split('T')[0]

  // Buscar consultas de amanhã
  const { data: consultas } = await supabase
    .from('consultas')
    .select('*, paciente:pacientes(*)')
    .eq('clinica_id', clinicaId)
    .gte('data_hora_inicio', `${dataAmanha}T00:00:00`)
    .lte('data_hora_inicio', `${dataAmanha}T23:59:59`)
    .in('status', ['agendado', 'confirmado'])

  if (!consultas) return

  for (const consulta of consultas) {
    const paciente = (consulta as any).paciente

    // Contar faltas anteriores do paciente
    const { count: totalFaltas } = await supabase
      .from('consultas')
      .select('id', { count: 'exact', head: true })
      .eq('paciente_id', consulta.paciente_id)
      .eq('status', 'faltou')

    const dataConsulta = new Date(consulta.data_hora_inicio)
    const agora = new Date()
    const diasAteConsulta = Math.floor(
      (dataConsulta.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
    )

    const fatores: FatoresPrevisao = {
      historico_faltas: totalFaltas || 0,
      dias_ate_consulta: diasAteConsulta,
      dia_semana: dataConsulta.getDay(),
      horario: `${dataConsulta.getHours().toString().padStart(2, '0')}:${dataConsulta
        .getMinutes()
        .toString()
        .padStart(2, '0')}`,
      confirmado: consulta.status === 'confirmado',
    }

    const probabilidade = calcularProbabilidadeFalta(fatores)

    // Salvar previsão apenas se probabilidade for relevante (> 30%)
    if (probabilidade >= 0.3) {
      await supabase.from('previsoes_faltas').upsert({
        clinica_id: clinicaId,
        consulta_id: consulta.id,
        paciente_id: consulta.paciente_id,
        probabilidade_falta: probabilidade,
        fatores,
      })
    }
  }
}

/**
 * Busca consultas com alto risco de falta para o painel
 */
export interface ConsultaAltoRisco {
  consulta_id: string
  paciente_id: string
  paciente_nome: string
  paciente_telefone?: string
  medico_nome?: string
  data_hora_inicio: string
  hora: string
  probabilidade: number
  nivel_risco: string
  fatores_risco: string[]
}

export async function buscarConsultasAltoRisco(
  clinicaId: string,
  data: string,
  limiarMinimo = 40   // % mínimo de probabilidade
): Promise<ConsultaAltoRisco[]> {
  const supabase = criarClienteServidor()

  // Tentar buscar previsões geradas (tabela previsoes_faltas)
  const { data: previsoes } = await supabase
    .from('previsoes_faltas')
    .select(`
      consulta_id,
      probabilidade_falta,
      fatores_risco,
      consulta:consultas(
        data_hora_inicio,
        paciente_id,
        paciente:pacientes(nome, telefone),
        medico:medicos(nome)
      )
    `)
    .eq('clinica_id', clinicaId)
    .gte('probabilidade_falta', limiarMinimo / 100)
    .order('probabilidade_falta', { ascending: false })
    .limit(20)

  if (previsoes && previsoes.length > 0) {
    return previsoes.map((p: any) => ({
      consulta_id: p.consulta_id,
      paciente_id: p.consulta?.paciente_id || '',
      paciente_nome: p.consulta?.paciente?.nome || 'Paciente',
      paciente_telefone: p.consulta?.paciente?.telefone,
      medico_nome: p.consulta?.medico?.nome,
      data_hora_inicio: p.consulta?.data_hora_inicio,
      hora: new Date(p.consulta?.data_hora_inicio).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit',
      }),
      probabilidade: Math.round(p.probabilidade_falta * 100),
      nivel_risco: classificarRiscoFalta(p.probabilidade_falta).nivel,
      fatores_risco: p.fatores_risco || [],
    }))
  }

  // Fallback: calcular em tempo real para consultas do dia sem previsão
  const { data: consultasDia } = await supabase
    .from('consultas')
    .select(`
      id,
      paciente_id,
      medico_id,
      data_hora_inicio,
      status,
      paciente:pacientes(nome, telefone),
      medico:medicos(nome)
    `)
    .eq('clinica_id', clinicaId)
    .gte('data_hora_inicio', `${data}T00:00:00`)
    .lte('data_hora_inicio', `${data}T23:59:59`)
    .in('status', ['agendado', 'confirmado'])
    .order('data_hora_inicio')

  if (!consultasDia?.length) return []

  const resultados: ConsultaAltoRisco[] = []

  for (const c of consultasDia) {
    const dataHora = new Date(c.data_hora_inicio)
    const diaSemana = dataHora.getDay()
    const hora = dataHora.getHours()

    // Buscar histórico simplificado de faltas do paciente
    const { count: totalConsultas } = await supabase
      .from('consultas')
      .select('id', { count: 'exact', head: true })
      .eq('paciente_id', c.paciente_id)
      .lt('data_hora_inicio', c.data_hora_inicio)

    const { count: totalFaltas } = await supabase
      .from('consultas')
      .select('id', { count: 'exact', head: true })
      .eq('paciente_id', c.paciente_id)
      .eq('status', 'faltou')
      .lt('data_hora_inicio', c.data_hora_inicio)

    const taxaFaltaHistorica = totalConsultas ? (totalFaltas || 0) / totalConsultas : 0

    const probabilidade = calcularProbabilidadeFalta({
      historico_faltas: totalFaltas || 0,
      dias_ate_consulta: 0, // Fallback para consultas do dia
      dia_semana: diaSemana,
      horario: `${String(dataHora.getHours()).padStart(2, '0')}:${String(dataHora.getMinutes()).padStart(2, '0')}`,
      confirmado: c.status === 'confirmado',
    })

    const probPct = Math.round(probabilidade * 100)
    if (probPct >= limiarMinimo) {
      const fatores: string[] = []
      if (taxaFaltaHistorica > 0.3) fatores.push(`${Math.round(taxaFaltaHistorica * 100)}% de faltas no histórico`)
      if ([1, 2, 3, 4, 5].includes(diaSemana) && hora < 9) fatores.push('Horário de manhã cedo')
      if (diaSemana === 5) fatores.push('Sexta-feira')
      if (c.status !== 'confirmado') fatores.push('Não confirmado')

      resultados.push({
        consulta_id: c.id,
        paciente_id: c.paciente_id,
        paciente_nome: (c.paciente as any)?.nome || 'Paciente',
        paciente_telefone: (c.paciente as any)?.telefone,
        medico_nome: (c.medico as any)?.nome,
        data_hora_inicio: c.data_hora_inicio,
        hora: dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        probabilidade: probPct,
        nivel_risco: classificarRiscoFalta(probabilidade).nivel,
        fatores_risco: fatores,
      })
    }
  }

  return resultados.sort((a, b) => b.probabilidade - a.probabilidade)
}
