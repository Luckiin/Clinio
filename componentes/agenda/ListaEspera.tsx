'use client'
// ============================================================
// CLINIO - Lista de Espera
// Gerencia pacientes aguardando encaixe na agenda
// Encaixe automático disparado quando consulta é cancelada
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { Clock, User, Phone, CheckCircle, X, ChevronUp, ChevronDown, Bell, Zap } from 'lucide-react'
import { formatarTelefone } from '@/lib/formatadores'

interface ItemListaEspera {
  id: string
  paciente_id: string
  clinica_id: string
  medico_id?: string
  tipo_consulta_id?: string
  data_preferida?: string
  horario_preferido_inicio?: string
  horario_preferido_fim?: string
  prioridade: number           // 1 = alta, 2 = média, 3 = baixa
  status: 'aguardando' | 'notificado' | 'encaixado' | 'desistiu'
  observacoes?: string
  criado_em: string
  paciente?: {
    nome: string
    telefone: string
    email?: string
  }
  medico?: { nome: string }
  tipo_consulta?: { nome: string; duracao_minutos: number }
}

interface PropsListaEspera {
  clinicaId: string
  medicoId?: string           // filtrar por médico específico
  dataReferencia?: string     // filtrar por data
  aoEncaixar?: (item: ItemListaEspera, horario: string) => void
}

const COR_PRIORIDADE: Record<number, string> = {
  1: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  2: 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  3: 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
}

const LABEL_PRIORIDADE: Record<number, string> = {
  1: 'Alta',
  2: 'Média',
  3: 'Baixa',
}

export function ListaEspera({
  clinicaId,
  medicoId,
  dataReferencia,
  aoEncaixar,
}: PropsListaEspera) {
  const [itens, setItens] = useState<ItemListaEspera[]>([])
  const [carregando, setCarregando] = useState(true)
  const [expandido, setExpandido] = useState(true)
  const [encaixandoId, setEncaixandoId] = useState<string | null>(null)
  const [notificandoId, setNotificandoId] = useState<string | null>(null)

  const buscarListaEspera = useCallback(async () => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({ clinica_id: clinicaId })
      if (medicoId) params.set('medico_id', medicoId)
      if (dataReferencia) params.set('data', dataReferencia)

      const res = await fetch(`/api/agenda/lista-espera?${params}`)
      if (res.ok) {
        const dados = await res.json()
        setItens(dados.itens || [])
      }
    } catch (err) {
      console.error('Erro ao buscar lista de espera:', err)
    } finally {
      setCarregando(false)
    }
  }, [clinicaId, medicoId, dataReferencia])

  useEffect(() => {
    buscarListaEspera()
  }, [buscarListaEspera])

  async function notificarPaciente(item: ItemListaEspera) {
    setNotificandoId(item.id)
    try {
      await fetch(`/api/agenda/lista-espera/${item.id}/notificar`, { method: 'POST' })
      await buscarListaEspera()
    } finally {
      setNotificandoId(null)
    }
  }

  async function removerDaLista(id: string) {
    if (!confirm('Remover este paciente da lista de espera?')) return
    await fetch(`/api/agenda/lista-espera/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'desistiu' }),
    })
    await buscarListaEspera()
  }

  async function moverPrioridade(id: string, direcao: 'cima' | 'baixo') {
    const idx = itens.findIndex((i) => i.id === id)
    if (idx === -1) return
    const novaPrioridade = direcao === 'cima'
      ? Math.max(1, itens[idx].prioridade - 1)
      : Math.min(3, itens[idx].prioridade + 1)

    await fetch(`/api/agenda/lista-espera/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prioridade: novaPrioridade }),
    })
    await buscarListaEspera()
  }

  const itensAtivos = itens.filter((i) => i.status === 'aguardando' || i.status === 'notificado')

  if (itensAtivos.length === 0 && !carregando) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm overflow-hidden">
      {/* Cabeçalho */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/40 hover:bg-amber-100 dark:bg-amber-900/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
            Lista de Espera
          </span>
          <span className="bg-amber-200 text-amber-800 dark:text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full">
            {itensAtivos.length}
          </span>
        </div>
        {expandido ? (
          <ChevronUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        )}
      </button>

      {/* Lista */}
      {expandido && (
        <div className="divide-y divide-gray-100">
          {carregando ? (
            <div className="p-4 space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            itensAtivos.map((item) => (
              <ItemEspera
                key={item.id}
                item={item}
                encaixando={encaixandoId === item.id}
                notificando={notificandoId === item.id}
                aoNotificar={() => notificarPaciente(item)}
                aoRemover={() => removerDaLista(item.id)}
                aoEncaixar={aoEncaixar ? (horario) => aoEncaixar(item, horario) : undefined}
                aoMoverCima={() => moverPrioridade(item.id, 'cima')}
                aoMoverBaixo={() => moverPrioridade(item.id, 'baixo')}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Subcomponente: item individual da lista ────────────────
interface PropsItemEspera {
  item: ItemListaEspera
  encaixando: boolean
  notificando: boolean
  aoNotificar: () => void
  aoRemover: () => void
  aoEncaixar?: (horario: string) => void
  aoMoverCima: () => void
  aoMoverBaixo: () => void
}

function ItemEspera({
  item,
  encaixando,
  notificando,
  aoNotificar,
  aoRemover,
  aoEncaixar,
  aoMoverCima,
  aoMoverBaixo,
}: PropsItemEspera) {
  const [mostrarEncaixe, setMostrarEncaixe] = useState(false)
  const [horarioEncaixe, setHorarioEncaixe] = useState('')

  function confirmarEncaixe() {
    if (!horarioEncaixe || !aoEncaixar) return
    aoEncaixar(horarioEncaixe)
    setMostrarEncaixe(false)
    setHorarioEncaixe('')
  }

  return (
    <div className={`p-3 ${item.status === 'notificado' ? 'bg-blue-50 dark:bg-blue-900/40' : 'bg-white dark:bg-slate-800'}`}>
      <div className="flex items-start gap-2">
        {/* Controles de prioridade */}
        <div className="flex flex-col items-center gap-0.5 pt-0.5">
          <button
            onClick={aoMoverCima}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 transition-colors"
            title="Aumentar prioridade"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={aoMoverBaixo}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 transition-colors"
            title="Diminuir prioridade"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Ícone do paciente */}
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-400" />
        </div>

        {/* Informações */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-800 dark:text-slate-200 text-sm truncate">
              {item.paciente?.nome}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${COR_PRIORIDADE[item.prioridade]}`}>
              {LABEL_PRIORIDADE[item.prioridade]}
            </span>
            {item.status === 'notificado' && (
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                <Bell className="w-3 h-3" /> Notificado
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {item.paciente?.telefone && (
              <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {formatarTelefone(item.paciente.telefone)}
              </span>
            )}
            {item.medico && (
              <span className="text-xs text-gray-500 dark:text-slate-400">Dr. {item.medico.nome}</span>
            )}
            {item.tipo_consulta && (
              <span className="text-xs text-gray-500 dark:text-slate-400">{item.tipo_consulta.nome}</span>
            )}
            {item.data_preferida && (
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Pref: {new Date(item.data_preferida + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          {item.observacoes && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.observacoes}</p>
          )}

          {/* Encaixe manual */}
          {mostrarEncaixe && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="datetime-local"
                value={horarioEncaixe}
                onChange={(e) => setHorarioEncaixe(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
              />
              <button
                onClick={confirmarEncaixe}
                disabled={!horarioEncaixe}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Confirmar
              </button>
              <button
                onClick={() => setMostrarEncaixe(false)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:text-slate-400"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {item.status === 'aguardando' && (
            <button
              onClick={aoNotificar}
              disabled={notificando}
              title="Notificar paciente"
              className="p-1.5 rounded-lg hover:bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:text-amber-400 transition-colors disabled:opacity-50"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}

          {aoEncaixar && !mostrarEncaixe && (
            <button
              onClick={() => setMostrarEncaixe(true)}
              disabled={encaixando}
              title="Encaixar agora"
              className="p-1.5 rounded-lg hover:bg-green-100 dark:bg-green-900/60 text-green-600 dark:text-green-400 hover:text-green-700 dark:text-green-400 transition-colors disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={aoRemover}
            title="Remover da lista"
            className="p-1.5 rounded-lg hover:bg-red-100 dark:bg-red-900/60 text-gray-400 hover:text-red-600 dark:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal para adicionar à lista de espera ─────────────────
interface PropsModalAdicionarEspera {
  clinicaId: string
  aberto: boolean
  aoFechar: () => void
  aoAdicionar: () => void
}

export function ModalAdicionarEspera({
  clinicaId,
  aberto,
  aoFechar,
  aoAdicionar,
}: PropsModalAdicionarEspera) {
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [pacienteSelecionado, setPacienteSelecionado] = useState<{ id: string; nome: string; telefone: string } | null>(null)
  const [resultadosBusca, setResultadosBusca] = useState<{ id: string; nome: string; telefone: string }[]>([])
  const [medicoId, setMedicoId] = useState('')
  const [dataPreferida, setDataPreferida] = useState('')
  const [prioridade, setPrioridade] = useState('2')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [medicos, setMedicos] = useState<{ id: string; nome: string }[]>([])

  useEffect(() => {
    if (!aberto) return
    fetch('/api/medicos').then((r) => r.json()).then((d) => setMedicos(d.dados || []))
  }, [aberto])

  useEffect(() => {
    if (buscaPaciente.length < 2) { setResultadosBusca([]); return }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/pacientes?busca=${buscaPaciente}&limite=5`)
      const d = await r.json()
      setResultadosBusca(d.pacientes || [])
    }, 300)
    return () => clearTimeout(t)
  }, [buscaPaciente])

  async function salvar() {
    if (!pacienteSelecionado) return
    setSalvando(true)
    try {
      await fetch('/api/agenda/lista-espera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: clinicaId,
          paciente_id: pacienteSelecionado.id,
          medico_id: medicoId || undefined,
          data_preferida: dataPreferida || undefined,
          prioridade: parseInt(prioridade),
          observacoes: observacoes || undefined,
        }),
      })
      aoAdicionar()
      aoFechar()
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Adicionar à Lista de Espera</h2>
          <button onClick={aoFechar} className="text-gray-400 hover:text-gray-600 dark:text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Busca de paciente */}
          <div>
            <label className="campo-label">Paciente *</label>
            {pacienteSelecionado ? (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">{pacienteSelecionado.nome}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">{pacienteSelecionado.telefone}</p>
                </div>
                <button
                  onClick={() => { setPacienteSelecionado(null); setBuscaPaciente('') }}
                  className="text-blue-400 hover:text-blue-600 dark:text-blue-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={buscaPaciente}
                  onChange={(e) => setBuscaPaciente(e.target.value)}
                  placeholder="Buscar por nome ou CPF..."
                  className="campo-input"
                />
                {resultadosBusca.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {resultadosBusca.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setPacienteSelecionado(p); setBuscaPaciente(''); setResultadosBusca([]) }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:bg-slate-900/50 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{p.nome}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{p.telefone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Médico preferido */}
          <div>
            <label className="campo-label">Médico preferido</label>
            <select
              value={medicoId}
              onChange={(e) => setMedicoId(e.target.value)}
              className="campo-input"
            >
              <option value="">Qualquer médico</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>

          {/* Data preferida */}
          <div>
            <label className="campo-label">Data preferida</label>
            <input
              type="date"
              value={dataPreferida}
              onChange={(e) => setDataPreferida(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="campo-input"
            />
          </div>

          {/* Prioridade */}
          <div>
            <label className="campo-label">Prioridade</label>
            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value)}
              className="campo-input"
            >
              <option value="1">Alta — Urgente</option>
              <option value="2">Média — Normal</option>
              <option value="3">Baixa — Sem pressa</option>
            </select>
          </div>

          {/* Observações */}
          <div>
            <label className="campo-label">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Motivo, restrições de horário..."
              className="campo-input resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-slate-800">
          <button onClick={aoFechar} className="botao-secundario flex-1">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={!pacienteSelecionado || salvando}
            className="botao-primario flex-1 disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Adicionar à Lista'}
          </button>
        </div>
      </div>
    </div>
  )
}
