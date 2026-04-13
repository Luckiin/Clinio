// ============================================================
// CLINIO - API: Previsão de Faltas
// GET /api/previsao-faltas?data=YYYY-MM-DD&limite=10
// Retorna consultas com alta probabilidade de falta
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { buscarConsultasAltoRisco } from '@/servicos/previsaoFaltas'

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
    const limite = parseInt(params.get('limite') || '10')
    const limiarMinimo = parseInt(params.get('limiar') || '40')

    const consultasAltoRisco = await buscarConsultasAltoRisco(
      usuario.clinica_id,
      data,
      limiarMinimo
    )

    // Os campos já vêm formatados por buscarConsultasAltoRisco
    const formatadas = consultasAltoRisco.slice(0, limite).map((c) => ({
      consulta_id: c.consulta_id,
      paciente_id: c.paciente_id,
      paciente_nome: c.paciente_nome,
      paciente_telefone: c.paciente_telefone,
      medico_nome: c.medico_nome,
      hora: c.hora,
      probabilidade: c.probabilidade,
      fatores: c.fatores_risco,
    }))

    return NextResponse.json({
      consultas_alto_risco: formatadas,
      total: formatadas.length,
      data,
    })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
