// ============================================================
// CLINIO - Webhook WhatsApp Business API
// GET  → verificação do endpoint pelo Meta
// POST → recebimento de mensagens e status updates
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { criarClienteSupabaseAdmin } from '@/lib/supabase/client'

// ─── Tipos ────────────────────────────────────────────────────

type WaMessage = {
  id?: string
  from?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
  image?: { caption?: string; mime_type?: string; id?: string }
  audio?: { id?: string; mime_type?: string }
  document?: { filename?: string; id?: string }
}

type WaStatus = {
  id?: string
  status?: 'sent' | 'delivered' | 'read' | 'failed'
  recipient_id?: string
}

type WaWebhookPayload = {
  object?: string
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string }
        messages?: WaMessage[]
        statuses?: WaStatus[]
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>
      }
    }>
  }>
}

// ─── Helpers ──────────────────────────────────────────────────

function normalizarTelefone(tel: string) {
  return tel.replace(/\D/g, '')
}

function variacoesTelefone(tel: string): string[] {
  const base = normalizarTelefone(tel)
  if (!base) return []
  const set = new Set<string>([base])
  if (base.startsWith('55')) {
    set.add(base.slice(2))
    // Brasil: celular pode ter 9 dígito extra (11 → 10 dígitos sem DDI)
    if (base.length === 13) set.add(base.slice(2, 4) + base.slice(5)) // remove o 9
  } else {
    set.add(`55${base}`)
  }
  return Array.from(set)
}

function extrairTextoMensagem(msg: WaMessage): string | null {
  if (msg.type === 'text') return msg.text?.body ?? null
  if (msg.type === 'image') return msg.image?.caption ?? '📷 Imagem'
  if (msg.type === 'audio') return '🎤 Áudio'
  if (msg.type === 'document') return `📄 Documento: ${msg.document?.filename ?? ''}`
  return null
}

// ─── Verificação de assinatura HMAC (segurança) ───────────────

async function verificarAssinatura(req: NextRequest, rawBody: string): Promise<boolean> {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) return true // sem secret configurado, permite (dev)

  const signature = req.headers.get('x-hub-signature-256')
  if (!signature) return false

  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
  return signature === expected
}

// ─── Buscar paciente por telefone (várias variações) ──────────

async function buscarPaciente(clinicaId: string, telefone: string) {
  const supabase = criarClienteSupabaseAdmin()
  const variacoes = variacoesTelefone(telefone)

  for (const v of variacoes) {
    const { data: p1 } = await supabase
      .from('pacientes').select('id, nome')
      .eq('clinica_id', clinicaId).eq('telefone_whatsapp', v).maybeSingle()
    if (p1) return p1

    const { data: p2 } = await supabase
      .from('pacientes').select('id, nome')
      .eq('clinica_id', clinicaId).eq('telefone', v).maybeSingle()
    if (p2) return p2
  }
  return null
}

// ─── Criar paciente automaticamente a partir do contato WhatsApp ─

async function criarPacienteWhatsApp(
  clinicaId: string,
  telefone: string,
  nomeContato?: string,
): Promise<{ id: string; nome: string }> {
  const supabase = criarClienteSupabaseAdmin()

  // Normaliza telefone para salvar no banco (sem DDI 55 se brasileiro)
  const base = normalizarTelefone(telefone)
  const telefoneSalvo = base.startsWith('55') ? base.slice(2) : base
  const nome = nomeContato?.trim() || `WhatsApp ${telefoneSalvo}`

  const { data, error } = await supabase
    .from('pacientes')
    .insert({
      clinica_id: clinicaId,
      nome: nome,
      telefone: telefoneSalvo,
      telefone_whatsapp: base,   // com DDI para facilitar lookup futuro
      status: 'ativo',
    })
    .select('id, nome')
    .single()

  if (error) throw new Error(`Erro ao criar paciente via WhatsApp: ${error.message}`)
  console.log(`[WhatsApp Webhook] 👤 Paciente criado automaticamente: ${nome} (${telefoneSalvo})`)
  return data
}

// ─── Criar/obter conversa WhatsApp ────────────────────────────

async function obterOuCriarConversa(clinicaId: string, pacienteId: string): Promise<string> {
  const supabase = criarClienteSupabaseAdmin()

  const { data: existente } = await supabase
    .from('conversas').select('id')
    .eq('clinica_id', clinicaId).eq('paciente_id', pacienteId)
    .eq('canal', 'whatsapp').in('status', ['ativa', 'aberta'])
    .order('criado_em', { ascending: false }).limit(1).maybeSingle()

  if (existente?.id) return existente.id

  const { data: nova, error } = await supabase
    .from('conversas')
    .insert({ clinica_id: clinicaId, paciente_id: pacienteId, canal: 'whatsapp', status: 'ativa' })
    .select('id').single()

  if (error || !nova?.id) throw new Error(error?.message ?? 'Erro ao criar conversa')
  return nova.id
}

// ─── Salvar mensagem recebida + atualizar contadores ──────────

async function salvarMensagem(
  conversaId: string,
  pacienteId: string,
  conteudo: string,
  waMessageId?: string,
) {
  const supabase = criarClienteSupabaseAdmin()
  const agora = new Date().toISOString()

  // Evitar duplicatas (Meta pode re-entregar)
  if (waMessageId) {
    const { data: dup } = await supabase
      .from('mensagens_conversa').select('id')
      .eq('mensagem_whatsapp_id', waMessageId).maybeSingle()
    if (dup) return // já processado
  }

  await supabase.from('mensagens_conversa').insert({
    conversa_id: conversaId,
    paciente_id: pacienteId,
    tipo_mensagem: 'recebida',
    conteudo,
    tipo_conteudo: 'texto',
    status_mensagem: 'entregue',
    mensagem_whatsapp_id: waMessageId ?? null,
    lida: false,
    data_envio: agora,
  })

  // Atualiza conversa: timestamp + incrementa nao_lidas atomicamente
  const { data: conv } = await supabase
    .from('conversas').select('nao_lidas, total_mensagens').eq('id', conversaId).single()

  await supabase.from('conversas').update({
    ultima_mensagem_em: agora,
    nao_lidas: (conv?.nao_lidas ?? 0) + 1,
    total_mensagens: (conv?.total_mensagens ?? 0) + 1,
    status: 'ativa',
  }).eq('id', conversaId)
}

// ─── Processar status update (delivered/read) ─────────────────

async function processarStatusUpdate(status: WaStatus) {
  if (!status.id || !status.status) return
  const supabase = criarClienteSupabaseAdmin()

  const mapa: Record<string, string> = {
    sent: 'enviada',
    delivered: 'entregue',
    read: 'lida',
    failed: 'falhou',
  }
  const novoStatus = mapa[status.status]
  if (!novoStatus) return

  await supabase.from('mensagens_conversa')
    .update({
      status_mensagem: novoStatus,
      lida: status.status === 'read',
    })
    .eq('mensagem_whatsapp_id', status.id)
}

// ─── GET: verificação do webhook pelo Meta ────────────────────

export async function GET(req: NextRequest) {
  const mode      = req.nextUrl.searchParams.get('hub.mode')
  const token     = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  console.log('[WhatsApp Webhook] GET verificação', { mode, token, challenge, verifyToken: verifyToken ? '***' : 'NÃO CONFIGURADO' })

  if (!verifyToken) {
    console.error('[WhatsApp Webhook] ❌ WHATSAPP_WEBHOOK_VERIFY_TOKEN não configurado no servidor!')
    return new NextResponse('Erro de configuração do servidor', { status: 500 })
  }

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    console.log('[WhatsApp Webhook] ✅ Verificação concluída')
    // Resposta obrigatória: apenas o challenge como texto puro
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.warn('[WhatsApp Webhook] ❌ Falha — mode:', mode, '| token match:', token === verifyToken)
  return new NextResponse('Forbidden', { status: 403 })
}

// ─── POST: recebimento de mensagens e status ──────────────────

export async function POST(req: NextRequest) {
  let rawBody = ''
  try {
    rawBody = await req.text()
    const assinaturaOk = await verificarAssinatura(req, rawBody)
    if (!assinaturaOk) {
      console.warn('[WhatsApp Webhook] ❌ Assinatura HMAC inválida')
      return NextResponse.json({ erro: 'Assinatura inválida' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody) as WaWebhookPayload
    if (payload.object !== 'whatsapp_business_account') {
      return NextResponse.json({ ok: true }, { status: 200 }) // ignorar outros eventos
    }

    const supabase = criarClienteSupabaseAdmin()

    // Carregar todas as integrações WhatsApp ativas uma única vez
    const { data: integracoes } = await supabase
      .from('integrations')
      .select('company_id, config, active')
      .eq('type', 'whatsapp')
      .eq('active', true)

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue

        const phoneNumberId = change.value?.metadata?.phone_number_id
        if (!phoneNumberId) continue

        // Encontrar a clínica pelo phone_number_id
        const integracao = (integracoes ?? []).find(i => {
          const cfg = (i.config ?? {}) as { phone_number_id?: string }
          return cfg.phone_number_id === phoneNumberId
        })
        if (!integracao?.company_id) {
          console.warn(
            `[WhatsApp Webhook] ⚠️ phone_number_id "${phoneNumberId}" não mapeado para nenhuma clínica.`,
            `Salve a integração em Painel → Integrações com este Phone Number ID.`
          )
          continue
        }

        const clinicaId = integracao.company_id

        // Mapa de nomes dos contatos do payload (wa_id → nome)
        const nomesContatos: Record<string, string> = {}
        for (const c of change.value?.contacts ?? []) {
          if (c.wa_id && c.profile?.name) {
            nomesContatos[c.wa_id] = c.profile.name
          }
        }

        // Processar status updates (sent/delivered/read/failed)
        for (const st of change.value?.statuses ?? []) {
          await processarStatusUpdate(st).catch(e =>
            console.error('[WhatsApp Webhook] Erro status update:', e)
          )
        }

        // Processar mensagens recebidas
        for (const msg of change.value?.messages ?? []) {
          const texto = extrairTextoMensagem(msg)
          if (!texto || !msg.from) continue

          // Buscar paciente; se não existir, criar automaticamente com o nome do WhatsApp
          let paciente = await buscarPaciente(clinicaId, msg.from)
          if (!paciente) {
            const nomeContato = nomesContatos[msg.from] ?? nomesContatos[normalizarTelefone(msg.from)]
            console.log(`[WhatsApp Webhook] Paciente não encontrado para ${msg.from}, criando automaticamente...`)
            paciente = await criarPacienteWhatsApp(clinicaId, msg.from, nomeContato)
          }

          const conversaId = await obterOuCriarConversa(clinicaId, paciente.id)
          await salvarMensagem(conversaId, paciente.id, texto, msg.id)

          console.log(`[WhatsApp Webhook] ✅ Mensagem salva — paciente: ${paciente.nome} | texto: "${texto}"`)
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[WhatsApp Webhook] Erro inesperado:', err)
    // Sempre retornar 200 para o Meta não reenviar indefinidamente
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}
