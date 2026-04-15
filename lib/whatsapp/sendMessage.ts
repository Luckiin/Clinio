import { criarClienteSupabaseAdmin } from '@/lib/supabase/client'

interface WhatsAppSendResponse {
  messages?: Array<{ id: string }>
  error?: {
    message: string
    type?: string
    code?: number
  }
}

export async function sendWhatsAppMessage(companyId: string, phone: string, message: string) {
  const supabase = criarClienteSupabaseAdmin()

  const { data: integration, error: integrationError } = await supabase
    .from('whatsapp_integrations')
    .select('access_token, phone_number_id')
    .eq('company_id', companyId)
    .single()

  if (integrationError || !integration) {
    throw new Error('Integração de WhatsApp não encontrada para a empresa.')
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: {
      body: message,
    },
  }

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${integration.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  const data = (await response.json()) as WhatsAppSendResponse
  if (!response.ok) {
    const reason = data.error?.message ?? 'Falha ao enviar mensagem via WhatsApp.'
    throw new Error(reason)
  }

  return data
}
