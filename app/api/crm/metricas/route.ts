import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { buscarMetricasCRM, buscarRadarOportunidades, listarPacientesInativos } from '@/servicos/crm'

// GET /api/crm/metricas
// GET /api/crm/metricas?tipo=radar&dias=90
// GET /api/crm/metricas?tipo=inativos&dias=90
export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const tipo = req.nextUrl.searchParams.get('tipo')
    const dias = parseInt(req.nextUrl.searchParams.get('dias') ?? '90')

    if (tipo === 'radar') {
      const dados = await buscarRadarOportunidades(usuario.clinica_id, dias)
      return NextResponse.json({ dados })
    }

    if (tipo === 'inativos') {
      const dados = await listarPacientesInativos(usuario.clinica_id, dias)
      return NextResponse.json({ dados })
    }

    const dados = await buscarMetricasCRM(usuario.clinica_id)
    return NextResponse.json({ dados })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
