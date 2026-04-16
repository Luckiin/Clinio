// ============================================================
// CLINIO - Layout Raiz da Aplicação
// ============================================================

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ProvedorTema } from '@/componentes/tema/ProvedorTema'
import { Toaster } from 'sonner'

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
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-gray-50 dark:bg-slate-900/50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300`}>
        <ProvedorTema attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ProvedorTema>
      </body>
    </html>
  )
}
