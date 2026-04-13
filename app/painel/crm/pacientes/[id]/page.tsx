'use client'
// ============================================================
// CLINIO - Perfil Completo do Paciente (CRM)
// Página com timeline, tags, interações e oportunidades
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Phone, Mail, Calendar, Clock, Star, Target,
  MessageSquare, Plus, Tag, Activity, DollarSign, User,
  CheckCircle, XCircle, AlertCircle, Edit3, Trash2,
  Award, TrendingUp, Heart, ChevronDown, Send
} from 'lucide-react'
import type {
  PerfilCompletoPaciente, TipoInteracao, TipoOportunidade,
  PrioridadeOportunidade, EtapaFunil, NivelPaciente
} from '@/tipos'

// ─── Constantes ───────────────────────────────────────────────

const ETAPAS_FUNIL: EtapaFunil[] = [
  'interessado', 'avaliacao_marcada', 'avaliacao_realizada',
  'tratamento_iniciado', 'tratamento_em_andamento', 'tratamento_finalizado',
  'fidelizado', 'perdido',
]

const LABELS_ETAPA: Record<EtapaFunil, string> = {
  interessado: 'Interessado',
  avaliacao_marcada: 'Avaliação Marcada',
  avaliacao_realizada: 'Avaliação Realizada',
  tratamento_iniciado: 'Tratamento Iniciado',
  tratamento_em_andamento: 'Em Andamento',
  tratamento_finalizado: 'Finalizado',
  fidelizado: 'Fidelizado',
  perdido: 'Perdido',
}

const NIVEL_CONFIG: Record<NivelPaciente, { cor: string; label: string }> = {
  bronze: { cor: 'text-amber-700 bg-amber-100 border-amber-300', label: '🥉 Bronze' },
  prata: { cor: 'text-slate-600 bg-slate-100 border-slate-300', label: '🥈 Prata' },
  ouro: { cor: 'text-yellow-700 bg-yellow-100 border-yellow-300', label: '🥇 Ouro' },
  diamante: { cor: 'text-blue-700 bg-blue-100 border-blue-300', label: '💎 Diamante' },
}

const COR_EVENTO: Record<string, string> = {
  consulta_realizada: '#10B981',
  consulta_agendada: '#3B82F6',
  consulta_cancelada: '#EF4444',
  pagamento: '#F59E0B',
  interacao: '#8B5CF6',
  anotacao: '#6B7280',
  mensagem_enviada: '#06B6D4',
  mensagem_recebida: '#0EA5E9',
  oportunidade: '#F97316',
  cadastro: '#6366F1',
}

const ICONE_INTERACAO: Record<TipoInteracao, typeof Phone> = {
  ligacao: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  presencial: User,
  anotacao: Edit3,
  outro: Activity,
}

// ─── Componente Principal ─────────────────────────────────────

export default function PerfilPacienteCRM() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const pacienteId = params.id

  const [perfil, setPerfil] = useState<PerfilCompletoPaciente | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'timeline' | 'interacoes' | 'oportunidades' | 'chat'>('timeline')

  // Estados para modais
  const [modalInteracao, setModalInteracao] = useState(false)
  const [modalOportunidade, setModalOportunidade] = useState(false)
  const [modalTag, setModalTag] = useState(false)
  const [novaTag, setNovaTag] = useState('')
  const [corTag, setCorTag] = useState('#3B82F6')

  // Formulário de interação
  const [tipoInteracao, setTipoInteracao] = useState<TipoInteracao>('anotacao')
  const [descricaoInteracao, setDescricaoInteracao] = useState('')
  const [salvandoInteracao, setSalvandoInteracao] = useState(false)

  // Formulário de oportunidade
  const [tipoOportunidade, setTipoOportunidade] = useState<TipoOportunidade>('retorno_consulta')
  const [descricaoOpor, setDescricaoOpor] = useState('')
  const [dataRetorno, setDataRetorno] = useState('')
  const [prioridadeOpor, setPrioridadeOpor] = useState<PrioridadeOportunidade>('media')
  const [salvandoOpor, setSalvandoOpor] = useState(false)

  const carregarPerfil = useCallback(async () => {
    setCarregando(true)
    try {
      const resp = await fetch(`/api/crm/perfil?paciente_id=${pacienteId}`)
      const data = await resp.json()
      if (data.dados) setPerfil(data.dados)
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
    } finally {
      setCarregando(false)
    }
  }, [pacienteId])

  useEffect(() => {
    carregarPerfil()
  }, [carregarPerfil])

  const salvarInteracao = async () => {
    if (!descricaoInteracao.trim()) return
    setSalvandoInteracao(true)
    try {
      await fetch('/api/crm/interacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          tipo_interacao: tipoInteracao,
          descricao: descricaoInteracao,
        }),
      })
      setModalInteracao(false)
      setDescricaoInteracao('')
      await carregarPerfil()
    } finally {
      setSalvandoInteracao(false)
    }
  }

  const salvarOportunidade = async () => {
    if (!descricaoOpor.trim()) return
    setSalvandoOpor(true)
    try {
      await fetch('/api/crm/oportunidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          tipo_oportunidade: tipoOportunidade,
          descricao: descricaoOpor,
          data_retorno_prevista: dataRetorno || undefined,
          prioridade: prioridadeOpor,
        }),
      })
      setModalOportunidade(false)
      setDescricaoOpor('')
      await carregarPerfil()
    } finally {
      setSalvandoOpor(false)
    }
  }

  const adicionarTag = async () => {
    if (!novaTag.trim()) return
    await fetch('/api/crm/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paciente_id: pacienteId,
        tag: novaTag.trim(),
        cor: corTag,
      }),
    })
    setModalTag(false)
    setNovaTag('')
    await carregarPerfil()
  }

  const removerTag = async (tagId: string) => {
    await fetch(`/api/crm/tags?id=${tagId}`, { method: 'DELETE' })
    await carregarPerfil()
  }

  const alterarEtapaFunil = async (etapa: EtapaFunil) => {
    await fetch('/api/crm/funil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: pacienteId, etapa }),
    })
    await carregarPerfil()
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primaria-500" />
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <User className="w-12 h-12 mb-3 opacity-40" />
        <p>Paciente não encontrado</p>
      </div>
    )
  }

  const { paciente, pontuacao, etapa_funil, tags, timeline, oportunidades, interacoes_recentes } = perfil
  const nivel = pontuacao?.nivel ?? 'bronze'
  const nivelConfig = NIVEL_CONFIG[nivel]

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Botão Voltar */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao CRM
      </button>

      {/* Cabeçalho do Perfil */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primaria-400 to-primaria-600 flex items-center justify-center text-white text-3xl font-bold shadow-md">
              {paciente.nome.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Info Principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{paciente.nome}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  {paciente.telefone && (
                    <a href={`tel:${paciente.telefone}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-primaria-600 transition-colors">
                      <Phone className="w-3.5 h-3.5" /> {paciente.telefone}
                    </a>
                  )}
                  {paciente.email && (
                    <a href={`mailto:${paciente.email}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-primaria-600 transition-colors">
                      <Mail className="w-3.5 h-3.5" /> {paciente.email}
                    </a>
                  )}
                  {paciente.data_nascimento && (
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>

              {/* Nível */}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${nivelConfig.cor}`}>
                <Award className="w-4 h-4 mr-1" />
                {nivelConfig.label} — {pontuacao?.pontuacao_total ?? 0} pts
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {tags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white group"
                  style={{ backgroundColor: t.cor }}
                >
                  <Tag className="w-3 h-3" />
                  {t.tag}
                  <button
                    onClick={() => removerTag(t.id)}
                    className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => setModalTag(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:border-primaria-400 hover:text-primaria-500 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Adicionar Tag
              </button>
            </div>

            {/* Etapa do Funil */}
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Funil:</span>
                <select
                  value={etapa_funil?.etapa ?? ''}
                  onChange={e => e.target.value && alterarEtapaFunil(e.target.value as EtapaFunil)}
                  className="text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300"
                >
                  <option value="">Sem etapa</option>
                  {ETAPAS_FUNIL.map(e => (
                    <option key={e} value={e}>{LABELS_ETAPA[e]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Indicadores rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
          <IndicadorRapido
            icone={<Calendar className="w-4 h-4" />}
            label="Última Consulta"
            valor={perfil.ultima_consulta
              ? new Date(perfil.ultima_consulta.data_hora_inicio).toLocaleDateString('pt-BR')
              : 'Nunca'}
            cor="blue"
          />
          <IndicadorRapido
            icone={<Clock className="w-4 h-4" />}
            label="Próxima Consulta"
            valor={perfil.proxima_consulta
              ? new Date(perfil.proxima_consulta.data_hora_inicio).toLocaleDateString('pt-BR')
              : 'Não agendada'}
            cor="green"
          />
          <IndicadorRapido
            icone={<Activity className="w-4 h-4" />}
            label="Total de Consultas"
            valor={`${perfil.total_consultas} realizadas`}
            cor="purple"
          />
          <IndicadorRapido
            icone={<DollarSign className="w-4 h-4" />}
            label="Valor Total Gasto"
            valor={perfil.valor_total_gasto.toLocaleString('pt-BR', {
              style: 'currency', currency: 'BRL'
            })}
            cor="amber"
          />
        </div>
      </div>

      {/* Conteúdo principal: Abas + Botões de Ação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal (timeline + abas) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Abas */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-200 dark:border-slate-700 px-4 pt-3">
              {[
                { key: 'timeline', label: 'Timeline', count: timeline.length },
                { key: 'interacoes', label: 'Interações', count: interacoes_recentes.length },
                { key: 'oportunidades', label: 'Oportunidades', count: oportunidades.length },
              ].map((aba) => (
                <button
                  key={aba.key}
                  onClick={() => setAbaAtiva(aba.key as typeof abaAtiva)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    abaAtiva === aba.key
                      ? 'border-primaria-500 text-primaria-600 dark:text-primaria-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  {aba.label}
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">
                    {aba.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-4 max-h-[600px] overflow-y-auto">
              {/* Timeline */}
              {abaAtiva === 'timeline' && (
                <div className="space-y-1">
                  {timeline.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>Nenhum evento na timeline</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Linha vertical */}
                      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-700" />
                      <div className="space-y-4">
                        {timeline.map((evento) => (
                          <div key={evento.id} className="flex gap-4 relative">
                            {/* Bolinha */}
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 z-10 shadow-sm"
                              style={{ backgroundColor: evento.cor ?? '#6B7280' }}
                            >
                              <IconeEvento tipo={evento.tipo} />
                            </div>
                            {/* Conteúdo */}
                            <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  {evento.titulo}
                                </p>
                                <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                                  {new Date(evento.data).toLocaleDateString('pt-BR', {
                                    day: '2-digit', month: 'short', year: 'numeric'
                                  })}
                                </span>
                              </div>
                              {evento.descricao && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {evento.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interações */}
              {abaAtiva === 'interacoes' && (
                <div className="space-y-3">
                  <button
                    onClick={() => setModalInteracao(true)}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-primaria-50 dark:bg-primaria-900/20 border border-dashed border-primaria-300 dark:border-primaria-700 rounded-xl text-sm font-medium text-primaria-600 dark:text-primaria-400 hover:bg-primaria-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Nova Interação
                  </button>
                  {interacoes_recentes.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>Nenhuma interação registrada</p>
                    </div>
                  ) : (
                    interacoes_recentes.map((i) => {
                      const Icone = ICONE_INTERACAO[i.tipo_interacao] ?? Activity
                      return (
                        <div key={i.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                            <Icone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {i.tipo_interacao.replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(i.criado_em).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{i.descricao}</p>
                            {i.usuario?.nome && (
                              <p className="text-xs text-slate-400 mt-1">por {i.usuario.nome}</p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* Oportunidades */}
              {abaAtiva === 'oportunidades' && (
                <div className="space-y-3">
                  <button
                    onClick={() => setModalOportunidade(true)}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-primaria-50 dark:bg-primaria-900/20 border border-dashed border-primaria-300 dark:border-primaria-700 rounded-xl text-sm font-medium text-primaria-600 dark:text-primaria-400 hover:bg-primaria-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Oportunidade
                  </button>
                  {oportunidades.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>Nenhuma oportunidade cadastrada</p>
                    </div>
                  ) : (
                    oportunidades.map((o) => (
                      <div key={o.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              {o.tipo_oportunidade.replace(/_/g, ' ')}
                            </span>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                              {o.descricao}
                            </p>
                            {o.data_retorno_prevista && (
                              <p className="text-xs text-slate-400 mt-1">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Retorno previsto: {new Date(o.data_retorno_prevista).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                              o.prioridade === 'alta' ? 'text-red-600 bg-red-50 border-red-200' :
                              o.prioridade === 'media' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                              'text-green-600 bg-green-50 border-green-200'
                            }`}>
                              {o.prioridade}
                            </span>
                            <span className="text-xs text-slate-400">{o.status}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna lateral: Ações Rápidas */}
        <div className="space-y-4">
          {/* Ações de Contato */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Ações Rápidas</h3>
            <div className="space-y-2">
              {paciente.telefone_whatsapp && (
                <a
                  href={`https://wa.me/55${paciente.telefone_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full px-3 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Enviar WhatsApp
                </a>
              )}
              {paciente.telefone && (
                <a
                  href={`tel:${paciente.telefone}`}
                  className="flex items-center gap-3 w-full px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Ligar
                </a>
              )}
              {paciente.email && (
                <a
                  href={`mailto:${paciente.email}`}
                  className="flex items-center gap-3 w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Enviar E-mail
                </a>
              )}
              <button
                onClick={() => setModalInteracao(true)}
                className="flex items-center gap-3 w-full px-3 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Registrar Interação
              </button>
              <button
                onClick={() => setModalOportunidade(true)}
                className="flex items-center gap-3 w-full px-3 py-2.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors"
              >
                <Target className="w-4 h-4" />
                Adicionar Oportunidade
              </button>
            </div>
          </div>

          {/* Pontuação Detalhada */}
          {pontuacao && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Pontuação de Relacionamento
              </h3>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{pontuacao.pontuacao_total}</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border mt-1 ${nivelConfig.cor}`}>
                  {nivelConfig.label}
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Consultas', valor: pontuacao.pontos_consultas },
                  { label: 'Valor Gasto', valor: pontuacao.pontos_valor_gasto },
                  { label: 'Fidelidade', valor: pontuacao.pontos_fidelidade },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{item.label}</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">+{item.valor} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {paciente.observacoes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Observações Internas
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-300">{paciente.observacoes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Nova Interação */}
      {modalInteracao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Registrar Interação</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                  <select
                    value={tipoInteracao}
                    onChange={e => setTipoInteracao(e.target.value as TipoInteracao)}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                  >
                    <option value="ligacao">Ligação Telefônica</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="presencial">Presencial</option>
                    <option value="anotacao">Anotação Interna</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                  <textarea
                    value={descricaoInteracao}
                    onChange={e => setDescricaoInteracao(e.target.value)}
                    rows={4}
                    placeholder="Descreva a interação..."
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primaria-500 resize-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setModalInteracao(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarInteracao}
                disabled={salvandoInteracao || !descricaoInteracao.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primaria-600 text-white rounded-xl text-sm font-medium hover:bg-primaria-700 disabled:opacity-50 transition-colors"
              >
                {salvandoInteracao ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Oportunidade */}
      {modalOportunidade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Nova Oportunidade</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                  <select
                    value={tipoOportunidade}
                    onChange={e => setTipoOportunidade(e.target.value as TipoOportunidade)}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                  >
                    <option value="retorno_consulta">Retorno de Consulta</option>
                    <option value="tratamento_incompleto">Tratamento Incompleto</option>
                    <option value="avaliacao_pendente">Avaliação Pendente</option>
                    <option value="renovacao_procedimento">Renovação de Procedimento</option>
                    <option value="indicacao">Indicação</option>
                    <option value="reativacao">Reativação</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                  <textarea
                    value={descricaoOpor}
                    onChange={e => setDescricaoOpor(e.target.value)}
                    rows={3}
                    placeholder="Descreva a oportunidade..."
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primaria-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Retorno</label>
                    <input
                      type="date"
                      value={dataRetorno}
                      onChange={e => setDataRetorno(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prioridade</label>
                    <select
                      value={prioridadeOpor}
                      onChange={e => setPrioridadeOpor(e.target.value as PrioridadeOportunidade)}
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setModalOportunidade(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarOportunidade}
                disabled={salvandoOpor || !descricaoOpor.trim()}
                className="px-4 py-2 bg-primaria-600 text-white rounded-xl text-sm font-medium hover:bg-primaria-700 disabled:opacity-50 transition-colors"
              >
                {salvandoOpor ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Tag */}
      {modalTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Adicionar Tag</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  value={novaTag}
                  onChange={e => setNovaTag(e.target.value)}
                  placeholder="Nome da tag (ex: VIP, Recorrente)"
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 dark:text-slate-300">Cor:</label>
                  <input
                    type="color"
                    value={corTag}
                    onChange={e => setCorTag(e.target.value)}
                    className="w-10 h-8 rounded cursor-pointer border border-slate-200"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'].map(c => (
                      <button
                        key={c}
                        onClick={() => setCorTag(c)}
                        className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: corTag === c ? 'currentColor' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>
                {novaTag && (
                  <div className="flex justify-center">
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: corTag }}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      {novaTag}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setModalTag(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarTag}
                disabled={!novaTag.trim()}
                className="px-4 py-2 bg-primaria-600 text-white rounded-xl text-sm font-medium hover:bg-primaria-700 disabled:opacity-50 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Auxiliares ───────────────────────────────────────────────

function IndicadorRapido({
  icone, label, valor, cor
}: {
  icone: React.ReactNode
  label: string
  valor: string
  cor: 'blue' | 'green' | 'purple' | 'amber'
}) {
  const cores = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  }
  return (
    <div className="text-center">
      <div className={`w-8 h-8 rounded-lg ${cores[cor]} flex items-center justify-center mx-auto mb-2`}>
        {icone}
      </div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{valor}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

function IconeEvento({ tipo }: { tipo: string }) {
  const tamanho = 'w-4 h-4'
  switch (tipo) {
    case 'consulta_realizada': return <CheckCircle className={tamanho} />
    case 'consulta_agendada': return <Calendar className={tamanho} />
    case 'consulta_cancelada': return <XCircle className={tamanho} />
    case 'pagamento': return <DollarSign className={tamanho} />
    case 'interacao':
    case 'anotacao': return <Edit3 className={tamanho} />
    case 'mensagem_enviada':
    case 'mensagem_recebida': return <MessageSquare className={tamanho} />
    case 'oportunidade': return <Target className={tamanho} />
    case 'cadastro': return <User className={tamanho} />
    default: return <Activity className={tamanho} />
  }
}
