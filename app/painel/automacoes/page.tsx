'use client'
// ============================================================
// CLINIO - Página de Automações
// Gerenciamento do motor de automações baseado em eventos
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  Zap, Plus, Search, Filter, AlertCircle,
  CheckCircle2, Clock, TrendingUp,
} from 'lucide-react'
import { CartaoAutomacao } from '@/componentes/automacoes/CartaoAutomacao'
import { ModalAutomacao } from '@/componentes/automacoes/ModalAutomacao'
import { HistoricoExecucoes } from '@/componentes/automacoes/HistoricoExecucoes'
import type { Automacao, EventoAutomacao } from '@/tipos'

const FILTROS_EVENTO: { value: EventoAutomacao | 'todos'; label: string }[] = [
  { value: 'todos',               label: 'Todos os eventos' },
  { value: 'consulta_criada',     label: 'Consulta criada' },
  { value: 'consulta_amanha',     label: 'Consulta amanhã' },
  { value: 'consulta_hoje',       label: 'Consulta hoje' },
  { value: 'consulta_cancelada',  label: 'Consulta cancelada' },
  { value: 'aniversario_paciente',label: 'Aniversário' },
  { value: 'paciente_inativo',    label: 'Paciente inativo' },
]

export default function PaginaAutomacoes() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroEvento, setFiltroEvento] = useState<EventoAutomacao | 'todos'>('todos')
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [automacaoEditando, setAutomacaoEditando] = useState<Automacao | null>(null)
  const [automacaoHistorico, setAutomacaoHistorico] = useState<string | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null)

  const carregarAutomacoes = useCallback(async () => {
    try {
      setErro('')
      const params = new URLSearchParams()
      if (filtroEvento !== 'todos') params.set('evento', filtroEvento)
      if (filtroAtivo !== 'todos') params.set('ativo', filtroAtivo === 'ativo' ? 'true' : 'false')

      const res = await fetch(`/api/automacoes?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar automações')
      const dados = await res.json()
      setAutomacoes(dados.automacoes ?? [])
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [filtroEvento, filtroAtivo])

  useEffect(() => { carregarAutomacoes() }, [carregarAutomacoes])

  async function handleToggleAtivo(id: string, ativo: boolean) {
    const res = await fetch(`/api/automacoes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo }),
    })
    if (res.ok) {
      setAutomacoes(prev => prev.map(a => a.id === id ? { ...a, ativo } : a))
    }
  }

  async function handleSalvar(dados: Partial<Automacao>) {
    const method = automacaoEditando ? 'PATCH' : 'POST'
    const url = automacaoEditando
      ? `/api/automacoes/${automacaoEditando.id}`
      : '/api/automacoes'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })

    if (!res.ok) {
      const erro = await res.json()
      throw new Error(erro.erro ?? 'Erro ao salvar')
    }

    await carregarAutomacoes()
    setAutomacaoEditando(null)
  }

  async function handleExcluir(id: string) {
    if (confirmandoExclusao !== id) {
      setConfirmandoExclusao(id)
      setTimeout(() => setConfirmandoExclusao(null), 3000)
      return
    }
    const res = await fetch(`/api/automacoes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAutomacoes(prev => prev.filter(a => a.id !== id))
      setConfirmandoExclusao(null)
    }
  }

  async function handleDisparar(id: string) {
    const res = await fetch(`/api/automacoes/${id}/executar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      // Feedback visual simples
      alert('Automação disparada com sucesso!')
    }
  }

  // Filtragem local por busca
  const automacoesVisiveis = automacoes.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.descricao ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  // Estatísticas
  const totalAtivas = automacoes.filter(a => a.ativo).length
  const totalInativas = automacoes.length - totalAtivas

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900/50">
      {/* Header da página */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Automações
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Motor de automações baseado em eventos — configure disparos automáticos para pacientes e consultas
              </p>
            </div>
            <button
              onClick={() => { setAutomacaoEditando(null); setModalAberto(true) }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova automação
            </button>
          </div>

          {/* Cards de estatísticas */}
          <div className="grid grid-cols-3 gap-4 mt-5">
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/60 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{automacoes.length}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Total de automações</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/60 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalAtivas}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Ativas</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-gray-200 rounded-lg">
                <Clock className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalInativas}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Inativas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Filtros */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar automações..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800"
            />
          </div>

          {/* Filtro evento */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filtroEvento}
              onChange={e => setFiltroEvento(e.target.value as EventoAutomacao | 'todos')}
              className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FILTROS_EVENTO.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Filtro status */}
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
            {(['todos', 'ativo', 'inativo'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroAtivo(f)}
                className={`px-3 py-2 text-sm capitalize transition-colors ${
                  filtroAtivo === f
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:bg-slate-900/50'
                }`}
              >
                {f === 'todos' ? 'Todos' : f === 'ativo' ? 'Ativas' : 'Inativas'}
              </button>
            ))}
          </div>
        </div>

        {/* Estado de erro */}
        {erro && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {erro}
          </div>
        )}

        {/* Estado de carregamento */}
        {carregando && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-800 p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista de automações */}
        {!carregando && (
          <>
            {automacoesVisiveis.length === 0 ? (
              <div className="text-center py-16">
                <Zap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <h3 className="text-gray-500 dark:text-slate-400 font-medium">
                  {busca || filtroEvento !== 'todos' || filtroAtivo !== 'todos'
                    ? 'Nenhuma automação encontrada com esses filtros'
                    : 'Nenhuma automação criada ainda'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {!(busca || filtroEvento !== 'todos' || filtroAtivo !== 'todos') &&
                    'Crie sua primeira automação para começar a enviar mensagens automáticas aos pacientes.'}
                </p>
                {!(busca || filtroEvento !== 'todos' || filtroAtivo !== 'todos') && (
                  <button
                    onClick={() => { setAutomacaoEditando(null); setModalAberto(true) }}
                    className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Criar automação
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {automacoesVisiveis.map(automacao => (
                  <div key={automacao.id}>
                    <CartaoAutomacao
                      automacao={automacao}
                      aoToggleAtivo={handleToggleAtivo}
                      aoEditar={a => { setAutomacaoEditando(a); setModalAberto(true) }}
                      aoExcluir={handleExcluir}
                      aoDisparar={handleDisparar}
                    />

                    {/* Confirmação de exclusão */}
                    {confirmandoExclusao === automacao.id && (
                      <div className="mt-1 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/40 rounded-lg px-3 py-2">
                        <AlertCircle className="w-4 h-4" />
                        Clique novamente em excluir para confirmar a exclusão permanente
                      </div>
                    )}

                    {/* Histórico expandido */}
                    {automacaoHistorico === automacao.id && (
                      <div className="mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Histórico de execuções
                        </h4>
                        <HistoricoExecucoes automacaoId={automacao.id} />
                      </div>
                    )}

                    <button
                      onClick={() => setAutomacaoHistorico(
                        automacaoHistorico === automacao.id ? null : automacao.id
                      )}
                      className="text-xs text-gray-400 hover:text-blue-600 dark:text-blue-400 hover:underline mt-1 ml-2"
                    >
                      {automacaoHistorico === automacao.id ? 'Ocultar histórico' : 'Ver histórico'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal criar/editar */}
      <ModalAutomacao
        aberto={modalAberto}
        automacao={automacaoEditando}
        aoFechar={() => { setModalAberto(false); setAutomacaoEditando(null) }}
        aoSalvar={handleSalvar}
      />
    </div>
  )
}
