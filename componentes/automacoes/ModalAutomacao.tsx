'use client'
// ============================================================
// CLINIO - Modal de Criação / Edição de Automação
// ============================================================

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type {
  Automacao, EventoAutomacao, TipoAcaoAutomacao,
  AcaoAutomacao, CanalComunicacao,
} from '@/tipos'

const EVENTOS: { value: EventoAutomacao; label: string; descricao: string }[] = [
  { value: 'consulta_criada',      label: 'Consulta criada',          descricao: 'Disparado quando uma nova consulta é agendada' },
  { value: 'consulta_amanha',      label: 'Consulta amanhã',          descricao: 'Disparado no dia anterior à consulta' },
  { value: 'consulta_hoje',        label: 'Consulta hoje',            descricao: 'Disparado no dia da consulta' },
  { value: 'consulta_cancelada',   label: 'Consulta cancelada',       descricao: 'Disparado quando uma consulta é cancelada' },
  { value: 'aniversario_paciente', label: 'Aniversário do paciente',  descricao: 'Disparado no aniversário do paciente' },
  { value: 'paciente_inativo',     label: 'Paciente inativo',         descricao: 'Disparado quando paciente fica sem consulta por N dias' },
]

const TIPOS_ACAO: { value: TipoAcaoAutomacao; label: string }[] = [
  { value: 'enviar_mensagem',   label: 'Enviar mensagem' },
  { value: 'criar_tarefa',      label: 'Criar tarefa' },
  { value: 'disparar_campanha', label: 'Disparar campanha' },
]

const CANAIS: { value: CanalComunicacao; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email',    label: 'E-mail' },
  { value: 'sms',      label: 'SMS' },
]

const VARIAVEIS_TEMPLATE = [
  '{{nome_paciente}}', '{{nome_medico}}', '{{data_consulta}}',
  '{{hora_consulta}}', '{{nome_clinica}}', '{{link_confirmacao}}',
]

interface PropsModalAutomacao {
  aberto: boolean
  automacao?: Automacao | null
  aoFechar: () => void
  aoSalvar: (dados: Partial<Automacao>) => Promise<void>
}

const ACAO_VAZIA: AcaoAutomacao = { tipo: 'enviar_mensagem', canal: 'whatsapp', template: '' }

export function ModalAutomacao({ aberto, automacao, aoFechar, aoSalvar }: PropsModalAutomacao) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [evento, setEvento] = useState<EventoAutomacao>('consulta_amanha')
  const [delayHoras, setDelayHoras] = useState(0)
  const [acoes, setAcoes] = useState<AcaoAutomacao[]>([{ ...ACAO_VAZIA }])
  const [condSemMensagem, setCondSemMensagem] = useState<number | ''>('')
  const [condDiasSemConsulta, setCondDiasSemConsulta] = useState<number | ''>('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const edicao = !!automacao

  useEffect(() => {
    if (automacao) {
      setNome(automacao.nome)
      setDescricao(automacao.descricao ?? '')
      setEvento(automacao.evento)
      setDelayHoras(automacao.delay_horas ?? 0)
      setAcoes(automacao.acoes.length ? automacao.acoes : [{ ...ACAO_VAZIA }])
      setCondSemMensagem(automacao.condicoes?.sem_mensagem_ultimas_horas ?? '')
      setCondDiasSemConsulta(automacao.condicoes?.dias_sem_consulta ?? '')
    } else {
      setNome('')
      setDescricao('')
      setEvento('consulta_amanha')
      setDelayHoras(0)
      setAcoes([{ ...ACAO_VAZIA }])
      setCondSemMensagem('')
      setCondDiasSemConsulta('')
    }
    setErro('')
  }, [automacao, aberto])

  function atualizarAcao(idx: number, campo: keyof AcaoAutomacao, valor: string) {
    setAcoes(prev => prev.map((a, i) => i === idx ? { ...a, [campo]: valor } : a))
  }

  function adicionarAcao() {
    setAcoes(prev => [...prev, { ...ACAO_VAZIA }])
  }

  function removerAcao(idx: number) {
    if (acoes.length === 1) return
    setAcoes(prev => prev.filter((_, i) => i !== idx))
  }

  function inserirVariavel(idx: number, variavel: string) {
    setAcoes(prev => prev.map((a, i) => {
      if (i !== idx) return a
      return { ...a, template: (a.template ?? '') + variavel }
    }))
  }

  async function handleSalvar() {
    if (!nome.trim()) { setErro('Informe um nome para a automação'); return }
    if (acoes.some(a => a.tipo === 'enviar_mensagem' && !a.template?.trim())) {
      setErro('Preencha o template de todas as ações de mensagem'); return
    }

    setSalvando(true)
    setErro('')
    try {
      const condicoes: Record<string, unknown> = {}
      if (condSemMensagem !== '') condicoes.sem_mensagem_ultimas_horas = Number(condSemMensagem)
      if (condDiasSemConsulta !== '') condicoes.dias_sem_consulta = Number(condDiasSemConsulta)

      await aoSalvar({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        evento,
        delay_horas: delayHoras,
        acoes,
        condicoes,
      })
      aoFechar()
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {edicao ? 'Editar automação' : 'Nova automação'}
          </h2>
          <button onClick={aoFechar} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex.: Lembrete 24h antes"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Opcional — descreva o objetivo desta automação"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Evento disparador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evento disparador *</label>
            <select
              value={evento}
              onChange={e => setEvento(e.target.value as EventoAutomacao)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {EVENTOS.map(ev => (
                <option key={ev.value} value={ev.value}>{ev.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {EVENTOS.find(ev => ev.value === evento)?.descricao}
            </p>
          </div>

          {/* Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delay (horas após o evento)
            </label>
            <input
              type="number"
              min={0}
              max={8760}
              value={delayHoras}
              onChange={e => setDelayHoras(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              0 = imediato. Ex.: 24 = executar 24h após o evento
            </p>
          </div>

          {/* Condições */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Condições (opcional)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sem mensagem nas últimas X horas</label>
                <input
                  type="number"
                  min={1}
                  value={condSemMensagem}
                  onChange={e => setCondSemMensagem(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="Ex.: 24"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Paciente inativo há X dias</label>
                <input
                  type="number"
                  min={1}
                  value={condDiasSemConsulta}
                  onChange={e => setCondDiasSemConsulta(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="Ex.: 180"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Ações */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Ações *</h3>
              <button
                onClick={adicionarAcao}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar ação
              </button>
            </div>

            <div className="space-y-3">
              {acoes.map((acao, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Ação {idx + 1}</span>
                    {acoes.length > 1 && (
                      <button
                        onClick={() => removerAcao(idx)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Tipo */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                    <select
                      value={acao.tipo}
                      onChange={e => atualizarAcao(idx, 'tipo', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {TIPOS_ACAO.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Canal (só para enviar_mensagem) */}
                  {acao.tipo === 'enviar_mensagem' && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Canal</label>
                      <select
                        value={acao.canal ?? 'whatsapp'}
                        onChange={e => atualizarAcao(idx, 'canal', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CANAIS.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Template (enviar_mensagem) */}
                  {acao.tipo === 'enviar_mensagem' && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Mensagem</label>
                      <textarea
                        value={acao.template ?? ''}
                        onChange={e => atualizarAcao(idx, 'template', e.target.value)}
                        placeholder="Ex.: Olá {{nome_paciente}}, lembramos que sua consulta é amanhã às {{hora_consulta}}."
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {/* Variáveis de template */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {VARIAVEIS_TEMPLATE.map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => inserirVariavel(idx, v)}
                            className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Título (criar_tarefa) */}
                  {acao.tipo === 'criar_tarefa' && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Título da tarefa</label>
                      <input
                        type="text"
                        value={acao.titulo ?? ''}
                        onChange={e => atualizarAcao(idx, 'titulo', e.target.value)}
                        placeholder="Ex.: Ligar para {{nome_paciente}}"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={aoFechar}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Salvando...' : edicao ? 'Salvar alterações' : 'Criar automação'}
          </button>
        </div>
      </div>
    </div>
  )
}
