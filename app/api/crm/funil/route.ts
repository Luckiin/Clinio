import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { listarFunilPacientes, definirEtapaFunil } from '@/servicos/crm'
import type { EtapaFunil } from '@/tipos'

// GET /api/crm/funil
export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const dados = await listarFunilPacientes(usuario.clinica_id)
    return NextResponse.json({ dados })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

// POST /api/crm/funil
export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const { paciente_id, etapa, observacao } = await req.json()
    if (!paciente_id || !etapa) {
      return NextResponse.json({ erro: 'paciente_id e etapa obrigatórios' }, { status: 400 })
    }

    const dados = await definirEtapaFunil(
      usuario.clinica_id,
      paciente_id,
      etapa as EtapaFunil,
      observacao
    )
    return NextResponse.json({ dados })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
