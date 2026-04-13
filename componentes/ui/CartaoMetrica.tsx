'use client'
// ============================================================
// CLINIO - Cartão de Métrica para o Dashboard
// Exibe KPIs com ícone, valor e variação percentual
// ============================================================

import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PropsCartaoMetrica {
  titulo: string
  valor: string | number
  variacao?: number
  descricaoVariacao?: string
  icone: ReactNode
  corIcone?: string
  carregando?: boolean
}

export function CartaoMetrica({
  titulo,
  valor,
  variacao,
  descricaoVariacao,
  icone,
  corIcone = 'text-blue-600 dark:text-blue-400',
  carregando = false,
}: PropsCartaoMetrica) {
  const variacaoPositiva = variacao !== undefined && variacao >= 0

  if (carregando) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">{titulo}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{valor}</p>

          {variacao !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {variacaoPositiva ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${variacaoPositiva ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {variacao > 0 ? '+' : ''}{variacao?.toFixed(1)}%
              </span>
              {descricaoVariacao && (
                <span className="text-xs text-gray-400">{descricaoVariacao}</span>
              )}
            </div>
          )}
        </div>

        <div className={`p-3 rounded-xl bg-gray-50 dark:bg-slate-900/50 ${corIcone}`}>
          {icone}
        </div>
      </div>
    </div>
  )
}
