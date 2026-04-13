'use client'
// ============================================================
// CLINIO - Cartão de Automação
// Exibe uma automação com toggle de ativo/inativo e ações
// ============================================================

import { useState } from 'react'
import {
  Bell, Calendar, CalendarX, Cake, UserX, Zap,
  MessageSquare, CheckSquare, Megaphone,
  Play, Pencil, Trash2, ChevronDown, ChevronUp, Clock,
} from 'lucide-react'
import type { Automacao, EventoAutomacao, TipoAcaoAutomacao } from '@/tipos'

const ICONE_EVENTO: Record<EventoAutomacao, React.ElementType> = {
  consulta_criada:    Calendar,
  consulta_amanha:    Bell,
  consulta_hoje:      Clock,
  consulta_cancelada: CalendarX,
  aniversario_paciente: Cake,
  paciente_inativo:   UserX,
}

const LABEL_EVENTO: Record<EventoAutomacao, string> = {
  consulta_criada:    'Consulta criada',
  consulta_amanha:    'Consulta amanhã',
  consulta_hoje:      'Consulta hoje',
  consulta_cancelada: 'Consulta cancelada',
  aniversario_paciente: 'Aniversário do paciente',
  paciente_inativo:   'Paciente inativo',
}

const ICONE_ACAO: Record<TipoAcaoAutomacao, React.ElementType> = {
  enviar_mensagem:   MessageSquare,
  criar_tarefa:      CheckSquare,
  disparar_campanha: Megaphone,
}

const LABEL_ACAO: Record<TipoAcaoAutomacao, string> = {
  enviar_mensagem:   'Enviar mensagem',
  criar_tarefa:      'Criar tarefa',
  disparar_campanha: 'Disparar campanha',
}

const COR_EVENTO: Record<EventoAutomacao, string> = {
  consulta_criada:      'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-400',
  consulta_amanha:      'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400',
  consulta_hoje:        'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-400',
  consulta_cancelada:   'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-400',
  aniversario_paciente: 'bg-pink-100 text-pink-700',
  paciente_inativo:     'bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-400',
}

interface PropsCartaoAutomacao {
  automacao: Automacao
  aoToggleAtivo: (id: string, ativo: boolean) => Promise<void>
  aoEditar: (automacao: Automacao) => void
  aoExcluir: (id: string) => void
  aoDisparar: (id: string) => void
  execucoesRecentes?: number
}

export function CartaoAutomacao({
  automacao,
  aoToggleAtivo,
  aoEditar,
  aoExcluir,
  aoDisparar,
  execucoesRecentes = 0,
}: PropsCartaoAutomacao) {
  const [expandido, setExpandido] = useState(false)
  const [alternando, setAlternando] = useState(false)

  const IconeEvento = ICONE_EVENTO[automacao.evento] ?? Zap

  async function handleToggle() {
    setAlternando(true)
    try {
      await aoToggleAtivo(automacao.id, !automacao.ativo)
    } finally {
      setAlternando(false)
    }
  }

  return (
    <div
      className={`
        bg-white dark:bg-slate-800 rounded-xl border transition-all duration-200
        ${automacao.ativo ? 'border-gray-200 dark:border-slate-700 shadow-sm' : 'border-gray-100 dark:border-slate-800 opacity-70'}
      `}
    >
      {/* Cabeçalho */}
      <div className="flex items-start gap-4 p-4">
        {/* Ícone do evento */}
        <div className={`p-2 rounded-lg flex-shrink-0 ${COR_EVENTO[automacao.evento] ?? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>
          <IconeEvento className="w-5 h-5" />
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{automacao.nome}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COR_EVENTO[automacao.evento] ?? 'bg-gray-100 dark:bg-slate-800'}`}>
              {LABEL_EVENTO[automacao.evento]}
            </span>
            {automacao.delay_horas > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                +{automacao.delay_horas}h delay
              </span>
            )}
          </div>

          {automacao.descricao && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{automacao.descricao}</p>
          )}

          {/* Resumo das ações */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {automacao.acoes.map((acao, idx) => {
              const IconeAcao = ICONE_ACAO[acao.tipo] ?? Zap
              return (
                <span key={idx} className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/50 px-2 py-1 rounded-md">
                  <IconeAcao className="w-3 h-3" />
                  {LABEL_ACAO[acao.tipo]}
                  {acao.canal && <span className="text-gray-400">({acao.canal})</span>}
                </span>
              )
            })}
          </div>
        </div>

        {/* Toggle + ações */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {execucoesRecentes > 0 && (
            <span className="text-xs text-gray-400">{execucoesRecentes} exec.</span>
          )}

          {/* Toggle on/off */}
          <button
            onClick={handleToggle}
            disabled={alternando}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
              ${automacao.ativo ? 'bg-blue-600' : 'bg-gray-300'}
              ${alternando ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            `}
            title={automacao.ativo ? 'Desativar' : 'Ativar'}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-800 shadow transition-transform duration-200
                ${automacao.ativo ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>

          {/* Ações */}
          <button
            onClick={() => aoDisparar(automacao.id)}
            className="p-1.5 rounded-md text-gray-400 hover:text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-green-900/40 transition-colors"
            title="Disparar manualmente"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={() => aoEditar(automacao)}
            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-900/40 transition-colors"
            title="Editar automação"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => aoExcluir(automacao.id)}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/40 transition-colors"
            title="Excluir automação"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Expandir detalhes */}
          <button
            onClick={() => setExpandido(!expandido)}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-50 dark:bg-slate-900/50 transition-colors"
          >
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="border-t border-gray-100 dark:border-slate-800 px-4 py-3 space-y-3">
          {/* Ações detalhadas */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Ações</p>
            <div className="space-y-2">
              {automacao.acoes.map((acao, idx) => {
                const IconeAcao = ICONE_ACAO[acao.tipo] ?? Zap
                return (
                  <div key={idx} className="flex gap-3 items-start bg-gray-50 dark:bg-slate-900/50 rounded-lg p-2.5">
                    <IconeAcao className="w-4 h-4 text-gray-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-slate-300">{LABEL_ACAO[acao.tipo]}</p>
                      {acao.template && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{acao.template}</p>
                      )}
                      {acao.titulo && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{acao.titulo}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Condições */}
          {automacao.condicoes && Object.keys(automacao.condicoes).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Condições</p>
              <div className="flex flex-wrap gap-2">
                {automacao.condicoes.sem_mensagem_ultimas_horas && (
                  <span className="text-xs bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-md">
                    Sem mensagem nas últimas {automacao.condicoes.sem_mensagem_ultimas_horas}h
                  </span>
                )}
                {automacao.condicoes.dias_sem_consulta && (
                  <span className="text-xs bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 px-2 py-1 rounded-md">
                    Inativo há {automacao.condicoes.dias_sem_consulta} dias
                  </span>
                )}
                {automacao.condicoes.status_consulta?.map(s => (
                  <span key={s} className="text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md">
                    Status: {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
