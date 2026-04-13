import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { buscarPerfilCompleto, recalcularPontuacao } from '@/servicos/crm'

// GET /api/crm/perfil?paciente_id=...
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

    const dados = await buscarPerfilCompleto(usuario.clinica_id, pacienteId)
    return NextResponse.json({ dados })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

// POST /api/crm/perfil/recalcular?paciente_id=... — recalcular pontuação
export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const pacienteId = req.nextUrl.searchParams.get('paciente_id')
    if (!pacienteId) return NextResponse.json({ erro: 'paciente_id obrigatório' }, { status: 400 })

    const dados = await recalcularPontuacao(usuario.clinica_id, pacienteId)
    return NextResponse.json({ dados })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
