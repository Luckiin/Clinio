'use client'
// ============================================================
// CLINIO - Calendário Semanal
// Visão de 7 dias com resumo de consultas por médico
// ============================================================

import Link from 'next/link'
import { nomeDiaSemana } from '@/lib/formatadores'
import { rotuloDaConsulta } from '@/lib/formatadores'
import type { ConsultaComRelacoes, StatusConsulta } from '@/tipos'

interface PropsCalendarioSemanal {
  consultas: ConsultaComRelacoes[]
  dataInicio: Date       // Segunda da semana
  aoClicarDia: (data: string) => void
  aoClicarConsulta: (consulta: ConsultaComRelacoes) => void
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const COR_STATUS: Record<StatusConsulta, string> = {
  agendado:      'bg-blue-400',
  confirmado:    'bg-green-500',
  em_atendimento:'bg-yellow-400',
  concluido:     'bg-gray-400',
  cancelado:     'bg-red-400',
  faltou:        'bg-orange-400',
  remarcado:     'bg-purple-400',
}

export function CalendarioSemanal({
  consultas,
  dataInicio,
  aoClicarDia,
  aoClicarConsulta,
}: PropsCalendarioSemanal) {
  const hoje = new Date().toISOString().split('T')[0]

  // Gerar os 7 dias da semana
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(dataInicio)
    d.setDate(d.getDate() + i)
    return d
  })

  function consultasDoDia(d: Date): ConsultaComRelacoes[] {
    const dataStr = d.toISOString().split('T')[0]
    return consultas
      .filter((c) => c.data_hora_inicio.startsWith(dataStr))
      .sort((a, b) => a.data_hora_inicio.localeCompare(b.data_hora_inicio))
  }

  return (
    <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
      {dias.map((dia, i) => {
        const dataStr = dia.toISOString().split('T')[0]
        const ehHoje = dataStr === hoje
        const consultasDia = consultasDoDia(dia)
        const totalDia = consultasDia.length

        return (
          <div
            key={dataStr}
            className="bg-white flex flex-col min-h-[180px]"
          >
            {/* Cabeçalho do dia */}
            <button
              onClick={() => aoClicarDia(dataStr)}
              className={`
                w-full px-2 pt-2 pb-1.5 text-center border-b border-gray-100
                hover:bg-gray-50 transition-colors
                ${ehHoje ? 'bg-blue-50' : ''}
              `}
            >
              <p className={`text-xs font-medium ${ehHoje ? 'text-blue-600' : 'text-gray-500'}`}>
                {DIAS_SEMANA[dia.getDay()]}
              </p>
              <p className={`
                text-lg font-bold leading-tight
                ${ehHoje
                  ? 'w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mt-0.5'
                  : 'text-gray-800'
                }
              `}>
                {dia.getDate()}
              </p>
              {totalDia > 0 && (
                <span className="text-xs text-gray-400">{totalDia} consulta{totalDia !== 1 ? 's' : ''}</span>
              )}
            </button>

            {/* Consultas do dia */}
            <div className="flex-1 p-1.5 space-y-1 overflow-y-auto max-h-[200px]">
              {consultasDia.slice(0, 5).map((consulta) => (
                <button
                  key={consulta.id}
                  onClick={() => aoClicarConsulta(consulta)}
                  className={`
                    w-full text-left rounded px-1.5 py-1 text-xs truncate
                    hover:opacity-80 transition-opacity flex items-center gap-1
                    ${COR_STATUS[consulta.status]} bg-opacity-20
                  `}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${COR_STATUS[consulta.status]}`}
                  />
                  <span className="font-medium truncate">
                    {new Date(consulta.data_hora_inicio).toLocaleTimeString('pt-BR', {
                      hour: '2-digit', minute: '2-digit'
                    })}{' '}
                    {consulta.paciente?.nome?.split(' ')[0]}
                  </span>
                </button>
              ))}

              {consultasDia.length > 5 && (
                <button
                  onClick={() => aoClicarDia(dataStr)}
                  className="w-full text-xs text-blue-600 text-center py-0.5 hover:underline"
                >
                  +{consultasDia.length - 5} mais
                </button>
              )}

              {consultasDia.length === 0 && (
                <button
                  onClick={() => aoClicarDia(dataStr)}
                  className="w-full h-full flex items-center justify-center text-gray-300 text-xs"
                >
                  + Agendar
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
