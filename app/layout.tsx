// ============================================================
// CLINIO - Layout Raiz da Aplicação
// ============================================================

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | Clinio',
    default: 'Clinio - Gestão de Clínicas',
  },
  description: 'Sistema SaaS completo para gestão de clínicas médicas e estéticas',
  keywords: ['clínica', 'agenda médica', 'gestão', 'pacientes', 'saúde'],
  authors: [{ name: 'Clinio' }],
}

export default function LayoutRaiz({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased bg-gray-50`}>
        {children}
      </body>
    </html>
  )
}
