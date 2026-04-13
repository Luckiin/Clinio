'use client'
// ============================================================
// CLINIO - Módulo de Agenda Médica — Página Principal
// Rota: /agenda
// Padrão: visão mensal. Usuário pode mudar para semana ou dia.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Calendar,
  LayoutGrid, List, Clock, RefreshCw,
} from 'lucide-react'
import { CalendarioMes } from '@/componentes/agenda/CalendarioMes'
import { CalendarioSemanal } from '@/componentes/agenda/CalendarioSemanal'
import { CalendarioDia } from '@/componentes/agenda/CalendarioDia'
import { ModalConsulta } from '@/componentes/agenda/ModalConsulta'
import { ListaEspera, ModalAdicionarEspera } from '@/componentes/agenda/ListaEspera'
import { AlerteRiscoFalta } from '@/componentes/agenda/AlerteRiscoFalta'
// nomeDiaSemana e nomeMes não usados aqui — título gerado com Intl.DateTimeFormat
import type { ConsultaComRelacoes, StatusConsulta, FormularioNovaConsulta, Medico } from '@/tipos'

type VisaoAgenda = 'mes' | 'semana' | 'dia'
type ModoModal = 'nova' | 'detalhes' | 'reagendar' | 'prontuario'

interface ConsultaRisco {
  consulta_id: string
  paciente_id: string
  paciente_nome: string
  paciente_telefone?: string
  medico_nome?: string
  hora: string
  probabilidade: number
  fatores: string[]
}

// ─── Utilitários de data ──────────────────────────────────────
function inicioSemana(d: Date): Date {
  const r = new Date(d)
  r.setDate(r.getDate() - r.getDay())
  r.setHours(0, 0, 0, 0)
  return r
}

function dataParaISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseDataLocal(str: string): Date {
  const [a, m, dia] = str.split('-').map(Number)
  return new Date(a, m - 1, dia)
}

// ─── Componente principal ─────────────────────────────────────
export default function PaginaAgenda() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Visão padrão: mês
  const [visao, setVisao] = useState<VisaoAgenda>('mes')
  const [dataAtual, setDataAtual] = useState<Date>(hoje)

  const [consultas, setConsultas] = useState<ConsultaComRelacoes[]>([])
  const [consultasRisco, setConsultasRisco] = useState<ConsultaRisco[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [clinicaId, setClinicaId] = useState<string>('')
  const [taxaOcupacao, setTaxaOcupacao] = useState<number | null>(null)
  const [medicoFiltro, setMedicoFiltro] = useState<string>('')

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('nova')
  const [consultaSelecionada, setConsultaSelecionada] = useState<ConsultaComRelacoes | undefined>()
  const [horarioInicial, setHorarioInicial] = useState('')
  const [medicoInicial, setMedicoInicial] = useState('')

  // Lista de espera
  const [modalEsperaAberto, setModalEsperaAberto] = useState(false)

  // ─── Perfil e médicos ───────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth').then((r) => r.json()).then((d) => {
      if (d.dados?.clinica_id) setClinicaId(d.dados.clinica_id)
    })
  }, [])

  useEffect(() => {
    if (!clinicaId) return
    fetch('/api/medicos').then((r) => r.json()).then((d) => setMedicos(d.dados || []))
  }, [clinicaId])

  // ─── Intervalo de busca por visão ──────────────────────────
  const { dataInicio, dataFim } = (() => {
    if (visao === 'mes') {
      const ini = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1)
      const fim = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0)
      return { dataInicio: dataParaISO(ini), dataFim: dataParaISO(fim) }
    }
    if (visao === 'semana') {
      const ini = inicioSemana(dataAtual)
      const fim = new Date(ini); fim.setDate(fim.getDate() + 6)
      return { dataInicio: dataParaISO(ini), dataFim: dataParaISO(fim) }
    }
    return { dataInicio: dataParaISO(dataAtual), dataFim: dataParaISO(dataAtual) }
  })()

  // ─── Buscar consultas + risco + ocupação ────────────────────
  const buscarConsultas = useCallback(async () => {
    setCarregando(true)
    try {
      const p = new URLSearchParams({
        data_inicio: `${dataInicio}T00:00:00`,
        data_fim: `${dataFim}T23:59:59`,
      })
      if (medicoFiltro) p.set('medico_id', medicoFiltro)

      const [rConsultas, rRisco, rOcupacao] = await Promise.allSettled([
        fetch(`/api/consultas?${p}`).then((r) => r.json()),
        fetch(`/api/previsao-faltas?data=${dataInicio}&limite=10`).then((r) => r.json()),
        fetch(`/api/agenda/ocupacao?data=${dataParaISO(hoje)}${medicoFiltro ? `&medico_id=${medicoFiltro}` : ''}`).then((r) => r.json()),
      ])

      if (rConsultas.status === 'fulfilled') setConsultas(rConsultas.value.dados || [])
      if (rRisco.status === 'fulfilled') setConsultasRisco(rRisco.value.consultas_alto_risco || [])
      if (rOcupacao.status === 'fulfilled') setTaxaOcupacao(rOcupacao.value.taxa_ocupacao ?? null)
    } catch (err) {
      console.error('Erro ao buscar agenda:', err)
    } finally {
      setCarregando(false)
    }
  }, [dataInicio, dataFim, medicoFiltro])

  useEffect(() => { buscarConsultas() }, [buscarConsultas])

  // ─── Navegação ──────────────────────────────────────────────
  function navegar(dir: 'anterior' | 'proximo') {
    const nova = new Date(dataAtual)
    if (visao === 'mes') {
      nova.setMonth(nova.getMonth() + (dir === 'proximo' ? 1 : -1))
      nova.setDate(1)
    } else if (visao === 'semana') {
      nova.setDate(nova.getDate() + (dir === 'proximo' ? 7 : -7))
    } else {
      nova.setDate(nova.getDate() + (dir === 'proximo' ? 1 : -1))
    }
    setDataAtual(nova)
  }

  function irParaHoje() { setDataAtual(new Date(hoje)) }

  // ─── Título da navegação ────────────────────────────────────
  // Construído manualmente para evitar bug do Intl em pt-BR no Windows
  // onde { month: 'long', year: 'numeric' } retorna "de 2026" sem o mês
  const MESES = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ]
  const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

  const tituloNav = (() => {
    if (visao === 'mes') {
      // ex: "Abril de 2026"
      return `${MESES[dataAtual.getMonth()]} de ${dataAtual.getFullYear()}`
    }
    if (visao === 'semana') {
      const ini = inicioSemana(dataAtual)
      const fim = new Date(ini); fim.setDate(fim.getDate() + 6)
      if (ini.getMonth() === fim.getMonth()) {
        // ex: "13–19 de abril de 2026"
        return `${ini.getDate()}–${fim.getDate()} de ${MESES[ini.getMonth()]} de ${ini.getFullYear()}`
      }
      // ex: "28 de abr – 4 de mai de 2026"
      return `${ini.getDate()} de ${MESES_CURTOS[ini.getMonth()]} – ${fim.getDate()} de ${MESES_CURTOS[fim.getMonth()]} de ${fim.getFullYear()}`
    }
    // visão dia — ex: "segunda-feira, 13 de abril de 2026"
    return `${DIAS_SEMANA[dataAtual.getDay()]}, ${dataAtual.getDate()} de ${MESES[dataAtual.getMonth()]} de ${dataAtual.getFullYear()}`
  })()

  // ─── Abrir modal nova consulta ──────────────────────────────
  function abrirNovaConsulta(dataHora?: string, medicoId?: string) {
    setConsultaSelecionada(undefined)
    setModoModal('nova')
    setHorarioInicial(dataHora || '')
    setMedicoInicial(medicoId || '')
    setModalAberto(true)
  }

  function abrirDetalhes(consulta: ConsultaComRelacoes) {
    setConsultaSelecionada(consulta)
    setModoModal('detalhes')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setConsultaSelecionada(undefined)
    setHorarioInicial('')
    setMedicoInicial('')
  }

  // ─── Handlers do modal ──────────────────────────────────────
  async function aoSalvar(dados: FormularioNovaConsulta) {
    // Converte o valor do datetime-local (sem timezone) para ISO com fuso correto.
    // Sem isso, o servidor (UTC) interpretaria o horário como UTC em vez de horário local.
    const dadosComTZ = {
      ...dados,
      data_hora_inicio: new Date(dados.data_hora_inicio).toISOString(),
    }
    const resposta = await fetch('/api/consultas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosComTZ),
    })
    if (!resposta.ok) {
      const erro = await resposta.json()
      throw new Error(erro.erro || 'Erro ao criar consulta')
    }
    await buscarConsultas()
  }

  async function aoAtualizarStatus(id: string, status: StatusConsulta, motivo?: string) {
    await fetch(`/api/consultas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'atualizar_status', status, motivo }),
    })
    await buscarConsultas()
  }

  async function aoReagendar(id: string, novaDataHora: string, duracao: number) {
    const inicio = new Date(novaDataHora)
    const fim = new Date(inicio.getTime() + duracao * 60000)
    await fetch(`/api/consultas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'reagendar',
        data_hora_inicio: inicio.toISOString(),
        data_hora_fim: fim.toISOString(),
      }),
    })
    await buscarConsultas()
    fecharModal()
  }

  async function aoSalvarProntuario(id: string, dados: { anamnese?: string; diagnostico?: string; prescricao?: string }) {
    await fetch(`/api/consultas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'prontuario', ...dados }),
    })
    await buscarConsultas()
  }

  // Drag-and-drop (CalendarioDia passa id + novaDataHora como string datetime-local)
  async function aoReagendarDrag(id: string, novaDataHora: string) {
    const consulta = consultas.find((c) => c.id === id)
    const duracaoMin = consulta
      ? Math.round((new Date(consulta.data_hora_fim).getTime() - new Date(consulta.data_hora_inicio).getTime()) / 60000)
      : 30
    await aoReagendar(id, novaDataHora, duracaoMin)
  }

  // Clicar num dia no mês ou semana → navegar para visão dia
  function irParaDia(dataStr: string) {
    setDataAtual(parseDataLocal(dataStr))
    setVisao('dia')
  }

  // Alertas de risco
  async function aoConfirmarPresencaRisco(consultaId: string) {
    await aoAtualizarStatus(consultaId, 'confirmado')
  }
  async function aoEnviarLembrete(consultaId: string) {
    await fetch(`/api/consultas/${consultaId}/lembrete`, { method: 'POST' })
  }

  // ─── Dados Calculados (Filtragem) ──────────────────────────
  const consultasFiltradas = useMemo(() => {
    if (!medicoFiltro) return consultas
    return consultas.filter((c) => c.medico_id === medicoFiltro)
  }, [consultas, medicoFiltro])

  const consultasDoDia = useMemo(() => {
    const dataAtualISO = dataParaISO(dataAtual)
    return consultasFiltradas.filter((c) => {
      const dataConsulta = dataParaISO(new Date(c.data_hora_inicio))
      return dataConsulta === dataAtualISO
    })
  }, [consultasFiltradas, dataAtual])

  const medicosFiltrados = useMemo(() => {
    if (!medicoFiltro) return medicos
    return medicos.filter((m) => m.id === medicoFiltro)
  }, [medicos, medicoFiltro])

  // Painel lateral só aparece na visão dia
  const mostrarPainelLateral = visao === 'dia' && !!clinicaId

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">

      {/* ── Toolbar ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={() => navegar('anterior')} className="p-1.5 rounded-md hover:bg-gray-100 dark:bg-slate-800 transition-colors" aria-label="Anterior">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>
          <button onClick={irParaHoje} className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:bg-slate-800 rounded-md transition-colors">
            Hoje
          </button>
          <button onClick={() => navegar('proximo')} className="p-1.5 rounded-md hover:bg-gray-100 dark:bg-slate-800 transition-colors" aria-label="Próximo">
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>
        </div>

        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 capitalize flex-1">{tituloNav}</h2>

        {medicos.length > 0 && (
          <select
            value={medicoFiltro}
            onChange={e => setMedicoFiltro(e.target.value)}
            className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os médicos</option>
            {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        )}

        {taxaOcupacao !== null && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${taxaOcupacao >= 80 ? 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-400' : taxaOcupacao >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-700 dark:text-yellow-400' : 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-400'}`}>
            {taxaOcupacao}% ocupado
          </span>
        )}

        <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
          {(['mes', 'semana', 'dia'] as const).map(v => (
            <button
              key={v}
              onClick={() => setVisao(v)}
              className={`px-3 py-1.5 text-sm flex items-center gap-1 transition-colors border-r last:border-r-0 border-gray-200 dark:border-slate-700 ${visao === v ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:bg-slate-900/50'}`}
            >
              {v === 'mes' ? <><LayoutGrid className="w-3.5 h-3.5" /> Mês</> : v === 'semana' ? <><List className="w-3.5 h-3.5" /> Semana</> : <><Clock className="w-3.5 h-3.5" /> Dia</>}
            </button>
          ))}
        </div>

        <button onClick={buscarConsultas} disabled={carregando} className="p-1.5 rounded-md hover:bg-gray-100 dark:bg-slate-800 transition-colors disabled:opacity-50" title="Atualizar">
          <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-slate-400 ${carregando ? 'animate-spin' : ''}`} />
        </button>

        <button onClick={() => setModalEsperaAberto(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-sm hover:bg-amber-100 dark:bg-amber-900/60 transition-colors">
          <Clock className="w-4 h-4" /> Espera
        </button>

        <button onClick={() => abrirNovaConsulta()} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nova consulta
        </button>
      </div>

      {/* ── Alerte risco (visão dia) ── */}
      {visao === 'dia' && consultasRisco.length > 0 && (
        <div className="px-4 pt-3 flex-shrink-0">
          <AlerteRiscoFalta
            consultas={consultasRisco}
            aoConfirmarPresenca={async (id) => { await aoAtualizarStatus(id, 'confirmado') }}
            aoEnviarLembrete={aoEnviarLembrete}
          />
        </div>
      )}

      {/* ── Grade principal ── */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        <div className={`flex-1 overflow-hidden ${visao === 'dia' ? 'max-w-[calc(100%-288px)]' : ''}`}>
          {visao === 'mes' && (
            <CalendarioMes
              consultas={consultas}
              ano={dataAtual.getFullYear()}
              mes={dataAtual.getMonth()}
              aoClicarDia={(dataStr) => { setDataAtual(parseDataLocal(dataStr)); setVisao('dia') }}
              aoClicarConsulta={abrirDetalhes}
            />
          )}
          {visao === 'semana' && (
            <CalendarioSemanal
              consultas={consultas}
              dataInicio={inicioSemana(dataAtual)}
              aoClicarDia={irParaDia}
              aoClicarConsulta={abrirDetalhes}
            />
          )}
          {visao === 'dia' && (
            <CalendarioDia
              consultas={consultasDoDia}
              medicos={medicos}
              medicoFiltrado={medicoFiltro}
              data={dataParaISO(dataAtual)}
              aoClicarConsulta={abrirDetalhes}
              aoClicarSlotVazio={(dataHora) => abrirNovaConsulta(dataHora)}
              aoReagendar={aoReagendarDrag}
            />
          )}
        </div>

        {/* Painel lateral — só na visão dia */}
        {visao === 'dia' && (
          <div className="w-68 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {consultasDoDia.length === 0 ? 'Sem consultas' : `${consultasDoDia.length} consulta${consultasDoDia.length !== 1 ? 's' : ''}`}
              </h3>
              <div className="space-y-1.5">
                {consultasDoDia.map(c => {
                  const hora = new Date(c.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <button key={c.id} onClick={() => abrirDetalhes(c)} className="w-full text-left text-xs flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:bg-slate-900/50 transition-colors">
                      <span className="text-gray-400 w-10 flex-shrink-0">{hora}</span>
                      <span className="text-gray-700 dark:text-slate-300 truncate">{c.paciente?.nome ?? '—'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {clinicaId && (
              <ListaEspera
                clinicaId={clinicaId}
                medicoId={medicoFiltro || undefined}
                dataReferencia={dataParaISO(dataAtual)}
                aoEncaixar={buscarConsultas}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Modal de consulta ── */}
      {modalAberto && (
        <ModalConsulta
          aberto={modalAberto}
          modo={modoModal}
          consulta={consultaSelecionada}
          dataHoraInicial={horarioInicial}
          medicoIdInicial={medicoInicial}
          aoFechar={fecharModal}
          aoSalvar={aoSalvar}
          aoAtualizarStatus={aoAtualizarStatus}
          aoReagendar={aoReagendar}
          aoSalvarProntuario={aoSalvarProntuario}
        />
      )}

      {/* ── Modal lista de espera ── */}
      {clinicaId && (
        <ModalAdicionarEspera
          aberto={modalEsperaAberto}
          clinicaId={clinicaId}
          aoFechar={() => setModalEsperaAberto(false)}
          aoAdicionar={buscarConsultas}
        />
      )}
    </div>
  )
}
