// ============================================================
// CLINIO - Serviço de Automações
// Lógica para automações de comunicação com pacientes
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import { buscarConsultasSemLembrete } from '@/servicos/consultas'
import { buscarAniversariantes, buscarPacientesParaReativacao } from '@/servicos/pacientes'
import { processarTemplateMensagem, formatarData, formatarHora } from '@/lib/formatadores'
import type { Automacao, Mensagem, CanalComunicacao } from '@/tipos'

/**
 * Busca automações ativas de uma clínica
 */
export async function buscarAutomacoesAtivas(clinicaId: string): Promise<Automacao[]> {
  const supabase = criarClienteServidor()

  const { data, error } = await supabase
    .from('automacoes')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('ativa', true)
    .order('nome')

  if (error) return []
  return (data as Automacao[]) || []
}

/**
 * Processa os lembretes de consultas agendadas
 * Deve ser executado periodicamente (ex: a cada hora via cron)
 */
export async function processarLembretesConsultas(): Promise<{
  processadas: number
  erros: number
}> {
  const supabase = criarClienteServidor()
  let processadas = 0
  let erros = 0

  // Buscar consultas das próximas 24h sem lembrete enviado
  const consultas = await buscarConsultasSemLembrete(24)

  for (const consulta of consultas) {
    try {
      // Buscar automação de lembrete da clínica
      const { data: automacoes } = await supabase
        .from('automacoes')
        .select('*')
        .eq('clinica_id', (consulta as any).clinica?.id || consulta.clinica_id)
        .eq('tipo', 'lembrete_consulta')
        .eq('ativa', true)
        .limit(1)

      if (!automacoes || automacoes.length === 0) continue

      const automacao = automacoes[0] as Automacao
      const paciente = (consulta as any).paciente

      if (!paciente) continue

      // Processar o template com as variáveis da consulta
      const variaveis = {
        nome: paciente.nome,
        data: formatarData(consulta.data_hora_inicio),
        hora: formatarHora(consulta.data_hora_inicio),
        medico: (consulta as any).medico?.nome || '',
        clinica: (consulta as any).clinica?.nome || '',
      }

      const conteudo = processarTemplateMensagem(automacao.mensagem_template, variaveis)

      // Registrar a mensagem para envio
      await supabase.from('mensagens').insert({
        clinica_id: consulta.clinica_id,
        paciente_id: consulta.paciente_id,
        consulta_id: consulta.id,
        automacao_id: automacao.id,
        canal: automacao.canal,
        conteudo,
        status: 'pendente',
      })

      // Marcar consulta como lembrete enviado
      await supabase
        .from('consultas')
        .update({ lembrete_enviado: true })
        .eq('id', consulta.id)

      // Incrementar contador da automação
      await supabase
        .from('automacoes')
        .update({ executada_total: automacao.executada_total + 1 })
        .eq('id', automacao.id)

      processadas++
    } catch (erro) {
      console.error(`Erro ao processar lembrete para consulta ${consulta.id}:`, erro)
      erros++
    }
  }

  return { processadas, erros }
}

/**
 * Processa mensagens de reativação para pacientes inativos
 */
export async function processarReativacaoPacientes(
  clinicaId: string
): Promise<number> {
  const supabase = criarClienteServidor()

  // Buscar automação de reativação
  const { data: automacoes } = await supabase
    .from('automacoes')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('tipo', 'reativacao_paciente')
    .eq('ativa', true)
    .limit(1)

  if (!automacoes || automacoes.length === 0) return 0

  const automacao = automacoes[0] as Automacao

  // Buscar pacientes para reativação (sem consulta há 90+ dias)
  const pacientes = await buscarPacientesParaReativacao(clinicaId, 90)

  let enviadas = 0

  for (const paciente of pacientes) {
    // Verificar se já enviamos mensagem de reativação recentemente
    const { data: mensagensRecentes } = await supabase
      .from('mensagens')
      .select('id')
      .eq('paciente_id', paciente.id)
      .eq('automacao_id', automacao.id)
      .gte('criado_em', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1)

    if (mensagensRecentes && mensagensRecentes.length > 0) continue

    const variaveis = {
      nome: paciente.nome.split(' ')[0],  // Primeiro nome
      clinica: '',
    }

    const conteudo = processarTemplateMensagem(automacao.mensagem_template, variaveis)

    await supabase.from('mensagens').insert({
      clinica_id: clinicaId,
      paciente_id: paciente.id,
      automacao_id: automacao.id,
      canal: automacao.canal,
      conteudo,
      status: 'pendente',
    })

    enviadas++
  }

  return enviadas
}

/**
 * Processa mensagens de aniversário
 */
export async function processarAniversarios(clinicaId: string): Promise<number> {
  const supabase = criarClienteServidor()

  const hoje = new Date()
  const diaHoje = hoje.getDate()
  const mesHoje = hoje.getMonth() + 1

  // Buscar automação de aniversário
  const { data: automacoes } = await supabase
    .from('automacoes')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('tipo', 'aniversario')
    .eq('ativa', true)
    .limit(1)

  if (!automacoes || automacoes.length === 0) return 0

  const automacao = automacoes[0] as Automacao

  // Buscar aniversariantes de hoje
  const aniversariantes = await buscarAniversariantes(clinicaId, mesHoje)
  const deHoje = aniversariantes.filter((p) => {
    if (!p.data_nascimento) return false
    return new Date(p.data_nascimento).getDate() === diaHoje
  })

  let enviadas = 0

  for (const paciente of deHoje) {
    // Verificar se já enviamos hoje
    const { data: jaEnviou } = await supabase
      .from('mensagens')
      .select('id')
      .eq('paciente_id', paciente.id)
      .eq('automacao_id', automacao.id)
      .gte('criado_em', new Date(hoje.setHours(0, 0, 0, 0)).toISOString())
      .limit(1)

    if (jaEnviou && jaEnviou.length > 0) continue

    const variaveis = { nome: paciente.nome.split(' ')[0] }
    const conteudo = processarTemplateMensagem(automacao.mensagem_template, variaveis)

    await supabase.from('mensagens').insert({
      clinica_id: clinicaId,
      paciente_id: paciente.id,
      automacao_id: automacao.id,
      canal: automacao.canal,
      conteudo,
      status: 'pendente',
    })

    enviadas++
  }

  return enviadas
}

