'use client'
// ============================================================
// CLINIO - Modal de Consulta
// Cria nova consulta, exibe detalhes, reagendamento e cancelamento
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { BotaoAcao } from '@/componentes/ui/BotaoAcao'
import {
  X, Calendar, Clock, User, Stethoscope, MapPin,
  CheckCircle, XCircle, AlertTriangle, MessageSquare,
  ChevronRight, Edit2, RefreshCw
} from 'lucide-react'
import { formatarDataHora, formatarHora, formatarData } from '@/lib/formatadores'
import type {
  ConsultaComRelacoes, Paciente, Medico, Sala,
  TipoConsulta, StatusConsulta, FormularioNovaConsulta
} from '@/tipos'

type ModoModal = 'nova' | 'detalhes' | 'reagendar' | 'prontuario'

interface PropsModalConsulta {
  aberto: boolean
  modo: ModoModal
  consulta?: ConsultaComRelacoes  // undefined = modo nova
  dataHoraInicial?: string        // pré-preencher horário
  medicoIdInicial?: string        // pré-preencher médico
  aoFechar: () => void
  aoSalvar: (dados: FormularioNovaConsulta) => Promise<void>
  aoAtualizarStatus: (id: string, status: StatusConsulta, motivo?: string) => Promise<void>
  aoReagendar: (id: string, novaDataHora: string, duracao: number) => Promise<void>
  aoSalvarProntuario: (id: string, dados: {
    anamnese?: string; diagnostico?: string; prescricao?: string
  }) => Promise<void>
}

export function ModalConsulta({
  aberto,
  modo: modoInicial,
  consulta,
  dataHoraInicial,
  medicoIdInicial,
  aoFechar,
  aoSalvar,
  aoAtualizarStatus,
  aoReagendar,
  aoSalvarProntuario,
}: PropsModalConsulta) {
  const [modo, setModo] = useState<ModoModal>(modoInicial)
  const [carregando, setCarregando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [salas, setSalas] = useState<Sala[]>([])
  const [tiposConsulta, setTiposConsulta] = useState<TipoConsulta[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  // Formulário nova consulta
  const [form, setForm] = useState<Partial<FormularioNovaConsulta>>({
    data_hora_inicio: dataHoraInicial || '',
    medico_id: medicoIdInicial || '',
    duracao_minutos: 30,
    tipo: 'presencial',
  })

  // Formulário prontuário
  const [prontuario, setProntuario] = useState({
    anamnese: consulta?.anamnese || '',
    diagnostico: consulta?.diagnostico || '',
    prescricao: consulta?.prescricao || '',
  })

  useEffect(() => {
    setModo(modoInicial)
    if (consulta) {
      setProntuario({
        anamnese: consulta.anamnese || '',
        diagnostico: consulta.diagnostico || '',
        prescricao: consulta.prescricao || '',
      })
    }
  }, [modoInicial, consulta])

  // Carregar dados base
  useEffect(() => {
    if (!aberto) return
    Promise.all([
      fetch('/api/medicos').then((r) => r.json()),
      fetch('/api/salas').then((r) => r.json()),
      fetch('/api/tipos-consulta').then((r) => r.json()),
      fetch('/api/pacientes?limite=500').then((r) => r.json()),
    ]).then(([med, sal, tip, pac]) => {
      setMedicos(med.dados || [])
      setSalas(sal.dados || [])
      setTiposConsulta(tip.dados || [])
      setPacientes(pac.dados || [])
    })
  }, [aberto])

  const atualizar = (campo: keyof FormularioNovaConsulta, valor: any) =>
    setForm((f) => ({ ...f, [campo]: valor }))

  async function submeterNovaConsulta() {
    if (!form.paciente_id || !form.medico_id || !form.data_hora_inicio) return
    setCarregando(true)
    setErroSalvar(null)
    try {
      await aoSalvar(form as FormularioNovaConsulta)
      aoFechar()
    } catch (e: any) {
      setErroSalvar(e?.message || 'Erro ao agendar consulta')
    } finally {
      setCarregando(false)
    }
  }

  async function submeterReagendamento() {
    if (!consulta || !form.data_hora_inicio) return
    setCarregando(true)
    try {
      const duracao = Math.round(
        (new Date(consulta.data_hora_fim).getTime() - new Date(consulta.data_hora_inicio).getTime()) / 60000
      )
      await aoReagendar(consulta.id, form.data_hora_inicio, duracao)
      aoFechar()
    } finally {
      setCarregando(false)
    }
  }

  async function confirmar() {
    if (!consulta) return
    setCarregando(true)
    try {
      await aoAtualizarStatus(consulta.id, 'confirmado')
      aoFechar()
    } finally {
      setCarregando(false)
    }
  }

  async function marcarComparecimento(compareceu: boolean) {
    if (!consulta) return
    setCarregando(true)
    try {
      await aoAtualizarStatus(consulta.id, compareceu ? 'concluido' : 'faltou')
      aoFechar()
    } finally {
      setCarregando(false)
    }
  }

  async function cancelar() {
    if (!consulta) return
    setCarregando(true)
    try {
      await aoAtualizarStatus(consulta.id, 'cancelado', motivoCancelamento)
      aoFechar()
    } finally {
      setCarregando(false)
    }
  }

  async function salvarProntuario() {
    if (!consulta) return
    setCarregando(true)
    try {
      await aoSalvarProntuario(consulta.id, prontuario)
      aoFechar()
    } finally {
      setCarregando(false)
    }
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col animar-fade-in">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {modo === 'detalhes' && consulta && (
              <div className="flex gap-1">
                <button
                  onClick={() => setModo('prontuario')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-300 px-2 py-1 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:bg-blue-900/40"
                >
                  Prontuário
                </button>
                <button
                  onClick={() => setModo('reagendar')}
                  className="text-xs text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:text-slate-200 px-2 py-1 rounded border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-900/50"
                >
                  Reagendar
                </button>
              </div>
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {modo === 'nova'      && 'Nova Consulta'}
              {modo === 'detalhes'  && 'Detalhes da Consulta'}
              {modo === 'reagendar' && 'Reagendar Consulta'}
              {modo === 'prontuario'&& 'Prontuário'}
            </h2>
          </div>
          <button onClick={aoFechar} className="p-1.5 rounded-lg hover:bg-gray-100 dark:bg-slate-800">
            <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Corpo scrollável */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── MODO NOVA CONSULTA ─────────────────────────── */}
          {modo === 'nova' && (
            <div className="space-y-4">
              {/* Paciente */}
              <div>
                <label className="rotulo-campo">Paciente *</label>
                <select
                  value={form.paciente_id || ''}
                  onChange={(e) => atualizar('paciente_id', e.target.value)}
                  className="campo-input"
                >
                  <option value="">Selecione um paciente</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.telefone ? `(${p.telefone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Médico */}
              <div>
                <label className="rotulo-campo">Médico *</label>
                <select
                  value={form.medico_id || ''}
                  onChange={(e) => {
                    atualizar('medico_id', e.target.value)
                    const med = medicos.find((m) => m.id === e.target.value)
                    if (med) atualizar('duracao_minutos', med.duracao_padrao)
                  }}
                  className="campo-input"
                >
                  <option value="">Selecione um médico</option>
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome} — {m.especialidade}</option>
                  ))}
                </select>
              </div>

              {/* Data e hora + duração */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="rotulo-campo">Data e Hora *</label>
                  <input
                    type="datetime-local"
                    value={form.data_hora_inicio || ''}
                    onChange={(e) => atualizar('data_hora_inicio', e.target.value)}
                    className="campo-input"
                  />
                </div>
                <div>
                  <label className="rotulo-campo">Duração (min)</label>
                  <select
                    value={form.duracao_minutos || 30}
                    onChange={(e) => atualizar('duracao_minutos', parseInt(e.target.value))}
                    className="campo-input"
                  >
                    {[15, 20, 30, 40, 45, 60, 90, 120].map((d) => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sala e tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="rotulo-campo">Sala</label>
                  <select
                    value={form.sala_id || ''}
                    onChange={(e) => atualizar('sala_id', e.target.value || undefined)}
                    className="campo-input"
                  >
                    <option value="">Sem sala específica</option>
                    {salas.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="rotulo-campo">Tipo</label>
                  <select
                    value={form.tipo || 'presencial'}
                    onChange={(e) => atualizar('tipo', e.target.value as any)}
                    className="campo-input"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="teleconsulta">Teleconsulta</option>
                  </select>
                </div>
              </div>

              {/* Tipo de consulta e valor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="rotulo-campo">Tipo de Consulta</label>
                  <select
                    value={form.tipo_consulta_id || ''}
                    onChange={(e) => {
                      atualizar('tipo_consulta_id', e.target.value || undefined)
                      const tc = tiposConsulta.find((t) => t.id === e.target.value)
                      if (tc) {
                        atualizar('duracao_minutos', tc.duracao_minutos)
                        if (tc.valor) atualizar('valor', tc.valor)
                      }
                    }}
                    className="campo-input"
                  >
                    <option value="">Selecione</option>
                    {tiposConsulta.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="rotulo-campo">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.valor || ''}
                    onChange={(e) => atualizar('valor', parseFloat(e.target.value) || undefined)}
                    placeholder="0,00"
                    className="campo-input"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="rotulo-campo">Observações</label>
                <textarea
                  value={form.observacoes || ''}
                  onChange={(e) => atualizar('observacoes', e.target.value)}
                  rows={2}
                  className="campo-input resize-none"
                  placeholder="Informações adicionais sobre o agendamento..."
                />
              </div>
            </div>
          )}

          {/* ── MODO DETALHES ──────────────────────────────── */}
          {modo === 'detalhes' && consulta && (
            <div className="space-y-5">
              {/* Cabeçalho da consulta */}
              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{consulta.paciente?.nome}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{consulta.paciente?.telefone}</p>
                </div>
                <StatusBadge status={consulta.status} />
              </div>

              {/* Informações da consulta */}
              <div className="grid grid-cols-2 gap-3">
                <InfoItem icone={<Calendar className="w-4 h-4" />} rotulo="Data">
                  {formatarData(consulta.data_hora_inicio)}
                </InfoItem>
                <InfoItem icone={<Clock className="w-4 h-4" />} rotulo="Horário">
                  {formatarHora(consulta.data_hora_inicio)} — {formatarHora(consulta.data_hora_fim)}
                </InfoItem>
                <InfoItem icone={<Stethoscope className="w-4 h-4" />} rotulo="Médico">
                  {consulta.medico?.nome}
                </InfoItem>
                {consulta.sala && (
                  <InfoItem icone={<MapPin className="w-4 h-4" />} rotulo="Sala">
                    {consulta.sala.nome}
                  </InfoItem>
                )}
                {consulta.tipo_consulta && (
                  <InfoItem icone={<RefreshCw className="w-4 h-4" />} rotulo="Tipo">
                    {consulta.tipo_consulta.nome}
                  </InfoItem>
                )}
                {consulta.valor && (
                  <InfoItem icone={<span className="text-xs font-bold">R$</span>} rotulo="Valor">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(consulta.valor)}
                  </InfoItem>
                )}
              </div>

              {consulta.observacoes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/40 border border-amber-100 rounded-lg">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">Observações</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">{consulta.observacoes}</p>
                </div>
              )}

              {/* Ações por status */}
              {consulta.status === 'agendado' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <BotaoAcao
                    variante="sucesso"
                    larguraTotal
                    carregando={carregando}
                    icone={<CheckCircle className="w-4 h-4" />}
                    onClick={confirmar}
                  >
                    Confirmar
                  </BotaoAcao>
                  <BotaoAcao
                    variante="perigo"
                    larguraTotal
                    icone={<XCircle className="w-4 h-4" />}
                    onClick={() => {
                      const motivo = window.prompt('Motivo do cancelamento (opcional):') || ''
                      setMotivoCancelamento(motivo)
                      setTimeout(cancelar, 0)
                    }}
                  >
                    Cancelar
                  </BotaoAcao>
                </div>
              )}

              {consulta.status === 'confirmado' && (
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Registro de Presença</p>
                  <div className="grid grid-cols-2 gap-3">
                    <BotaoAcao
                      variante="sucesso"
                      larguraTotal
                      carregando={carregando}
                      icone={<CheckCircle className="w-4 h-4" />}
                      onClick={() => marcarComparecimento(true)}
                    >
                      Compareceu
                    </BotaoAcao>
                    <BotaoAcao
                      variante="perigo"
                      larguraTotal
                      carregando={carregando}
                      icone={<XCircle className="w-4 h-4" />}
                      onClick={() => marcarComparecimento(false)}
                    >
                      Não Compareceu
                    </BotaoAcao>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MODO REAGENDAR ─────────────────────────────── */}
          {modo === 'reagendar' && consulta && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/40 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">{consulta.paciente?.nome}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  Atual: {formatarDataHora(consulta.data_hora_inicio)}
                </p>
              </div>

              <div>
                <label className="rotulo-campo">Nova Data e Hora *</label>
                <input
                  type="datetime-local"
                  value={form.data_hora_inicio || ''}
                  onChange={(e) => atualizar('data_hora_inicio', e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="campo-input"
                />
              </div>

              <p className="text-xs text-gray-400">
                A duração da consulta ({Math.round((
                  new Date(consulta.data_hora_fim).getTime() -
                  new Date(consulta.data_hora_inicio).getTime()
                ) / 60000)} min) será mantida.
              </p>
            </div>
          )}

          {/* ── MODO PRONTUÁRIO ────────────────────────────── */}
          {modo === 'prontuario' && consulta && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">{consulta.paciente?.nome}</p>
                <p className="text-xs text-gray-400">{formatarDataHora(consulta.data_hora_inicio)}</p>
              </div>
              <div>
                <label className="rotulo-campo">Anamnese / Queixa Principal</label>
                <textarea
                  value={prontuario.anamnese}
                  onChange={(e) => setProntuario((p) => ({ ...p, anamnese: e.target.value }))}
                  rows={4}
                  className="campo-input resize-none"
                  placeholder="Descreva os sintomas e histórico do paciente..."
                />
              </div>
              <div>
                <label className="rotulo-campo">Diagnóstico</label>
                <textarea
                  value={prontuario.diagnostico}
                  onChange={(e) => setProntuario((p) => ({ ...p, diagnostico: e.target.value }))}
                  rows={3}
                  className="campo-input resize-none"
                  placeholder="CID e descrição do diagnóstico..."
                />
              </div>
              <div>
                <label className="rotulo-campo">Prescrição / Conduta</label>
                <textarea
                  value={prontuario.prescricao}
                  onChange={(e) => setProntuario((p) => ({ ...p, prescricao: e.target.value }))}
                  rows={4}
                  className="campo-input resize-none"
                  placeholder="Medicamentos, exames solicitados, orientações..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com botões */}
        <div className="flex flex-col gap-2 px-6 py-4 border-t border-gray-100 dark:border-slate-800">
          {erroSalvar && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {erroSalvar}
            </p>
          )}
          <div className="flex justify-end gap-3">
          <BotaoAcao variante="secundario" onClick={aoFechar}>
            {modo === 'detalhes' ? 'Fechar' : 'Cancelar'}
          </BotaoAcao>

          {modo === 'nova' && (
            <BotaoAcao
              variante="primario"
              carregando={carregando}
              disabled={!form.paciente_id || !form.medico_id || !form.data_hora_inicio}
              onClick={submeterNovaConsulta}
            >
              Agendar Consulta
            </BotaoAcao>
          )}
          {modo === 'reagendar' && (
            <BotaoAcao
              variante="primario"
              carregando={carregando}
              disabled={!form.data_hora_inicio}
              onClick={submeterReagendamento}
            >
              Confirmar Reagendamento
            </BotaoAcao>
          )}
          {modo === 'prontuario' && (
            <BotaoAcao
              variante="sucesso"
              carregando={carregando}
              onClick={salvarProntuario}
            >
              Salvar Prontuário
            </BotaoAcao>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────────

function StatusBadge({ status }: { status: StatusConsulta }) {
  const mapa: Record<StatusConsulta, { texto: string; classe: string }> = {
    agendado:       { texto: 'Agendado',        classe: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-400' },
    confirmado:     { texto: 'Confirmado',       classe: 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-400' },
    em_atendimento: { texto: 'Em Atendimento',   classe: 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-700 dark:text-yellow-400' },
    concluido:      { texto: 'Concluído',        classe: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400' },
    cancelado:      { texto: 'Cancelado',        classe: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-400' },
    faltou:         { texto: 'Não Compareceu',   classe: 'bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-400' },
    remarcado:      { texto: 'Remarcado',        classe: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-400' },
  }
  const { texto, classe } = mapa[status] ?? mapa.agendado
  return <span className={`badge text-xs font-semibold px-3 py-1 rounded-full ${classe}`}>{texto}</span>
}

function InfoItem({
  icone, rotulo, children
}: { icone: React.ReactNode; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icone}</span>
      <div>
        <p className="text-xs text-gray-400">{rotulo}</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{children}</p>
      </div>
    </div>
  )
}
