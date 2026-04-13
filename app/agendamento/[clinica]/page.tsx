'use client'
// ============================================================
// CLINIO - Portal Público de Agendamento Online
// Página pública acessível sem login para pacientes agendarem
// ============================================================

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, Clock, User, Phone, Mail, CheckCircle, Stethoscope } from 'lucide-react'
import { criarClienteNavegador } from '@/lib/supabase-cliente'
import { BotaoAcao } from '@/componentes/ui/BotaoAcao'
import { validarEmail, validarTelefone } from '@/lib/validadores'
import { formatarData, nomeDiaSemana } from '@/lib/formatadores'
import type { Medico, TipoConsulta, SlotDisponivel } from '@/tipos'

type EtapaAgendamento = 'especialidade' | 'medico' | 'data' | 'horario' | 'dados' | 'confirmacao'

interface DadosPaciente {
  nome: string
  telefone: string
  email: string
  cpf: string
  observacoes: string
}

export default function PaginaAgendamentoPublico() {
  const params = useParams()
  const slugClinica = params.clinica as string

  const [clinica, setClinica] = useState<any>(null)
  const [etapa, setEtapa] = useState<EtapaAgendamento>('especialidade')
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [tiposConsulta, setTiposConsulta] = useState<TipoConsulta[]>([])
  const [slots, setSlots] = useState<SlotDisponivel[]>([])

  // Seleções do usuário
  const [medicoSelecionado, setMedicoSelecionado] = useState<Medico | null>(null)
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoConsulta | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [slotSelecionado, setSlotSelecionado] = useState<SlotDisponivel | null>(null)

  const [dadosPaciente, setDadosPaciente] = useState<DadosPaciente>({
    nome: '', telefone: '', email: '', cpf: '', observacoes: '',
  })

  const [carregando, setCarregando] = useState(false)
  const [erros, setErros] = useState<string[]>([])
  const [agendamentoConcluido, setAgendamentoConcluido] = useState(false)

  // Buscar dados da clínica pelo slug
  useEffect(() => {
    async function buscarClinica() {
      try {
        const supabase = criarClienteNavegador()

        const { data } = await supabase
          .from('clinicas')
          .select('id, nome, logo_url, telefone, configuracoes')
          .eq('slug', slugClinica)
          .eq('ativo', true)
          .single()

        if (data) {
          setClinica(data)
          buscarMedicos(data.id)
          buscarTiposConsulta(data.id)
        }
      } catch (erro) {
        console.error('Erro ao buscar clínica:', erro)
      }
    }

    buscarClinica()
  }, [slugClinica])

  async function buscarMedicos(clinicaId: string) {
    const supabase = criarClienteNavegador()

    const { data } = await supabase
      .from('medicos')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .order('nome')

    setMedicos((data as Medico[]) || [])
  }

  async function buscarTiposConsulta(clinicaId: string) {
    const supabase = criarClienteNavegador()

    const { data } = await supabase
      .from('tipos_consulta')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .order('nome')

    setTiposConsulta((data as TipoConsulta[]) || [])
  }

  async function buscarSlotsDisponiveis() {
    if (!medicoSelecionado || !dataSelecionada || !clinica) return

    setCarregando(true)
    try {
      const params = new URLSearchParams({
        medico_id: medicoSelecionado.id,
        data: dataSelecionada,
        clinica_id: clinica.id,
        duracao_minutos: (tipoSelecionado?.duracao_minutos || medicoSelecionado.duracao_padrao).toString(),
      })

      const resposta = await fetch(`/api/agenda/slots?${params}`)
      const dados = await resposta.json()
      setSlots(dados.dados || [])
      setEtapa('horario')
    } catch (erro) {
      console.error('Erro ao buscar slots:', erro)
    } finally {
      setCarregando(false)
    }
  }

  async function finalizarAgendamento() {
    // Validar dados do paciente
    const novosErros: string[] = []
    if (!dadosPaciente.nome || dadosPaciente.nome.length < 3) {
      novosErros.push('Nome deve ter pelo menos 3 caracteres')
    }
    if (!validarTelefone(dadosPaciente.telefone)) {
      novosErros.push('Telefone inválido')
    }
    if (dadosPaciente.email && !validarEmail(dadosPaciente.email)) {
      novosErros.push('Email inválido')
    }

    if (novosErros.length > 0) {
      setErros(novosErros)
      return
    }

    setCarregando(true)
    setErros([])

    try {
      const resposta = await fetch('/api/agendamento-publico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: clinica.id,
          medico_id: medicoSelecionado?.id,
          tipo_consulta_id: tipoSelecionado?.id,
          data_hora: slotSelecionado?.data_hora,
          duracao_minutos: tipoSelecionado?.duracao_minutos || medicoSelecionado?.duracao_padrao,
          ...dadosPaciente,
        }),
      })

      if (resposta.ok) {
        setAgendamentoConcluido(true)
      } else {
        const erro = await resposta.json()
        setErros([erro.erro || 'Erro ao realizar agendamento'])
      }
    } catch {
      setErros(['Erro de conexão. Tente novamente.'])
    } finally {
      setCarregando(false)
    }
  }

  if (!clinica && !agendamentoConcluido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Carregando informações da clínica...</p>
        </div>
      </div>
    )
  }

  // Tela de confirmação final
  if (agendamentoConcluido) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Agendamento Confirmado! 🎉
          </h2>
          <p className="text-gray-600 mb-6">
            Seu agendamento foi realizado com sucesso. Você receberá uma confirmação no WhatsApp
            {dadosPaciente.email && ' e no email'} informados.
          </p>

          <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-500">Paciente</span>
              <span className="font-medium text-gray-900">{dadosPaciente.nome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Médico</span>
              <span className="font-medium text-gray-900">{medicoSelecionado?.nome}</span>
            </div>
            {tipoSelecionado && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <span className="font-medium text-gray-900">{tipoSelecionado.nome}</span>
              </div>
            )}
            {slotSelecionado && (
              <div className="flex justify-between">
                <span className="text-gray-500">Data e hora</span>
                <span className="font-medium text-gray-900">
                  {formatarData(slotSelecionado.data_hora)}{' '}
                  às{' '}
                  {new Date(slotSelecionado.data_hora).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-400">
            Em caso de dúvidas, entre em contato: {clinica?.telefone}
          </p>
        </div>
      </div>
    )
  }

  // Progresso das etapas
  const etapas: { id: EtapaAgendamento; rotulo: string }[] = [
    { id: 'especialidade', rotulo: 'Tipo' },
    { id: 'medico', rotulo: 'Médico' },
    { id: 'data', rotulo: 'Data' },
    { id: 'horario', rotulo: 'Horário' },
    { id: 'dados', rotulo: 'Dados' },
  ]

  const indiceEtapa = etapas.findIndex((e) => e.id === etapa)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Cabeçalho da clínica */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-4">
          {clinica.logo_url ? (
            <img src={clinica.logo_url} alt={clinica.nome} className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-gray-900 text-lg">{clinica.nome}</h1>
            <p className="text-sm text-gray-500">Agendamento online</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Barra de progresso */}
        <div className="flex items-center justify-between mb-8">
          {etapas.map((e, i) => (
            <div key={e.id} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                ${i < indiceEtapa ? 'bg-green-500 text-white' :
                  i === indiceEtapa ? 'bg-blue-600 text-white' :
                  'bg-gray-200 text-gray-500'}
              `}>
                {i < indiceEtapa ? '✓' : i + 1}
              </div>
              <span className={`ml-1.5 text-xs font-medium hidden sm:block
                ${i === indiceEtapa ? 'text-blue-700' : 'text-gray-500'}`}>
                {e.rotulo}
              </span>
              {i < etapas.length - 1 && (
                <div className={`mx-2 flex-1 h-0.5 w-6 sm:w-12
                  ${i < indiceEtapa ? 'bg-green-500' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* ETAPA 1: Tipo de Consulta */}
          {etapa === 'especialidade' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Qual tipo de consulta?</h2>
              <p className="text-gray-500 text-sm mb-6">Selecione o serviço que deseja agendar</p>

              {tiposConsulta.length > 0 ? (
                <div className="space-y-3">
                  {tiposConsulta.map((tipo) => (
                    <button
                      key={tipo.id}
                      onClick={() => {
                        setTipoSelecionado(tipo)
                        setEtapa('medico')
                      }}
                      className="w-full p-4 rounded-xl border-2 border-gray-100 hover:border-blue-300
                                 hover:bg-blue-50 transition-all text-left flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{tipo.nome}</p>
                        {tipo.descricao && (
                          <p className="text-sm text-gray-500 mt-0.5">{tipo.descricao}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-500">{tipo.duracao_minutos} min</p>
                        {tipo.valor && (
                          <p className="text-sm font-medium text-green-600">
                            R$ {tipo.valor.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setEtapa('medico')}
                  className="w-full p-4 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 font-medium"
                >
                  Consulta Geral
                </button>
              )}
            </div>
          )}

          {/* ETAPA 2: Médico */}
          {etapa === 'medico' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Escolha o médico</h2>
              <p className="text-gray-500 text-sm mb-6">Selecione o profissional de sua preferência</p>

              <div className="space-y-3">
                {medicos.map((medico) => (
                  <button
                    key={medico.id}
                    onClick={() => {
                      setMedicoSelecionado(medico)
                      setEtapa('data')
                    }}
                    className="w-full p-4 rounded-xl border-2 border-gray-100 hover:border-blue-300
                               hover:bg-blue-50 transition-all text-left flex items-center gap-4"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
                      style={{ backgroundColor: medico.cor_agenda }}
                    >
                      {medico.nome.split(' ').slice(0, 2).map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{medico.nome}</p>
                      {medico.especialidade && (
                        <p className="text-sm text-gray-500">{medico.especialidade}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setEtapa('especialidade')}
                className="mt-4 text-sm text-gray-400 hover:text-gray-600"
              >
                ← Voltar
              </button>
            </div>
          )}

          {/* ETAPA 3: Data */}
          {etapa === 'data' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Escolha a data</h2>
              <p className="text-gray-500 text-sm mb-6">Selecione o dia desejado para a consulta</p>

              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                max={new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="campo-input text-lg"
              />

              <div className="flex gap-3 mt-6">
                <BotaoAcao
                  variante="secundario"
                  onClick={() => setEtapa('medico')}
                >
                  Voltar
                </BotaoAcao>
                <BotaoAcao
                  variante="primario"
                  larguraTotal
                  disabled={!dataSelecionada}
                  carregando={carregando}
                  onClick={buscarSlotsDisponiveis}
                >
                  Ver horários disponíveis
                </BotaoAcao>
              </div>
            </div>
          )}

          {/* ETAPA 4: Horário */}
          {etapa === 'horario' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Escolha o horário</h2>
              <p className="text-gray-500 text-sm mb-6">
                Disponível em {formatarData(dataSelecionada)}
              </p>

              {slots.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Não há horários disponíveis nesta data</p>
                  <button
                    onClick={() => setEtapa('data')}
                    className="mt-4 text-blue-600 text-sm font-medium"
                  >
                    Escolher outra data
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                  {slots.map((slot) => {
                    const hora = new Date(slot.data_hora).toLocaleTimeString('pt-BR', {
                      hour: '2-digit', minute: '2-digit'
                    })
                    const selecionado = slotSelecionado?.data_hora === slot.data_hora

                    return (
                      <button
                        key={slot.data_hora}
                        onClick={() => setSlotSelecionado(slot)}
                        className={`
                          p-3 rounded-xl border-2 text-sm font-semibold transition-all
                          ${selecionado
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                          }
                        `}
                      >
                        {hora}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <BotaoAcao variante="secundario" onClick={() => setEtapa('data')}>
                  Voltar
                </BotaoAcao>
                <BotaoAcao
                  variante="primario"
                  larguraTotal
                  disabled={!slotSelecionado}
                  onClick={() => setEtapa('dados')}
                >
                  Continuar
                </BotaoAcao>
              </div>
            </div>
          )}

          {/* ETAPA 5: Dados do Paciente */}
          {etapa === 'dados' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Seus dados</h2>
              <p className="text-gray-500 text-sm mb-6">Preencha as informações para o agendamento</p>

              {erros.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                  {erros.map((e, i) => (
                    <p key={i} className="text-sm text-red-700">{e}</p>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="rotulo-campo">Nome completo *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={dadosPaciente.nome}
                      onChange={(e) => setDadosPaciente({ ...dadosPaciente, nome: e.target.value })}
                      placeholder="Seu nome completo"
                      className="campo-input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="rotulo-campo">Telefone (WhatsApp) *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={dadosPaciente.telefone}
                      onChange={(e) => setDadosPaciente({ ...dadosPaciente, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="campo-input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="rotulo-campo">Email (opcional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={dadosPaciente.email}
                      onChange={(e) => setDadosPaciente({ ...dadosPaciente, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="campo-input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="rotulo-campo">Observações (opcional)</label>
                  <textarea
                    value={dadosPaciente.observacoes}
                    onChange={(e) => setDadosPaciente({ ...dadosPaciente, observacoes: e.target.value })}
                    placeholder="Algum sintoma ou informação relevante..."
                    rows={3}
                    className="campo-input resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <BotaoAcao variante="secundario" onClick={() => setEtapa('horario')}>
                  Voltar
                </BotaoAcao>
                <BotaoAcao
                  variante="sucesso"
                  larguraTotal
                  carregando={carregando}
                  onClick={finalizarAgendamento}
                  icone={<CheckCircle className="w-4 h-4" />}
                >
                  Confirmar Agendamento
                </BotaoAcao>
              </div>
            </div>
          )}
        </div>

        {/* Resumo da seleção */}
        {(medicoSelecionado || tipoSelecionado || slotSelecionado) && (
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
            <p className="font-semibold text-blue-800 mb-2">Resumo do agendamento</p>
            <div className="space-y-1 text-blue-700">
              {tipoSelecionado && <p>📋 {tipoSelecionado.nome}</p>}
              {medicoSelecionado && <p>👨‍⚕️ {medicoSelecionado.nome}</p>}
              {dataSelecionada && slotSelecionado && (
                <p>📅 {formatarData(dataSelecionada)} às{' '}
                  {new Date(slotSelecionado.data_hora).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
