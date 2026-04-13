import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { listarTagsPaciente, adicionarTag, removerTag, buscarTagsUnicas } from '@/servicos/crm'

// GET /api/crm/tags?paciente_id=... | /api/crm/tags?unicas=true
export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const pacienteId = req.nextUrl.searchParams.get('paciente_id')
    const unicas = req.nextUrl.searchParams.get('unicas')

    if (unicas === 'true') {
      const dados = await buscarTagsUnicas(usuario.clinica_id)
      return NextResponse.json({ dados })
    }

    if (!pacienteId) return NextResponse.json({ erro: 'paciente_id obrigatório' }, { status: 400 })

    const dados = await listarTagsPaciente(usuario.clinica_id, pacienteId)
    return NextResponse.json({ dados })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

// POST /api/crm/tags
export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const { paciente_id, tag, cor } = await req.json()
    if (!paciente_id || !tag) {
      return NextResponse.json({ erro: 'paciente_id e tag obrigatórios' }, { status: 400 })
    }

    const dados = await adicionarTag(usuario.clinica_id, paciente_id, tag, cor)
    return NextResponse.json({ dados }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

// DELETE /api/crm/tags?id=...
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

    await removerTag(usuario.clinica_id, id)
    return NextResponse.json({ mensagem: 'Tag removida' })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
