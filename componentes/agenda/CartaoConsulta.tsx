'use client'
// ============================================================
// CLINIO - Cartão de Consulta para a Agenda
// Exibe uma consulta na visualização da agenda
// ============================================================

import { formatarHora } from '@/lib/formatadores'
import { rotuloDaConsulta } from '@/lib/formatadores'
import type { ConsultaComRelacoes } from '@/tipos'
import { User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface PropsCartaoConsulta {
  consulta: ConsultaComRelacoes
  aoClicar?: (consulta: ConsultaComRelacoes) => void
  aoConfirmar?: (id: string) => void
  aoCancelar?: (id: string) => void
  compacto?: boolean
}

const iconesStatus: Record<string, React.ElementType> = {
  agendado: Clock,
  confirmado: CheckCircle,
  em_atendimento: AlertCircle,
  concluido: CheckCircle,
  cancelado: XCircle,
  faltou: XCircle,
  remarcado: Clock,
}

const coresStatus: Record<string, string> = {
  agendado: 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:bg-blue-900/60',
  confirmado: 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-800 hover:bg-green-100 dark:bg-green-900/60',
  em_atendimento: 'bg-yellow-50 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/60',
  concluido: 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:bg-slate-800',
  cancelado: 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800 opacity-60',
  faltou: 'bg-orange-50 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800 opacity-60',
  remarcado: 'bg-purple-50 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:bg-purple-900/60',
}

export function CartaoConsulta({
  consulta,
  aoClicar,
  aoConfirmar,
  aoCancelar,
  compacto = false,
}: PropsCartaoConsulta) {
  const StatusIcone = iconesStatus[consulta.status] || Clock
  const rotuloStatus = rotuloDaConsulta(consulta.status)

  return (
    <div
      className={`
        relative rounded-lg border p-3 cursor-pointer transition-all duration-150
        ${coresStatus[consulta.status] || 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'}
        ${aoClicar ? 'cursor-pointer' : 'cursor-default'}
      `}
      style={{ borderLeftWidth: 4, borderLeftColor: consulta.medico?.cor_agenda || '#3B82F6' }}
      onClick={() => aoClicar?.(consulta)}
    >
      {/* Linha de horário */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">
          {formatarHora(consulta.data_hora_inicio)} - {formatarHora(consulta.data_hora_fim)}
        </span>
        <div className="flex items-center gap-1">
          <StatusIcone className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
          <span className="text-xs text-gray-500 dark:text-slate-400">{rotuloStatus.texto}</span>
        </div>
      </div>

      {/* Nome do paciente */}
      <div className="flex items-center gap-1.5 mb-1">
        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">
          {consulta.paciente?.nome}
        </span>
      </div>

      {/* Tipo de consulta e médico */}
      {!compacto && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {consulta.tipo_consulta?.nome || 'Consulta'}
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400">{consulta.medico?.nome}</span>
        </div>
      )}

      {/* Ações rápidas */}
      {(aoConfirmar || aoCancelar) && consulta.status === 'agendado' && (
        <div className="flex gap-2 mt-2 pt-2 border-t border-current/10">
          {aoConfirmar && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                aoConfirmar(consulta.id)
              }}
              className="flex-1 text-xs bg-green-600 text-white rounded px-2 py-1
                         hover:bg-green-700 transition-colors"
            >
              Confirmar
            </button>
          )}
          {aoCancelar && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                aoCancelar(consulta.id)
              }}
              className="flex-1 text-xs bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-400 rounded px-2 py-1
                         hover:bg-red-200 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
