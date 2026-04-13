'use client'
// ============================================================
// CLINIO - Alerte de Risco de Falta
// Exibe pacientes com alta probabilidade de não comparecer
// e sugere ações: confirmação antecipada, encaixe preventivo
// ============================================================

import { useState } from 'react'
import { AlertTriangle, Phone, MessageSquare, CheckCircle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { formatarTelefone } from '@/lib/formatadores'

interface ConsultaAltoRisco {
  consulta_id: string
  paciente_id: string
  paciente_nome: string
  paciente_telefone?: string
  medico_nome?: string
  hora: string
  probabilidade: number
  fatores: string[]
}

interface PropsAlerteRiscoFalta {
  consultas: ConsultaAltoRisco[]
  aoConfirmarPresenca?: (consultaId: string) => Promise<void>
  aoEnviarLembrete?: (consultaId: string) => Promise<void>
}

const COR_RISCO = (prob: number) => {
  if (prob >= 70) return { borda: 'border-red-300', fundo: 'bg-red-50', texto: 'text-red-700', badge: 'bg-red-600' }
  if (prob >= 50) return { borda: 'border-orange-300', fundo: 'bg-orange-50', texto: 'text-orange-700', badge: 'bg-orange-500' }
  return { borda: 'border-yellow-300', fundo: 'bg-yellow-50', texto: 'text-yellow-700', badge: 'bg-yellow-500' }
}

export function AlerteRiscoFalta({
  consultas,
  aoConfirmarPresenca,
  aoEnviarLembrete,
}: PropsAlerteRiscoFalta) {
  const [expandido, setExpandido] = useState(true)
  const [descartados, setDescartados] = useState<Set<string>>(new Set())
  const [processando, setProcessando] = useState<Record<string, 'confirmando' | 'lembrando' | null>>({})

  const visiveis = consultas.filter((c) => !descartados.has(c.consulta_id))

  if (visiveis.length === 0) return null

  async function confirmar(consultaId: string) {
    setProcessando((p) => ({ ...p, [consultaId]: 'confirmando' }))
    try {
      await aoConfirmarPresenca?.(consultaId)
      setDescartados((d) => new Set([...Array.from(d), consultaId]))
    } finally {
      setProcessando((p) => ({ ...p, [consultaId]: null }))
    }
  }

  async function enviarLembrete(consultaId: string) {
    setProcessando((p) => ({ ...p, [consultaId]: 'lembrando' }))
    try {
      await aoEnviarLembrete?.(consultaId)
    } finally {
      setProcessando((p) => ({ ...p, [consultaId]: null }))
    }
  }

  const maisAlto = Math.max(...visiveis.map((c) => c.probabilidade))
  const cores = COR_RISCO(maisAlto)

  return (
    <div className={`rounded-xl border ${cores.borda} overflow-hidden`}>
      {/* Cabeçalho */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 ${cores.fundo} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${cores.texto}`} />
          <span className={`font-semibold text-sm ${cores.texto}`}>
            Risco de Falta Hoje
          </span>
          <span className={`${cores.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
            {visiveis.length}
          </span>
        </div>
        {expandido ? (
          <ChevronUp className={`w-4 h-4 ${cores.texto}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${cores.texto}`} />
        )}
      </button>

      {/* Lista */}
      {expandido && (
        <div className="divide-y divide-gray-100 bg-white">
          {visiveis.map((consulta) => {
            const c = COR_RISCO(consulta.probabilidade)
            const acao = processando[consulta.consulta_id]

            return (
              <div key={consulta.consulta_id} className="p-3">
                <div className="flex items-start gap-3">
                  {/* Indicador de probabilidade */}
                  <div className="flex flex-col items-center min-w-[48px]">
                    <div className={`${c.badge} text-white text-xs font-bold px-2 py-1 rounded-lg text-center`}>
                      {consulta.probabilidade}%
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5">risco</span>
                  </div>

                  {/* Info da consulta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">{consulta.paciente_nome}</span>
                      <span className="text-xs text-gray-500">{consulta.hora}</span>
                      {consulta.medico_nome && (
                        <span className="text-xs text-gray-400">— {consulta.medico_nome}</span>
                      )}
                    </div>

                    {consulta.paciente_telefone && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatarTelefone(consulta.paciente_telefone)}
                        </span>
                      </div>
                    )}

                    {/* Fatores de risco */}
                    {consulta.fatores.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {consulta.fatores.map((fator, i) => (
                          <span
                            key={i}
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${c.fundo} ${c.texto} border-current`}
                          >
                            {fator}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {aoEnviarLembrete && (
                      <button
                        onClick={() => enviarLembrete(consulta.consulta_id)}
                        disabled={!!acao}
                        title="Enviar lembrete agora"
                        className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {acao === 'lembrando' ? (
                          <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MessageSquare className="w-3 h-3" />
                        )}
                        Lembrete
                      </button>
                    )}

                    {aoConfirmarPresenca && (
                      <button
                        onClick={() => confirmar(consulta.consulta_id)}
                        disabled={!!acao}
                        title="Marcar como confirmado"
                        className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {acao === 'confirmando' ? (
                          <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        Confirmou
                      </button>
                    )}

                    <button
                      onClick={() => setDescartados((d) => new Set([...Array.from(d), consulta.consulta_id]))}
                      title="Dispensar alerta"
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Ignorar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dica */}
      {expandido && (
        <div className={`px-4 py-2 ${cores.fundo} border-t ${cores.borda}`}>
          <p className={`text-xs ${cores.texto} opacity-80`}>
            💡 Envie um lembrete ou ligue agora para reduzir faltas e liberar vagas para a lista de espera.
          </p>
        </div>
      )}
    </div>
  )
}
