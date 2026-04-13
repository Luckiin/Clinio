// ============================================================
// CLINIO - API de Relatórios
// Tráfego seguro para as métricas da clínica
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { gerarRelatorioGerencial } from '@/servicos/relatorios'
import { intervaloDoMes } from '@/lib/formatadores'

export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id, perfil').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    // Apenas Administrador e Gerência (se houver) deveriam ver tudo,
    // Recepção não vê faturamento
    if (usuario.perfil !== 'administrador') {
      return NextResponse.json({ erro: 'Apenas administradores podem ver o Relatório Gerencial' }, { status: 403 })
    }

    const url = new URL(req.url)
    const inicioQuery = url.searchParams.get('inicio')
    const fimQuery = url.searchParams.get('fim')

    const hoje = new Date()
    const fallback = intervaloDoMes(hoje.getFullYear(), hoje.getMonth() + 1)
    
    // YYYY-MM-DD
    const dataInicio = inicioQuery || fallback.inicio
    const dataFim = fimQuery || fallback.fim

    const dados = await gerarRelatorioGerencial(usuario.clinica_id, dataInicio, dataFim)

    return NextResponse.json({ dados })
  } catch (error: any) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}
