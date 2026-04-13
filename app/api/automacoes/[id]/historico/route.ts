import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'

// GET /api/automacoes/[id]/historico — histórico de execuções de uma automação
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: membro } = await supabase
      .from('membros_equipe')
      .select('clinica_id')
      .eq('usuario_id', user.id)
      .single()

    if (!membro) return NextResponse.json({ erro: 'Clínica não encontrada' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const limite = parseInt(searchParams.get('limite') ?? '20')
    const pagina = parseInt(searchParams.get('pagina') ?? '0')

    const { data, error, count } = await supabase
      .from('execucoes_automacoes')
      .select(`
        *,
        pacientes(nome, telefone)
      `, { count: 'exact' })
      .eq('automacao_id', params.id)
      .eq('clinica_id', membro.clinica_id)
      .order('criado_em', { ascending: false })
      .range(pagina * limite, (pagina + 1) * limite - 1)

    if (error) throw error

    return NextResponse.json({ execucoes: data, total: count })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
