// ============================================================
// CLINIO - Layout do Painel Principal
// Inclui barra lateral e cabeçalho
// ============================================================

import { redirect } from 'next/navigation'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { BarraLateral } from '@/componentes/layout/BarraLateral'

export default async function LayoutPainel({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await criarClienteServidor()

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/autenticacao/entrar')
  }

  // Buscar dados do usuário e clínica
  const { data: usuario } = await supabase
    .from('membros_equipe')
    .select('perfil, clinica:clinicas(nome), usuarios(nome)')
    .eq('usuario_id', user.id)
    .single()

  const nomeClinica = (usuario?.clinica as any)?.nome
  const nomeUsuario = (usuario?.usuarios as any)?.nome
  const perfil = usuario?.perfil

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50 selection:bg-primaria-200 selection:text-primaria-900">
      {/* Barra lateral */}
      <BarraLateral
        nomeClinica={nomeClinica}
        nomeUsuario={nomeUsuario}
        perfil={perfil}
      />

      {/* Área principal de conteúdo */}
      <main className="flex-1 overflow-y-auto ml-72 transition-all duration-300">
        <div className="min-h-screen px-8 py-8 w-full max-w-[1600px] mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
