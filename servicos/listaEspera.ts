// ============================================================
// CLINIO - Serviço de Lista de Espera
// Lógica de negócio: gerenciamento da fila, encaixe automático
// quando consultas são canceladas, notificações de disponibilidade
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'

export interface ItemListaEsperaDB {
  id: string
  paciente_id: string
  clinica_id: string
  medico_id?: string
  tipo_consulta_id?: string
  data_preferida?: string
  horario_preferido_inicio?: string
  horario_preferido_fim?: string
  prioridade: number
  status: 'aguardando' | 'notificado' | 'encaixado' | 'desistiu'
  observacoes?: string
  criado_em: string
}

export interface CandidatoEncaixe {
  item: ItemListaEsperaDB & {
    paciente?: { nome: string; telefone: string; email?: string }
    medico?: { nome: string }
    tipo_consulta?: { nome: string; duracao_minutos: number }
  }
  score: number
  motivo: string[]
}

// ─── Buscar lista de espera ──────────────────────────────────
export async function buscarListaEspera(
  clinicaId: string,
  opcoes?: {
    medicoId?: string
    data?: string
    status?: string[]
    limite?: number
  }
) {
  const supabase = criarClienteServidor()

  let query = supabase
    .from('lista_espera')
    .select(`
      *,
      paciente:pacientes(nome, telefone, email),
      medico:medicos(nome),
      tipo_consulta:tipos_consulta(nome, duracao_minutos)
    `)
    .eq('clinica_id', clinicaId)
    .in('status', opcoes?.status || ['aguardando', 'notificado'])
    .order('prioridade', { ascending: true })
    .order('criado_em', { ascending: true })

  if (opcoes?.medicoId) {
    query = query.or(`medico_id.eq.${opcoes.medicoId},medico_id.is.null`)
  }

  if (opcoes?.data) {
    query = query.or(`data_preferida.eq.${opcoes.data},data_preferida.is.null`)
  }

  if (opcoes?.limite) {
    query = query.limit(opcoes.limite)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ─── Adicionar à lista de espera ─────────────────────────────
export async function adicionarListaEspera(dados: {
  clinicaId: string
  pacienteId: string
  medicoId?: string
  tipoConsultaId?: string
  dataPreferida?: string
  horarioPreferidoInicio?: string
  horarioPreferidoFim?: string
  prioridade?: number
  observacoes?: string
}) {
  const supabase = criarClienteServidor()

  // Verificar se já está na lista para este médico
  const { data: existente } = await supabase
    .from('lista_espera')
    .select('id')
    .eq('clinica_id', dados.clinicaId)
    .eq('paciente_id', dados.pacienteId)
    .in('status', ['aguardando', 'notificado'])
    .maybeSingle()

  if (existente) {
    throw new Error('Paciente já está na lista de espera')
  }

  const { data, error } = await supabase
    .from('lista_espera')
    .insert({
      clinica_id: dados.clinicaId,
      paciente_id: dados.pacienteId,
      medico_id: dados.medicoId,
      tipo_consulta_id: dados.tipoConsultaId,
      data_preferida: dados.dataPreferida,
      horario_preferido_inicio: dados.horarioPreferidoInicio,
      horario_preferido_fim: dados.horarioPreferidoFim,
      prioridade: dados.prioridade ?? 2,
      observacoes: dados.observacoes,
      status: 'aguardando',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Atualizar item da lista ─────────────────────────────────
export async function atualizarItemListaEspera(
  id: string,
  dados: Partial<{
    prioridade: number
    status: string
    medico_id: string
    data_preferida: string
  }>
) {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('lista_espera')
    .update({ ...dados, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Encaixe automático após cancelamento ───────────────────
// Quando uma consulta é cancelada, busca os melhores candidatos
// da lista de espera e retorna ranqueados por compatibilidade
export async function buscarCandidatosEncaixe(
  clinicaId: string,
  consultaCancelada: {
    medicoId: string
    data_hora_inicio: string
    data_hora_fim: string
    tipoConsultaId?: string
  }
): Promise<CandidatoEncaixe[]> {
  const supabase = criarClienteServidor()

  const dataConsulta = consultaCancelada.data_hora_inicio.split('T')[0]
  const horaInicio = consultaCancelada.data_hora_inicio.split('T')[1]?.slice(0, 5)
  const horaFim = consultaCancelada.data_hora_fim.split('T')[1]?.slice(0, 5)

  // Calcular duração do slot disponível
  const inicio = new Date(consultaCancelada.data_hora_inicio)
  const fim = new Date(consultaCancelada.data_hora_fim)
  const duracaoSlotMin = Math.round((fim.getTime() - inicio.getTime()) / 60000)

  // Buscar candidatos da lista de espera para este médico (ou sem preferência)
  const { data: candidatos } = await supabase
    .from('lista_espera')
    .select(`
      *,
      paciente:pacientes(nome, telefone, email),
      medico:medicos(nome),
      tipo_consulta:tipos_consulta(nome, duracao_minutos)
    `)
    .eq('clinica_id', clinicaId)
    .in('status', ['aguardando', 'notificado'])
    .or(`medico_id.eq.${consultaCancelada.medicoId},medico_id.is.null`)
    .order('prioridade', { ascending: true })
    .order('criado_em', { ascending: true })

  if (!candidatos?.length) return []

  // Pontuar cada candidato
  const ranqueados: CandidatoEncaixe[] = candidatos
    .map((item) => {
      let score = 100 - (item.prioridade - 1) * 20 // prioridade 1 = +0, 2 = -20, 3 = -40
      const motivo: string[] = []

      // Médico preferido bate
      if (item.medico_id === consultaCancelada.medicoId) {
        score += 30
        motivo.push('Médico preferido disponível')
      }

      // Data preferida bate
      if (item.data_preferida === dataConsulta) {
        score += 25
        motivo.push('Data preferida disponível')
      }

      // Horário preferido dentro do slot
      if (item.horario_preferido_inicio && item.horario_preferido_fim) {
        const prefInicio = item.horario_preferido_inicio
        const prefFim = item.horario_preferido_fim
        if (prefInicio <= horaInicio && horaFim <= prefFim) {
          score += 20
          motivo.push('Horário dentro da preferência')
        }
      }

      // Tipo de consulta bate
      if (item.tipo_consulta_id === consultaCancelada.tipoConsultaId) {
        score += 15
        motivo.push('Tipo de consulta compatível')
      }

      // Duração compatível (tipo_consulta.duracao <= slot)
      const duracaoTipo = item.tipo_consulta?.duracao_minutos
      if (duracaoTipo && duracaoTipo <= duracaoSlotMin) {
        score += 10
        motivo.push('Duração compatível com o slot')
      } else if (duracaoTipo && duracaoTipo > duracaoSlotMin) {
        score -= 50 // Inviável — slot menor que duração necessária
        motivo.push('Duração insuficiente para o tipo de consulta')
      }

      // Penalidade por já ter sido notificado antes (pode ter desistido)
      if (item.status === 'notificado') {
        score -= 5
      }

      return {
        item,
        score: Math.max(0, score),
        motivo,
      }
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)

  return ranqueados.slice(0, 5) // Top 5 candidatos
}

// ─── Encaixar candidato: cria a consulta e remove da espera ──
export async function encaixarCandidato(
  itemListaId: string,
  consultaDados: {
    clinicaId: string
    pacienteId: string
    medicoId: string
    dataHoraInicio: string
    dataHoraFim: string
    tipoConsultaId?: string
    salaId?: string
  }
) {
  const supabase = criarClienteServidor()

  // Criar a consulta
  const { data: novaConsulta, error: errConsulta } = await supabase
    .from('consultas')
    .insert({
      clinica_id: consultaDados.clinicaId,
      paciente_id: consultaDados.pacienteId,
      medico_id: consultaDados.medicoId,
      sala_id: consultaDados.salaId,
      tipo_consulta_id: consultaDados.tipoConsultaId,
      data_hora_inicio: consultaDados.dataHoraInicio,
      data_hora_fim: consultaDados.dataHoraFim,
      status: 'agendado',
      origem: 'encaixe_lista_espera',
    })
    .select()
    .single()

  if (errConsulta) throw errConsulta

  // Marcar item como encaixado
  await supabase
    .from('lista_espera')
    .update({
      status: 'encaixado',
      consulta_encaixada_id: novaConsulta.id,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', itemListaId)

  return novaConsulta
}

// ─── Notificar pacientes sobre slot disponível ───────────────
// Marca como "notificado" e registra o horário ofertado
export async function notificarPacienteListaEspera(
  itemId: string,
  slotDisponivel?: { data_hora_inicio: string; medico_nome?: string }
) {
  const supabase = criarClienteServidor()

  const { data: item } = await supabase
    .from('lista_espera')
    .select('*, paciente:pacientes(nome, telefone, email)')
    .eq('id', itemId)
    .single()

  if (!item) throw new Error('Item não encontrado na lista de espera')

  // Atualizar status para notificado
  await supabase
    .from('lista_espera')
    .update({
      status: 'notificado',
      notificado_em: new Date().toISOString(),
      slot_ofertado: slotDisponivel?.data_hora_inicio,
    })
    .eq('id', itemId)

  // Registrar mensagem de notificação
  if (item.paciente?.telefone) {
    const dataHora = slotDisponivel?.data_hora_inicio
      ? new Date(slotDisponivel.data_hora_inicio).toLocaleString('pt-BR', {
          weekday: 'long', day: 'numeric', month: 'long',
          hour: '2-digit', minute: '2-digit',
        })
      : 'em breve'

    const mensagemCorpo = slotDisponivel
      ? `Olá, ${item.paciente.nome}! Temos um horário disponível para você: ${dataHora}${slotDisponivel.medico_nome ? ` com ${slotDisponivel.medico_nome}` : ''}. Deseja confirmar? Responda SIM para reservar.`
      : `Olá, ${item.paciente.nome}! Um horário ficou disponível na agenda. Entre em contato conosco para confirmar sua consulta.`

    await supabase.from('mensagens').insert({
      clinica_id: item.clinica_id,
      paciente_id: item.paciente_id,
      canal: 'whatsapp',
      direcao: 'saida',
      conteudo: mensagemCorpo,
      status: 'pendente',
      origem: 'lista_espera',
      referencia_id: itemId,
    })
  }

  return item
}

// ─── Processar encaixes automáticos após cancelamento ────────
// Disparado pelo webhook/API quando status muda para "cancelado"
export async function processarEncaixeAutomatico(
  clinicaId: string,
  consultaCancelada: {
    id: string
    medicoId: string
    data_hora_inicio: string
    data_hora_fim: string
    tipoConsultaId?: string
  }
): Promise<{ candidatos: CandidatoEncaixe[]; notificados: number }> {
  const candidatos = await buscarCandidatosEncaixe(clinicaId, {
    medicoId: consultaCancelada.medicoId,
    data_hora_inicio: consultaCancelada.data_hora_inicio,
    data_hora_fim: consultaCancelada.data_hora_fim,
    tipoConsultaId: consultaCancelada.tipoConsultaId,
  })

  let notificados = 0

  // Notificar os top 3 candidatos (primeiro a responder ganha o horário)
  for (const candidato of candidatos.slice(0, 3)) {
    try {
      await notificarPacienteListaEspera(candidato.item.id, {
        data_hora_inicio: consultaCancelada.data_hora_inicio,
      })
      notificados++
    } catch (err) {
      console.error('Erro ao notificar candidato:', err)
    }
  }

  return { candidatos, notificados }
}
