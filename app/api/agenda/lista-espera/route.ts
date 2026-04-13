// ============================================================
// CLINIO - API: Lista de Espera
// GET  /api/agenda/lista-espera  → listar itens
// POST /api/agenda/lista-espera  → adicionar à lista
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import {
  buscarListaEspera,
  adicionarListaEspera,
} from '@/servicos/listaEspera'

export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const params = req.nextUrl.searchParams
    const medicoId = params.get('medico_id') || undefined
    const data = params.get('data') || undefined
    const status = params.get('status')?.split(',') || undefined

    const itens = await buscarListaEspera(usuario.clinica_id, { medicoId, data, status })

    return NextResponse.json({ itens })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const corpo = await req.json()

    const item = await adicionarListaEspera({
      clinicaId: usuario.clinica_id,
      pacienteId: corpo.paciente_id,
      medicoId: corpo.medico_id,
      tipoConsultaId: corpo.tipo_consulta_id,
      dataPreferida: corpo.data_preferida,
      horarioPreferidoInicio: corpo.horario_preferido_inicio,
      horarioPreferidoFim: corpo.horario_preferido_fim,
      prioridade: corpo.prioridade ?? 2,
      observacoes: corpo.observacoes,
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (err: any) {
    const status = err.message.includes('já está na lista') ? 409 : 500
    return NextResponse.json({ erro: err.message }, { status })
  }
}
