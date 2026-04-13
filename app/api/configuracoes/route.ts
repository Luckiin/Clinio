// ============================================================
// CLINIO - API de Configurações
// Recuperar e Gravar dados nativos da Clínica
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { buscarConfiguracoes, atualizarConfiguracoes } from '@/servicos/configuracoes'

export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id, perfil').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const conf = await buscarConfiguracoes(usuario.clinica_id)
    return NextResponse.json({ dados: conf })
  } catch (error: any) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id, perfil').eq('id', user.id).single()

    if (!usuario || usuario.perfil !== 'administrador') {
      return NextResponse.json({ erro: 'Apenas administradores podem editar a clínica' }, { status: 403 })
    }

    const corpo = await req.json()
    const novaConf = await atualizarConfiguracoes(
      usuario.clinica_id, 
      corpo.dadosBasicos, 
      corpo.configuracoes
    )
    
    return NextResponse.json({ dados: novaConf })
  } catch (error: any) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}
