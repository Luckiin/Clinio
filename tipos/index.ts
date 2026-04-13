// ============================================================
// CLINIO - Entidades e Tipos TypeScript
// Definições de tipos para todo o sistema
// ============================================================

// ============================================================
// CLÍNICA
// ============================================================
export type PlanoClinica = 'basico' | 'profissional' | 'enterprise'

export interface ConfiguracoesClinica {
  fuso_horario?: string
  horario_abertura?: string
  horario_fechamento?: string
  dias_funcionamento?: number[]  // 0=Dom, 1=Seg, ..., 6=Sab
  cor_primaria?: string
  logo_url?: string
  whatsapp_api_token?: string
  email_remetente?: string
  permite_agendamento_online?: boolean
  antecedencia_minima_agendamento?: number  // em horas
  antecedencia_maxima_agendamento?: number  // em dias
}

export interface Clinica {
  id: string
  nome: string
  cnpj?: string
  telefone?: string
  email?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  logo_url?: string
  slug: string
  plano: PlanoClinica
  ativo: boolean
  configuracoes: ConfiguracoesClinica
  criado_em: string
  atualizado_em: string
}

// ============================================================
// USUÁRIO
// ============================================================
export type PerfilUsuario = 'administrador' | 'recepcao' | 'medico'

export interface Usuario {
  id: string
  clinica_id: string
  nome: string
  email: string
  telefone?: string
  perfil: PerfilUsuario
  avatar_url?: string
  ativo: boolean
  ultimo_acesso?: string
  criado_em: string
  atualizado_em: string
}

// ============================================================
// MÉDICO
// ============================================================
export interface HorarioTrabalho {
  inicio: string   // ex: "08:00"
  fim: string      // ex: "18:00"
  ativo: boolean
}

export interface HorariosTrabalhoMedico {
  domingo?: HorarioTrabalho
  segunda?: HorarioTrabalho
  terca?: HorarioTrabalho
  quarta?: HorarioTrabalho
  quinta?: HorarioTrabalho
  sexta?: HorarioTrabalho
  sabado?: HorarioTrabalho
}

export interface Medico {
  id: string
  clinica_id: string
  usuario_id?: string
  nome: string
  especialidade?: string
  crm?: string
  telefone?: string
  email?: string
  cor_agenda: string
  duracao_padrao: number
  horarios_trabalho: HorariosTrabalhoMedico
  ativo: boolean
  foto_url?: string
  criado_em: string
  atualizado_em: string
}

// ============================================================
// SALA
// ============================================================
export interface Sala {
  id: string
  clinica_id: string
  nome: string
  descricao?: string
  capacidade: number
  cor: string
  ativa: boolean
  criado_em: string
  atualizado_em: string
}

// ============================================================
// TIPO DE CONSULTA
// ============================================================
export interface TipoConsulta {
  id: string
  clinica_id: string
  nome: string
  descricao?: string
  duracao_minutos: number
  valor?: number
  cor: string
  exige_medico: boolean
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

// ============================================================
// PACIENTE
// ============================================================
export type SexoPaciente = 'masculino' | 'feminino' | 'outro' | 'nao_informado'
export type StatusPaciente = 'ativo' | 'inativo' | 'bloqueado'

export interface Paciente {
  id: string
  clinica_id: string
  nome: string
  cpf?: string
  data_nascimento?: string
  sexo?: SexoPaciente
  telefone?: string
  telefone_whatsapp?: string
  email?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  convenio?: string
  numero_convenio?: string
  observacoes?: string
  como_conheceu?: string
  status: StatusPaciente
  ultimo_atendimento?: string
  total_consultas: number
  foto_url?: string
  tags?: TagPaciente[]
  criado_em: string
  atualizado_em: string
}

export interface TagPaciente {
  id: string
  clinica_id: string
  paciente_id: string
  tag: string
  cor: string
  criado_em: string
}

// ============================================================
// CONSULTA / AGENDAMENTO
// ============================================================
export type StatusConsulta =
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'
  | 'faltou'
  | 'remarcado'

export type TipoConsultaEnum = 'presencial' | 'teleconsulta'

export interface Consulta {
  id: string
  clinica_id: string
  paciente_id: string
  medico_id: string
  sala_id?: string
  tipo_consulta_id?: string
  data_hora_inicio: string
  data_hora_fim: string
  status: StatusConsulta
  tipo: TipoConsultaEnum
  valor?: number
  observacoes?: string
  anamnese?: string
  diagnostico?: string
  prescricao?: string
  agendado_online: boolean
  lembrete_enviado: boolean
  confirmado_em?: string
  cancelado_em?: string
  motivo_cancelamento?: string
  criado_por?: string
  criado_em: string
  atualizado_em: string
  // Relacionamentos expandidos
  paciente?: Paciente
  medico?: Medico
  sala?: Sala
  tipo_consulta?: TipoConsulta
}

export interface ConsultaComRelacoes extends Consulta {
  paciente: Paciente
  medico: Medico
  sala?: Sala
  tipo_consulta?: TipoConsulta
}

// ============================================================
// AUTOMAÇÃO
// ============================================================
export type EventoAutomacao =
  | 'consulta_criada'
  | 'consulta_amanha'
  | 'consulta_hoje'
  | 'consulta_cancelada'
  | 'aniversario_paciente'
  | 'paciente_inativo'

export type TipoAcaoAutomacao = 'enviar_mensagem' | 'criar_tarefa' | 'disparar_campanha'

export type CanalComunicacao = 'whatsapp' | 'email' | 'sms'

export interface AcaoAutomacao {
  tipo: TipoAcaoAutomacao
  canal?: CanalComunicacao
  template?: string
  titulo?: string
  descricao?: string
  campanha_id?: string
}

export interface CondicoesAutomacao {
  sem_mensagem_ultimas_horas?: number
  status_consulta?: string[]
  dias_sem_consulta?: number
}

export interface Automacao {
  id: string
  clinica_id: string
  nome: string
  descricao?: string
  evento: EventoAutomacao
  condicoes: CondicoesAutomacao
  acoes: AcaoAutomacao[]
  delay_horas: number
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface ExecucaoAutomacao {
  id: string
  automacao_id: string
  clinica_id: string
  paciente_id?: string
  consulta_id?: string
  status: 'agendada' | 'concluida' | 'erro' | 'cancelada'
  executar_em?: string
  executado_em?: string
  resultado?: Record<string, unknown>
  contexto?: Record<string, unknown>
  erro_mensagem?: string
  criado_em: string
  pacientes?: { nome: string; telefone?: string }
}

// ============================================================
// MENSAGEM
// ============================================================
export type StatusMensagem =
  | 'pendente'
  | 'enviada'
  | 'entregue'
  | 'lida'
  | 'respondida'
  | 'falhou'

export interface Mensagem {
  id: string
  clinica_id: string
  paciente_id: string
  consulta_id?: string
  automacao_id?: string
  campanha_id?: string
  canal: CanalComunicacao
  conteudo: string
  status: StatusMensagem
  enviada_em?: string
  entregue_em?: string
  lida_em?: string
  erro?: string
  criado_em: string
  atualizado_em: string
  // Relacionamentos
  paciente?: Paciente
}

// ============================================================
// CAMPANHA
// ============================================================
export type TipoCampanha =
  | 'marketing'
  | 'reativacao'
  | 'promocional'
  | 'informativa'
  | 'aniversario'

export type StatusCampanha =
  | 'rascunho'
  | 'agendada'
  | 'enviando'
  | 'concluida'
  | 'cancelada'
  | 'pausada'

export interface SegmentacaoCampanha {
  tags?: string[]
  status?: StatusPaciente[]
  ultimo_atendimento_antes?: string
  ultimo_atendimento_depois?: string
  cidade?: string
  convenio?: string
  sexo?: SexoPaciente
  idade_minima?: number
  idade_maxima?: number
}

export interface Campanha {
  id: string
  clinica_id: string
  nome: string
  descricao?: string
  tipo: TipoCampanha
  canal: CanalComunicacao
  mensagem_template: string
  segmentacao: SegmentacaoCampanha
  agendada_para?: string
  status: StatusCampanha
  total_destinatarios: number
  total_enviadas: number
  total_entregues: number
  total_lidas: number
  total_respostas: number
  criado_por?: string
  criado_em: string
  atualizado_em: string
}

// ============================================================
// FINANCEIRO
// ============================================================
export type StatusCobranca =
  | 'pendente'
  | 'pago'
  | 'parcialmente_pago'
  | 'cancelado'
  | 'vencido'

export interface Cobranca {
  id: string
  clinica_id: string
  paciente_id: string
  consulta_id?: string
  descricao: string
  valor: number
  valor_desconto: number
  valor_final: number
  vencimento?: string
  status: StatusCobranca
  criado_em: string
  atualizado_em: string
  // Relacionamentos
  paciente?: Paciente
  consulta?: Consulta
  pagamentos?: Pagamento[]
}

export type FormaPagamento =
  | 'dinheiro'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'pix'
  | 'transferencia'
  | 'convenio'
  | 'boleto'
  | 'outro'

export interface Pagamento {
  id: string
  clinica_id: string
  cobranca_id: string
  paciente_id: string
  valor: number
  forma_pagamento: FormaPagamento
  parcelas: number
  data_pagamento: string
  comprovante_url?: string
  observacoes?: string
  registrado_por?: string
  criado_em: string
  atualizado_em: string
}

// ============================================================
// PREVISÃO DE FALTAS (IA)
// ============================================================
export interface FatoresPrevisao {
  historico_faltas: number    // número de faltas anteriores
  dias_ate_consulta: number   // dias até a consulta
  dia_semana: number          // 0=Dom a 6=Sab
  horario: string             // horário da consulta
  confirmado: boolean         // se confirmou presença
  distancia?: number          // distância estimada em km
}

export interface PrevisaoFalta {
  id: string
  clinica_id: string
  consulta_id: string
  paciente_id: string
  probabilidade_falta: number  // 0.0 a 1.0
  fatores: FatoresPrevisao
  acao_tomada?: string
  criado_em: string
}

// ============================================================
// DASHBOARD - Métricas
// ============================================================
export interface MetricasDashboard {
  total_consultas_hoje: number
  total_consultas_semana: number
  total_pacientes_ativos: number
  total_novos_pacientes_mes: number
  taxa_comparecimento: number          // percentual
  receita_mes_atual: number
  receita_mes_anterior: number
  variacao_receita: number             // percentual
  consultas_por_status: Record<StatusConsulta, number>
  horarios_mais_agendados: { hora: string; total: number }[]
  medicos_mais_ativos: { medico: string; total: number }[]
}

export interface FiltroRelatorio {
  data_inicio: string
  data_fim: string
  medico_id?: string
  tipo_consulta_id?: string
  status?: StatusConsulta[]
}

// ============================================================
// AGENDA - Visualização
// ============================================================
export interface EventoAgenda {
  id: string
  titulo: string
  inicio: string
  fim: string
  cor: string
  paciente: string
  medico: string
  status: StatusConsulta
  tipo: TipoConsultaEnum
  dados: Consulta
}

export interface SlotDisponivel {
  data_hora: string
  medico_id: string
  medico_nome: string
  duracao_minutos: number
}

// ============================================================
// FORMULÁRIOS
// ============================================================
export interface FormularioNovaConsulta {
  paciente_id: string
  medico_id: string
  sala_id?: string
  tipo_consulta_id?: string
  data_hora_inicio: string
  duracao_minutos: number
  tipo: TipoConsultaEnum
  valor?: number
  observacoes?: string
}

export interface FormularioNovoPaciente {
  nome: string
  cpf?: string
  data_nascimento?: string
  sexo?: SexoPaciente
  telefone?: string
  telefone_whatsapp?: string
  email?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  convenio?: string
  numero_convenio?: string
  observacoes?: string
  como_conheceu?: string
}

export interface FormularioAgendamentoPublico {
  nome: string
  telefone: string
  email?: string
  cpf?: string
  medico_id: string
  tipo_consulta_id?: string
  data_hora: string
  observacoes?: string
}

// ============================================================
// RESPOSTA PADRÃO DA API
// ============================================================
export interface RespostaApi<T = unknown> {
  dados?: T
  erro?: string
  mensagem?: string
  total?: number
  pagina?: number
  por_pagina?: number
}

export interface PaginacaoParams {
  pagina?: number
  por_pagina?: number
  busca?: string
  ordenar_por?: string
  ordem?: 'asc' | 'desc'
}

export interface FormularioAgendamentoPublico {
  nome: string
  telefone: string
  email?: string
  cpf?: string
  medico_id: string
  tipo_consulta_id?: string
  data_hora: string
  observacoes?: string
  clinica_slug: string
}
