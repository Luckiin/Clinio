// ============================================================
// CLINIO - Serviço de Relatórios Gerenciais
// Lógica pesada de agregação de dados
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import { intervaloDoMes, dataDeHoje } from '@/lib/formatadores'

export async function gerarRelatorioGerencial(clinicaId: string, dataInicio: string, dataFim: string) {
  const supabase = criarClienteServidor()
  const hoje = dataDeHoje()

  // 1. Consultas do Dia
  const { count: consultasDia } = await supabase
    .from('consultas')
    .select('id', { count: 'exact' })
    .eq('clinica_id', clinicaId)
    .gte('data_hora_inicio', `${hoje}T00:00:00`)
    .lte('data_hora_inicio', `${hoje}T23:59:59`)

  // 2. Faltas no período selecionado (Geralmente no mes)
  const { count: totalConsultasPeriodo } = await supabase
    .from('consultas')
    .select('id', { count: 'exact' })
    .eq('clinica_id', clinicaId)
    .gte('data_hora_inicio', `${dataInicio}T00:00:00`)
    .lte('data_hora_inicio', `${dataFim}T23:59:59`)

  const { count: totalFaltasPeriodo } = await supabase
    .from('consultas')
    .select('id', { count: 'exact' })
    .eq('clinica_id', clinicaId)
    .eq('status', 'faltou')
    .gte('data_hora_inicio', `${dataInicio}T00:00:00`)
    .lte('data_hora_inicio', `${dataFim}T23:59:59`)

  const taxaFaltas = totalConsultasPeriodo ? (totalFaltasPeriodo / totalConsultasPeriodo) * 100 : 0

  // 3. Faturamento do Dia e do Mês
  const { data: pagamentosDia } = await supabase
    .from('pagamentos')
    .select('valor')
    .eq('clinica_id', clinicaId)
    .eq('data_pagamento', hoje)

  const { data: pagamentosPeriodo } = await supabase
    .from('pagamentos')
    .select('valor')
    .eq('clinica_id', clinicaId)
    .gte('data_pagamento', dataInicio)
    .lte('data_pagamento', dataFim)

  const fatDia = pagamentosDia?.reduce((acc, p) => acc + p.valor, 0) || 0
  const fatPeriodo = pagamentosPeriodo?.reduce((acc, p) => acc + p.valor, 0) || 0

  // 4. Pacientes Novos no Período
  const { count: pacientesNovos } = await supabase
    .from('pacientes')
    .select('id', { count: 'exact' })
    .eq('clinica_id', clinicaId)
    .gte('criado_em', `${dataInicio}T00:00:00`)
    .lte('criado_em', `${dataFim}T23:59:59`)

  // 5. Faturamento por Médico (Join Pagamentos -> Cobrancas -> Consultas -> Medico)
  // Como as vezes pagamento não amarra em consulta diretamente, faremos uma estimativa pelo 'cobrancas.consulta_id'
  const { data: colsFaturamento } = await supabase
    .from('pagamentos')
    .select(`
      valor,
      cobranca:cobrancas(
        consulta:consultas(
          medico:medicos(nome)
        )
      )
    `)
    .eq('clinica_id', clinicaId)
    .gte('data_pagamento', dataInicio)
    .lte('data_pagamento', dataFim)

  const faturamentoPorMedico: Record<string, number> = {}
  colsFaturamento?.forEach((pag: any) => {
    const nomeMedico = pag.cobranca?.consulta?.medico?.nome || 'Avulso/Sem Médico'
    faturamentoPorMedico[nomeMedico] = (faturamentoPorMedico[nomeMedico] || 0) + pag.valor
  })

  // 6. Horários Mais Movimentados
  const { data: consHorarios } = await supabase
    .from('consultas')
    .select('data_hora_inicio')
    .eq('clinica_id', clinicaId)
    .gte('data_hora_inicio', `${dataInicio}T00:00:00`)
    .lte('data_hora_inicio', `${dataFim}T23:59:59`)

  const contagemHorarios: Record<string, number> = {}
  consHorarios?.forEach(c => {
    const d = new Date(c.data_hora_inicio)
    const horaStr = `${String(d.getHours()).padStart(2, '0')}:00`
    contagemHorarios[horaStr] = (contagemHorarios[horaStr] || 0) + 1
  })

  return {
    indicadores: {
      consultasDia: consultasDia || 0,
      consultasPeriodo: totalConsultasPeriodo || 0,
      faturamentoDia: fatDia,
      faturamentoPeriodo: fatPeriodo,
      pacientesNovos: pacientesNovos || 0,
      taxaFaltas: Math.round(taxaFaltas)
    },
    faturamentoPorMedico: Object.entries(faturamentoPorMedico)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor),
    horariosMovimentados: Object.entries(contagemHorarios)
      .map(([hora, total]) => ({ hora, total }))
      .sort((a, b) => a.hora.localeCompare(b.hora)) // ordernar por cronologia
  }
}
