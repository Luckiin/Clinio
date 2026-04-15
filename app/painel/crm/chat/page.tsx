'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageSquare, Send, Search, Plus, Phone,
  Check, CheckCheck, X, Loader2, User, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface Conversa {
  id: string
  paciente_id: string
  canal: string
  status: string
  ultima_mensagem_em: string | null
  pacientes?: {
    nome_completo: string
    telefone?: string
    email?: string
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
  nome_completo: string
  telefone?: string
  email?: string
}

export default function PaginaChat() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [buscaConversa, setBuscaConversa] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoMensagens, setCarregandoMensagens] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [modalNovaConversa, setModalNovaConversa] = useState(false)
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [pacientesEncontrados, setPacientesEncontrados] = useState<Paciente[]>([])
  const [buscandoPaciente, setBuscandoPaciente] = useState(false)
  const [canalNovo, setCanalNovo] = useState<'whatsapp' | 'email' | 'interno'>('interno')
  const [criandoConversa, setCriandoConversa] = useState(false)

  const fimMensagensRef = useRef<HTMLDivElement>(null)
  const timeoutBuscaRef = useRef<NodeJS.Timeout>()

  const carregarConversas = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/conversas')
      if (res.ok) {
        const dados = await res.json()
        setConversas(dados.conversas || [])
      }
    } catch (err) {
      console.error('Erro ao carregar conversas:', err)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregarConversas() }, [carregarConversas])

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
        console.error('Erro ao carregar mensagens:', err)
      } finally {
        setCarregandoMensagens(false)
      }
    }
    carregarMensagens()
  }, [conversaSelecionada])

  useEffect(() => {
    fimMensagensRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  useEffect(() => {
    if (!buscaPaciente.trim()) { setPacientesEncontrados([]); return }
    clearTimeout(timeoutBuscaRef.current)
    timeoutBuscaRef.current = setTimeout(async () => {
      setBuscandoPaciente(true)
      try {
        const res = await fetch(`/api/pacientes?busca=${encodeURIComponent(buscaPaciente)}&limite=8`)
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
        body: JSON.stringify({ conversa_id: conversaSelecionada.id, conteudo, remetente: 'clinica' })
      })
      if (res.ok) {
        const dados = await res.json()
        if (dados.mensagem) setMensagens(prev => [...prev, dados.mensagem])
        carregarConversas()
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
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
        body: JSON.stringify({ paciente_id: paciente.id, canal: canalNovo, conteudo: null })
      })
      if (res.ok) {
        const dados = await res.json()
        await carregarConversas()
        if (dados.conversa) setConversaSelecionada(dados.conversa)
        setModalNovaConversa(false)
        setBuscaPaciente('')
        setPacientesEncontrados([])
      }
    } catch (err) {
      console.error('Erro ao iniciar conversa:', err)
    } finally {
      setCriandoConversa(false)
    }
  }

  const conversasFiltradas = conversas.filter(c =>
    c.pacientes?.nome_completo.toLowerCase().includes(buscaConversa.toLowerCase())
  )

  function formatarHora(data: string | null) {
    if (!data) return ''
    const d = new Date(data)
    const diff = new Date().getTime() - d.getTime()
    if (diff < 86400000) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] lg:h-[calc(100vh-6rem)] bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
      {/* Lista de conversas */}
      <div className="w-80 sm:w-96 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10">
        <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link 
                href="/painel/crm"
                className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Voltar para CRM"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Mensagens</h2>
            </div>
            <button
              onClick={() => setModalNovaConversa(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-primaria-600 text-white hover:bg-primaria-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primaria-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              title="Nova conversa"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={buscaConversa}
              onChange={e => setBuscaConversa(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primaria-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-primaria-500" />
            </div>
          ) : conversasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Nenhuma conversa ainda</p>
              <button onClick={() => setModalNovaConversa(true)} className="mt-3 text-xs text-primaria-600 hover:underline font-medium">
                + Nova Conversa
              </button>
            </div>
          ) : (
            conversasFiltradas.map(conversa => (
              <button
                key={conversa.id}
                onClick={() => setConversaSelecionada(conversa)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 ${conversaSelecionada?.id === conversa.id ? 'bg-primaria-50 dark:bg-primaria-900/20' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-primaria-100 dark:bg-primaria-900/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primaria-600 dark:text-primaria-400">
                    {conversa.pacientes?.nome_completo?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {conversa.pacientes?.nome_completo || 'Paciente'}
                    </p>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                      {formatarHora(conversa.ultima_mensagem_em)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 capitalize">{conversa.canal}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Painel de mensagens */}
      {conversaSelecionada ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primaria-100 dark:bg-primaria-900/40 flex items-center justify-center">
                <span className="text-sm font-bold text-primaria-600 dark:text-primaria-400">
                  {conversaSelecionada.pacientes?.nome_completo?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {conversaSelecionada.pacientes?.nome_completo || 'Paciente'}
                </p>
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${conversaSelecionada.status === 'aberta' ? 'bg-green-400' : 'bg-slate-300'}`} />
                  <span className="text-xs text-slate-400 capitalize">{conversaSelecionada.status} · {conversaSelecionada.canal}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {conversaSelecionada.pacientes?.telefone && (
                <a
                  href={`https://wa.me/55${conversaSelecionada.pacientes.telefone.replace(/\D/g,'')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
              <a
                href={`/painel/crm/pacientes/${conversaSelecionada.paciente_id}`}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <User className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-slate-50 dark:bg-slate-950">
            {carregandoMensagens ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-primaria-500" />
              </div>
            ) : mensagens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-3" />
                <p className="text-slate-400 text-sm">Nenhuma mensagem ainda. Envie a primeira abaixo.</p>
              </div>
            ) : (
              mensagens.map(msg => {
                const daCli = msg.remetente === 'clinica'
                return (
                  <div key={msg.id} className={`flex ${daCli ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${daCli ? 'bg-primaria-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-100 dark:border-slate-700'}`}>
                      <p className="text-sm leading-relaxed">{msg.conteudo}</p>
                      <div className={`flex items-center gap-1 mt-1 ${daCli ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[10px] ${daCli ? 'text-primaria-200' : 'text-slate-400'}`}>
                          {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {daCli && (msg.lida ? <CheckCheck className="w-3 h-3 text-primaria-200" /> : <Check className="w-3 h-3 text-primaria-200" />)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={fimMensagensRef} />
          </div>

          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className="flex items-end gap-3">
              <div className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-2.5">
                <textarea
                  value={novaMensagem}
                  onChange={e => setNovaMensagem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem() } }}
                  placeholder="Digite uma mensagem... (Enter para enviar)"
                  rows={1}
                  className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none resize-none"
                  style={{ maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={enviarMensagem}
                disabled={enviando || !novaMensagem.trim()}
                className="w-10 h-10 flex items-center justify-center bg-primaria-600 text-white rounded-full hover:bg-primaria-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950">
          <div className="w-20 h-20 rounded-full bg-primaria-50 dark:bg-primaria-900/20 flex items-center justify-center mb-4">
            <MessageSquare className="w-10 h-10 text-primaria-300 dark:text-primaria-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-1">Chat CRM</h3>
          <p className="text-sm text-slate-400 mb-4 max-w-xs">
            Selecione uma conversa ou inicie uma nova com um paciente.
          </p>
          <button
            onClick={() => setModalNovaConversa(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primaria-600 text-white rounded-xl hover:bg-primaria-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nova Conversa
          </button>
        </div>
      )}

      {/* Modal Nova Conversa */}
      {modalNovaConversa && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Nova Conversa</h3>
              <button
                onClick={() => { setModalNovaConversa(false); setBuscaPaciente(''); setPacientesEncontrados([]) }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Canal</label>
                <div className="flex gap-2">
                  {(['interno', 'whatsapp', 'email'] as const).map(canal => (
                    <button
                      key={canal}
                      onClick={() => setCanalNovo(canal)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${canalNovo === canal ? 'bg-primaria-50 dark:bg-primaria-900/30 border-primaria-300 dark:border-primaria-700 text-primaria-700 dark:text-primaria-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'}`}
                    >
                      {canal === 'interno' ? 'Chat' : canal === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Paciente</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar paciente pelo nome..."
                    value={buscaPaciente}
                    onChange={e => setBuscaPaciente(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primaria-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  />
                  {buscandoPaciente && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primaria-500" />}
                </div>
              </div>

              {pacientesEncontrados.length > 0 && (
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  {pacientesEncontrados.map(paciente => (
                    <button
                      key={paciente.id}
                      onClick={() => iniciarConversa(paciente)}
                      disabled={criandoConversa}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primaria-50 dark:hover:bg-primaria-900/20 transition-colors text-left border-b border-slate-50 dark:border-slate-800 last:border-0 disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-primaria-100 dark:bg-primaria-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primaria-600 dark:text-primaria-400">
                          {paciente.nome_completo?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{paciente.nome_completo}</p>
                        {paciente.telefone && <p className="text-xs text-slate-400 truncate">{paciente.telefone}</p>}
                      </div>
                      {criandoConversa ? <Loader2 className="w-4 h-4 animate-spin text-primaria-500 flex-shrink-0" /> : <Plus className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {buscaPaciente.trim() && !buscandoPaciente && pacientesEncontrados.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">Nenhum paciente encontrado</p>
              )}

              {!buscaPaciente.trim() && (
                <p className="text-xs text-slate-400 text-center py-1">Digite o nome do paciente para iniciar uma conversa</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
