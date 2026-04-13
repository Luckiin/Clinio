import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { dispararEvento } from '@/servicos/motorAutomacoes'

// POST /api/automacoes/[id]/executar — disparo manual de automação
export async function POST(
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

    // Busca a automação
    const { data: automacao, error: errAuto } = await supabase
      .from('automacoes')
      .select('*')
      .eq('id', params.id)
      .eq('clinica_id', membro.clinica_id)
      .single()

    if (errAuto || !automacao) {
      return NextResponse.json({ erro: 'Automação não encontrada' }, { status: 404 })
    }

    const corpo = await req.json().catch(() => ({}))
    const { paciente_id, consulta_id } = corpo

    // Dispara o evento da automação com contexto manual
    await dispararEvento(automacao.evento, {
      clinica_id: membro.clinica_id,
      paciente_id,
      consulta_id,
      disparo_manual: true,
      automacao_id_especifica: params.id,
    })

    // Registra execução manual
    await supabase.from('execucoes_automacoes').insert({
      automacao_id: params.id,
      clinica_id: membro.clinica_id,
      paciente_id,
      consulta_id,
      status: 'concluida',
      executado_em: new Date().toISOString(),
      resultado: { tipo: 'manual', disparado_por: user.id },
      contexto: corpo,
    })

    return NextResponse.json({ sucesso: true, mensagem: 'Automação disparada com sucesso' })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
