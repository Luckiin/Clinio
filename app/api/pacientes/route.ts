// ============================================================
// CLINIO - API de Pacientes
// Endpoints REST Padrão
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import {
  buscarPacientes,
  criarPaciente,
  atualizarPaciente,
  excluirPaciente
} from '@/servicos/pacientes'

export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const url = new URL(req.url)
    const busca = url.searchParams.get('busca') || undefined
    const limiteParam = url.searchParams.get('limite')
    const limite = limiteParam ? parseInt(limiteParam) : 100 // Defaults limite 100

    const pacientes = await buscarPacientes(usuario.clinica_id, { busca, limite })
    return NextResponse.json({ dados: pacientes })
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
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

    const corpo = await req.json()
    if (!corpo.nome) {
      return NextResponse.json({ erro: 'Nome do paciente é obrigatório' }, { status: 400 })
    }

    const novoPaciente = await criarPaciente(usuario.clinica_id, corpo)
    return NextResponse.json({ dados: novoPaciente }, { status: 201 })
  } catch (error: any) {
    // Tratar violação de CPF duplicado
    if (error.message?.includes('duplicate key value violates unique constraint') && error.message?.includes('cpf')) {
       return NextResponse.json({ erro: 'Já existe um paciente com este CPF na clínica.' }, { status: 409 })
    }
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ erro: 'ID obrigatório na query string' }, { status: 400 })

    const corpo = await req.json()
    const att = await atualizarPaciente(usuario.clinica_id, id, corpo)
    return NextResponse.json({ dados: att })
  } catch (error: any) {
    if (error.message?.includes('duplicate key value violates unique constraint')) {
       return NextResponse.json({ erro: 'Já existe outro paciente com este CPF.' }, { status: 409 })
    }
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

    if (!usuario || (usuario.perfil !== 'administrador')) {
      return NextResponse.json({ erro: 'Apenas administradores podem EXCLUIR do banco' }, { status: 403 })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await excluirPaciente(usuario.clinica_id, id)
    return NextResponse.json({ mensagem: 'Deletado com sucesso' })
  } catch (error: any) {
    if (error.message?.includes('violates foreign key constraint')) {
       return NextResponse.json({ erro: 'Paciente possui histórico médico e não pode ser excluído permanentemente. Tente bloqueá-lo/desativá-lo.' }, { status: 409 })
    }
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}
