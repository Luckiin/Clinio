// ============================================================
// CLINIO - Funções Utilitárias de Formatação
// ============================================================

/**
 * Formata um valor monetário em Real Brasileiro
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

/**
 * Formata uma data para exibição no padrão brasileiro
 */
export function formatarData(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Formata data e hora para exibição
 */
export function formatarDataHora(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Formata apenas a hora de uma data
 */
export function formatarHora(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Formata um CPF no padrão XXX.XXX.XXX-XX
 */
export function formatarCpf(cpf: string): string {
  const apenasNumeros = cpf.replace(/\D/g, '')
  return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata um número de telefone brasileiro
 */
export function formatarTelefone(telefone: string): string {
  const apenasNumeros = telefone.replace(/\D/g, '')
  if (apenasNumeros.length === 11) {
    return apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

/**
 * Formata um CEP no padrão XXXXX-XXX
 */
export function formatarCep(cep: string): string {
  const apenasNumeros = cep.replace(/\D/g, '')
  return apenasNumeros.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/**
 * Formata um CNPJ no padrão XX.XXX.XXX/XXXX-XX
 */
export function formatarCnpj(cnpj: string): string {
  const apenasNumeros = cnpj.replace(/\D/g, '')
  return apenasNumeros.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    '$1.$2.$3/$4-$5'
  )
}

/**
 * Retorna as iniciais de um nome para avatar
 */
export function obterIniciais(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

/**
 * Calcula a idade a partir da data de nascimento
 */
export function calcularIdade(dataNascimento: string): number {
  const nascimento = new Date(dataNascimento)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mesAtual = hoje.getMonth()
  const mesNascimento = nascimento.getMonth()
  if (
    mesAtual < mesNascimento ||
    (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())
  ) {
    idade--
  }
  return idade
}

/**
 * Formata duração em minutos para exibição legível
 */
export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const minutosRestantes = minutos % 60
  if (minutosRestantes === 0) return `${horas}h`
  return `${horas}h ${minutosRestantes}min`
}

/**
 * Retorna rótulo amigável para o status da consulta
 */
export function rotuloDaConsulta(
  status: string
): { texto: string; cor: string } {
  const mapa: Record<string, { texto: string; cor: string }> = {
    agendado: { texto: 'Agendado', cor: 'azul' },
    confirmado: { texto: 'Confirmado', cor: 'verde' },
    em_atendimento: { texto: 'Em Atendimento', cor: 'amarelo' },
    concluido: { texto: 'Concluído', cor: 'cinza' },
    cancelado: { texto: 'Cancelado', cor: 'vermelho' },
    faltou: { texto: 'Faltou', cor: 'laranja' },
    remarcado: { texto: 'Remarcado', cor: 'roxo' },
  }
  return mapa[status] || { texto: status, cor: 'cinza' }
}

/**
 * Substitui variáveis no template de mensagem
 * Ex: "Olá {nome}, sua consulta é dia {data}" -> "Olá João, sua consulta é dia 10/04"
 */
export function processarTemplateMensagem(
  template: string,
  variaveis: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, chave) => variaveis[chave] || `{${chave}}`)
}

/**
 * Gera um slug a partir de um texto
 */
export function gerarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Formata um percentual para exibição
 */
export function formatarPercentual(valor: number, casasDecimais = 1): string {
  return `${valor.toFixed(casasDecimais)}%`
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD
 */
export function dataDeHoje(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Retorna o início e fim de um mês
 */
export function intervaloDoMes(ano: number, mes: number): { inicio: string; fim: string } {
  const inicio = new Date(ano, mes - 1, 1)
  const fim = new Date(ano, mes, 0, 23, 59, 59)
  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
  }
}

/**
 * Converte um número de dia da semana para nome em português
 */
export function nomeDiaSemana(dia: number): string {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  return dias[dia] || ''
}

/**
 * Converte um número de mês para nome em português
 */
export function nomeMes(mes: number): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  return meses[mes - 1] || ''
}
