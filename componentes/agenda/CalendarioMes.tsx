'use client'
// ============================================================
// CLINIO - Calendário Mensal
// Grade 7×N com todos os dias do mês, pontos por status,
// clique no dia navega para visão diária
// ============================================================

import type { ConsultaComRelacoes, StatusConsulta } from '@/tipos'

interface PropsCalendarioMes {
  consultas: ConsultaComRelacoes[]
  ano: number
  mes: number              // 0–11 (padrão JS)
  aoClicarDia: (data: string) => void
  aoClicarConsulta: (consulta: ConsultaComRelacoes) => void
}

const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const COR_STATUS: Record<StatusConsulta, { ponto: string; fundo: string; texto: string }> = {
  agendado:       { ponto: 'bg-blue-50 dark:bg-blue-900/400',   fundo: 'bg-blue-50 dark:bg-blue-900/40',   texto: 'text-blue-800 dark:text-blue-300' },
  confirmado:     { ponto: 'bg-green-50 dark:bg-green-900/400',  fundo: 'bg-green-50 dark:bg-green-900/40',  texto: 'text-green-800 dark:text-green-300' },
  em_atendimento: { ponto: 'bg-yellow-50 dark:bg-yellow-900/400', fundo: 'bg-yellow-50 dark:bg-yellow-900/40', texto: 'text-yellow-800 dark:text-yellow-300' },
  concluido:      { ponto: 'bg-gray-400',   fundo: 'bg-gray-100 dark:bg-slate-800',  texto: 'text-gray-600 dark:text-slate-400' },
  cancelado:      { ponto: 'bg-red-400',    fundo: 'bg-red-50 dark:bg-red-900/40',    texto: 'text-red-700 dark:text-red-400' },
  faltou:         { ponto: 'bg-orange-400', fundo: 'bg-orange-50 dark:bg-orange-900/40', texto: 'text-orange-700 dark:text-orange-400' },
  remarcado:      { ponto: 'bg-purple-400', fundo: 'bg-purple-50 dark:bg-purple-900/40', texto: 'text-purple-700 dark:text-purple-400' },
}

export function CalendarioMes({
  consultas,
  ano,
  mes,
  aoClicarDia,
  aoClicarConsulta,
}: PropsCalendarioMes) {
  const hoje = new Date()
  const hojeISO = hoje.toISOString().split('T')[0]

  // Gerar grade do mês
  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)
  const inicioDaSemana = primeiroDia.getDay() // 0=dom

  // Células: dias do mês anterior (preenchimento) + dias do mês + próximo
  const totalCelulas = Math.ceil((inicioDaSemana + ultimoDia.getDate()) / 7) * 7
  const celulas: (Date | null)[] = []

  for (let i = 0; i < totalCelulas; i++) {
    const diaOffset = i - inicioDaSemana + 1
    if (diaOffset < 1 || diaOffset > ultimoDia.getDate()) {
      celulas.push(null)
    } else {
      celulas.push(new Date(ano, mes, diaOffset))
    }
  }

  function consultasDoDia(data: Date): ConsultaComRelacoes[] {
    const dataStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
    return consultas
      .filter((c) => c.data_hora_inicio.startsWith(dataStr))
      .sort((a, b) => a.data_hora_inicio.localeCompare(b.data_hora_inicio))
  }

  const MAX_VISIVEIS = 3 // máximo de consultas exibidas por célula

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col h-full">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700">
        {DIAS_SEMANA_CURTO.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div
        className="grid grid-cols-7 flex-1"
        style={{ gridTemplateRows: `repeat(${totalCelulas / 7}, minmax(0, 1fr))` }}
      >
        {celulas.map((dia, idx) => {
          if (!dia) {
            return (
              <div
                key={`vazio-${idx}`}
                className="border-b border-r border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 last:border-r-0"
              />
            )
          }

          const dataStr = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`
          const ehHoje = dataStr === hojeISO
          const ehFimDeSemana = dia.getDay() === 0 || dia.getDay() === 6
          const consultasDia = consultasDoDia(dia)
          const total = consultasDia.length
          const excedente = total - MAX_VISIVEIS

          return (
            <div
              key={dataStr}
              className={`
                border-b border-r border-gray-100 dark:border-slate-800 last:border-r-0 flex flex-col
                ${ehFimDeSemana ? 'bg-gray-50/50' : 'bg-white dark:bg-slate-800'}
                ${ehHoje ? 'ring-1 ring-inset ring-blue-400' : ''}
              `}
            >
              {/* Número do dia */}
              <button
                onClick={() => aoClicarDia(dataStr)}
                className="flex items-start justify-between px-2 pt-1.5 pb-0.5 hover:bg-gray-50 dark:bg-slate-900/50 transition-colors group"
              >
                <span
                  className={`
                    text-sm font-semibold leading-none w-6 h-6 flex items-center justify-center rounded-full
                    transition-colors group-hover:bg-blue-100 dark:bg-blue-900/60 group-hover:text-blue-700 dark:text-blue-400
                    ${ehHoje
                      ? 'bg-blue-600 text-white group-hover:bg-blue-700 group-hover:text-white'
                      : ehFimDeSemana
                        ? 'text-gray-400'
                        : 'text-gray-800 dark:text-slate-200'
                    }
                  `}
                >
                  {dia.getDate()}
                </span>

                {/* Contagem compacta se houver muitas consultas */}
                {total > 0 && (
                  <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                    {total}
                  </span>
                )}
              </button>

              {/* Consultas */}
              <div className="flex-1 px-1 pb-1 space-y-0.5 overflow-hidden">
                {consultasDia.slice(0, MAX_VISIVEIS).map((consulta) => {
                  const cor = COR_STATUS[consulta.status]
                  const hora = new Date(consulta.data_hora_inicio).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit',
                  })
                  const primeiroNome = consulta.paciente?.nome?.split(' ')[0] || '—'

                  return (
                    <button
                      key={consulta.id}
                      onClick={(e) => { e.stopPropagation(); aoClicarConsulta(consulta) }}
                      className={`
                        w-full text-left rounded px-1.5 py-0.5 text-[11px] flex items-center gap-1
                        ${cor.fundo} ${cor.texto} hover:opacity-80 transition-opacity truncate
                      `}
                      title={`${hora} — ${consulta.paciente?.nome}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cor.ponto}`} />
                      <span className="truncate font-medium">{hora} {primeiroNome}</span>
                    </button>
                  )
                })}

                {excedente > 0 && (
                  <button
                    onClick={() => aoClicarDia(dataStr)}
                    className="w-full text-[11px] text-blue-600 dark:text-blue-400 hover:underline text-left px-1.5"
                  >
                    +{excedente} mais
                  </button>
                )}

                {/* Área clicável vazia */}
                {total === 0 && (
                  <button
                    onClick={() => aoClicarDia(dataStr)}
                    className="w-full h-full min-h-[24px] rounded hover:bg-blue-50 dark:bg-blue-900/40 transition-colors"
                    title="Agendar neste dia"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legenda de status */}
      <div className="border-t border-gray-100 dark:border-slate-800 px-4 py-2 flex flex-wrap gap-x-4 gap-y-1">
        {(
          [
            ['agendado', 'Agendado'],
            ['confirmado', 'Confirmado'],
            ['em_atendimento', 'Em atendimento'],
            ['concluido', 'Concluído'],
            ['cancelado', 'Cancelado'],
            ['faltou', 'Faltou'],
          ] as [StatusConsulta, string][]
        ).map(([status, label]) => (
          <span key={status} className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400">
            <span className={`w-2 h-2 rounded-full ${COR_STATUS[status].ponto}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
