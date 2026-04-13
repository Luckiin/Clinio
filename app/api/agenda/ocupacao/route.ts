// ============================================================
// CLINIO - API: Taxa de Ocupação da Agenda
// GET /api/agenda/ocupacao?data=YYYY-MM-DD&medico_id=
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { calcularTaxaOcupacao } from '@/servicos/agenda'

export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const params = req.nextUrl.searchParams
    const data = params.get('data') || new Date().toISOString().split('T')[0]
    const medicoId = params.get('medico_id') || undefined

    const resultado = await calcularTaxaOcupacao(usuario.clinica_id, data, medicoId)

    return NextResponse.json(resultado)
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
