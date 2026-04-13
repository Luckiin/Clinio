// ============================================================
// CLINIO - API Financeira
// Rotas: GET /api/financeiro  POST /api/financeiro/cobrancas
//        POST /api/financeiro/pagamentos
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import {
  buscarCobrancas,
  criarCobranca,
  registrarPagamento,
  buscarResumoFinanceiro,
  buscarEvolucaoReceita,
} from '@/servicos/financeiro'
import { dataDeHoje, intervaloDoMes } from '@/lib/formatadores'

/**
 * GET /api/financeiro
 * Retorna resumo financeiro e cobranças
 */
export async function GET(requisicao: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id, perfil').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    // Apenas admin e recepção podem ver financeiro
    if (!['administrador', 'recepcao'].includes(usuario.perfil)) {
      return NextResponse.json({ erro: 'Sem permissão para acessar dados financeiros' }, { status: 403 })
    }

    const params = requisicao.nextUrl.searchParams
    const tipo = params.get('tipo') || 'resumo'

    const hoje = new Date()
    const { inicio, fim } = intervaloDoMes(hoje.getFullYear(), hoje.getMonth() + 1)

    if (tipo === 'resumo') {
      const [resumo, evolucao] = await Promise.all([
        buscarResumoFinanceiro(usuario.clinica_id, inicio, fim),
        buscarEvolucaoReceita(usuario.clinica_id, 6),
      ])

      return NextResponse.json({ dados: { resumo, evolucao } })
    }

    if (tipo === 'cobrancas') {
      const { dados, total } = await buscarCobrancas(usuario.clinica_id, {
        status: params.get('status') as any || undefined,
        paciente_id: params.get('paciente_id') || undefined,
        data_inicio: params.get('data_inicio') || undefined,
        data_fim: params.get('data_fim') || undefined,
        pagina: parseInt(params.get('pagina') || '1'),
        por_pagina: parseInt(params.get('por_pagina') || '20'),
      })

      return NextResponse.json({ dados, total })
    }

    return NextResponse.json({ erro: 'Tipo inválido' }, { status: 400 })
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}

/**
 * POST /api/financeiro
 * Cria cobrança ou registra pagamento
 */
export async function POST(requisicao: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id, perfil').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    if (!['administrador', 'recepcao'].includes(usuario.perfil)) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const corpo = await requisicao.json()
    const acao = requisicao.nextUrl.searchParams.get('acao') || corpo.acao

    if (acao === 'criar_cobranca') {
      if (!corpo.paciente_id || !corpo.descricao || !corpo.valor) {
        return NextResponse.json({ erro: 'Paciente, descrição e valor são obrigatórios' }, { status: 400 })
      }

      const cobranca = await criarCobranca(usuario.clinica_id, {
        paciente_id: corpo.paciente_id,
        consulta_id: corpo.consulta_id,
        descricao: corpo.descricao,
        valor: parseFloat(corpo.valor),
        valor_desconto: corpo.valor_desconto ? parseFloat(corpo.valor_desconto) : 0,
        vencimento: corpo.vencimento,
      })

      return NextResponse.json({ dados: cobranca }, { status: 201 })
    }

    if (acao === 'registrar_pagamento') {
      if (!corpo.cobranca_id || !corpo.valor || !corpo.forma_pagamento) {
        return NextResponse.json(
          { erro: 'Cobrança, valor e forma de pagamento são obrigatórios' },
          { status: 400 }
        )
      }

      const pagamento = await registrarPagamento(usuario.clinica_id, {
        cobranca_id: corpo.cobranca_id,
        paciente_id: corpo.paciente_id,
        valor: parseFloat(corpo.valor),
        forma_pagamento: corpo.forma_pagamento,
        parcelas: corpo.parcelas || 1,
        data_pagamento: corpo.data_pagamento || dataDeHoje(),
        observacoes: corpo.observacoes,
        registrado_por: user.id,
      })

      return NextResponse.json({ dados: pagamento }, { status: 201 })
    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 })
  }
}
