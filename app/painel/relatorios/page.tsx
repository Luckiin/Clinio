'use client'
// ============================================================
// CLINIO - Dashboard de Relatórios Gerenciais
// Exibe métricas, faturamento por médico e gráficos CSS puros
// ============================================================

import { useState, useEffect } from 'react'
import { Calendar, DollarSign, Users, AlertTriangle, TrendingUp, BarChart } from 'lucide-react'
import { CartaoMetrica } from '@/componentes/ui/CartaoMetrica'
import { formatarMoeda } from '@/lib/formatadores'

export default function PaginaRelatorios() {
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  // Filtros de tempo
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  useEffect(() => {
    // Ao iniciar as datas ficam em branco, deixando pro servidor determinar o Mês Atual
    buscarDados(dataInicio, dataFim)
  }, [])

  async function buscarDados(inicio: string, fim: string) {
    setCarregando(true)
    try {
      const q = new URLSearchParams()
      if (inicio) q.append('inicio', inicio)
      if (fim) q.append('fim', fim)
      
      const res = await fetch(`/api/relatorios?${q.toString()}`)
      const json = await res.json()
      
      if (json.erro) {
        alert(json.erro)
      } else {
        setDados(json.dados)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  function aplicarFiltro(e: React.FormEvent) {
    e.preventDefault()
    buscarDados(dataInicio, dataFim)
  }

  // Cálculos para Gráficos
  const maiorFaturamentoMedico = dados?.faturamentoPorMedico?.length 
    ? Math.max(...dados.faturamentoPorMedico.map((m: any) => m.valor))
    : 1
    
  const maiorVolumeHorario = dados?.horariosMovimentados?.length
    ? Math.max(...dados.horariosMovimentados.map((h: any) => h.total))
    : 1

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios Gerenciais</h1>
          <p className="text-slate-500 text-sm">Visão panorâmica da clínica</p>
        </div>
        
        {/* Filtro por Datas */}
        <form onSubmit={aplicarFiltro} className="flex bg-white items-center gap-2 p-1 rounded-xl shadow-sm border border-slate-200">
          <input 
            type="date" 
            className="text-sm bg-transparent border-0 ring-0 text-slate-600 focus:ring-0 cursor-pointer"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
          />
          <span className="text-slate-300">ate</span>
          <input 
            type="date" 
            className="text-sm bg-transparent border-0 ring-0 text-slate-600 focus:ring-0 cursor-pointer"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
          />
          <button type="submit" className="bg-primaria-500 hover:bg-primaria-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium transition-colors">
            Filtrar
          </button>
        </form>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-20 text-slate-400 animate-pulse">
           Gerando Data Warehouse...
        </div>
      ) : dados && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Cards KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <CartaoMetrica
              titulo="Faturamento no Período"
              valor={formatarMoeda(dados.indicadores.faturamentoPeriodo)}
              icone={<DollarSign className="w-6 h-6 text-green-600" />}
              corIcone="bg-green-50 text-green-600"
              descricaoVariacao={`R$ ${dados.indicadores.faturamentoDia} faturados hoje`}
              variacao={100} // Apenas forçando exibição do descritivo
            />
            <CartaoMetrica
              titulo="Volume de Consultas"
              valor={dados.indicadores.consultasPeriodo}
              icone={<Calendar className="w-6 h-6 text-blue-600" />}
              corIcone="bg-blue-50 text-blue-600"
              descricaoVariacao={`${dados.indicadores.consultasDia} agendadas p/ hoje`}
              variacao={100}
            />
            <CartaoMetrica
              titulo="Taxa de Faltas"
              valor={`${dados.indicadores.taxaFaltas}%`}
              icone={<AlertTriangle className="w-6 h-6 text-red-500" />}
              corIcone="bg-red-50 text-red-500"
              descricaoVariacao="Baseado nos status 'Faltou'"
              variacao={-dados.indicadores.taxaFaltas}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico Faturamento por Médico */}
            <div className="cartao h-96 flex flex-col">
              <h2 className="titulo-secao flex items-center gap-2 mb-6">
                <BarChart className="w-5 h-5 text-primaria-500" />
                Faturamento por Médico
              </h2>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {dados.faturamentoPorMedico.length === 0 ? (
                  <p className="text-slate-400 text-sm">Nenhum faturamento atrelado no período.</p>
                ) : dados.faturamentoPorMedico.map((med: any) => {
                  const percentual = (med.valor / maiorFaturamentoMedico) * 100
                  return (
                    <div key={med.nome} className="group">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold text-slate-700">{med.nome}</span>
                        <span className="font-bold text-slate-900">{formatarMoeda(med.valor)}</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primaria-500 group-hover:bg-primaria-400 rounded-full transition-all duration-1000"
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Gráfico Movimento por Horário */}
            <div className="cartao h-96 flex flex-col">
              <h2 className="titulo-secao flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Horários de Pico (Consultas)
              </h2>
              <div className="flex-1 flex items-end gap-2 overflow-x-auto pb-2">
                {dados.horariosMovimentados.length === 0 ? (
                  <p className="text-slate-400 text-sm">Nenhuma consulta agendada no período.</p>
                ) : dados.horariosMovimentados.map((horario: any) => {
                  const altura = (horario.total / maiorVolumeHorario) * 100
                  return (
                    <div key={horario.hora} className="flex-1 min-w-[30px] flex flex-col items-center justify-end group">
                      <span className="text-[10px] text-slate-400 font-medium opacity-0 group-hover:opacity-100 mb-1 transition-opacity">
                        {horario.total} vol
                      </span>
                      <div 
                        className="w-full bg-emerald-200 group-hover:bg-emerald-400 rounded-t-md transition-all duration-1000 relative"
                        style={{ height: `${Math.max(10, altura)}%` }}
                      />
                      <span className="text-[10px] text-slate-500 mt-2 rotate-45 transform origin-left whitespace-nowrap">
                        {horario.hora}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mini KPIs soltos */}
            <div className="col-span-1 lg:col-span-2 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-soft flex flex-col sm:flex-row items-center justify-between">
              <div>
                <p className="text-slate-400 font-medium text-sm mb-1 uppercase tracking-wider">Crescimento de Base</p>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-3xl font-bold">{dados.indicadores.pacientesNovos}</h3>
                  <span className="text-primaria-300 text-sm">pacientes captados no período</span>
                </div>
              </div>
              <Users className="w-16 h-16 text-slate-700/50 hidden sm:block" />
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
