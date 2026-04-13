import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { listarInteracoes, criarInteracao, excluirInteracao } from '@/servicos/crm'

// GET /api/crm/interacoes?paciente_id=...
export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const pacienteId = req.nextUrl.searchParams.get('paciente_id')
    if (!pacienteId) return NextResponse.json({ erro: 'paciente_id obrigatório' }, { status: 400 })

    const dados = await listarInteracoes(usuario.clinica_id, pacienteId)
    return NextResponse.json({ dados })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

// POST /api/crm/interacoes
export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const corpo = await req.json()
    const { paciente_id, tipo_interacao, descricao } = corpo

    if (!paciente_id || !tipo_interacao || !descricao) {
      return NextResponse.json({ erro: 'Campos obrigatórios: paciente_id, tipo_interacao, descricao' }, { status: 400 })
    }

    const dados = await criarInteracao(usuario.clinica_id, paciente_id, user.id, {
      tipo_interacao,
      descricao,
    })
    return NextResponse.json({ dados }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

// DELETE /api/crm/interacoes?id=...
export async function DELETE(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    await excluirInteracao(usuario.clinica_id, id)
    return NextResponse.json({ mensagem: 'Interação removida' })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
