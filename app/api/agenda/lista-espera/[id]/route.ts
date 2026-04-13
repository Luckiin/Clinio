// ============================================================
// CLINIO - API: Lista de Espera — Item Individual
// PATCH /api/agenda/lista-espera/[id] → atualizar item
// DELETE /api/agenda/lista-espera/[id] → remover
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { atualizarItemListaEspera } from '@/servicos/listaEspera'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const corpo = await req.json()
    const item = await atualizarItemListaEspera(params.id, corpo)

    return NextResponse.json({ item })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    await supabase.from('lista_espera').delete().eq('id', params.id)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
