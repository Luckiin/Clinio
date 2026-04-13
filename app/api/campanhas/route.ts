// ============================================================
// CLINIO - API de Campanhas de Marketing
// Rotas: GET /api/campanhas  POST /api/campanhas
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import type { SegmentacaoCampanha, TipoCampanha, CanalComunicacao } from '@/tipos'

/**
 * GET /api/campanhas
 * Lista campanhas da clínica
 */
export async function GET(requisicao: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    const params = requisicao.nextUrl.searchParams
    const status = params.get('status')

    let consulta = supabase
      .from('campanhas')
      .select('*', { count: 'exact' })
      .eq('clinica_id', usuario.clinica_id)
      .order('criado_em', { ascending: false })

    if (status) consulta = consulta.eq('status', status)

    const { data, error, count } = await consulta

    if (error) throw error

    return NextResponse.json({ dados: data, total: count })
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}

/**
 * POST /api/campanhas
 * Cria uma nova campanha
 */
export async function POST(requisicao: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id, perfil').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    if (usuario.perfil !== 'administrador') {
      return NextResponse.json({ erro: 'Apenas administradores podem criar campanhas' }, { status: 403 })
    }

    const corpo = await requisicao.json()

    if (!corpo.nome || !corpo.mensagem_template) {
      return NextResponse.json({ erro: 'Nome e template da mensagem são obrigatórios' }, { status: 400 })
    }

    // Contar destinatários com base na segmentação
    const totalDestinatarios = await contarDestinatarios(
      usuario.clinica_id,
      corpo.segmentacao || {}
    )

    const { data: campanha, error } = await supabase
      .from('campanhas')
      .insert({
        clinica_id: usuario.clinica_id,
        nome: corpo.nome,
        descricao: corpo.descricao,
        tipo: (corpo.tipo as TipoCampanha) || 'marketing',
        canal: (corpo.canal as CanalComunicacao) || 'whatsapp',
        mensagem_template: corpo.mensagem_template,
        segmentacao: corpo.segmentacao || {},
        agendada_para: corpo.agendada_para,
        status: corpo.agendada_para ? 'agendada' : 'rascunho',
        total_destinatarios: totalDestinatarios,
        criado_por: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ dados: campanha }, { status: 201 })
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}

/**
 * Conta o número de pacientes que atendem aos critérios da segmentação
 */
async function contarDestinatarios(
  clinicaId: string,
  segmentacao: SegmentacaoCampanha
): Promise<number> {
  const supabase = criarClienteServidor()

  let consulta = supabase
    .from('pacientes')
    .select('id', { count: 'exact', head: true })
    .eq('clinica_id', clinicaId)
    .eq('status', 'ativo')

  if (segmentacao.sexo) {
    consulta = consulta.eq('sexo', segmentacao.sexo)
  }

  if (segmentacao.cidade) {
    consulta = consulta.ilike('cidade', `%${segmentacao.cidade}%`)
  }

  if (segmentacao.ultimo_atendimento_antes) {
    consulta = consulta.lt('ultimo_atendimento', segmentacao.ultimo_atendimento_antes)
  }

  if (segmentacao.ultimo_atendimento_depois) {
    consulta = consulta.gt('ultimo_atendimento', segmentacao.ultimo_atendimento_depois)
  }

  const { count } = await consulta
  return count || 0
}
