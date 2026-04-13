// ============================================================
// CLINIO - Dashboard Principal
// Exibe métricas gerenciais, agenda do dia e alertas
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import { CartaoMetrica } from '@/componentes/ui/CartaoMetrica'
import { buscarMetricasConsultas } from '@/servicos/consultas'
import { buscarEstatisticasPacientes } from '@/servicos/pacientes'
import { buscarResumoFinanceiro } from '@/servicos/financeiro'
import { buscarConsultasAltoRisco } from '@/servicos/previsaoFaltas'
import { formatarMoeda, formatarHora, dataDeHoje, intervaloDoMes } from '@/lib/formatadores'
import {
  Calendar, Users, DollarSign, TrendingUp,
  AlertTriangle, Clock, CheckCircle
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function PaginaDashboard() {
  const supabase = criarClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios').select('clinica_id, nome').eq('id', user.id).single()
  if (!usuario) return null

  const hoje = new Date()
  const { inicio, fim } = intervaloDoMes(hoje.getFullYear(), hoje.getMonth() + 1)
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString()
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString()

  // Buscar dados em paralelo para performance
  const [
    metricasConsultasMes,
    metricasConsultasOntem,
    estatisticasPacientes,
    resumoFinanceiro,
    resumoFinanceiroAnterior,
    consultasAltoRisco,
    consultasHoje,
  ] = await Promise.all([
    buscarMetricasConsultas(usuario.clinica_id, inicio, fim),
    buscarMetricasConsultas(usuario.clinica_id, dataDeHoje() + 'T00:00:00', dataDeHoje() + 'T23:59:59'),
    buscarEstatisticasPacientes(usuario.clinica_id),
    buscarResumoFinanceiro(usuario.clinica_id, inicio, fim),
    buscarResumoFinanceiro(usuario.clinica_id, inicioMesAnterior, fimMesAnterior),
    buscarConsultasAltoRisco(usuario.clinica_id, dataDeHoje()),
    supabase.from('consultas')
      .select('id, data_hora_inicio, data_hora_fim, status, paciente:pacientes(nome), medico:medicos(nome, cor_agenda)')
      .eq('clinica_id', usuario.clinica_id)
      .gte('data_hora_inicio', dataDeHoje() + 'T00:00:00')
      .lte('data_hora_inicio', dataDeHoje() + 'T23:59:59')
      .not('status', 'in', '("cancelado")')
      .order('data_hora_inicio')
      .limit(8),
  ])

  // Calcular variação de receita
  const variacaoReceita = resumoFinanceiroAnterior.receita_total > 0
    ? ((resumoFinanceiro.receita_total - resumoFinanceiroAnterior.receita_total) / resumoFinanceiroAnterior.receita_total) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bom dia, {usuario.nome?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
      </div>

      {/* Alertas de alto risco */}
      {consultasAltoRisco.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">
              {consultasAltoRisco.length} consulta(s) com alto risco de falta hoje
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {consultasAltoRisco.map((c) => (
              <span key={c.consulta_id} className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded-lg">
                {c.hora} - {c.paciente_nome} ({c.probabilidade}% de risco)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cartões de métricas
          Ícones passados como JSX (<Calendar />) e não como referência (Calendar)
          porque o dashboard é um Server Component e CartaoMetrica é Client Component */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <CartaoMetrica
          titulo="Consultas Hoje"
          valor={metricasConsultasOntem.total}
          icone={<Calendar className="w-6 h-6" />}
          corIcone="text-blue-600"
        />
        <CartaoMetrica
          titulo="Pacientes Ativos"
          valor={estatisticasPacientes.total_ativos.toLocaleString('pt-BR')}
          descricaoVariacao="este mês"
          icone={<Users className="w-6 h-6" />}
          corIcone="text-green-600"
        />
        <CartaoMetrica
          titulo="Receita do Mês"
          valor={formatarMoeda(resumoFinanceiro.receita_total)}
          variacao={variacaoReceita}
          descricaoVariacao="vs. mês anterior"
          icone={<DollarSign className="w-6 h-6" />}
          corIcone="text-emerald-600"
        />
        <CartaoMetrica
          titulo="Taxa de Comparecimento"
          valor={`${metricasConsultasMes.taxa_comparecimento}%`}
          icone={<TrendingUp className="w-6 h-6" />}
          corIcone="text-purple-600"
        />
      </div>

      {/* Grade de conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda do Dia */}
        <div className="lg:col-span-2 cartao">
          <div className="flex items-center justify-between mb-5">
            <h2 className="titulo-secao">Agenda de Hoje</h2>
            <a href="/painel/agenda" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Ver agenda completa →
            </a>
          </div>

          {consultasHoje.data && consultasHoje.data.length > 0 ? (
            <div className="space-y-2">
              {consultasHoje.data.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border-l-4"
                  style={{ borderLeftColor: c.medico?.cor_agenda || '#3B82F6' }}
                >
                  <div className="text-center min-w-[50px]">
                    <p className="text-sm font-bold text-gray-700">{formatarHora(c.data_hora_inicio)}</p>
                    <p className="text-xs text-gray-400">{formatarHora(c.data_hora_fim)}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{(c.paciente as any)?.nome}</p>
                    <p className="text-xs text-gray-500">{(c.medico as any)?.nome}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium
                    ${c.status === 'confirmado' ? 'bg-green-100 text-green-700' :
                      c.status === 'em_atendimento' ? 'bg-yellow-100 text-yellow-700' :
                      c.status === 'concluido' ? 'bg-gray-100 text-gray-600' :
                      'bg-blue-100 text-blue-700'}`}
                  >
                    {c.status === 'agendado' ? 'Agendado' :
                     c.status === 'confirmado' ? 'Confirmado' :
                     c.status === 'em_atendimento' ? 'Em atendimento' :
                     c.status === 'concluido' ? 'Concluído' : c.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma consulta agendada para hoje</p>
            </div>
          )}
        </div>

        {/* Painel lateral */}
        <div className="space-y-5">
          {/* Resumo financeiro */}
          <div className="cartao">
            <h2 className="titulo-secao mb-4">Financeiro do Mês</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Receita</span>
                <span className="font-semibold text-green-600">
                  {formatarMoeda(resumoFinanceiro.receita_total)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">A receber</span>
                <span className="font-semibold text-amber-600">
                  {resumoFinanceiro.cobrancas_pendentes} cobranças
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ticket médio</span>
                <span className="font-semibold text-gray-800">
                  {formatarMoeda(resumoFinanceiro.ticket_medio)}
                </span>
              </div>
            </div>
          </div>

          {/* Pacientes: alertas */}
          <div className="cartao">
            <h2 className="titulo-secao mb-4">Pacientes</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Novos este mês</span>
                <span className="font-semibold text-blue-600">
                  {estatisticasPacientes.novos_mes}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sem consulta há 90 dias</span>
                <span className="font-semibold text-orange-600">
                  {estatisticasPacientes.sem_consulta_90_dias}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Inativos</span>
                <span className="font-semibold text-red-600">
                  {estatisticasPacientes.inativos}
                </span>
              </div>
              <a
                href="/painel/pacientes?filtro=reativacao"
                className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
              >
                Reativar pacientes →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
