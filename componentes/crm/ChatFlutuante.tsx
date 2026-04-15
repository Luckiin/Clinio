'use client'
// ============================================================
// CLINIO - Chat Flutuante
// Painel de chat acessível em qualquer tela do painel
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageSquare, X, Plus, Send, ArrowLeft,
  Search, Loader2, Check, CheckCheck, Phone, User
} from 'lucide-react'

interface Conversa {
  id: string
  paciente_id: string
  canal: string
  status: string
  ultima_mensagem_em: string | null
  pacientes?: {
    nome_completo: string
    telefone?: string
  }
}

interface Mensagem {
  id: string
  conversa_id: string
  remetente: string
  conteudo: string
  lida: boolean
  criado_em: string
}

interface Paciente {
  id: string
  nome_completo?: string
  nome?: string
  telefone?: string
  email?: string
  cpf?: string
}

export function ChatFlutuante() {
  const [aberto, setAberto] = useState(false)
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoMensagens, setCarregandoMensagens] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Nova conversa
  const [modalNovaConversa, setModalNovaConversa] = useState(false)
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [pacientesEncontrados, setPacientesEncontrados] = useState<Paciente[]>([])
  const [buscandoPaciente, setBuscandoPaciente] = useState(false)
  const [criandoConversa, setCriandoConversa] = useState(false)

  const fimRef = useRef<HTMLDivElement>(null)
  const timeoutBuscaRef = useRef<NodeJS.Timeout>()

  const carregarConversas = useCallback(async () => {
    if (!aberto) return [] as Conversa[]
    setCarregando(true)
    try {
      const res = await fetch('/api/crm/conversas')
      if (res.ok) {
        const dados = await res.json()
        const lista = dados.conversas || []
        setConversas(lista)
        return lista as Conversa[]
      }
    } catch (err) {
      console.error('Erro ao carregar conversas:', err)
    } finally {
      setCarregando(false)
    }
    return [] as Conversa[]
  }, [aberto])

  useEffect(() => {
    if (aberto) carregarConversas()
  }, [aberto, carregarConversas])

  useEffect(() => {
    if (!conversaSelecionada) return
    async function carregarMensagens() {
      setCarregandoMensagens(true)
      try {
        const res = await fetch(`/api/crm/conversas?conversa_id=${conversaSelecionada!.id}`)
        if (res.ok) {
          const dados = await res.json()
          setMensagens(dados.mensagens || [])
        }
      } catch (err) {
        console.error('Erro:', err)
      } finally {
        setCarregandoMensagens(false)
      }
    }
    carregarMensagens()
  }, [conversaSelecionada])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  // Busca de pacientes para nova conversa
  useEffect(() => {
    if (!buscaPaciente.trim()) { setPacientesEncontrados([]); return }
    clearTimeout(timeoutBuscaRef.current)
    timeoutBuscaRef.current = setTimeout(async () => {
      setBuscandoPaciente(true)
      try {
        const res = await fetch(`/api/pacientes?busca=${encodeURIComponent(buscaPaciente)}&limite=6`)
        if (res.ok) {
          const dados = await res.json()
          setPacientesEncontrados(dados.dados || [])
        }
      } catch (err) {
        console.error('Erro ao buscar pacientes:', err)
      } finally {
        setBuscandoPaciente(false)
      }
    }, 300)
    return () => clearTimeout(timeoutBuscaRef.current)
  }, [buscaPaciente])

  async function enviarMensagem() {
    if (!novaMensagem.trim() || !conversaSelecionada || enviando) return
    setEnviando(true)
    const conteudo = novaMensagem.trim()
    setNovaMensagem('')
    try {
      const res = await fetch('/api/crm/conversas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversa_id: conversaSelecionada.id, conteudo, remetente: 'clinica' }),
      })
      if (res.ok) {
        const dados = await res.json()
        if (dados.mensagem) setMensagens(prev => [...prev, dados.mensagem])
        carregarConversas()
      }
    } catch (err) {
      console.error('Erro ao enviar:', err)
    } finally {
      setEnviando(false)
    }
  }

  async function iniciarConversa(paciente: Paciente) {
    setCriandoConversa(true)
    try {
      const res = await fetch('/api/crm/conversas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_id: paciente.id, canal: 'whatsapp', conteudo: null }),
      })
      if (res.ok) {
        const dados = await res.json()
        const listaAtualizada = await carregarConversas()
        if (dados.conversa) {
          const conversaAtualizada = listaAtualizada.find((c) => c.id === dados.conversa.id)
          setConversaSelecionada(conversaAtualizada || dados.conversa)
        }
        setModalNovaConversa(false)
        setBuscaPaciente('')
        setPacientesEncontrados([])
      }
    } catch (err) {
      console.error('Erro ao criar conversa:', err)
    } finally {
      setCriandoConversa(false)
    }
  }

  function obterNomePaciente(paciente: Paciente) {
    return paciente.nome_completo || paciente.nome || 'Paciente'
  }

  function formatarHora(data: string | null) {
    if (!data) return ''
    const d = new Date(data)
    const diff = new Date().getTime() - d.getTime()
    if (diff < 86400000) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const conversasFiltradas = conversas.filter(c =>
    (c.pacientes?.nome_completo ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(prev => !prev)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          aberto
            ? 'bg-slate-700 hover:bg-slate-800 rotate-0'
            : 'bg-primaria-600 hover:bg-primaria-700'
        }`}
        title="Chat"
      >
        {aberto ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6 text-white" />
            {conversas.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {conversas.length > 9 ? '9+' : conversas.length}
              </span>
            )}
          </>
        )}
      </button>

      {/* Painel flutuante */}
      {aberto && (
        <div className="fixed bottom-24 right-6 z-50 w-[370px] h-[520px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-fade-in">

          {/* Sem conversa selecionada: lista de conversas */}
          {!conversaSelecionada && !modalNovaConversa && (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Chat CRM</h3>
                <button
                  onClick={() => setModalNovaConversa(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-primaria-600 text-white hover:bg-primaria-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Busca */}
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar conversa..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primaria-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Lista de conversas */}
              <div className="flex-1 overflow-y-auto">
                {carregando ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="w-4 h-4 animate-spin text-primaria-500" />
                  </div>
                ) : conversasFiltradas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                    <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400">Nenhuma conversa ainda</p>
                    <button
                      onClick={() => setModalNovaConversa(true)}
                      className="mt-2 text-xs text-primaria-600 hover:underline font-medium"
                    >
                      + Nova conversa
                    </button>
                  </div>
                ) : (
                  conversasFiltradas.map(conversa => (
                    <button
                      key={conversa.id}
                      onClick={() => setConversaSelecionada(conversa)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800"
                    >
                      <div className="w-9 h-9 rounded-full bg-primaria-100 dark:bg-primaria-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primaria-600 dark:text-primaria-400">
                          {conversa.pacientes?.nome_completo?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {conversa.pacientes?.nome_completo || 'Paciente'}
                          </p>
                          <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
                            {formatarHora(conversa.ultima_mensagem_em)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 capitalize">{conversa.canal}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* Modal Nova Conversa */}
          {modalNovaConversa && (
            <>
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900">
                <button
                  onClick={() => { setModalNovaConversa(false); setBuscaPaciente(''); setPacientesEncontrados([]) }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Nova Conversa</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                  Novas conversas são iniciadas automaticamente via WhatsApp.
                </p>

                {/* Busca de paciente */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Paciente</p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar pelo nome..."
                      value={buscaPaciente}
                      onChange={e => setBuscaPaciente(e.target.value)}
                      autoFocus
                      className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primaria-500 text-slate-800 dark:text-slate-200"
                    />
                    {buscandoPaciente && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-primaria-500" />
                    )}
                  </div>
                </div>

                {/* Resultados */}
                {pacientesEncontrados.length > 0 && (
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                    {pacientesEncontrados.map(paciente => (
                      <button
                        key={paciente.id}
                        onClick={() => iniciarConversa(paciente)}
                        disabled={criandoConversa}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primaria-50 dark:hover:bg-primaria-900/20 text-left border-b border-slate-50 dark:border-slate-800 last:border-0 disabled:opacity-50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-primaria-100 dark:bg-primaria-900/40 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primaria-600 dark:text-primaria-400">
                            {obterNomePaciente(paciente).charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                            {obterNomePaciente(paciente)}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {[paciente.telefone, paciente.email, paciente.cpf].filter(Boolean).join(' · ') || `ID: ${paciente.id.slice(0, 8)}`}
                          </p>
                        </div>
                        {criandoConversa
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primaria-500" />
                          : <Plus className="w-3.5 h-3.5 text-slate-300" />
                        }
                      </button>
                    ))}
                  </div>
                )}

                {buscaPaciente.trim() && !buscandoPaciente && pacientesEncontrados.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">Nenhum paciente encontrado</p>
                )}
                {!buscaPaciente.trim() && (
                  <p className="text-xs text-slate-400 text-center py-1">Digite o nome para pesquisar</p>
                )}
              </div>
            </>
          )}

          {/* Tela de mensagens */}
          {conversaSelecionada && !modalNovaConversa && (
            <>
              {/* Header da conversa */}
              <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900">
                <button
                  onClick={() => { setConversaSelecionada(null); setMensagens([]) }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-7 h-7 rounded-full bg-primaria-100 dark:bg-primaria-900/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primaria-600 dark:text-primaria-400">
                    {conversaSelecionada.pacientes?.nome_completo?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {conversaSelecionada.pacientes?.nome_completo || 'Paciente'}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">{conversaSelecionada.status} · {conversaSelecionada.canal}</p>
                </div>
                <div className="flex items-center gap-1">
                  {conversaSelecionada.pacientes?.telefone && (
                    <a
                      href={`https://wa.me/55${conversaSelecionada.pacientes.telefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <a
                    href={`/painel/crm/pacientes/${conversaSelecionada.paciente_id}`}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50 dark:bg-slate-950">
                {carregandoMensagens ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-4 h-4 animate-spin text-primaria-500" />
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-8 h-8 text-slate-200 dark:text-slate-700 mb-2" />
                    <p className="text-xs text-slate-400">Nenhuma mensagem. Envie a primeira!</p>
                  </div>
                ) : (
                  mensagens.map(msg => {
                    const daCli = msg.remetente === 'clinica'
                    return (
                      <div key={msg.id} className={`flex ${daCli ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
                          daCli
                            ? 'bg-primaria-600 text-white rounded-br-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-sm'
                        }`}>
                          <p className="text-xs leading-relaxed">{msg.conteudo}</p>
                          <div className={`flex items-center gap-1 mt-0.5 ${daCli ? 'justify-end' : ''}`}>
                            <span className={`text-[10px] ${daCli ? 'text-primaria-200' : 'text-slate-400'}`}>
                              {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {daCli && (msg.lida
                              ? <CheckCheck className="w-3 h-3 text-primaria-200" />
                              : <Check className="w-3 h-3 text-primaria-200" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={fimRef} />
              </div>

              {/* Input de mensagem */}
              <div className="px-3 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-end gap-2">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2">
                    <textarea
                      value={novaMensagem}
                      onChange={e => setNovaMensagem(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem() } }}
                      placeholder="Mensagem... (Enter para enviar)"
                      rows={1}
                      className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none resize-none"
                      style={{ maxHeight: '80px' }}
                    />
                  </div>
                  <button
                    onClick={enviarMensagem}
                    disabled={enviando || !novaMensagem.trim()}
                    className="w-8 h-8 flex items-center justify-center bg-primaria-600 text-white rounded-full hover:bg-primaria-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {enviando
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Send className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
