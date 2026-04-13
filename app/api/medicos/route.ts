// ============================================================
// CLINIO - API de Médicos
// Endpoints REST para CRUD de Médicos
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import {
  buscarMedicos,
  criarMedico,
  atualizarMedico,
  deletarMedico
} from '@/servicos/medicos'

export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id, perfil').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const url = new URL(req.url)
    const busca = url.searchParams.get('busca') || undefined
    const ativoParam = url.searchParams.get('ativo')
    const ativo = ativoParam !== null ? ativoParam === 'true' : undefined

    const medicos = await buscarMedicos(usuario.clinica_id, { busca, ativo })
    return NextResponse.json({ dados: medicos })
  } catch (error: any) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id, perfil').eq('id', user.id).single()

    if (!usuario || (usuario.perfil !== 'administrador' && usuario.perfil !== 'recepcao')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const corpo = await req.json()
    if (!corpo.nome) {
      return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 })
    }

    const novoMedico = await criarMedico(usuario.clinica_id, corpo)
    return NextResponse.json({ dados: novoMedico }, { status: 201 })
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

    if (!usuario || (usuario.perfil !== 'administrador' && usuario.perfil !== 'recepcao')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ erro: 'ID do médico é obrigatório na query string' }, { status: 400 })

    const corpo = await req.json()
    const medicoAtualizado = await atualizarMedico(usuario.clinica_id, id, corpo)
    return NextResponse.json({ dados: medicoAtualizado })
  } catch (error: any) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id, perfil').eq('id', user.id).single()

    if (!usuario || usuario.perfil !== 'administrador') {
      return NextResponse.json({ erro: 'Apenas administradores podem excluir médicos' }, { status: 403 })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await deletarMedico(usuario.clinica_id, id)
    return NextResponse.json({ mensagem: 'Médico excluído com sucesso' })
  } catch (error: any) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}
