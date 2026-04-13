// ============================================================
// CLINIO - Serviço de Configurações
// Acesso e manipulação dos dados da Clínica Pai
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import type { Clinica } from '@/tipos'

export async function buscarConfiguracoes(clinicaId: string): Promise<Clinica> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('clinicas')
    .select('*')
    .eq('id', clinicaId)
    .single()

  if (error) throw new Error(`Erro ao buscar configurações: ${error.message}`)
  
  // Garantir que as configurações JSON existam
  if (!data.configuracoes) {
    data.configuracoes = {}
  }
  
  return data as Clinica
}

export async function atualizarConfiguracoes(
  clinicaId: string, 
  dadosBasicos: Partial<Clinica>,
  dadosConfig: Record<string, any>
): Promise<Clinica> {
  const supabase = criarClienteServidor()
  
  // Fetch do objeto JSON atual primeiro para não sobrescrever flags
  const { data: atual } = await supabase
    .from('clinicas')
    .select('configuracoes')
    .eq('id', clinicaId)
    .single()

  const configuracoesMescladas = {
    ...(atual?.configuracoes || {}),
    ...dadosConfig
  }

  // Sanitizar campos que não devem ser salvos diretamente na raiz
  const payloadSeguro = {
    nome: dadosBasicos.nome,
    cnpj: dadosBasicos.cnpj,
    telefone: dadosBasicos.telefone,
    email: dadosBasicos.email,
    endereco: dadosBasicos.endereco,
    configuracoes: configuracoesMescladas
  }

  const { data, error } = await supabase
    .from('clinicas')
    .update(payloadSeguro)
    .eq('id', clinicaId)
    .select()
    .single()

  if (error) throw new Error(`Erro ao atualizar clinica: ${error.message}`)
  return data as Clinica
}
