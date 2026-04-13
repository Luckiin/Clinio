'use client'
// ============================================================
// CLINIO - Componente de Botão Reutilizável
// ============================================================

import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'fantasma' | 'sucesso'
type TamanhoBotao = 'pequeno' | 'medio' | 'grande'

interface PropsBotaoAcao extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao
  tamanho?: TamanhoBotao
  carregando?: boolean
  icone?: React.ReactNode
  iconeApos?: React.ReactNode
  larguraTotal?: boolean
}

const estilosVariante: Record<VarianteBotao, string> = {
  primario: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
  secundario: 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-900/50 text-gray-700 dark:text-slate-300 border border-gray-300 shadow-sm',
  perigo: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  fantasma: 'hover:bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400',
  sucesso: 'bg-green-600 hover:bg-green-700 text-white shadow-sm',
}

const estilosTamanho: Record<TamanhoBotao, string> = {
  pequeno: 'px-3 py-1.5 text-xs',
  medio: 'px-4 py-2 text-sm',
  grande: 'px-6 py-3 text-base',
}

export function BotaoAcao({
  children,
  variante = 'primario',
  tamanho = 'medio',
  carregando = false,
  icone,
  iconeApos,
  larguraTotal = false,
  disabled,
  className,
  ...props
}: PropsBotaoAcao) {
  return (
    <button
      {...props}
      disabled={disabled || carregando}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2
        focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
        ${estilosVariante[variante]}
        ${estilosTamanho[tamanho]}
        ${larguraTotal ? 'w-full' : ''}
        ${className || ''}
      `}
    >
      {carregando ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icone && <span className="flex-shrink-0">{icone}</span>
      )}
      {children}
      {!carregando && iconeApos && (
        <span className="flex-shrink-0">{iconeApos}</span>
      )}
    </button>
  )
}
