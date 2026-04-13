// ============================================================
// CLINIO - Repositório Financeiro
// Acesso ao banco de dados para cobranças e pagamentos
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import type { Cobranca, Pagamento, FormaPagamento, StatusCobranca } from '@/tipos'

/**
 * Busca cobranças com filtros
 */
export async function buscarCobrancas(
  clinicaId: string,
  params: {
    status?: StatusCobranca
    paciente_id?: string
    data_inicio?: string
    data_fim?: string
    pagina?: number
    por_pagina?: number
  } = {}
): Promise<{ dados: Cobranca[]; total: number }> {
  const supabase = criarClienteServidor()
  const porPagina = params.por_pagina || 20
  const pagina = params.pagina || 1
  const de = (pagina - 1) * porPagina

  let consulta = supabase
    .from('cobrancas')
    .select('*, paciente:pacientes(id, nome), pagamentos(*)', { count: 'exact' })
    .eq('clinica_id', clinicaId)
    .order('criado_em', { ascending: false })
    .range(de, de + porPagina - 1)

  if (params.status) consulta = consulta.eq('status', params.status)
  if (params.paciente_id) consulta = consulta.eq('paciente_id', params.paciente_id)
  if (params.data_inicio) consulta = consulta.gte('criado_em', params.data_inicio)
  if (params.data_fim) consulta = consulta.lte('criado_em', params.data_fim)

  const { data, error, count } = await consulta
  if (error) throw new Error(`Erro ao buscar cobranças: ${error.message}`)

  return { dados: (data as Cobranca[]) || [], total: count || 0 }
}

/**
 * Cria uma nova cobrança
 */
export async function criarCobranca(
  clinicaId: string,
  dados: {
    paciente_id: string
    consulta_id?: string
    descricao: string
    valor: number
    valor_desconto?: number
    vencimento?: string
  }
): Promise<Cobranca> {
  const supabase = criarClienteServidor()

  const { data, error } = await supabase
    .from('cobrancas')
    .insert({ clinica_id: clinicaId, ...dados, valor_desconto: dados.valor_desconto || 0 })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar cobrança: ${error.message}`)
  return data as Cobranca
}

/**
 * Registra um pagamento e atualiza o status da cobrança
 */
export async function registrarPagamento(
  clinicaId: string,
  dados: {
    cobranca_id: string
    paciente_id: string
    valor: number
    forma_pagamento: FormaPagamento
    parcelas?: number
    data_pagamento: string
    observacoes?: string
    registrado_por?: string
  }
): Promise<Pagamento> {
  const supabase = criarClienteServidor()

  const { data: pagamento, error } = await supabase
    .from('pagamentos')
    .insert({ clinica_id: clinicaId, ...dados, parcelas: dados.parcelas || 1 })
    .select()
    .single()

  if (error) throw new Error(`Erro ao registrar pagamento: ${error.message}`)

  // Verificar se a cobrança foi totalmente paga
  const { data: cobranca } = await supabase
    .from('cobrancas')
    .select('valor_final')
    .eq('id', dados.cobranca_id)
    .single()

  const { data: totalPago } = await supabase
    .from('pagamentos')
    .select('valor')
    .eq('cobranca_id', dados.cobranca_id)

  const somaPagamentos = totalPago?.reduce((acc, p) => acc + p.valor, 0) || 0
  const valorFinal = (cobranca as any)?.valor_final || 0

  const novoStatus: StatusCobranca =
    somaPagamentos >= valorFinal
      ? 'pago'
      : somaPagamentos > 0
      ? 'parcialmente_pago'
      : 'pendente'

  await supabase
    .from('cobrancas')
    .update({ status: novoStatus })
    .eq('id', dados.cobranca_id)

  return pagamento as Pagamento
}

/**
 * Busca resumo financeiro para o dashboard
 */
export async function buscarResumoFinanceiro(
  clinicaId: string,
  dataInicio: string,
  dataFim: string
): Promise<{
  receita_total: number
  receita_por_forma: Record<FormaPagamento, number>
  cobrancas_pendentes: number
  cobrancas_vencidas: number
  ticket_medio: number
}> {
  const supabase = criarClienteServidor()

  const [pagamentos, pendentes, vencidas] = await Promise.all([
    supabase
      .from('pagamentos')
      .select('valor, forma_pagamento')
      .eq('clinica_id', clinicaId)
      .gte('data_pagamento', dataInicio)
      .lte('data_pagamento', dataFim),
    supabase
      .from('cobrancas')
      .select('valor_final', { count: 'exact' })
      .eq('clinica_id', clinicaId)
      .eq('status', 'pendente'),
    supabase
      .from('cobrancas')
      .select('valor_final', { count: 'exact' })
      .eq('clinica_id', clinicaId)
      .eq('status', 'vencido'),
  ])

  const receitaTotal = pagamentos.data?.reduce((acc, p) => acc + p.valor, 0) || 0
  const receitaPorForma = {} as Record<FormaPagamento, number>

  pagamentos.data?.forEach((p) => {
    const forma = p.forma_pagamento as FormaPagamento
    receitaPorForma[forma] = (receitaPorForma[forma] || 0) + p.valor
  })

  const ticketMedio =
    pagamentos.data && pagamentos.data.length > 0
      ? receitaTotal / pagamentos.data.length
      : 0

  return {
    receita_total: receitaTotal,
    receita_por_forma: receitaPorForma,
    cobrancas_pendentes: pendentes.count || 0,
    cobrancas_vencidas: vencidas.count || 0,
    ticket_medio: Math.round(ticketMedio * 100) / 100,
  }
}

/**
 * Busca evolução de receita por mês (últimos N meses)
 */
export async function buscarEvolucaoReceita(
  clinicaId: string,
  meses: number = 6
): Promise<{ mes: string; receita: number }[]> {
  const supabase = criarClienteServidor()

  const dataInicio = new Date()
  dataInicio.setMonth(dataInicio.getMonth() - meses)

  const { data, error } = await supabase
    .from('pagamentos')
    .select('valor, data_pagamento')
    .eq('clinica_id', clinicaId)
    .gte('data_pagamento', dataInicio.toISOString().split('T')[0])
    .order('data_pagamento', { ascending: true })

  if (error || !data) return []

  // Agrupar por mês
  const porMes: Record<string, number> = {}
  data.forEach((p) => {
    const d = new Date(p.data_pagamento)
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    porMes[chave] = (porMes[chave] || 0) + p.valor
  })

  return Object.entries(porMes).map(([mes, receita]) => ({ mes, receita }))
}
