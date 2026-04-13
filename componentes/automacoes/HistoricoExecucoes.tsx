'use client'
// ============================================================
// CLINIO - Histórico de Execuções de Automação
// ============================================================

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react'
import type { ExecucaoAutomacao } from '@/tipos'

const ICONE_STATUS = {
  concluida: { Comp: CheckCircle2, classe: 'text-green-500' },
  erro:      { Comp: XCircle,      classe: 'text-red-500'   },
  agendada:  { Comp: Clock,        classe: 'text-blue-400'  },
  cancelada: { Comp: XCircle,      classe: 'text-gray-400'  },
}

const LABEL_STATUS: Record<string, string> = {
  concluida: 'Concluída',
  erro:      'Erro',
  agendada:  'Agendada',
  cancelada: 'Cancelada',
}

interface PropsHistoricoExecucoes {
  automacaoId: string
}

export function HistoricoExecucoes({ automacaoId }: PropsHistoricoExecucoes) {
  const [execucoes, setExecucoes] = useState<ExecucaoAutomacao[]>([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      const res = await fetch(`/api/automacoes/${automacaoId}/historico?limite=10`)
      if (res.ok) {
        const dados = await res.json()
        setExecucoes(dados.execucoes ?? [])
        setTotal(dados.total ?? 0)
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [automacaoId])

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando...
      </div>
    )
  }

  if (execucoes.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400 text-sm">
        Nenhuma execução registrada ainda.
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{total} execuções no total</p>
        <button
          onClick={carregar}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Atualizar
        </button>
      </div>

      <div className="space-y-2">
        {execucoes.map(exec => {
          const cfg = ICONE_STATUS[exec.status] ?? ICONE_STATUS.agendada
          const IconeStatus = cfg.Comp
          const dataExec = exec.executado_em ?? exec.criado_em
          const dataFmt = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
          }).format(new Date(dataExec))

          return (
            <div
              key={exec.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <IconeStatus className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.classe}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">
                    {LABEL_STATUS[exec.status]}
                  </span>
                  {exec.pacientes?.nome && (
                    <span className="text-xs text-gray-500">— {exec.pacientes.nome}</span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">{dataFmt}</span>
                </div>
                {exec.erro_mensagem && (
                  <p className="text-xs text-red-500 mt-0.5">{exec.erro_mensagem}</p>
                )}
                {exec.executar_em && exec.status === 'agendada' && (
                  <p className="text-xs text-blue-500 mt-0.5">
                    Prevista para: {new Intl.DateTimeFormat('pt-BR', {
                      day: '2-digit', month: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    }).format(new Date(exec.executar_em))}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
