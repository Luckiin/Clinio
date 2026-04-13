'use client'
// ============================================================
// CLINIO - Hook de Autenticação
// Gerencia o estado de autenticação do usuário no lado cliente
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import { criarClienteNavegador } from '@/lib/supabase-cliente'
import type { Usuario } from '@/tipos'

interface EstadoAutenticacao {
  usuario: Usuario | null
  carregando: boolean
  autenticado: boolean
}

export function useAutenticacao(): EstadoAutenticacao {
  const [estado, setEstado] = useState<EstadoAutenticacao>({
    usuario: null,
    carregando: true,
    autenticado: false,
  })

  const buscarPerfil = useCallback(async (userId: string) => {
    const supabase = criarClienteNavegador()
    const { data } = await supabase
      .from('usuarios')
      .select('*, clinica:clinicas(*)')
      .eq('id', userId)
      .single()

    setEstado({
      usuario: data as Usuario | null,
      carregando: false,
      autenticado: !!data,
    })
  }, [])

  useEffect(() => {
    const supabase = criarClienteNavegador()

    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        buscarPerfil(session.user.id)
      } else {
        setEstado({ usuario: null, carregando: false, autenticado: false })
      }
    })

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_evento, sessao) => {
        if (sessao?.user) {
          buscarPerfil(sessao.user.id)
        } else {
          setEstado({ usuario: null, carregando: false, autenticado: false })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [buscarPerfil])

  return estado
}
