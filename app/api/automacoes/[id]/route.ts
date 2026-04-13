import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'

// PATCH /api/automacoes/[id] — atualiza automação (toggle ativo, editar config)
export async function PATCH(
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

    const corpo = await req.json()

    // Só permite atualizar campos seguros
    const camposPermitidos = ['nome', 'descricao', 'evento', 'condicoes', 'acoes', 'delay_horas', 'ativo']
    const atualizacao: Record<string, unknown> = {}
    for (const campo of camposPermitidos) {
      if (campo in corpo) atualizacao[campo] = corpo[campo]
    }

    if (Object.keys(atualizacao).length === 0) {
      return NextResponse.json({ erro: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('automacoes')
      .update(atualizacao)
      .eq('id', params.id)
      .eq('clinica_id', membro.clinica_id)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ erro: 'Automação não encontrada' }, { status: 404 })

    return NextResponse.json({ automacao: data })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}

// DELETE /api/automacoes/[id] — remove automação
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: membro } = await supabase
      .from('membros_equipe')
      .select('clinica_id, perfil')
      .eq('usuario_id', user.id)
      .single()

    if (!membro) return NextResponse.json({ erro: 'Clínica não encontrada' }, { status: 403 })

    const { error } = await supabase
      .from('automacoes')
      .delete()
      .eq('id', params.id)
      .eq('clinica_id', membro.clinica_id)

    if (error) throw error

    return NextResponse.json({ sucesso: true })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
