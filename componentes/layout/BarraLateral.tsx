'use client'
// ============================================================
// CLINIO - Barra Lateral de Navegação
// Componente principal de navegação do painel
// ============================================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  Users,
  DollarSign,
  Megaphone,
  Settings,
  LayoutDashboard,
  Stethoscope,
  BarChart2,
  LogOut,
  Bell,
  ChevronLeft,
  Moon,
  Sun,
  Heart,
  Plug
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { criarClienteNavegador } from '@/lib/supabase-cliente'
import { useRouter } from 'next/navigation'

interface ItemNavegacao {
  rotulo: string
  href: string
  icone: React.ElementType
  somente?: 'administrador'[]
}

const itensNavegacao: ItemNavegacao[] = [
  { rotulo: 'Painel',         href: '/painel',             icone: LayoutDashboard },
  { rotulo: 'Agenda',         href: '/painel/agenda',      icone: Calendar },
  { rotulo: 'Pacientes',      href: '/painel/pacientes',   icone: Users },
  { rotulo: 'CRM',            href: '/painel/crm',         icone: Heart },
  { rotulo: 'Financeiro',     href: '/painel/financeiro',  icone: DollarSign },
  { rotulo: 'Automações',     href: '/painel/automacoes',  icone: Bell },
  { rotulo: 'Campanhas',      href: '/painel/campanhas',   icone: Megaphone },
  { rotulo: 'Médicos',        href: '/painel/medicos',     icone: Stethoscope },
  { rotulo: 'Relatórios',     href: '/painel/relatorios',  icone: BarChart2 },
  { rotulo: 'Integrações',    href: '/painel/integracoes', icone: Plug },
  { rotulo: 'Configurações',  href: '/painel/configuracoes',icone: Settings },
]

interface PropsBarraLateral {
  nomeClinica?: string
  nomeUsuario?: string
  perfil?: string
}

export function BarraLateral({ nomeClinica, nomeUsuario, perfil }: PropsBarraLateral) {
  const caminho = usePathname()
  const roteador = useRouter()
  const [recolhida, setRecolhida] = useState(false)
  const { theme, setTheme } = useTheme()
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  async function sair() {
    const supabase = criarClienteNavegador()
    await supabase.auth.signOut()
    roteador.push('/autenticacao/entrar')
  }

  return (
    <aside
      className={`
        flex flex-col h-screen bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition-all duration-300
        ${recolhida ? 'w-20' : 'w-72'}
        fixed left-0 top-0 z-30 shadow-glass
      `}
    >
      {/* Cabeçalho da barra lateral */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100 dark:border-slate-800">
        {!recolhida && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primaria-500 to-primaria-600 flex items-center justify-center shadow-soft">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Clinio</h1>
              {nomeClinica && (
                <p className="text-[11px] text-slate-400 truncate max-w-[140px] uppercase tracking-wider font-medium">{nomeClinica}</p>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {montado && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          )}
          <button
          onClick={() => setRecolhida(!recolhida)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-700 dark:text-slate-300 transition-colors ml-auto"
          aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
        >
          <ChevronLeft
            className={`w-5 h-5 transition-transform ${recolhida ? 'rotate-180' : ''}`}
          />
        </button>
        </div>
      </div>

      {/* Itens de navegação */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {itensNavegacao.map((item) => {
          const ativo = item.href === '/painel'
            ? caminho === '/painel'
            : caminho === item.href || caminho.startsWith(item.href + '/')
          const Icone = item.icone

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 group
                ${ativo
                  ? 'bg-primaria-50/80 dark:bg-primaria-900/20 text-primaria-600 dark:text-primaria-400 font-semibold shadow-sm border border-primaria-100/50 dark:border-primaria-800/50'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
                }
                ${recolhida ? 'justify-center mx-1' : ''}
              `}
              title={recolhida ? item.rotulo : undefined}
            >
              <Icone className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${ativo ? 'text-primaria-500' : 'text-slate-400 group-hover:scale-110 group-hover:text-primaria-400'}`} />
              {!recolhida && (
                <span className="text-sm">{item.rotulo}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé da barra lateral */}
      <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Notificações */}
        <Link
          href="/notificacoes"
          className={`
            flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400
            hover:bg-white dark:bg-slate-800 hover:text-slate-800 dark:text-slate-200 hover:shadow-sm border border-transparent hover:border-slate-200 dark:border-slate-700 transition-all mb-2 group
            ${recolhida ? 'justify-center mx-1' : ''}
          `}
          title={recolhida ? 'Notificações' : undefined}
        >
          <Bell className="w-5 h-5 text-slate-400 group-hover:text-primaria-400 group-hover:scale-110 transition-transform" />
          {!recolhida && <span className="text-sm font-medium">Notificações</span>}
        </Link>

        {/* Usuário e sair */}
        {!recolhida && nomeUsuario && (
          <div className="px-3 py-2.5 mb-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs">
              {nomeUsuario.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Logado como</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-bold truncate">{nomeUsuario}</p>
              {perfil && (
                <span className="text-[10px] text-primaria-600 font-semibold uppercase">{perfil}</span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={sair}
          className={`
            w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl group
            text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:bg-red-900/40 hover:text-red-600 dark:text-red-400 hover:border-red-100 border border-transparent transition-all
            ${recolhida ? 'justify-center mx-1' : ''}
          `}
          title={recolhida ? 'Sair' : undefined}
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500 transition-colors" />
          {!recolhida && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  )
}
