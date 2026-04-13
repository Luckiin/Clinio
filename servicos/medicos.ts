// ============================================================
// CLINIO - Serviço de Gestão de Médicos
// Repositório de acesso ao DB
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import type { Medico } from '@/tipos'

export async function buscarMedicos(
  clinicaId: string,
  params: { ativo?: boolean; busca?: string } = {}
): Promise<Medico[]> {
  const supabase = criarClienteServidor()
  let consulta = supabase
    .from('medicos')
    .select('*')
    .eq('clinica_id', clinicaId)
    .order('nome', { ascending: true })

  if (params.ativo !== undefined) {
    consulta = consulta.eq('ativo', params.ativo)
  }
  
  if (params.busca) {
    consulta = consulta.ilike('nome', `%${params.busca}%`)
  }

  const { data, error } = await consulta
  if (error) throw new Error(`Erro ao buscar médicos: ${error.message}`)

  return data as Medico[]
}

export async function buscarMedicoPorId(clinicaId: string, medicoId: string): Promise<Medico | null> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('medicos')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('id', medicoId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(`Erro ao buscar médico: ${error.message}`)
  return data as Medico | null
}

export async function criarMedico(clinicaId: string, dados: Partial<Medico>): Promise<Medico> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('medicos')
    .insert({
      clinica_id: clinicaId,
      nome: dados.nome,
      especialidade: dados.especialidade,
      crm: dados.crm,
      telefone: dados.telefone,
      email: dados.email,
      cor_agenda: dados.cor_agenda || '#3B82F6',
      duracao_padrao: dados.duracao_padrao || 30,
      ativo: dados.ativo !== false,
      horarios_trabalho: dados.horarios_trabalho || {}
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar médico: ${error.message}`)
  return data as Medico
}

export async function atualizarMedico(clinicaId: string, medicoId: string, dados: Partial<Medico>): Promise<Medico> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('medicos')
    .update({
      nome: dados.nome,
      especialidade: dados.especialidade,
      crm: dados.crm,
      telefone: dados.telefone,
      email: dados.email,
      cor_agenda: dados.cor_agenda,
      duracao_padrao: dados.duracao_padrao,
      ativo: dados.ativo,
      horarios_trabalho: dados.horarios_trabalho
    })
    .eq('clinica_id', clinicaId)
    .eq('id', medicoId)
    .select()
    .single()

  if (error) throw new Error(`Erro ao atualizar médico: ${error.message}`)
  return data as Medico
}

export async function deletarMedico(clinicaId: string, medicoId: string): Promise<void> {
  const supabase = criarClienteServidor()
  const { error } = await supabase
    .from('medicos')
    .delete()
    .eq('clinica_id', clinicaId)
    .eq('id', medicoId)

  // Em produção, seria melhor fazer "soft_delete" marcando ativo=false,
  // mas como o requisito solicitou a ação...
  if (error) throw new Error(`Erro ao deletar médico: ${error.message}`)
}
