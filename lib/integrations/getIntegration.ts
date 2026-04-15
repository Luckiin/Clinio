import { criarClienteSupabaseAdmin } from '@/lib/supabase/client'

export type IntegrationType = 'whatsapp' | 'instagram' | 'telegram' | 'email' | 'sms'

export interface IntegrationRecord {
  id: string
  company_id: string
  type: string
  config: Record<string, unknown>
  active: boolean
  created_at: string
}

export async function getIntegration(companyId: string, type: string) {
  const supabase = criarClienteSupabaseAdmin()

  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('company_id', companyId)
    .eq('type', type)
    .maybeSingle()

  if (error) {
    throw new Error(`Erro ao buscar integração: ${error.message}`)
  }

  return data as IntegrationRecord | null
}
