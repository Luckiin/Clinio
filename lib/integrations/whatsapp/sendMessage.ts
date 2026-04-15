import { getIntegration } from '@/lib/integrations/getIntegration'

interface WhatsAppConfig {
  access_token: string
  phone_number_id: string
  business_account_id?: string
}

interface WhatsAppSendResponse {
  messages?: Array<{ id: string }>
  error?: {
    message: string
    type?: string
    code?: number
  }
}

export async function sendWhatsAppMessage(companyId: string, phone: string, message: string) {
  const integration = await getIntegration(companyId, 'whatsapp')

  if (!integration || !integration.active) {
    throw new Error('Integração de WhatsApp não está ativa para a clínica.')
  }

  const config = integration.config as unknown as WhatsAppConfig
  if (!config?.access_token || !config?.phone_number_id) {
    throw new Error('Configuração de WhatsApp incompleta. Verifique Access Token e Phone Number ID.')
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
    `https://graph.facebook.com/v19.0/${config.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  const data = (await response.json()) as WhatsAppSendResponse
  if (!response.ok) {
    throw new Error(data.error?.message ?? 'Falha ao enviar mensagem via WhatsApp.')
  }

  return data
}
