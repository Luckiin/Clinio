// ============================================================
// CLINIO - Serviço de CRM
// Funções de acesso ao banco para o módulo de CRM
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import type {
  InteracaoPaciente,
  TagCRM,
  OportunidadePaciente,
  EtapaFunilPaciente,
  PontuacaoPaciente,
  Conversa,
  MensagemConversa,
  CampanhaCRM,
  EnvioCampanhaCRM,
  EventoTimeline,
  PerfilCompletoPaciente,
  MetricasCRM,
  RadarOportunidade,
  TipoInteracao,
  TipoOportunidade,
  StatusOportunidade,
  PrioridadeOportunidade,
  EtapaFunil,
  CanalConversa,
  TipoCampanhaCRM,
  StatusCampanhaCRM,
  CanalComunicacao,
  StatusPaciente,
  SexoPaciente,
} from '@/tipos'

// ─── INTERAÇÕES ──────────────────────────────────────────────

export async function listarInteracoes(
  clinicaId: string,
  pacienteId: string
): Promise<InteracaoPaciente[]> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('interacoes_paciente')
    .select(`
      *,
      usuario:usuarios(nome, avatar_url)
    `)
    .eq('clinica_id', clinicaId)
    .eq('paciente_id', pacienteId)
    .order('criado_em', { ascending: false })

  if (error) throw new Error(`Erro ao listar interações: ${error.message}`)
  return (data ?? []) as InteracaoPaciente[]
}

export async function criarInteracao(
  clinicaId: string,
  pacienteId: string,
  usuarioId: string,
  dados: { tipo_interacao: TipoInteracao; descricao: string }
): Promise<InteracaoPaciente> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('interacoes_paciente')
    .insert({
      clinica_id: clinicaId,
      paciente_id: pacienteId,
      usuario_id: usuarioId,
      tipo_interacao: dados.tipo_interacao,
      descricao: dados.descricao,
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar interação: ${error.message}`)
  return data as InteracaoPaciente
}

export async function excluirInteracao(clinicaId: string, id: string): Promise<void> {
  const supabase = criarClienteServidor()
  const { error } = await supabase
    .from('interacoes_paciente')
    .delete()
    .eq('clinica_id', clinicaId)
    .eq('id', id)

  if (error) throw new Error(`Erro ao excluir interação: ${error.message}`)
}

// ─── TAGS ────────────────────────────────────────────────────

export async function listarTagsPaciente(
  clinicaId: string,
  pacienteId: string
): Promise<TagCRM[]> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('tags_paciente')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('paciente_id', pacienteId)
    .order('criado_em', { ascending: true })

  if (error) throw new Error(`Erro ao listar tags: ${error.message}`)
  return (data ?? []) as TagCRM[]
}

export async function adicionarTag(
  clinicaId: string,
  pacienteId: string,
  tag: string,
  cor: string = '#3B82F6'
): Promise<TagCRM> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('tags_paciente')
    .insert({ clinica_id: clinicaId, paciente_id: pacienteId, tag, cor })
    .select()
    .single()

  if (error) throw new Error(`Erro ao adicionar tag: ${error.message}`)
  return data as TagCRM
}

export async function removerTag(clinicaId: string, id: string): Promise<void> {
  const supabase = criarClienteServidor()
  const { error } = await supabase
    .from('tags_paciente')
    .delete()
    .eq('clinica_id', clinicaId)
    .eq('id', id)

  if (error) throw new Error(`Erro ao remover tag: ${error.message}`)
}

export async function buscarTagsUnicas(clinicaId: string): Promise<string[]> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('tags_paciente')
    .select('tag')
    .eq('clinica_id', clinicaId)
    .order('tag')

  if (error) throw new Error(`Erro ao buscar tags: ${error.message}`)
  const unicas = Array.from(new Set((data ?? []).map((t: { tag: string }) => t.tag)))
  return unicas
}

export async function listarOportunidades(
  clinicaId: string,
  filtros?: {
    pacienteId?: string
    status?: StatusOportunidade
    prioridade?: PrioridadeOportunidade
    limite?: number
  }
): Promise<OportunidadePaciente[]> {
  const supabase = criarClienteServidor()
  let consulta = supabase
    .from('oportunidades_paciente')
    .select(`
      *,
      paciente:pacientes(id, nome, telefone, telefone_whatsapp, email, status),
      usuario_responsavel:usuarios(nome)
    `)
    .eq('clinica_id', clinicaId)
    .order('criado_em', { ascending: false })

  if (filtros?.pacienteId) consulta = consulta.eq('paciente_id', filtros.pacienteId)
  if (filtros?.status) consulta = consulta.eq('status', filtros.status)
  if (filtros?.prioridade) consulta = consulta.eq('prioridade', filtros.prioridade)
  if (filtros?.limite) consulta = consulta.limit(filtros.limite)

  const { data, error } = await consulta
  if (error) throw new Error(`Erro ao listar oportunidades: ${error.message}`)
  return (data ?? []) as OportunidadePaciente[]
}

export async function criarOportunidade(
  clinicaId: string,
  dados: {
    paciente_id: string
    usuario_responsavel_id?: string
    tipo_oportunidade: TipoOportunidade
    descricao: string
    data_retorno_prevista?: string
    prioridade?: PrioridadeOportunidade
    valor_estimado?: number
  }
): Promise<OportunidadePaciente> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('oportunidades_paciente')
    .insert({ clinica_id: clinicaId, ...dados })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar oportunidade: ${error.message}`)
  return data as OportunidadePaciente
}

export async function atualizarOportunidade(
  clinicaId: string,
  id: string,
  dados: Partial<OportunidadePaciente>
): Promise<OportunidadePaciente> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('oportunidades_paciente')
    .update(dados)
    .eq('clinica_id', clinicaId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Erro ao atualizar oportunidade: ${error.message}`)
  return data as OportunidadePaciente
}

// ─── FUNIL ───────────────────────────────────────────────────

export async function obterEtapaFunilPaciente(
  clinicaId: string,
  pacienteId: string
): Promise<EtapaFunilPaciente | null> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('etapas_funil_paciente')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('paciente_id', pacienteId)
    .maybeSingle()

  if (error) throw new Error(`Erro ao buscar etapa do funil: ${error.message}`)
  return data as EtapaFunilPaciente | null
}

export async function definirEtapaFunil(
  clinicaId: string,
  pacienteId: string,
  etapa: EtapaFunil,
  observacao?: string
): Promise<EtapaFunilPaciente> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('etapas_funil_paciente')
    .upsert(
      { clinica_id: clinicaId, paciente_id: pacienteId, etapa, observacao },
      { onConflict: 'clinica_id,paciente_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`Erro ao definir etapa do funil: ${error.message}`)
  return data as EtapaFunilPaciente
}

export async function listarFunilPacientes(
  clinicaId: string
): Promise<Record<EtapaFunil, EtapaFunilPaciente[]>> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('etapas_funil_paciente')
    .select(`
      *,
      paciente:pacientes(id, nome, telefone, email, status, foto_url)
    `)
    .eq('clinica_id', clinicaId)
    .order('criado_em', { ascending: false })

  if (error) throw new Error(`Erro ao listar funil: ${error.message}`)

  const resultado: Record<string, EtapaFunilPaciente[]> = {}
  for (const item of (data ?? []) as EtapaFunilPaciente[]) {
    if (!resultado[item.etapa]) resultado[item.etapa] = []
    resultado[item.etapa].push(item)
  }
  return resultado as Record<EtapaFunil, EtapaFunilPaciente[]>
}

// ─── PONTUAÇÃO ───────────────────────────────────────────────

export async function obterPontuacaoPaciente(
  clinicaId: string,
  pacienteId: string
): Promise<PontuacaoPaciente | null> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('pontuacao_paciente')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('paciente_id', pacienteId)
    .maybeSingle()

  if (error) throw new Error(`Erro ao buscar pontuação: ${error.message}`)
  return data as PontuacaoPaciente | null
}

export async function recalcularPontuacao(
  clinicaId: string,
  pacienteId: string
): Promise<PontuacaoPaciente> {
  const supabase = criarClienteServidor()

  // Buscar dados para cálculo
  const [{ count: totalConsultas }, cobrancas, { data: paciente }] = await Promise.all([
    supabase
      .from('consultas')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', pacienteId)
      .eq('status', 'concluido'),
    supabase
      .from('cobrancas')
      .select('valor_final')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', pacienteId)
      .eq('status', 'pago'),
    supabase
      .from('pacientes')
      .select('criado_em')
      .eq('id', pacienteId)
      .single(),
  ])

  const valorTotal = (cobrancas.data ?? []).reduce(
    (acc: number, c: { valor_final: number }) => acc + (c.valor_final || 0),
    0
  )

  const mesesCliente = paciente
    ? Math.floor(
      (Date.now() - new Date(paciente.criado_em).getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
    : 0

  const pontosConsultas = (totalConsultas ?? 0) * 10
  const pontosValor = Math.floor(valorTotal / 100)
  const pontosFidelidade = mesesCliente * 5
  const pontuacaoTotal = pontosConsultas + pontosValor + pontosFidelidade

  const nivel =
    pontuacaoTotal >= 500
      ? 'diamante'
      : pontuacaoTotal >= 200
        ? 'ouro'
        : pontuacaoTotal >= 50
          ? 'prata'
          : 'bronze'

  const { data, error } = await supabase
    .from('pontuacao_paciente')
    .upsert(
      {
        clinica_id: clinicaId,
        paciente_id: pacienteId,
        pontuacao_total: pontuacaoTotal,
        pontos_consultas: pontosConsultas,
        pontos_valor_gasto: pontosValor,
        pontos_fidelidade: pontosFidelidade,
        pontos_indicacoes: 0,
        nivel,
        calculado_em: new Date().toISOString(),
      },
      { onConflict: 'clinica_id,paciente_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`Erro ao recalcular pontuação: ${error.message}`)
  return data as PontuacaoPaciente
}

// ─── CONVERSAS ───────────────────────────────────────────────

export async function listarConversas(
  clinicaId: string,
  filtros?: { status?: string; canal?: CanalConversa; limite?: number }
): Promise<Conversa[]> {
  const supabase = criarClienteServidor()
  let consulta = supabase
    .from('conversas')
    .select(`
      *,
      paciente:pacientes(id, nome, telefone, telefone_whatsapp, foto_url)
    `)
    .eq('clinica_id', clinicaId)
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })

  if (filtros?.status) consulta = consulta.eq('status', filtros.status)
  if (filtros?.canal) consulta = consulta.eq('canal', filtros.canal)
  if (filtros?.limite) consulta = consulta.limit(filtros.limite)

  const { data, error } = await consulta
  if (error) throw new Error(`Erro ao listar conversas: ${error.message}`)
  return (data ?? []) as Conversa[]
}

export async function obterConversa(clinicaId: string, conversaId: string): Promise<Conversa | null> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('conversas')
    .select(`
      *,
      paciente:pacientes(id, nome, telefone, telefone_whatsapp, foto_url),
      mensagens:mensagens_conversa(*, usuario:usuarios(nome, avatar_url))
    `)
    .eq('clinica_id', clinicaId)
    .eq('id', conversaId)
    .maybeSingle()

  if (error) throw new Error(`Erro ao buscar conversa: ${error.message}`)
  return data as Conversa | null
}

export async function criarOuObterConversa(
  clinicaId: string,
  pacienteId: string,
  canal: CanalConversa = 'whatsapp'
): Promise<Conversa> {
  const supabase = criarClienteServidor()

  // Tenta encontrar conversa ativa existente
  const { data: existente } = await supabase
    .from('conversas')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('paciente_id', pacienteId)
    .eq('canal', canal)
    .eq('status', 'ativa')
    .maybeSingle()

  if (existente) return existente as Conversa

  // Cria nova conversa
  const { data, error } = await supabase
    .from('conversas')
    .insert({ clinica_id: clinicaId, paciente_id: pacienteId, canal })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar conversa: ${error.message}`)
  return data as Conversa
}

export async function listarMensagens(
  clinicaId: string,
  conversaId: string,
  limite: number = 50
): Promise<MensagemConversa[]> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('mensagens_conversa')
    .select(`
      *,
      usuario:usuarios(nome, avatar_url)
    `)
    .eq('conversa_id', conversaId)
    .order('data_envio', { ascending: true })
    .limit(limite)

  if (error) throw new Error(`Erro ao listar mensagens: ${error.message}`)
  return (data ?? []) as MensagemConversa[]
}

export async function enviarMensagem(
  clinicaId: string,
  conversaId: string,
  pacienteId: string,
  dados: {
    conteudo: string
    tipo_mensagem: 'enviada' | 'recebida' | 'sistema'
    tipo_conteudo?: string
    usuario_id?: string
  }
): Promise<MensagemConversa> {
  const supabase = criarClienteServidor()

  // Insere mensagem
  const { data: msg, error } = await supabase
    .from('mensagens_conversa')
    .insert({
      conversa_id: conversaId,
      paciente_id: pacienteId,
      usuario_id: dados.usuario_id,
      tipo_mensagem: dados.tipo_mensagem,
      conteudo: dados.conteudo,
      tipo_conteudo: dados.tipo_conteudo ?? 'texto',
      status_mensagem: 'enviada',
      data_envio: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao enviar mensagem: ${error.message}`)

  // Atualiza timestamp da conversa (total_mensagens pode ser mantido por trigger no banco)
  await supabase
    .from('conversas')
    .update({ ultima_mensagem_em: new Date().toISOString() })
    .eq('id', conversaId)

  return msg as MensagemConversa
}

// ─── TIMELINE ────────────────────────────────────────────────

export async function montarTimeline(
  clinicaId: string,
  pacienteId: string
): Promise<EventoTimeline[]> {
  const supabase = criarClienteServidor()

  const [
    { data: consultas },
    { data: pagamentos },
    { data: interacoes },
    { data: mensagens },
    { data: paciente },
  ] = await Promise.all([
    supabase
      .from('consultas')
      .select('id, data_hora_inicio, data_hora_fim, status, observacoes, medico:medicos(nome)')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', pacienteId)
      .order('data_hora_inicio', { ascending: false })
      .limit(30),
    supabase
      .from('pagamentos')
      .select('id, valor, forma_pagamento, data_pagamento, observacoes')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', pacienteId)
      .order('data_pagamento', { ascending: false })
      .limit(20),
    supabase
      .from('interacoes_paciente')
      .select('id, tipo_interacao, descricao, criado_em, usuario:usuarios(nome)')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', pacienteId)
      .order('criado_em', { ascending: false })
      .limit(20),
    supabase
      .from('mensagens_conversa')
      .select('id, tipo_mensagem, conteudo, data_envio')
      .eq('paciente_id', pacienteId)
      .order('data_envio', { ascending: false })
      .limit(20),
    supabase
      .from('pacientes')
      .select('criado_em, nome')
      .eq('id', pacienteId)
      .single(),
  ])

  const eventos: EventoTimeline[] = []

  // Cadastro do paciente
  if (paciente) {
    eventos.push({
      id: `cadastro-${pacienteId}`,
      tipo: 'cadastro',
      titulo: 'Paciente cadastrado no sistema',
      descricao: `${paciente.nome} foi cadastrado(a) na clínica`,
      data: paciente.criado_em,
      cor: '#6366F1',
    })
  }

  // Consultas
  for (const c of (consultas ?? []) as any[]) {
    const tipoMap: Record<string, 'consulta_realizada' | 'consulta_agendada' | 'consulta_cancelada'> = {
      concluido: 'consulta_realizada',
      agendado: 'consulta_agendada',
      confirmado: 'consulta_agendada',
      cancelado: 'consulta_cancelada',
      faltou: 'consulta_cancelada',
    }
    const tipo = tipoMap[c.status] ?? 'consulta_agendada'
    const corMap: Record<string, string> = {
      consulta_realizada: '#10B981',
      consulta_agendada: '#3B82F6',
      consulta_cancelada: '#EF4444',
    }
    eventos.push({
      id: `consulta-${c.id}`,
      tipo,
      titulo:
        tipo === 'consulta_realizada'
          ? 'Consulta realizada'
          : tipo === 'consulta_cancelada'
            ? 'Consulta cancelada'
            : 'Consulta agendada',
      descricao: c.medico?.nome
        ? `Com Dr(a). ${c.medico.nome}${c.observacoes ? ' — ' + c.observacoes : ''}`
        : c.observacoes,
      data: c.data_hora_inicio,
      cor: corMap[tipo],
      dados: { id: c.id, status: c.status },
    })
  }

  // Pagamentos
  for (const p of (pagamentos ?? []) as Array<{
    id: string; valor: number; forma_pagamento: string
    data_pagamento: string; observacoes?: string
  }>) {
    eventos.push({
      id: `pagamento-${p.id}`,
      tipo: 'pagamento',
      titulo: `Pagamento de R$ ${p.valor.toFixed(2)}`,
      descricao: `Via ${p.forma_pagamento.replace(/_/g, ' ')}${p.observacoes ? ' — ' + p.observacoes : ''}`,
      data: p.data_pagamento,
      cor: '#F59E0B',
      dados: { valor: p.valor, forma: p.forma_pagamento },
    })
  }

  // Interações
  for (const i of (interacoes ?? []) as any[]) {
    eventos.push({
      id: `interacao-${i.id}`,
      tipo: 'interacao',
      titulo: `Interação: ${i.tipo_interacao.replace(/_/g, ' ')}`,
      descricao: i.descricao + (i.usuario?.nome ? ` (por ${i.usuario.nome})` : ''),
      data: i.criado_em,
      cor: '#8B5CF6',
      dados: { tipo: i.tipo_interacao },
    })
  }

  // Mensagens
  for (const m of (mensagens ?? []) as Array<{
    id: string; tipo_mensagem: string; conteudo: string; data_envio: string
  }>) {
    eventos.push({
      id: `mensagem-${m.id}`,
      tipo: m.tipo_mensagem === 'enviada' ? 'mensagem_enviada' : 'mensagem_recebida',
      titulo: m.tipo_mensagem === 'enviada' ? 'Mensagem enviada' : 'Mensagem recebida',
      descricao: m.conteudo.length > 100 ? m.conteudo.substring(0, 100) + '...' : m.conteudo,
      data: m.data_envio,
      cor: '#06B6D4',
    })
  }

  // Ordenar cronologicamente (mais recente primeiro)
  eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  return eventos
}

// ─── PERFIL COMPLETO ─────────────────────────────────────────

export async function buscarPerfilCompleto(
  clinicaId: string,
  pacienteId: string
): Promise<PerfilCompletoPaciente> {
  const supabase = criarClienteServidor()

  const [
    { data: paciente, error: errPaciente },
    pontuacao,
    etapaFunil,
    { data: tags },
    timeline,
    oportunidades,
    { data: ultimaConsulta },
    { data: proximaConsulta },
    { count: totalConsultas },
    { data: cobrancas },
    interacoesRecentes,
  ] = await Promise.all([
    supabase
      .from('pacientes')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('id', pacienteId)
      .single(),
    obterPontuacaoPaciente(clinicaId, pacienteId),
    obterEtapaFunilPaciente(clinicaId, pacienteId),
    supabase
      .from('tags_paciente')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', pacienteId),
    montarTimeline(clinicaId, pacienteId),
    listarOportunidades(clinicaId, { pacienteId, status: 'aberta' }),
    supabase
      .from('consultas')
      .select('*, medico:medicos(nome, especialidade)')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', pacienteId)
      .eq('status', 'concluido')
      .order('data_hora_inicio', { ascending: false })
      .limit(1),
    supabase
      .from('consultas')
      .select('*, medico:medicos(nome, especialidade)')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', pacienteId)
      .in('status', ['agendado', 'confirmado'])
      .gte('data_hora_inicio', new Date().toISOString())
      .order('data_hora_inicio', { ascending: true })
      .limit(1),
    supabase
      .from('consultas')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', pacienteId)
      .eq('status', 'concluido'),
    supabase
      .from('cobrancas')
      .select('valor_final')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', pacienteId)
      .eq('status', 'pago'),
    listarInteracoes(clinicaId, pacienteId),
  ])

  if (errPaciente || !paciente) throw new Error('Paciente não encontrado')

  const valorTotalGasto = (cobrancas ?? []).reduce(
    (acc: number, c: { valor_final: number }) => acc + (c.valor_final || 0),
    0
  )

  return {
    paciente,
    pontuacao: pontuacao ?? undefined,
    etapa_funil: etapaFunil ?? undefined,
    tags: (tags ?? []) as TagCRM[],
    timeline,
    oportunidades,
    ultima_consulta: ultimaConsulta?.[0] ?? undefined,
    proxima_consulta: proximaConsulta?.[0] ?? undefined,
    total_consultas: totalConsultas ?? 0,
    valor_total_gasto: valorTotalGasto,
    interacoes_recentes: interacoesRecentes.slice(0, 5),
  }
}

// ─── MÉTRICAS CRM ────────────────────────────────────────────

export async function buscarMetricasCRM(clinicaId: string): Promise<MetricasCRM> {
  const supabase = criarClienteServidor()

  const agora = new Date()
  const limite90 = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const limite180 = new Date(agora.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalAtivos },
    { count: oportunidadesAbertas },
    { count: oportunidadesAlta },
    { count: conversasAtivas },
    { count: mensagensNaoLidas },
    { data: pacientesComConsulta90 },
    { data: pacientesComConsulta180 },
    { count: totalPacientes },
  ] = await Promise.all([
    supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .eq('status', 'ativo'),
    supabase
      .from('oportunidades_paciente')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .eq('status', 'aberta'),
    supabase
      .from('oportunidades_paciente')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .eq('status', 'aberta')
      .eq('prioridade', 'alta'),
    supabase
      .from('conversas')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .eq('status', 'ativa'),
    supabase
      .from('mensagens_conversa')
      .select('id', { count: 'exact', head: true })
      .eq('lida', false)
      .in(
        'conversa_id',
        supabase
          .from('conversas')
          .select('id')
          .eq('clinica_id', clinicaId) as unknown as string[]
      ),
    supabase
      .from('consultas')
      .select('paciente_id')
      .eq('clinica_id', clinicaId)
      .gte('data_hora_inicio', limite90)
      .not('status', 'in', '(cancelado,faltou)'),
    supabase
      .from('consultas')
      .select('paciente_id')
      .eq('clinica_id', clinicaId)
      .gte('data_hora_inicio', limite180)
      .not('status', 'in', '(cancelado,faltou)'),
    supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .eq('status', 'ativo'),
  ])

  const idsAtivos90 = new Set((pacientesComConsulta90 ?? []).map((c: { paciente_id: string }) => c.paciente_id))
  const idsAtivos180 = new Set((pacientesComConsulta180 ?? []).map((c: { paciente_id: string }) => c.paciente_id))

  const inativos90 = Math.max(0, (totalAtivos ?? 0) - idsAtivos90.size)
  const inativos180 = Math.max(0, (totalAtivos ?? 0) - idsAtivos180.size)

  const taxaRetorno = totalPacientes
    ? Math.round((idsAtivos90.size / (totalPacientes ?? 1)) * 100)
    : 0

  return {
    total_pacientes_ativos: totalAtivos ?? 0,
    pacientes_inativos_90dias: inativos90,
    pacientes_inativos_180dias: inativos180,
    oportunidades_abertas: oportunidadesAbertas ?? 0,
    oportunidades_alta_prioridade: oportunidadesAlta ?? 0,
    conversas_ativas: conversasAtivas ?? 0,
    mensagens_nao_lidas: mensagensNaoLidas ?? 0,
    campanhas_ativas: 0,
    taxa_retorno: taxaRetorno,
  }
}

// ─── RADAR DE OPORTUNIDADES ──────────────────────────────────

export async function buscarRadarOportunidades(
  clinicaId: string,
  diasMinimo: number = 90
): Promise<RadarOportunidade[]> {
  const supabase = criarClienteServidor()

  // Busca pacientes ativos com última consulta antiga
  const limiteData = new Date(Date.now() - diasMinimo * 24 * 60 * 60 * 1000).toISOString()

  const { data: pacientesAtivos } = await supabase
    .from('pacientes')
    .select('id, nome, telefone, telefone_whatsapp')
    .eq('clinica_id', clinicaId)
    .eq('status', 'ativo')

  const resultados: RadarOportunidade[] = []

  // Buscar todas as tags dos pacientes ativos em uma única query
  const pacienteIds = (pacientesAtivos ?? []).map((p: any) => p.id)
  const { data: todasTags } = pacienteIds.length
    ? await supabase
        .from('crm_tags')
        .select('paciente_id, tag, cor')
        .in('paciente_id', pacienteIds)
    : { data: [] }

  const tagsPorPaciente: Record<string, Array<{ tag: string; cor: string }>> = {}
  for (const t of (todasTags ?? []) as Array<{ paciente_id: string; tag: string; cor: string }>) {
    if (!tagsPorPaciente[t.paciente_id]) tagsPorPaciente[t.paciente_id] = []
    tagsPorPaciente[t.paciente_id].push({ tag: t.tag, cor: t.cor })
  }

  for (const paciente of (pacientesAtivos ?? []) as Array<{
    id: string; nome: string; telefone?: string; telefone_whatsapp?: string
  }>) {
    const { data: ultimaConsulta } = await supabase
      .from('consultas')
      .select('data_hora_inicio, tipo_consulta:tipos_consulta(nome)')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', paciente.id)
      .eq('status', 'concluido')
      .order('data_hora_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    const tags = tagsPorPaciente[paciente.id] || []

    if (!ultimaConsulta) {
      // Nunca teve consulta — oportunidade de primeira consulta
      resultados.push({
        paciente_id: paciente.id,
        clinica_id: clinicaId,
        paciente_nome: paciente.nome,
        telefone: paciente.telefone,
        telefone_whatsapp: paciente.telefone_whatsapp,
        dias_desde_ultimo: 999,
        tipo_oportunidade: 'avaliacao_pendente',
        prioridade: 'alta',
        tags,
      })
    } else {
      const dataUltima = new Date((ultimaConsulta as { data_hora_inicio: string }).data_hora_inicio)
      if (dataUltima < new Date(limiteData)) {
        const diasDesde = Math.floor(
          (Date.now() - dataUltima.getTime()) / (1000 * 60 * 60 * 24)
        )
        const prioridade: 'alta' | 'media' | 'baixa' =
          diasDesde > 365 ? 'alta' : diasDesde > 180 ? 'media' : 'baixa'

        resultados.push({
          paciente_id: paciente.id,
          clinica_id: clinicaId,
          paciente_nome: paciente.nome,
          telefone: paciente.telefone,
          telefone_whatsapp: paciente.telefone_whatsapp,
          ultimo_procedimento: (ultimaConsulta as any).tipo_consulta?.nome,
          data_ultimo_procedimento: (ultimaConsulta as any).data_hora_inicio,
          dias_desde_ultimo: diasDesde,
          tipo_oportunidade: 'retorno_consulta',
          prioridade,
          tags,
        })
      }
    }
  }

  // Ordenar por prioridade e dias
  return resultados
    .sort((a, b) => {
      const ordemPrioridade = { alta: 0, media: 1, baixa: 2 }
      if (ordemPrioridade[a.prioridade] !== ordemPrioridade[b.prioridade]) {
        return ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade]
      }
      return b.dias_desde_ultimo - a.dias_desde_ultimo
    })
    .slice(0, 100)
}

// ─── CAMPANHAS CRM ───────────────────────────────────────────

export async function listarCampanhasCRM(
  clinicaId: string,
  status?: StatusCampanhaCRM
): Promise<CampanhaCRM[]> {
  const supabase = criarClienteServidor()
  let consulta = supabase
    .from('campanhas_crm')
    .select('*')
    .eq('clinica_id', clinicaId)
    .order('criado_em', { ascending: false })

  if (status) consulta = consulta.eq('status', status)

  const { data, error } = await consulta
  if (error) throw new Error(`Erro ao listar campanhas: ${error.message}`)
  return (data ?? []) as CampanhaCRM[]
}

export async function criarCampanhaCRM(
  clinicaId: string,
  usuarioId: string,
  dados: Omit<CampanhaCRM, 'id' | 'clinica_id' | 'total_destinatarios' | 'total_enviadas' | 'total_entregues' | 'total_lidas' | 'total_respostas' | 'criado_em' | 'atualizado_em'>
): Promise<CampanhaCRM> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('campanhas_crm')
    .insert({
      clinica_id: clinicaId,
      criado_por: usuarioId,
      ...dados,
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar campanha: ${error.message}`)
  return data as CampanhaCRM
}

export async function buscarDestinatariosCampanha(
  clinicaId: string,
  filtros: {
    tags?: string[]
    status?: StatusPaciente[]
    diasSemConsulta?: number
    cidade?: string
    sexo?: SexoPaciente
    idadeMin?: number
    idadeMax?: number
  }
): Promise<{ id: string; nome: string; telefone?: string; email?: string }[]> {
  const supabase = criarClienteServidor()
  let consulta = supabase
    .from('pacientes')
    .select('id, nome, telefone, telefone_whatsapp, email, data_nascimento, cidade, sexo, status')
    .eq('clinica_id', clinicaId)

  if (filtros.status?.length) {
    consulta = consulta.in('status', filtros.status)
  } else {
    consulta = consulta.eq('status', 'ativo')
  }

  if (filtros.cidade) consulta = consulta.ilike('cidade', `%${filtros.cidade}%`)
  if (filtros.sexo) consulta = consulta.eq('sexo', filtros.sexo)

  const { data: pacientes } = await consulta

  let resultado = pacientes ?? []

  // Filtrar por tags
  if (filtros.tags?.length) {
    const { data: pacientesTags } = await supabase
      .from('tags_paciente')
      .select('paciente_id')
      .eq('clinica_id', clinicaId)
      .in('tag', filtros.tags)

    const idsComTag = new Set((pacientesTags ?? []).map((t: { paciente_id: string }) => t.paciente_id))
    resultado = resultado.filter((p: { id: string }) => idsComTag.has(p.id))
  }

  // Filtrar por dias sem consulta
  if (filtros.diasSemConsulta) {
    const limite = new Date(Date.now() - filtros.diasSemConsulta * 24 * 60 * 60 * 1000).toISOString()
    const { data: comConsulta } = await supabase
      .from('consultas')
      .select('paciente_id')
      .eq('clinica_id', clinicaId)
      .gte('data_hora_inicio', limite)
      .not('status', 'in', '(cancelado,faltou)')

    const idsComConsulta = new Set((comConsulta ?? []).map((c: { paciente_id: string }) => c.paciente_id))
    resultado = resultado.filter((p: { id: string }) => !idsComConsulta.has(p.id))
  }

  // Filtrar por idade
  if (filtros.idadeMin || filtros.idadeMax) {
    const hoje = new Date()
    resultado = resultado.filter((p: { data_nascimento?: string }) => {
      if (!p.data_nascimento) return false
      const idade = Math.floor(
        (hoje.getTime() - new Date(p.data_nascimento).getTime()) / (1000 * 60 * 60 * 24 * 365)
      )
      if (filtros.idadeMin && idade < filtros.idadeMin) return false
      if (filtros.idadeMax && idade > filtros.idadeMax) return false
      return true
    })
  }

  return resultado as { id: string; nome: string; telefone?: string; email?: string }[]
}

export async function listarPacientesInativos(
  clinicaId: string,
  diasSemConsulta: number = 90
): Promise<Array<{
  id: string; nome: string; telefone?: string; email?: string
  ultima_consulta?: string; dias_sem_consulta: number; total_consultas: number
}>> {
  const supabase = criarClienteServidor()
  const limite = new Date(Date.now() - diasSemConsulta * 24 * 60 * 60 * 1000).toISOString()

  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('id, nome, telefone, email, ultimo_atendimento, total_consultas')
    .eq('clinica_id', clinicaId)
    .eq('status', 'ativo')

  const { data: comConsulta } = await supabase
    .from('consultas')
    .select('paciente_id')
    .eq('clinica_id', clinicaId)
    .gte('data_hora_inicio', limite)
    .not('status', 'in', '(cancelado,faltou)')

  const idsAtivos = new Set((comConsulta ?? []).map((c: { paciente_id: string }) => c.paciente_id))

  return (pacientes ?? [])
    .filter((p: { id: string }) => !idsAtivos.has(p.id))
    .map((p: {
      id: string; nome: string; telefone?: string; email?: string
      ultimo_atendimento?: string; total_consultas: number
    }) => {
      const diasSemConsultaCalc = p.ultimo_atendimento
        ? Math.floor((Date.now() - new Date(p.ultimo_atendimento).getTime()) / (1000 * 60 * 60 * 24))
        : 999
      return {
        id: p.id,
        nome: p.nome,
        telefone: p.telefone,
        email: p.email,
        ultima_consulta: p.ultimo_atendimento,
        dias_sem_consulta: diasSemConsultaCalc,
        total_consultas: p.total_consultas ?? 0,
      }
    })
    .sort((a, b) => b.dias_sem_consulta - a.dias_sem_consulta)
}
