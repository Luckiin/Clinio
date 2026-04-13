'use client'
// ============================================================
// CLINIO - Calendário Dia
// Grade horária com arrastar-e-soltar, múltiplos médicos e salas
// ============================================================

import { useRef, useState, useCallback } from 'react'
import { formatarHora } from '@/lib/formatadores'
import { rotuloDaConsulta } from '@/lib/formatadores'
import type { ConsultaComRelacoes, Medico, StatusConsulta } from '@/tipos'
import { AlertTriangle, Clock, User } from 'lucide-react'

// Hora de início e fim da grade (6h às 22h = 16 horas)
const HORA_INICIO = 6
const HORA_FIM = 22
const TOTAL_HORAS = HORA_FIM - HORA_INICIO
const ALTURA_HORA_PX = 64 // pixels por hora

interface NivelRisco {
  nivel: 'alto' | 'medio' | 'baixo'
  probabilidade: number
}

interface ConsultaComRisco extends ConsultaComRelacoes {
  risco?: NivelRisco
}

interface PropsCalendarioDia {
  consultas: ConsultaComRisco[]
  medicos: Medico[]
  medicoFiltrado?: string
  aoClicarConsulta: (consulta: ConsultaComRelacoes) => void
  aoReagendar: (id: string, novaDataHora: string) => Promise<void>
  aoClicarSlotVazio: (dataHora: string, medicoId?: string) => void
  data: string // YYYY-MM-DD
  carregando?: boolean
}

// Mapeamento de estilos por status
const ESTILOS_STATUS: Record<StatusConsulta, { fundo: string; borda: string; texto: string }> = {
  agendado:      { fundo: 'bg-blue-50',   borda: 'border-blue-400',  texto: 'text-blue-800' },
  confirmado:    { fundo: 'bg-green-50',  borda: 'border-green-400', texto: 'text-green-800' },
  em_atendimento:{ fundo: 'bg-yellow-50', borda: 'border-yellow-400',texto: 'text-yellow-800' },
  concluido:     { fundo: 'bg-gray-100',  borda: 'border-gray-300',  texto: 'text-gray-600' },
  cancelado:     { fundo: 'bg-red-50',    borda: 'border-red-300',   texto: 'text-red-600' },
  faltou:        { fundo: 'bg-orange-50', borda: 'border-orange-300',texto: 'text-orange-700' },
  remarcado:     { fundo: 'bg-purple-50', borda: 'border-purple-300',texto: 'text-purple-700' },
}

// Converte uma data/hora para posição em pixels na grade
function dataParaPx(dataHora: string): number {
  const d = new Date(dataHora)
  const horasDesdeInicio = d.getHours() + d.getMinutes() / 60 - HORA_INICIO
  return Math.max(0, horasDesdeInicio * ALTURA_HORA_PX)
}

// Converte duração em minutos para altura em pixels
function duracaoPx(inicio: string, fim: string): number {
  const diffMs = new Date(fim).getTime() - new Date(inicio).getTime()
  const diffMin = diffMs / 60000
  return Math.max(32, (diffMin / 60) * ALTURA_HORA_PX)
}

// Converte posição Y em pixels para data/hora
function pxParaDataHora(pxY: number, data: string): string {
  const minutosDesdeInicio = (pxY / ALTURA_HORA_PX) * 60
  const horaTotal = HORA_INICIO + minutosDesdeInicio / 60
  const hora = Math.floor(horaTotal)
  // Arredondar para 15 minutos
  const minutos = Math.round((horaTotal - hora) * 60 / 15) * 15
  const horaFinal = hora + Math.floor(minutos / 60)
  const minutoFinal = minutos % 60
  return `${data}T${String(horaFinal).padStart(2, '0')}:${String(minutoFinal).padStart(2, '0')}:00`
}

export function CalendarioDia({
  consultas,
  medicos,
  medicoFiltrado,
  aoClicarConsulta,
  aoReagendar,
  aoClicarSlotVazio,
  data,
  carregando = false,
}: PropsCalendarioDia) {
  const gradeRef = useRef<HTMLDivElement>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [fantasmaPos, setFantasmaPos] = useState<{ top: number; medicoId?: string } | null>(null)

  // Filtra médicos a exibir
  const medicosVisiveis = medicoFiltrado
    ? medicos.filter((m) => m.id === medicoFiltrado)
    : medicos

  // Filtra consultas por médico
  function consultasDoMedico(medicoId: string): ConsultaComRisco[] {
    return consultas.filter(
      (c) =>
        c.medico_id === medicoId &&
        c.status !== 'cancelado'
    )
  }

  // ── Drag and Drop ──────────────────────────────────────────

  function aoIniciarArrasto(e: React.DragEvent, consultaId: string) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('consultaId', consultaId)
    setArrastando(consultaId)
  }

  function aoSoltarNaGrade(
    e: React.DragEvent,
    medicoId: string,
    colunaRef: React.RefObject<HTMLDivElement>
  ) {
    e.preventDefault()
    const consultaId = e.dataTransfer.getData('consultaId')
    if (!consultaId || !colunaRef.current) return

    const rect = colunaRef.current.getBoundingClientRect()
    const pxY = e.clientY - rect.top
    const novaDataHora = pxParaDataHora(pxY, data)

    aoReagendar(consultaId, novaDataHora)
    setArrastando(null)
    setFantasmaPos(null)
  }

  function aoDragarSobre(
    e: React.DragEvent,
    colunaRef: React.RefObject<HTMLDivElement>
  ) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!colunaRef.current) return
    const rect = colunaRef.current.getBoundingClientRect()
    setFantasmaPos({ top: e.clientY - rect.top })
  }

  const horasGrade = Array.from({ length: TOTAL_HORAS + 1 }, (_, i) => HORA_INICIO + i)

  return (
    <div className="flex overflow-x-auto min-h-0 relative select-none">
      {/* Coluna de horas */}
      <div className="flex-shrink-0 w-14 border-r border-gray-200 bg-white sticky left-0 z-10">
        {/* Espaço do cabeçalho */}
        <div className="h-10 border-b border-gray-200" />
        <div style={{ height: TOTAL_HORAS * ALTURA_HORA_PX }} className="relative">
          {horasGrade.map((hora) => (
            <div
              key={hora}
              className="absolute right-2 text-xs text-gray-400 font-medium"
              style={{ top: (hora - HORA_INICIO) * ALTURA_HORA_PX - 6 }}
            >
              {String(hora).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>

      {/* Colunas de médicos */}
      {medicosVisiveis.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-20 text-gray-400">
          Nenhum médico selecionado
        </div>
      ) : consultas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
          <Clock className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-medium">Nenhuma consulta agendada para este dia</p>
        </div>
      ) : (
        medicosVisiveis.map((medico) => (
          <ColunaMedico
            key={medico.id}
            medico={medico}
            consultas={consultasDoMedico(medico.id)}
            horasGrade={horasGrade}
            data={data}
            arrastando={arrastando}
            aoClicarConsulta={aoClicarConsulta}
            aoIniciarArrasto={aoIniciarArrasto}
            aoSoltarNaGrade={aoSoltarNaGrade}
            aoDragarSobre={aoDragarSobre}
            aoClicarSlotVazio={aoClicarSlotVazio}
            carregando={carregando}
          />
        ))
      )}

      {/* Linha de hora atual */}
      <LinhaHoraAtual data={data} />
    </div>
  )
}

// ── Coluna individual de cada médico ─────────────────────────
interface PropsColunaMedico {
  medico: Medico
  consultas: ConsultaComRisco[]
  horasGrade: number[]
  data: string
  arrastando: string | null
  aoClicarConsulta: (c: ConsultaComRelacoes) => void
  aoIniciarArrasto: (e: React.DragEvent, id: string) => void
  aoSoltarNaGrade: (e: React.DragEvent, medicoId: string, ref: React.RefObject<HTMLDivElement>) => void
  aoDragarSobre: (e: React.DragEvent, ref: React.RefObject<HTMLDivElement>) => void
  aoClicarSlotVazio: (dataHora: string, medicoId?: string) => void
  carregando: boolean
}

function ColunaMedico({
  medico,
  consultas,
  horasGrade,
  data,
  arrastando,
  aoClicarConsulta,
  aoIniciarArrasto,
  aoSoltarNaGrade,
  aoDragarSobre,
  aoClicarSlotVazio,
  carregando,
}: PropsColunaMedico) {
  const colunaRef = useRef<HTMLDivElement>(null)

  function aoClicarNaColuna(e: React.MouseEvent) {
    // Só aciona se clicou no fundo (não em uma consulta)
    if ((e.target as HTMLElement).closest('.cartao-consulta-grade')) return
    if (!colunaRef.current) return
    const rect = colunaRef.current.getBoundingClientRect()
    const pxY = e.clientY - rect.top
    aoClicarSlotVazio(pxParaDataHora(pxY, data), medico.id)
  }

  return (
    <div className="flex-1 min-w-[160px] border-r border-gray-200 last:border-r-0">
      {/* Cabeçalho do médico */}
      <div
        className="h-10 flex items-center justify-center gap-2 border-b border-gray-200 px-2 sticky top-0 bg-white z-10"
        style={{ borderTop: `3px solid ${medico.cor_agenda}` }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: medico.cor_agenda }}
        />
        <span className="text-xs font-semibold text-gray-700 truncate">{medico.nome}</span>
      </div>

      {/* Área da grade com consultas */}
      <div
        ref={colunaRef}
        className="relative cursor-pointer"
        style={{ height: TOTAL_HORAS * ALTURA_HORA_PX }}
        onClick={aoClicarNaColuna}
        onDragOver={(e) => aoDragarSobre(e, colunaRef)}
        onDrop={(e) => aoSoltarNaGrade(e, medico.id, colunaRef)}
      >
        {/* Linhas de hora */}
        {horasGrade.map((hora) => (
          <div
            key={hora}
            className="absolute left-0 right-0 border-t border-gray-100"
            style={{ top: (hora - HORA_INICIO) * ALTURA_HORA_PX }}
          />
        ))}

        {/* Linhas de meia hora */}
        {horasGrade.slice(0, -1).map((hora) => (
          <div
            key={`meio-${hora}`}
            className="absolute left-0 right-0 border-t border-gray-50"
            style={{ top: (hora - HORA_INICIO) * ALTURA_HORA_PX + ALTURA_HORA_PX / 2 }}
          />
        ))}

        {/* Consultas */}
        {!carregando && consultas.map((consulta) => (
          <ConsultaNaGrade
            key={consulta.id}
            consulta={consulta}
            estaArrastando={arrastando === consulta.id}
            aoClicar={() => aoClicarConsulta(consulta)}
            aoIniciarArrasto={aoIniciarArrasto}
            medicoCorAgenda={medico.cor_agenda}
          />
        ))}

        {carregando && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Card de consulta posicionado na grade ─────────────────────
interface PropsConsultaNaGrade {
  consulta: ConsultaComRisco
  estaArrastando: boolean
  aoClicar: () => void
  aoIniciarArrasto: (e: React.DragEvent, id: string) => void
  medicoCorAgenda: string
}

function ConsultaNaGrade({
  consulta,
  estaArrastando,
  aoClicar,
  aoIniciarArrasto,
  medicoCorAgenda,
}: PropsConsultaNaGrade) {
  const topPx = dataParaPx(consulta.data_hora_inicio)
  const alturaPx = duracaoPx(consulta.data_hora_inicio, consulta.data_hora_fim)
  const estilo = ESTILOS_STATUS[consulta.status] ?? ESTILOS_STATUS.agendado
  const cancelavel = ['agendado', 'confirmado', 'em_atendimento'].includes(consulta.status)

  return (
    <div
      className={`
        cartao-consulta-grade absolute left-1 right-1 rounded-lg border-l-4 px-2 py-1
        shadow-sm cursor-grab active:cursor-grabbing transition-opacity overflow-hidden
        ${estilo.fundo} ${estilo.texto}
        ${estaArrastando ? 'opacity-40 shadow-lg scale-105' : 'hover:shadow-md hover:z-20'}
        ${cancelavel ? '' : 'cursor-default'}
      `}
      style={{
        top: topPx + 2,
        height: Math.max(alturaPx - 4, 28),
        borderLeftColor: medicoCorAgenda,
        zIndex: estaArrastando ? 30 : 10,
      }}
      draggable={cancelavel}
      onDragStart={(e) => cancelavel && aoIniciarArrasto(e, consulta.id)}
      onClick={(e) => { e.stopPropagation(); aoClicar() }}
    >
      {/* Indicador de risco */}
      {consulta.risco && consulta.risco.nivel === 'alto' && (
        <div className="absolute top-0.5 right-0.5">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
        </div>
      )}

      {/* Horário */}
      <p className="text-[10px] font-semibold opacity-70 leading-none mb-0.5">
        {formatarHora(consulta.data_hora_inicio)}
      </p>

      {/* Nome do paciente */}
      <p className="text-xs font-bold truncate leading-tight">
        {consulta.paciente?.nome?.split(' ')[0]}{' '}
        {consulta.paciente?.nome?.split(' ').pop() !== consulta.paciente?.nome?.split(' ')[0]
          ? consulta.paciente?.nome?.split(' ').pop()
          : ''}
      </p>

      {/* Tipo de consulta (só se tiver espaço) */}
      {alturaPx > 48 && consulta.tipo_consulta && (
        <p className="text-[10px] opacity-60 truncate">{consulta.tipo_consulta.nome}</p>
      )}

      {/* Badge de risco */}
      {consulta.risco && alturaPx > 56 && (
        <span className={`
          inline-block text-[9px] px-1 py-0.5 rounded font-semibold mt-0.5
          ${consulta.risco.nivel === 'alto' ? 'bg-red-200 text-red-800' :
            consulta.risco.nivel === 'medio' ? 'bg-amber-200 text-amber-800' :
            'bg-green-200 text-green-800'}
        `}>
          {consulta.risco.probabilidade}% falta
        </span>
      )}
    </div>
  )
}

// ── Linha da hora atual ───────────────────────────────────────
function LinhaHoraAtual({ data }: { data: string }) {
  const agora = new Date()
  const dataHoje = agora.toISOString().split('T')[0]
  if (data !== dataHoje) return null

  const horaAtual = agora.getHours() + agora.getMinutes() / 60
  if (horaAtual < HORA_INICIO || horaAtual > HORA_FIM) return null

  const topPx = (horaAtual - HORA_INICIO) * ALTURA_HORA_PX + 40 // +40 cabeçalho

  return (
    <div
      className="absolute left-14 right-0 flex items-center pointer-events-none z-20"
      style={{ top: topPx }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0" />
      <div className="flex-1 border-t-2 border-red-500" />
    </div>
  )
}
