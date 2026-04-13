// ============================================================
// CLINIO - Motor de Automações Baseado em Eventos
// Eventos → Condições → Ações
//
// Eventos suportados:
//   consulta_criada | consulta_amanha | consulta_hoje
//   consulta_cancelada | aniversario_paciente | paciente_inativo
//
// Ações suportadas:
//   enviar_mensagem | criar_tarefa | disparar_campanha
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import { processarTemplateMensagem } from '@/lib/formatadores'

// ─── Tipos ────────────────────────────────────────────────────

export type EventoAutomacao =
  | 'consulta_criada'
  | 'consulta_amanha'
  | 'consulta_hoje'
  | 'consulta_cancelada'
  | 'aniversario_paciente'
  | 'paciente_inativo'

export type AcaoAutomacao =
  | 'enviar_mensagem'
  | 'criar_tarefa'
  | 'disparar_campanha'

export interface ContextoEvento {
  clinica_id: string
  paciente_id?: string
  consulta_id?: string
  medico_id?: string
  dados_extras?: Record<string, any>
}

export interface ResultadoExecucao {
  automacao_id: string
  automacao_nome: string
  sucesso: boolean
  acao: AcaoAutomacao
  mensagem?: string
  erro?: string
}

// ─── Dispatcher principal ─────────────────────────────────────
// Chamado quando um evento ocorre. Busca automações ativas
// para o evento e executa cada ação configurada.
export async function dispararEvento(
  evento: EventoAutomacao,
  contexto: ContextoEvento
): Promise<ResultadoExecucao[]> {
  const supabase = criarClienteServidor()

  // Buscar automações ativas para este evento
  const { data: automacoes } = await supabase
    .from('automacoes')
    .select('*')
    .eq('clinica_id', contexto.clinica_id)
    .eq('ativa', true)
    .eq('evento_gatilho', evento)

  if (!automacoes?.length) return []

  const resultados: ResultadoExecucao[] = []

  for (const automacao of automacoes) {
    // Verificar condições (se houver)
    const condicoesOk = await verificarCondicoes(automacao.condicoes, contexto)
    if (!condicoesOk) continue

    // Verificar delay configurado (ex: enviar 24h antes)
    if (automacao.delay_horas) {
      await agendarExecucaoComDelay(automacao, contexto)
      resultados.push({
        automacao_id: automacao.id,
        automacao_nome: automacao.nome,
        sucesso: true,
        acao: automacao.acao,
        mensagem: `Agendada para execução em ${automacao.delay_horas}h`,
      })
      continue
    }

    // Executar imediatamente
    const resultado = await executarAcao(automacao, contexto)
    resultados.push(resultado)

    // Registrar execução no histórico
    await registrarExecucao(automacao.id, contexto, resultado)
  }

  return resultados
}

// ─── Verificar condições da automação ────────────────────────
async function verificarCondicoes(
  condicoes: Record<string, any> | null,
  contexto: ContextoEvento
): Promise<boolean> {
  if (!condicoes || Object.keys(condicoes).length === 0) return true

  const supabase = criarClienteServidor()

  // Condição: só executar se paciente não recebeu mensagem nas últimas N horas
  if (condicoes.sem_mensagem_ultimas_horas && contexto.paciente_id) {
    const limite = new Date(Date.now() - condicoes.sem_mensagem_ultimas_horas * 3600000).toISOString()
    const { count } = await supabase
      .from('mensagens')
      .select('id', { count: 'exact', head: true })
      .eq('paciente_id', contexto.paciente_id)
      .gte('criado_em', limite)
    if ((count || 0) > 0) return false
  }

  // Condição: status da consulta
  if (condicoes.status_consulta && contexto.consulta_id) {
    const { data: c } = await supabase
      .from('consultas')
      .select('status')
      .eq('id', contexto.consulta_id)
      .single()
    if (c?.status !== condicoes.status_consulta) return false
  }

  // Condição: dias sem consulta (para paciente_inativo)
  if (condicoes.dias_sem_consulta && contexto.paciente_id) {
    const limite = new Date(Date.now() - condicoes.dias_sem_consulta * 86400000).toISOString()
    const { data: ultima } = await supabase
      .from('consultas')
      .select('data_hora_inicio')
      .eq('paciente_id', contexto.paciente_id)
      .not('status', 'in', '("cancelado","faltou")')
      .order('data_hora_inicio', { ascending: false })
      .limit(1)
      .single()
    if (!ultima || ultima.data_hora_inicio > limite) return false
  }

  return true
}

// ─── Executar ação ────────────────────────────────────────────
async function executarAcao(
  automacao: any,
  contexto: ContextoEvento
): Promise<ResultadoExecucao> {
  try {
    switch (automacao.acao as AcaoAutomacao) {
      case 'enviar_mensagem':
        return await acaoEnviarMensagem(automacao, contexto)
      case 'criar_tarefa':
        return await acaoCriarTarefa(automacao, contexto)
      case 'disparar_campanha':
        return await acaoDispararCampanha(automacao, contexto)
      default:
        return {
          automacao_id: automacao.id,
          automacao_nome: automacao.nome,
          sucesso: false,
          acao: automacao.acao,
          erro: `Ação desconhecida: ${automacao.acao}`,
        }
    }
  } catch (err: any) {
    return {
      automacao_id: automacao.id,
      automacao_nome: automacao.nome,
      sucesso: false,
      acao: automacao.acao,
      erro: err.message,
    }
  }
}

// ─── Ação: Enviar Mensagem ────────────────────────────────────
async function acaoEnviarMensagem(
  automacao: any,
  contexto: ContextoEvento
): Promise<ResultadoExecucao> {
  const supabase = criarClienteServidor()

  // Montar variáveis do template
  let variaveis: Record<string, string> = {}

  if (contexto.paciente_id) {
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('nome, telefone, data_nascimento')
      .eq('id', contexto.paciente_id)
      .single()

    if (!paciente?.telefone) {
      return {
        automacao_id: automacao.id,
        automacao_nome: automacao.nome,
        sucesso: false,
        acao: 'enviar_mensagem',
        erro: 'Paciente sem telefone cadastrado',
      }
    }

    variaveis.nome_paciente = paciente.nome
    variaveis.telefone = paciente.telefone
  }

  if (contexto.consulta_id) {
    const { data: consulta } = await supabase
      .from('consultas')
      .select('data_hora_inicio, data_hora_fim, medico:medicos(nome), tipo_consulta:tipos_consulta(nome)')
      .eq('id', contexto.consulta_id)
      .single()

    if (consulta) {
      const dt = new Date(consulta.data_hora_inicio)
      variaveis.data_consulta = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
      variaveis.hora_consulta = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      variaveis.medico = (consulta.medico as any)?.nome || ''
      variaveis.tipo_consulta = (consulta.tipo_consulta as any)?.nome || ''
    }
  }

  // Adicionar extras do contexto
  if (contexto.dados_extras) {
    Object.assign(variaveis, contexto.dados_extras)
  }

  // Processar template da mensagem
  const conteudo = processarTemplateMensagem(
    automacao.configuracao?.template || automacao.template_mensagem || '',
    variaveis
  )

  // Inserir mensagem na fila de envio
  const { error } = await supabase.from('mensagens').insert({
    clinica_id: contexto.clinica_id,
    paciente_id: contexto.paciente_id,
    canal: automacao.configuracao?.canal || 'whatsapp',
    direcao: 'saida',
    conteudo,
    status: 'pendente',
    origem: 'automacao',
    referencia_id: automacao.id,
  })

  if (error) throw new Error(error.message)

  return {
    automacao_id: automacao.id,
    automacao_nome: automacao.nome,
    sucesso: true,
    acao: 'enviar_mensagem',
    mensagem: `Mensagem enfileirada para ${variaveis.telefone || 'paciente'}`,
  }
}

// ─── Ação: Criar Tarefa ───────────────────────────────────────
async function acaoCriarTarefa(
  automacao: any,
  contexto: ContextoEvento
): Promise<ResultadoExecucao> {
  const supabase = criarClienteServidor()

  const config = automacao.configuracao || {}
  const vencimentoHoras = config.vencimento_horas || 24
  const vencimento = new Date(Date.now() + vencimentoHoras * 3600000).toISOString()

  await supabase.from('notificacoes').insert({
    clinica_id: contexto.clinica_id,
    tipo: 'tarefa',
    titulo: config.titulo || automacao.nome,
    mensagem: config.descricao || `Tarefa gerada por: ${automacao.nome}`,
    referencia_tipo: contexto.consulta_id ? 'consulta' : contexto.paciente_id ? 'paciente' : null,
    referencia_id: contexto.consulta_id || contexto.paciente_id || null,
    vencimento_em: vencimento,
    lida: false,
  })

  return {
    automacao_id: automacao.id,
    automacao_nome: automacao.nome,
    sucesso: true,
    acao: 'criar_tarefa',
    mensagem: `Tarefa criada: ${config.titulo || automacao.nome}`,
  }
}

// ─── Ação: Disparar Campanha ──────────────────────────────────
async function acaoDispararCampanha(
  automacao: any,
  contexto: ContextoEvento
): Promise<ResultadoExecucao> {
  const supabase = criarClienteServidor()
  const config = automacao.configuracao || {}

  if (!config.campanha_id) {
    throw new Error('campanha_id não configurado na automação')
  }

  // Ativar campanha ou adicionar paciente à campanha
  if (contexto.paciente_id) {
    await supabase.from('mensagens').insert({
      clinica_id: contexto.clinica_id,
      paciente_id: contexto.paciente_id,
      canal: 'whatsapp',
      direcao: 'saida',
      conteudo: '',           // preenchido pelo processador da campanha
      status: 'pendente',
      origem: 'campanha_automacao',
      referencia_id: config.campanha_id,
    })
  }

  return {
    automacao_id: automacao.id,
    automacao_nome: automacao.nome,
    sucesso: true,
    acao: 'disparar_campanha',
    mensagem: `Paciente adicionado à campanha ${config.campanha_id}`,
  }
}

// ─── Agendar execução com delay ───────────────────────────────
async function agendarExecucaoComDelay(
  automacao: any,
  contexto: ContextoEvento
): Promise<void> {
  const supabase = criarClienteServidor()
  const executarEm = new Date(Date.now() + automacao.delay_horas * 3600000).toISOString()

  await supabase.from('execucoes_automacoes').insert({
    automacao_id: automacao.id,
    clinica_id: contexto.clinica_id,
    paciente_id: contexto.paciente_id,
    consulta_id: contexto.consulta_id,
    status: 'agendada',
    executar_em: executarEm,
    contexto: contexto.dados_extras || {},
  })
}

// ─── Registrar execução no histórico ─────────────────────────
async function registrarExecucao(
  automacaoId: string,
  contexto: ContextoEvento,
  resultado: ResultadoExecucao
): Promise<void> {
  const supabase = criarClienteServidor()
  await supabase.from('execucoes_automacoes').insert({
    automacao_id: automacaoId,
    clinica_id: contexto.clinica_id,
    paciente_id: contexto.paciente_id,
    consulta_id: contexto.consulta_id,
    status: resultado.sucesso ? 'concluida' : 'erro',
    executado_em: new Date().toISOString(),
    resultado: { mensagem: resultado.mensagem, erro: resultado.erro },
    contexto: contexto.dados_extras || {},
  })
}

// ═══════════════════════════════════════════════════════════════
// PROCESSADORES AGENDADOS (rodam via cron/scheduled tasks)
// ═══════════════════════════════════════════════════════════════

// ─── Processar consultas de amanhã ────────────────────────────
export async function processarConsultasAmanha(): Promise<{ total: number; disparados: number }> {
  const supabase = criarClienteServidor()
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  const dataStr = amanha.toISOString().split('T')[0]

  const { data: consultas } = await supabase
    .from('consultas')
    .select('id, clinica_id, paciente_id, medico_id')
    .gte('data_hora_inicio', `${dataStr}T00:00:00`)
    .lte('data_hora_inicio', `${dataStr}T23:59:59`)
    .in('status', ['agendado', 'confirmado'])
    .is('lembrete_enviado_em', null)

  let disparados = 0
  for (const c of consultas || []) {
    const resultados = await dispararEvento('consulta_amanha', {
      clinica_id: c.clinica_id,
      paciente_id: c.paciente_id,
      consulta_id: c.id,
      medico_id: c.medico_id,
    })
    if (resultados.some((r) => r.sucesso)) {
      await supabase
        .from('consultas')
        .update({ lembrete_enviado_em: new Date().toISOString() })
        .eq('id', c.id)
      disparados++
    }
  }
  return { total: consultas?.length || 0, disparados }
}

// ─── Processar consultas de hoje ─────────────────────────────
export async function processarConsultasHoje(): Promise<{ total: number; disparados: number }> {
  const supabase = criarClienteServidor()
  const hoje = new Date().toISOString().split('T')[0]

  const { data: consultas } = await supabase
    .from('consultas')
    .select('id, clinica_id, paciente_id, medico_id')
    .gte('data_hora_inicio', `${hoje}T00:00:00`)
    .lte('data_hora_inicio', `${hoje}T23:59:59`)
    .in('status', ['agendado', 'confirmado'])

  let disparados = 0
  for (const c of consultas || []) {
    const resultados = await dispararEvento('consulta_hoje', {
      clinica_id: c.clinica_id,
      paciente_id: c.paciente_id,
      consulta_id: c.id,
    })
    if (resultados.some((r) => r.sucesso)) disparados++
  }
  return { total: consultas?.length || 0, disparados }
}

// ─── Processar aniversariantes do dia ────────────────────────
export async function processarAniversariantes(): Promise<{ total: number; disparados: number }> {
  const supabase = criarClienteServidor()
  const hoje = new Date()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')

  // Buscar pacientes com aniversário hoje (comparar mês e dia do campo data_nascimento)
  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('id, clinica_id, nome')
    .not('data_nascimento', 'is', null)
    .like('data_nascimento', `%-${mes}-${dia}`)

  let disparados = 0
  for (const p of pacientes || []) {
    const resultados = await dispararEvento('aniversario_paciente', {
      clinica_id: p.clinica_id,
      paciente_id: p.id,
      dados_extras: { nome_paciente: p.nome },
    })
    if (resultados.some((r) => r.sucesso)) disparados++
  }
  return { total: pacientes?.length || 0, disparados }
}

// ─── Processar pacientes inativos (6+ meses sem consulta) ────
export async function processarPacientesInativos(
  diasSemConsulta = 180
): Promise<{ total: number; disparados: number }> {
  const supabase = criarClienteServidor()
  const limite = new Date(Date.now() - diasSemConsulta * 86400000).toISOString()

  // Pacientes cuja última consulta foi antes do limite
  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('id, clinica_id, nome')
    .eq('ativo', true)
    .lt('ultima_consulta_em', limite)

  let disparados = 0
  for (const p of pacientes || []) {
    const resultados = await dispararEvento('paciente_inativo', {
      clinica_id: p.clinica_id,
      paciente_id: p.id,
      dados_extras: { dias_sem_consulta: diasSemConsulta },
    })
    if (resultados.some((r) => r.sucesso)) disparados++
  }
  return { total: pacientes?.length || 0, disparados }
}

// ─── Processar execuções agendadas com delay ─────────────────
export async function processarExecucoesAgendadas(): Promise<{ processadas: number }> {
  const supabase = criarClienteServidor()
  const agora = new Date().toISOString()

  const { data: execucoes } = await supabase
    .from('execucoes_automacoes')
    .select('*, automacao:automacoes(*)')
    .eq('status', 'agendada')
    .lte('executar_em', agora)
    .limit(50)

  let processadas = 0
  for (const exec of execucoes || []) {
    const contexto: ContextoEvento = {
      clinica_id: exec.clinica_id,
      paciente_id: exec.paciente_id,
      consulta_id: exec.consulta_id,
      dados_extras: exec.contexto,
    }
    const resultado = await executarAcao(exec.automacao, contexto)
    await supabase
      .from('execucoes_automacoes')
      .update({
        status: resultado.sucesso ? 'concluida' : 'erro',
        executado_em: new Date().toISOString(),
        resultado: { mensagem: resultado.mensagem, erro: resultado.erro },
      })
      .eq('id', exec.id)
    processadas++
  }
  return { processadas }
}

// ─── Automações padrão para novas clínicas ───────────────────
export const AUTOMACOES_PADRAO = [
  {
    nome: 'Confirmação 24h antes',
    descricao: 'Envia mensagem de confirmação de consulta 24 horas antes do horário',
    evento_gatilho: 'consulta_amanha' as EventoAutomacao,
    acao: 'enviar_mensagem' as AcaoAutomacao,
    ativa: true,
    delay_horas: null,
    condicoes: { sem_mensagem_ultimas_horas: 20 },
    configuracao: {
      canal: 'whatsapp',
      template: 'Olá, {{nome_paciente}}! 😊 Sua consulta está marcada para *amanhã, {{data_consulta}} às {{hora_consulta}}*{{#medico}} com {{medico}}{{/medico}}. Por favor, confirme sua presença respondendo *SIM* ou nos avise se precisar remarcar.',
    },
  },
  {
    nome: 'Lembrete no dia',
    descricao: 'Envia lembrete no dia da consulta pela manhã',
    evento_gatilho: 'consulta_hoje' as EventoAutomacao,
    acao: 'enviar_mensagem' as AcaoAutomacao,
    ativa: true,
    delay_horas: null,
    condicoes: { sem_mensagem_ultimas_horas: 8 },
    configuracao: {
      canal: 'whatsapp',
      template: 'Bom dia, {{nome_paciente}}! 👋 Só lembrando que sua consulta é *hoje às {{hora_consulta}}*. Te esperamos! Se precisar de algo, estamos à disposição.',
    },
  },
  {
    nome: 'Mensagem de Aniversário',
    descricao: 'Envia felicitações no aniversário do paciente',
    evento_gatilho: 'aniversario_paciente' as EventoAutomacao,
    acao: 'enviar_mensagem' as AcaoAutomacao,
    ativa: true,
    delay_horas: null,
    condicoes: {},
    configuracao: {
      canal: 'whatsapp',
      template: '🎂 Feliz aniversário, {{nome_paciente}}! Toda a equipe deseja um dia muito especial e cheio de saúde. Você é muito importante para nós! 🎉',
    },
  },
  {
    nome: 'Reativação de Pacientes',
    descricao: 'Envia mensagem para pacientes sem consulta há 6 meses',
    evento_gatilho: 'paciente_inativo' as EventoAutomacao,
    acao: 'enviar_mensagem' as AcaoAutomacao,
    ativa: true,
    delay_horas: null,
    condicoes: { dias_sem_consulta: 180 },
    configuracao: {
      canal: 'whatsapp',
      template: 'Olá, {{nome_paciente}}! 💙 Sentimos sua falta! Faz um tempo que não te vemos por aqui. Que tal agendar uma consulta de revisão? Temos horários disponíveis e adoraríamos te atender novamente. Entre em contato conosco! 😊',
    },
  },
]
