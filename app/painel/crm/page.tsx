'use client'
// ============================================================
// CLINIO - Painel CRM
// Centro de relacionamento com pacientes
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  Users, MessageSquare, Target, TrendingUp, AlertCircle,
  Phone, Mail, Star, Clock, Activity, ChevronRight,
  Search, Filter, Plus, BarChart2, Zap, Heart
} from 'lucide-react'
import Link from 'next/link'
import type { MetricasCRM, OportunidadePaciente, RadarOportunidade } from '@/tipos'

// ─── Tipos Locais ─────────────────────────────────────────────

interface PacienteInativo {
  id: string
  nome: string
  telefone?: string
  email?: string
  ultima_consulta?: string
  dias_sem_consulta: number
  total_consultas: number
}

// ─── Constantes ───────────────────────────────────────────────

const CORES_PRIORIDADE = {
  alta: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  media: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  baixa: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
}

// ─── Componente Principal ─────────────────────────────────────

export default function PaginaCRM() {
  const [metricas, setMetricas] = useState<MetricasCRM | null>(null)
  const [oportunidades, setOportunidades] = useState<OportunidadePaciente[]>([])
  const [radar, setRadar] = useState<RadarOportunidade[]>([])
  const [inativos, setInativos] = useState<PacienteInativo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'radar' | 'oportunidades' | 'inativos'>('radar')
  const [busca, setBusca] = useState('')

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    try {
      const [mResp, oResp, rResp, iResp] = await Promise.all([
        fetch('/api/crm/metricas'),
        fetch('/api/crm/oportunidades?status=aberta&limite=20'),
        fetch('/api/crm/metricas?tipo=radar&dias=90'),
        fetch('/api/crm/metricas?tipo=inativos&dias=90'),
      ])

      const [mData, oData, rData, iData] = await Promise.all([
        mResp.json(), oResp.json(), rResp.json(), iResp.json(),
      ])

      if (mData.dados) setMetricas(mData.dados)
      if (oData.dados) setOportunidades(oData.dados)
      if (rData.dados) setRadar(rData.dados)
      if (iData.dados) setInativos(iData.dados)
    } catch (err) {
      console.error('Erro ao carregar CRM:', err)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const radarFiltrado = radar.filter(r =>
    busca ? r.paciente_nome.toLowerCase().includes(busca.toLowerCase()) : true
  )

  const inativosFiltrados = inativos.filter(p =>
    busca ? p.nome.toLowerCase().includes(busca.toLowerCase()) : true
  )

  const oportunidadesFiltradas = oportunidades.filter(o =>
    busca ? o.paciente?.nome?.toLowerCase().includes(busca.toLowerCase()) : true
  )

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primaria-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CRM de Pacientes</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Centro de relacionamento e comunicação com pacientes
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/painel/crm/chat"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </Link>
          <Link
            href="/painel/crm/campanhas"
            className="flex items-center gap-2 px-4 py-2 bg-primaria-600 text-white rounded-xl text-sm font-medium hover:bg-primaria-700 transition-colors shadow-sm"
          >
            <Zap className="w-4 h-4" />
            Nova Campanha
          </Link>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricaCard
          titulo="Pacientes Ativos"
          valor={metricas?.total_pacientes_ativos ?? 0}
          icone={<Users className="w-5 h-5" />}
          cor="blue"
          subtitulo="No sistema"
        />
        <MetricaCard
          titulo="Inativos (90d)"
          valor={metricas?.pacientes_inativos_90dias ?? 0}
          icone={<AlertCircle className="w-5 h-5" />}
          cor="amber"
          subtitulo="Sem consulta"
          alerta
        />
        <MetricaCard
          titulo="Oportunidades"
          valor={metricas?.oportunidades_abertas ?? 0}
          icone={<Target className="w-5 h-5" />}
          cor="purple"
          subtitulo={`${metricas?.oportunidades_alta_prioridade ?? 0} alta prioridade`}
        />
        <MetricaCard
          titulo="Taxa de Retorno"
          valor={`${metricas?.taxa_retorno ?? 0}%`}
          icone={<TrendingUp className="w-5 h-5" />}
          cor="green"
          subtitulo="Últimos 90 dias"
        />
      </div>

      {/* Links rápidos para módulos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: '/painel/crm/funil', icone: <BarChart2 className="w-5 h-5" />, label: 'Funil de Pacientes', desc: 'Acompanhe etapas do tratamento', cor: 'from-blue-500 to-blue-600' },
          { href: '/painel/crm/chat', icone: <MessageSquare className="w-5 h-5" />, label: 'Chat', desc: `${metricas?.conversas_ativas ?? 0} conversas ativas`, cor: 'from-green-500 to-emerald-600' },
          { href: '/painel/crm/campanhas', icone: <Zap className="w-5 h-5" />, label: 'Campanhas', desc: 'Dispare mensagens em massa', cor: 'from-purple-500 to-violet-600' },
          { href: '/painel/pacientes', icone: <Heart className="w-5 h-5" />, label: 'Pacientes', desc: 'Perfis completos', cor: 'from-rose-500 to-pink-600' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.cor} flex items-center justify-center text-white mb-3 shadow-sm`}>
              {item.icone}
            </div>
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{item.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Seção Principal: Abas */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Abas */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-700 px-6 pt-4">
          {[
            { key: 'radar', label: 'Radar de Oportunidades', count: radar.length },
            { key: 'oportunidades', label: 'Oportunidades Abertas', count: oportunidades.length },
            { key: 'inativos', label: 'Pacientes Inativos', count: inativos.length },
          ].map((aba) => (
            <button
              key={aba.key}
              onClick={() => setAbaAtiva(aba.key as typeof abaAtiva)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors mr-2 ${
                abaAtiva === aba.key
                  ? 'border-primaria-500 text-primaria-600 dark:text-primaria-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {aba.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                abaAtiva === aba.key
                  ? 'bg-primaria-100 text-primaria-700 dark:bg-primaria-900/40 dark:text-primaria-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {aba.count}
              </span>
            </button>
          ))}
        </div>

        {/* Barra de busca */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar paciente..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primaria-500"
            />
          </div>
        </div>

        {/* Conteúdo das abas */}
        <div className="overflow-y-auto max-h-[500px]">
          {abaAtiva === 'radar' && (
            <TabelaRadar dados={radarFiltrado} />
          )}
          {abaAtiva === 'oportunidades' && (
            <TabelaOportunidades dados={oportunidadesFiltradas} onAtualizar={carregarDados} />
          )}
          {abaAtiva === 'inativos' && (
            <TabelaInativos dados={inativosFiltrados} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────

function MetricaCard({
  titulo, valor, icone, cor, subtitulo, alerta
}: {
  titulo: string
  valor: string | number
  icone: React.ReactNode
  cor: 'blue' | 'amber' | 'purple' | 'green'
  subtitulo?: string
  alerta?: boolean
}) {
  const cores = {
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-purple-500 to-violet-600',
    green: 'from-green-500 to-emerald-600',
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cores[cor]} flex items-center justify-center text-white shadow-sm`}>
          {icone}
        </div>
        {alerta && Number(valor) > 0 && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{valor}</p>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-0.5">{titulo}</p>
      {subtitulo && <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>}
    </div>
  )
}

function TabelaRadar({ dados }: { dados: RadarOportunidade[] }) {
  if (!dados.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Activity className="w-10 h-10 mb-3 opacity-40" />
        <p className="font-medium">Nenhuma oportunidade identificada</p>
        <p className="text-sm mt-1">Todos os pacientes retornaram nos últimos 90 dias</p>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead className="bg-slate-50 dark:bg-slate-700/50">
        <tr>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Paciente</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Último Procedimento</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Dias Sem Consulta</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Prioridade</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
        {dados.map((r) => (
          <tr key={r.paciente_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primaria-400 to-primaria-600 flex items-center justify-center text-white text-xs font-bold">
                  {r.paciente_nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Link
                    href={`/painel/crm/pacientes/${r.paciente_id}`}
                    className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-primaria-600 dark:hover:text-primaria-400"
                  >
                    {r.paciente_nome}
                  </Link>
                  {r.telefone && (
                    <p className="text-xs text-slate-400">{r.telefone}</p>
                  )}
                </div>
              </div>
            </td>
            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
              {r.ultimo_procedimento ?? '—'}
            </td>
            <td className="px-6 py-4">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {r.dias_desde_ultimo === 999 ? 'Nunca consultou' : `${r.dias_desde_ultimo} dias`}
              </span>
            </td>
            <td className="px-6 py-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CORES_PRIORIDADE[r.prioridade]}`}>
                {r.prioridade}
              </span>
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                {r.telefone_whatsapp && (
                  <a
                    href={`https://wa.me/55${r.telefone_whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                )}
                {r.telefone && (
                  <a
                    href={`tel:${r.telefone}`}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Ligar"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                <Link
                  href={`/painel/crm/pacientes/${r.paciente_id}`}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Ver perfil"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TabelaOportunidades({
  dados, onAtualizar
}: {
  dados: OportunidadePaciente[]
  onAtualizar: () => void
}) {
  const converterStatus = async (id: string, novoStatus: string) => {
    await fetch(`/api/crm/oportunidades?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    })
    onAtualizar()
  }

  if (!dados.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Target className="w-10 h-10 mb-3 opacity-40" />
        <p className="font-medium">Nenhuma oportunidade aberta</p>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead className="bg-slate-50 dark:bg-slate-700/50">
        <tr>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Paciente</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Tipo</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Descrição</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Retorno Previsto</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Prioridade</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
        {dados.map((o) => (
          <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
            <td className="px-6 py-4">
              <Link
                href={`/painel/crm/pacientes/${o.paciente_id}`}
                className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-primaria-600"
              >
                {o.paciente?.nome ?? '—'}
              </Link>
            </td>
            <td className="px-6 py-4 text-xs text-slate-500">
              {o.tipo_oportunidade.replace(/_/g, ' ')}
            </td>
            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
              {o.descricao}
            </td>
            <td className="px-6 py-4 text-sm text-slate-500">
              {o.data_retorno_prevista
                ? new Date(o.data_retorno_prevista).toLocaleDateString('pt-BR')
                : '—'}
            </td>
            <td className="px-6 py-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CORES_PRIORIDADE[o.prioridade]}`}>
                {o.prioridade}
              </span>
            </td>
            <td className="px-6 py-4">
              <select
                className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300"
                value={o.status}
                onChange={e => converterStatus(o.id, e.target.value)}
              >
                <option value="aberta">Aberta</option>
                <option value="em_contato">Em Contato</option>
                <option value="convertida">Convertida</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TabelaInativos({ dados }: { dados: PacienteInativo[] }) {
  if (!dados.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Clock className="w-10 h-10 mb-3 opacity-40" />
        <p className="font-medium">Nenhum paciente inativo</p>
        <p className="text-sm mt-1">Todos os pacientes consultaram nos últimos 90 dias</p>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead className="bg-slate-50 dark:bg-slate-700/50">
        <tr>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Paciente</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Última Consulta</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Dias Parado</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Total Consultas</th>
          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Contato</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
        {dados.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold">
                  {p.nome.charAt(0).toUpperCase()}
                </div>
                <Link
                  href={`/painel/crm/pacientes/${p.id}`}
                  className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-primaria-600"
                >
                  {p.nome}
                </Link>
              </div>
            </td>
            <td className="px-6 py-4 text-sm text-slate-500">
              {p.ultima_consulta
                ? new Date(p.ultima_consulta).toLocaleDateString('pt-BR')
                : 'Nunca'}
            </td>
            <td className="px-6 py-4">
              <span className={`inline-flex items-center gap-1 text-sm font-semibold ${
                p.dias_sem_consulta > 365 ? 'text-red-600' :
                p.dias_sem_consulta > 180 ? 'text-amber-600' : 'text-slate-600'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                {p.dias_sem_consulta === 999 ? 'Nunca' : `${p.dias_sem_consulta}d`}
              </span>
            </td>
            <td className="px-6 py-4 text-sm text-slate-500">
              {p.total_consultas} consultas
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                {p.telefone && (
                  <a
                    href={`https://wa.me/55${p.telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                )}
                {p.email && (
                  <a
                    href={`mailto:${p.email}`}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="E-mail"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
