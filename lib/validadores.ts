// ============================================================
// CLINIO - Funções de Validação
// ============================================================

/**
 * Valida um CPF brasileiro
 */
export function validarCpf(cpf: string): boolean {
  const apenasNumeros = cpf.replace(/\D/g, '')
  if (apenasNumeros.length !== 11) return false
  if (/^(\d)\1{10}$/.test(apenasNumeros)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(apenasNumeros[i]) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(apenasNumeros[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(apenasNumeros[i]) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  return resto === parseInt(apenasNumeros[10])
}

/**
 * Valida um CNPJ brasileiro
 */
export function validarCnpj(cnpj: string): boolean {
  const apenasNumeros = cnpj.replace(/\D/g, '')
  if (apenasNumeros.length !== 14) return false
  if (/^(\d)\1{13}$/.test(apenasNumeros)) return false

  const calcularDigito = (numeros: string, pesos: number[]): number => {
    let soma = 0
    for (let i = 0; i < pesos.length; i++) {
      soma += parseInt(numeros[i]) * pesos[i]
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const digito1 = calcularDigito(apenasNumeros, pesos1)
  const digito2 = calcularDigito(apenasNumeros, pesos2)

  return (
    digito1 === parseInt(apenasNumeros[12]) &&
    digito2 === parseInt(apenasNumeros[13])
  )
}

/**
 * Valida um endereço de email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Valida um número de telefone brasileiro
 */
export function validarTelefone(telefone: string): boolean {
  const apenasNumeros = telefone.replace(/\D/g, '')
  return apenasNumeros.length === 10 || apenasNumeros.length === 11
}

/**
 * Valida um CEP brasileiro
 */
export function validarCep(cep: string): boolean {
  const apenasNumeros = cep.replace(/\D/g, '')
  return apenasNumeros.length === 8
}

/**
 * Verifica se uma data/hora está no futuro
 */
export function ehDataFutura(data: string | Date): boolean {
  const d = typeof data === 'string' ? new Date(data) : data
  return d > new Date()
}

/**
 * Verifica se dois intervalos de tempo se sobrepõem
 */
export function horariosSeChocam(
  inicio1: Date,
  fim1: Date,
  inicio2: Date,
  fim2: Date
): boolean {
  return inicio1 < fim2 && fim1 > inicio2
}

/**
 * Valida campos obrigatórios de uma consulta
 */
export function validarFormularioConsulta(dados: {
  paciente_id: string
  medico_id: string
  data_hora_inicio: string
  duracao_minutos: number
}): string[] {
  const erros: string[] = []
  if (!dados.paciente_id) erros.push('Paciente é obrigatório')
  if (!dados.medico_id) erros.push('Médico é obrigatório')
  if (!dados.data_hora_inicio) erros.push('Data e hora são obrigatórios')
  if (!dados.duracao_minutos || dados.duracao_minutos < 10) {
    erros.push('Duração mínima é de 10 minutos')
  }
  return erros
}

/**
 * Valida campos obrigatórios de um paciente
 */
export function validarFormularioPaciente(dados: {
  nome: string
  telefone?: string
  email?: string
  cpf?: string
}): string[] {
  const erros: string[] = []
  if (!dados.nome || dados.nome.trim().length < 3) {
    erros.push('Nome deve ter pelo menos 3 caracteres')
  }
  if (dados.email && !validarEmail(dados.email)) {
    erros.push('Email inválido')
  }
  if (dados.telefone && !validarTelefone(dados.telefone)) {
    erros.push('Telefone inválido')
  }
  if (dados.cpf && !validarCpf(dados.cpf)) {
    erros.push('CPF inválido')
  }
  return erros
}
