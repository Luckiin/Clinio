// ============================================================
// CLINIO - API: Notificar Paciente da Lista de Espera
// POST /api/agenda/lista-espera/[id]/notificar
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { notificarPacienteListaEspera } from '@/servicos/listaEspera'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const corpo = await req.json().catch(() => ({}))
    const item = await notificarPacienteListaEspera(params.id, corpo.slot)

    return NextResponse.json({ ok: true, item })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
