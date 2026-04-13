'use client'
// ============================================================
// CLINIO - Hook de Consultas
// Gerencia estado e operações de consultas no lado cliente
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import type { ConsultaComRelacoes, StatusConsulta } from '@/tipos'

interface FiltrosConsultas {
  data_inicio?: string
  data_fim?: string
  medico_id?: string
  status?: StatusConsulta
}

interface EstadoConsultas {
  consultas: ConsultaComRelacoes[]
  total: number
  carregando: boolean
  erro: string | null
}

export function useConsultas(filtros: FiltrosConsultas = {}) {
  const [estado, setEstado] = useState<EstadoConsultas>({
    consultas: [],
    total: 0,
    carregando: true,
    erro: null,
  })

  const buscar = useCallback(async () => {
    setEstado((e) => ({ ...e, carregando: true, erro: null }))

    try {
      const params = new URLSearchParams()
      if (filtros.data_inicio) params.set('data_inicio', filtros.data_inicio)
      if (filtros.data_fim) params.set('data_fim', filtros.data_fim)
      if (filtros.medico_id) params.set('medico_id', filtros.medico_id)
      if (filtros.status) params.set('status', filtros.status)

      const resposta = await fetch(`/api/consultas?${params}`)
      if (!resposta.ok) throw new Error('Erro ao buscar consultas')

      const dados = await resposta.json()
      setEstado({
        consultas: dados.dados || [],
        total: dados.total || 0,
        carregando: false,
        erro: null,
      })
    } catch (erro: any) {
      setEstado((e) => ({ ...e, carregando: false, erro: erro.message }))
    }
  }, [filtros.data_inicio, filtros.data_fim, filtros.medico_id, filtros.status])

  useEffect(() => {
    buscar()
  }, [buscar])

  const atualizarStatus = useCallback(
    async (id: string, novoStatus: StatusConsulta, motivo?: string) => {
      const resposta = await fetch(`/api/consultas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus, motivo_cancelamento: motivo }),
      })

      if (!resposta.ok) {
        const erro = await resposta.json()
        throw new Error(erro.erro || 'Erro ao atualizar consulta')
      }

      // Atualizar localmente para resposta imediata
      setEstado((e) => ({
        ...e,
        consultas: e.consultas.map((c) =>
          c.id === id ? { ...c, status: novoStatus } : c
        ),
      }))
    },
    []
  )

  return {
    ...estado,
    buscar,
    atualizarStatus,
  }
}
