'use client'
// ============================================================
// CLINIO - Campanhas CRM
// Gestão e envio de campanhas segmentadas
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  Zap, Plus, Users, MessageSquare, Mail, Phone,
  BarChart2, Clock, CheckCircle, XCircle, Edit,
  Target, Filter, Send
} from 'lucide-react'
import type { CampanhaCRM, TipoCampanhaCRM, StatusCampanhaCRM } from '@/tipos'

const STATUS_CONFIG: Record<StatusCampanhaCRM, { label: string; cor: string; icone: React.ElementType }> = {
  rascunho: { label: 'Rascunho', cor: 'text-slate-500 bg-slate-100 dark:bg-slate-700', icone: Edit },
  agendada: { label: 'Agendada', cor: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', icone: Clock },
  enviando: { label: 'Enviando', cor: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', icone: Send },
  concluida: { label: 'Concluída', cor: 'text-green-600 bg-green-100 dark:bg-green-900/30', icone: CheckCircle },
  cancelada: { label: 'Cancelada', cor: 'text-red-500 bg-red-100 dark:bg-red-900/20', icone: XCircle },
  pausada: { label: 'Pausada', cor: 'text-orange-500 bg-orange-100 dark:bg-orange-900/20', icone: Clock },
}

const CANAL_ICONE: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  email: Mail,
  sms: Phone,
}

export default function PaginaCampanhasCRM() {
  const [campanhas, setCampanhas] = useState<CampanhaCRM[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalNova, setModalNova] = useState(false)
  const [previewTotal, setPreviewTotal] = useState<number | null>(null)
  const [carregandoPreview, setCarregandoPreview] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroCampanha, setErroCampanha] = useState<string | null>(null)

  // Formulário
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    tipo: 'marketing' as TipoCampanhaCRM,
    canal: 'whatsapp',
    mensagem_template: '',
    filtro_dias_sem_consulta: '',
    filtro_tags: '',
    filtro_cidade: '',
    agendada_para: '',
  })

  const carregarCampanhas = useCallback(async () => {
    setCarregando(true)
    try {
      const resp = await fetch('/api/crm/campanhas')
      const data = await resp.json()
      if (data.dados) setCampanhas(data.dados)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarCampanhas()
  }, [carregarCampanhas])

  const calcularPreview = async () => {
    setCarregandoPreview(true)
    try {
      const resp = await fetch('/api/crm/campanhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'preview_destinatarios',
          filtro_dias_sem_consulta: form.filtro_dias_sem_consulta ? parseInt(form.filtro_dias_sem_consulta) : undefined,
          filtro_tags: form.filtro_tags ? form.filtro_tags.split(',').map(t => t.trim()) : undefined,
          filtro_cidade: form.filtro_cidade || undefined,
        }),
      })
      const data = await resp.json()
      setPreviewTotal(data.dados?.total ?? 0)
    } finally {
      setCarregandoPreview(false)
    }
  }

  const criarCampanha = async () => {
    if (!form.nome || !form.mensagem_template) return
    setSalvando(true)
    setErroCampanha(null)
    try {
      const resp = await fetch('/api/crm/campanhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          descricao: form.descricao,
          tipo: form.tipo,
          canal: form.canal,
          mensagem_template: form.mensagem_template,
          filtro_dias_sem_consulta: form.filtro_dias_sem_consulta ? parseInt(form.filtro_dias_sem_consulta) : undefined,
          filtro_tags: form.filtro_tags ? form.filtro_tags.split(',').map(t => t.trim()) : undefined,
          filtro_cidade: form.filtro_cidade || undefined,
          agendada_para: form.agendada_para || undefined,
        }),
      })
      if (!resp.ok) {
        const dados = await resp.json().catch(() => ({}))
        throw new Error(dados.erro || `Erro ao salvar campanha (${resp.status})`)
      }
      setModalNova(false)
      setForm({ nome: '', descricao: '', tipo: 'marketing', canal: 'whatsapp', mensagem_template: '', filtro_dias_sem_consulta: '', filtro_tags: '', filtro_cidade: '', agendada_para: '' })
      setPreviewTotal(null)
      await carregarCampanhas()
    } catch (err: unknown) {
      setErroCampanha((err as Error).message)
      console.error('Erro ao criar campanha:', err)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Campanhas CRM</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Envie mensagens segmentadas para grupos de pacientes
          </p>
        </div>
        <button
          onClick={() => setModalNova(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primaria-600 text-white rounded-xl text-sm font-medium hover:bg-primaria-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      {/* Cards de Campanhas */}
      {carregando ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primaria-500" />
        </div>
      ) : campanhas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Zap className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma campanha criada</p>
          <p className="text-sm mt-1">Crie sua primeira campanha para reativar pacientes e aumentar o faturamento</p>
          <button
            onClick={() => setModalNova(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-primaria-600 text-white rounded-xl text-sm font-medium hover:bg-primaria-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Campanha
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campanhas.map((c) => {
            const statusConf = STATUS_CONFIG[c.status]
            const StatusIcone = statusConf.icone
            const CanalIcone = CANAL_ICONE[c.canal] ?? MessageSquare

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primaria-100 dark:bg-primaria-900/30 flex items-center justify-center">
                      <CanalIcone className="w-4 h-4 text-primaria-600 dark:text-primaria-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.nome}</h3>
                      <p className="text-xs text-slate-400">{c.tipo.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${statusConf.cor}`}>
                    <StatusIcone className="w-3 h-3" />
                    {statusConf.label}
                  </span>
                </div>

                {c.descricao && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{c.descricao}</p>
                )}

                {/* Preview da mensagem */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 mb-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {c.mensagem_template}
                  </p>
                </div>

                {/* Métricas */}
                {c.status !== 'rascunho' && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { label: 'Destinos', valor: c.total_destinatarios },
                      { label: 'Enviadas', valor: c.total_enviadas },
                      { label: 'Entregues', valor: c.total_entregues },
                      { label: 'Lidas', valor: c.total_lidas },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{m.valor}</p>
                        <p className="text-[10px] text-slate-400">{m.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Users className="w-3 h-3" />
                    {c.total_destinatarios} destinatários
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dicas de Campanhas Sugeridas */}
      <div className="bg-gradient-to-br from-primaria-50 to-blue-50 dark:from-primaria-900/20 dark:to-blue-900/20 rounded-2xl border border-primaria-100 dark:border-primaria-800 p-6">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primaria-600" />
          Campanhas Sugeridas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              titulo: 'Reativação de Inativos',
              desc: 'Pacientes sem consulta há mais de 90 dias',
              tipo: 'Reativação',
              cor: 'from-amber-500 to-orange-500',
            },
            {
              titulo: 'Feliz Aniversário',
              desc: 'Mensagem automática no dia do aniversário',
              tipo: 'Aniversário',
              cor: 'from-pink-500 to-rose-500',
            },
            {
              titulo: 'Retorno de Tratamento',
              desc: 'Lembrar pacientes de agendar retorno',
              tipo: 'Retorno',
              cor: 'from-blue-500 to-indigo-500',
            },
          ].map((sugestao) => (
            <div key={sugestao.titulo} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${sugestao.cor} flex items-center justify-center text-white mb-3`}>
                <Zap className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{sugestao.titulo}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sugestao.desc}</p>
              <button
                onClick={() => {
                  setForm(f => ({ ...f, nome: sugestao.titulo, tipo: sugestao.tipo.toLowerCase() as TipoCampanhaCRM }))
                  setModalNova(true)
                }}
                className="mt-3 text-xs font-medium text-primaria-600 dark:text-primaria-400 hover:underline"
              >
                Usar modelo →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Nova Campanha */}
      {modalNova && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nova Campanha</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Informações básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Campanha *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Reativação de Pacientes Inativos"
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoCampanhaCRM }))}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                  >
                    <option value="marketing">Marketing</option>
                    <option value="reativacao">Reativação</option>
                    <option value="promocional">Promocional</option>
                    <option value="informativa">Informativa</option>
                    <option value="aniversario">Aniversário</option>
                    <option value="retorno">Retorno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Canal</label>
                  <select
                    value={form.canal}
                    onChange={e => setForm(f => ({ ...f, canal: e.target.value }))}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>

              {/* Template da mensagem */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mensagem *
                  <span className="ml-2 text-xs font-normal text-slate-400">Use {'{{nome}}'} para personalizar</span>
                </label>
                <textarea
                  value={form.mensagem_template}
                  onChange={e => setForm(f => ({ ...f, mensagem_template: e.target.value }))}
                  rows={4}
                  placeholder={`Olá, {{nome}}! Sentimos sua falta... Agende sua consulta e ganhe 10% de desconto.`}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primaria-500 resize-none"
                />
              </div>

              {/* Segmentação */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Segmentação de Público
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Dias sem consulta (mínimo)</label>
                    <input
                      type="number"
                      value={form.filtro_dias_sem_consulta}
                      onChange={e => setForm(f => ({ ...f, filtro_dias_sem_consulta: e.target.value }))}
                      placeholder="Ex: 90"
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tags (separadas por vírgula)</label>
                    <input
                      type="text"
                      value={form.filtro_tags}
                      onChange={e => setForm(f => ({ ...f, filtro_tags: e.target.value }))}
                      placeholder="Ex: VIP, recorrente"
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={form.filtro_cidade}
                      onChange={e => setForm(f => ({ ...f, filtro_cidade: e.target.value }))}
                      placeholder="Filtrar por cidade"
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Agendar para</label>
                    <input
                      type="datetime-local"
                      value={form.agendada_para}
                      onChange={e => setForm(f => ({ ...f, agendada_para: e.target.value }))}
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primaria-500"
                    />
                  </div>
                </div>

                {/* Preview de destinatários */}
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={calcularPreview}
                    disabled={carregandoPreview}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                  >
                    {carregandoPreview ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-500" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                    Calcular Público
                  </button>
                  {previewTotal !== null && (
                    <span className="text-sm font-semibold text-primaria-600 dark:text-primaria-400">
                      {previewTotal} destinatários encontrados
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 pb-2">
              {erroCampanha && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                  ⚠️ {erroCampanha}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => { setModalNova(false); setPreviewTotal(null); setErroCampanha(null) }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={criarCampanha}
                disabled={!form.nome || !form.mensagem_template || salvando}
                className="flex items-center gap-2 px-4 py-2 bg-primaria-600 text-white rounded-xl text-sm font-medium hover:bg-primaria-700 disabled:opacity-50 transition-colors"
              >
                {salvando ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {salvando ? 'Salvando...' : 'Criar Campanha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
