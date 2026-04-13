// ============================================================
// CLINIO - API de Consulta Individual
// Rotas: GET /api/consultas/[id]  PATCH /api/consultas/[id]  DELETE /api/consultas/[id]
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import {
  buscarConsultaPorId,
  atualizarStatusConsulta,
  atualizarDadosConsulta,
} from '@/servicos/consultas'
import type { StatusConsulta } from '@/tipos'

interface Parametros {
  params: { id: string }
}

/**
 * GET /api/consultas/[id]
 * Retorna os detalhes de uma consulta específica
 */
export async function GET(_req: NextRequest, { params }: Parametros) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const consulta = await buscarConsultaPorId(params.id, usuario.clinica_id)
    if (!consulta) return NextResponse.json({ erro: 'Consulta não encontrada' }, { status: 404 })

    return NextResponse.json({ dados: consulta })
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}

/**
 * PATCH /api/consultas/[id]
 * Atualiza o status ou dados clínicos de uma consulta
 */
export async function PATCH(requisicao: NextRequest, { params }: Parametros) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id, perfil')
      .eq('id', user.id)
      .single()

    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const corpo = await requisicao.json()

    // Atualizar status se fornecido
    if (corpo.status) {
      await atualizarStatusConsulta(
        params.id,
        usuario.clinica_id,
        corpo.status as StatusConsulta,
        { motivo_cancelamento: corpo.motivo_cancelamento }
      )
    }

    // Atualizar dados clínicos se fornecidos (apenas médico ou admin)
    if (
      (corpo.anamnese || corpo.diagnostico || corpo.prescricao) &&
      ['medico', 'administrador'].includes(usuario.perfil)
    ) {
      await atualizarDadosConsulta(params.id, usuario.clinica_id, {
        anamnese: corpo.anamnese,
        diagnostico: corpo.diagnostico,
        prescricao: corpo.prescricao,
        observacoes: corpo.observacoes,
        valor: corpo.valor,
      })
    }

    return NextResponse.json({ mensagem: 'Consulta atualizada com sucesso' })
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}

/**
 * DELETE /api/consultas/[id]
 * Cancela uma consulta (soft delete via status)
 */
export async function DELETE(requisicao: NextRequest, { params }: Parametros) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id, perfil')
      .eq('id', user.id)
      .single()

    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const corpo = await requisicao.json().catch(() => ({}))

    await atualizarStatusConsulta(
      params.id,
      usuario.clinica_id,
      'cancelado',
      { motivo_cancelamento: corpo.motivo }
    )

    return NextResponse.json({ mensagem: 'Consulta cancelada com sucesso' })
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}
