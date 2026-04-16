// ============================================================
// CLINIO - Debug WhatsApp (só usar em desenvolvimento)
// GET /api/whatsapp/debug
// ============================================================

import { NextResponse } from 'next/server'
import { criarClienteSupabaseAdmin } from '@/lib/supabase/client'

export async function GET() {
  // Apenas para desenvolvimento — remova antes de ir a produção
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ erro: 'Desabilitado em produção' }, { status: 403 })
  }

  try {
    const admin = criarClienteSupabaseAdmin()

    // 1. Todas as integrações WhatsApp
    const { data: integracoes } = await admin
      .from('integrations')
      .select('id, company_id, type, config, active, created_at')
      .eq('type', 'whatsapp')

    // 2. Últimas 5 conversas criadas
    const { data: conversas } = await admin
      .from('conversas')
      .select('id, clinica_id, paciente_id, canal, status, ultima_mensagem_em, criado_em')
      .order('criado_em', { ascending: false })
      .limit(5)

    // 3. Últimas 10 mensagens recebidas
    const { data: mensagens } = await admin
      .from('mensagens_conversa')
      .select('id, conversa_id, tipo_mensagem, conteudo, mensagem_whatsapp_id, data_envio')
      .eq('tipo_mensagem', 'recebida')
      .order('data_envio', { ascending: false })
      .limit(10)

    // 4. Últimos 5 pacientes criados (possíveis criados pelo webhook)
    const { data: pacientes } = await admin
      .from('pacientes')
      .select('id, nome, telefone, telefone_whatsapp, criado_em')
      .order('criado_em', { ascending: false })
      .limit(5)

    return NextResponse.json({
      integracoes: (integracoes ?? []).map(i => ({
        id: i.id,
        company_id: i.company_id,
        active: i.active,
        phone_number_id: (i.config as any)?.phone_number_id,
        has_access_token: !!(i.config as any)?.access_token,
        criado_em: i.created_at,
      })),
      ultimas_conversas: conversas ?? [],
      ultimas_mensagens_recebidas: mensagens ?? [],
      ultimos_pacientes: pacientes ?? [],
    })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
