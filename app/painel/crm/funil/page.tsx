'use client'
// ============================================================
// CLINIO - Funil de Pacientes
// Kanban visual do funil de relacionamento
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { BarChart2, Users, MessageSquare, Phone, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { EtapaFunilPaciente, EtapaFunil } from '@/tipos'

const ETAPAS: { key: EtapaFunil; label: string; cor: string; corBg: string }[] = [
  { key: 'interessado', label: 'Interessado', cor: 'text-slate-600', corBg: 'bg-slate-100 dark:bg-slate-700' },
  { key: 'avaliacao_marcada', label: 'Avaliação Marcada', cor: 'text-blue-600', corBg: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'avaliacao_realizada', label: 'Avaliação Realizada', cor: 'text-indigo-600', corBg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { key: 'tratamento_iniciado', label: 'Tratamento Iniciado', cor: 'text-violet-600', corBg: 'bg-violet-50 dark:bg-violet-900/20' },
  { key: 'tratamento_em_andamento', label: 'Em Andamento', cor: 'text-purple-600', corBg: 'bg-purple-50 dark:bg-purple-900/20' },
  { key: 'tratamento_finalizado', label: 'Finalizado', cor: 'text-emerald-600', corBg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'fidelizado', label: 'Fidelizado ⭐', cor: 'text-yellow-600', corBg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { key: 'perdido', label: 'Perdido', cor: 'text-red-500', corBg: 'bg-red-50 dark:bg-red-900/10' },
]

export default function PaginaFunil() {
  const [funil, setFunil] = useState<Record<string, EtapaFunilPaciente[]>>({})
  const [carregando, setCarregando] = useState(true)

  const carregarFunil = useCallback(async () => {
    setCarregando(true)
    try {
      const resp = await fetch('/api/crm/funil')
      const data = await resp.json()
      if (data.dados) setFunil(data.dados)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarFunil()
  }, [carregarFunil])

  const moverPaciente = async (pacienteId: string, novaEtapa: EtapaFunil) => {
    await fetch('/api/crm/funil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id: pacienteId, etapa: novaEtapa }),
    })
    await carregarFunil()
  }

  const totalPacientes = Object.values(funil).reduce((acc, arr) => acc + arr.length, 0)

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primaria-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Funil de Pacientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {totalPacientes} pacientes acompanhados no funil
          </p>
        </div>
        <Link
          href="/painel/crm"
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <BarChart2 className="w-4 h-4" />
          Voltar ao CRM
        </Link>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ETAPAS.map((etapa) => {
          const pacientes = funil[etapa.key] ?? []
          return (
            <div
              key={etapa.key}
              className="flex-shrink-0 w-64 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
            >
              {/* Cabeçalho da coluna */}
              <div className={`px-4 py-3 ${etapa.corBg} border-b border-slate-200 dark:border-slate-700`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${etapa.cor}`}>{etapa.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 ${etapa.cor}`}>
                    {pacientes.length}
                  </span>
                </div>
              </div>

              {/* Cards de pacientes */}
              <div className="p-3 space-y-2 min-h-[200px] max-h-[500px] overflow-y-auto">
                {pacientes.length === 0 ? (
                  <div className="text-center py-8 text-slate-300 dark:text-slate-600">
                    <Users className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">Nenhum paciente</p>
                  </div>
                ) : (
                  pacientes.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-3 hover:border-primaria-300 dark:hover:border-primaria-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primaria-400 to-primaria-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {item.paciente?.nome?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <Link
                          href={`/painel/crm/pacientes/${item.paciente_id}`}
                          className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-primaria-600 truncate"
                        >
                          {item.paciente?.nome}
                        </Link>
                      </div>
                      {item.observacao && (
                        <p className="text-[11px] text-slate-400 truncate mb-2">{item.observacao}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {item.paciente?.telefone && (
                            <a
                              href={`https://wa.me/55${item.paciente.telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          )}
                          {item.paciente?.telefone && (
                            <a
                              href={`tel:${item.paciente.telefone}`}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {/* Mover para próxima etapa */}
                        <select
                          className="text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 text-slate-500"
                          value={etapa.key}
                          onChange={e => moverPaciente(item.paciente_id, e.target.value as EtapaFunil)}
                        >
                          {ETAPAS.map(e => (
                            <option key={e.key} value={e.key}>{e.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
