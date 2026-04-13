'use client'
// ============================================================
// CLINIO - Contexto Global da Clínica
// Provê os dados da clínica atual para todos os componentes
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { criarClienteNavegador } from '@/lib/supabase-cliente'
import type { Clinica, Usuario } from '@/tipos'

interface DadosClinicaContexto {
  clinica: Clinica | null
  usuario: Usuario | null
  carregando: boolean
  recarregar: () => void
}

const ClinicaContexto = createContext<DadosClinicaContexto>({
  clinica: null,
  usuario: null,
  carregando: true,
  recarregar: () => {},
})

interface ProvedorClinicaProps {
  children: ReactNode
}

/**
 * Provedor que disponibiliza dados da clínica via Context API
 * Envolver o layout do painel com este componente
 */
export function ProvedorClinica({ children }: ProvedorClinicaProps) {
  const [clinica, setClinica] = useState<Clinica | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    try {
      const supabase = criarClienteNavegador()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setCarregando(false)
        return
      }

      const { data } = await supabase
        .from('usuarios')
        .select('*, clinica:clinicas(*)')
        .eq('id', user.id)
        .single()

      if (data) {
        setUsuario(data as unknown as Usuario)
        setClinica((data as any).clinica as Clinica)
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  return (
    <ClinicaContexto.Provider
      value={{ clinica, usuario, carregando, recarregar: carregar }}
    >
      {children}
    </ClinicaContexto.Provider>
  )
}

/**
 * Hook para acessar o contexto da clínica
 * Uso: const { clinica, usuario } = useClinica()
 */
export function useClinica() {
  const contexto = useContext(ClinicaContexto)
  if (!contexto) {
    throw new Error('useClinica deve ser usado dentro de ProvedorClinica')
  }
  return contexto
}
