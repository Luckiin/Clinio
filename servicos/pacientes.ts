// ============================================================
// CLINIO - Serviço de Gestão de Pacientes
// Repositório de acesso ao DB (Supabase)
// ============================================================

import { criarClienteServidor } from '@/lib/supabase-servidor'
import type { Paciente } from '@/tipos'

export async function buscarPacientes(
  clinicaId: string,
  params: { busca?: string; limite?: number } = {}
): Promise<Paciente[]> {
  const supabase = criarClienteServidor()
  let consulta = supabase
    .from('pacientes')
    .select('*')
    .eq('clinica_id', clinicaId)
    .order('criado_em', { ascending: false })

  if (params.busca) {
    // Busca por nome ou CPF
    consulta = consulta.or(`nome.ilike.%${params.busca}%,cpf.ilike.%${params.busca}%,telefone.ilike.%${params.busca}%`)
  }
  
  if (params.limite) {
    consulta = consulta.limit(params.limite)
  }

  const { data, error } = await consulta
  if (error) throw new Error(`Erro ao buscar pacientes: ${error.message}`)

  return data as Paciente[]
}

export async function criarPaciente(clinicaId: string, dados: Partial<Paciente>): Promise<Paciente> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('pacientes')
    .insert({
      clinica_id: clinicaId,
      nome: dados.nome,
      cpf: dados.cpf,
      telefone: dados.telefone,
      email: dados.email,
      sexo: dados.sexo || 'nao_informado',
      data_nascimento: dados.data_nascimento || null,
      convenio: dados.convenio,
      numero_convenio: dados.numero_convenio,
      status: dados.status || 'ativo',
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao cadastrar paciente: ${error.message}`)
  return data as Paciente
}

export async function atualizarPaciente(clinicaId: string, id: string, dados: Partial<Paciente>): Promise<Paciente> {
  const supabase = criarClienteServidor()
  const { data, error } = await supabase
    .from('pacientes')
    .update({
      nome: dados.nome,
      cpf: dados.cpf,
      telefone: dados.telefone,
      email: dados.email,
      sexo: dados.sexo,
      data_nascimento: dados.data_nascimento,
      convenio: dados.convenio,
      numero_convenio: dados.numero_convenio,
      status: dados.status
    })
    .eq('clinica_id', clinicaId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Erro ao atualizar paciente: ${error.message}`)
  return data as Paciente
}

export async function excluirPaciente(clinicaId: string, id: string): Promise<void> {
  const supabase = criarClienteServidor()
  const { error } = await supabase
    .from('pacientes')
    .delete()
    .eq('clinica_id', clinicaId)
    .eq('id', id)

  if (error) throw new Error(`Erro ao deletar paciente: ${error.message}`)
}

export interface EstatisticasPacientes {
  total_ativos: number
  novos_mes: number
  sem_consulta_90_dias: number
  inativos: number
}

export async function buscarEstatisticasPacientes(clinicaId: string): Promise<EstatisticasPacientes> {
  const supabase = criarClienteServidor()

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
  const limite90Dias = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [ativos, novosMes, inativos] = await Promise.all([
    // Total de pacientes ativos
    supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .eq('status', 'ativo'),

    // Novos pacientes cadastrados neste mês
    supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .gte('criado_em', inicioMes),

    // Pacientes inativos
    supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .eq('status', 'inativo'),
  ])

  // Pacientes ativos sem consulta nos últimos 90 dias
  const { data: pacientesComConsultaRecente } = await supabase
    .from('consultas')
    .select('paciente_id')
    .eq('clinica_id', clinicaId)
    .gte('data_hora_inicio', limite90Dias)
    .not('status', 'eq', 'cancelado')

  const idsComConsultaRecente = new Set((pacientesComConsultaRecente || []).map((c: any) => c.paciente_id))

  const { count: totalAtivos } = await supabase
    .from('pacientes')
    .select('id', { count: 'exact', head: true })
    .eq('clinica_id', clinicaId)
    .eq('status', 'ativo')

  let semConsulta90Dias = 0
  if (totalAtivos && totalAtivos > 0) {
    const { count } = await supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .eq('status', 'ativo')
      .not('id', 'in', `(${[...idsComConsultaRecente].join(',') || 'null'})`)

    semConsulta90Dias = count ?? 0
  }

  return {
    total_ativos: ativos.count ?? 0,
    novos_mes: novosMes.count ?? 0,
    sem_consulta_90_dias: semConsulta90Dias,
    inativos: inativos.count ?? 0,
  }
}

export async function buscarAniversariantes(clinicaId: string, mes: number): Promise<Paciente[]> {
  const supabase = criarClienteServidor()
  const mesStr = String(mes).padStart(2, '0')

  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('clinica_id', clinicaId)
    .not('data_nascimento', 'is', null)
    .filter('data_nascimento', 'like', `%-${mesStr}-%`)

  if (error) throw new Error(`Erro ao buscar aniversariantes: ${error.message}`)
  return data as Paciente[]
}

export async function buscarPacientesParaReativacao(clinicaId: string, diasSemConsulta = 90): Promise<Paciente[]> {
  const supabase = criarClienteServidor()
  const limite = new Date(Date.now() - diasSemConsulta * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('status', 'ativo')
    .or(`ultimo_atendimento.lt.${limite},ultimo_atendimento.is.null`)
    .order('ultimo_atendimento', { ascending: true })

  if (error) throw new Error(`Erro ao buscar pacientes para reativação: ${error.message}`)
  return data as Paciente[]
}
