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
  nome_completo?: string
  nome?: string
  telefone?: string
  email?: string
  cpf?: string
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
  const [criandoConversa, setCriandoConversa] = useState(false)

  const fimMensagensRef = useRef<HTMLDivElement>(null)
  const timeoutBuscaRef = useRef<NodeJS.Timeout>()
  const pollingRef = useRef<NodeJS.Timeout>()

  const carregarConversas = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true)
    try {
      const res = await fetch('/api/crm/conversas')
      if (res.ok) {
        const dados = await res.json()
        const lista = dados.conversas || []
        setConversas(lista)
        
        // Se houver uma conversa selecionada, atualiza os dados dela na lista
        if (conversaSelecionada) {
          const atualizada = lista.find((c: Conversa) => c.id === conversaSelecionada.id)
          if (atualizada) setConversaSelecionada(atualizada)
        }
        
        return lista as Conversa[]
      }
    } catch (err) {
      console.error('Erro ao carregar conversas:', err)
    } finally {
      if (!silencioso) setCarregando(false)
    }
    return [] as Conversa[]
  }, [conversaSelecionada])

  const carregarMensagens = useCallback(async (idConversa: string, silencioso = false) => {
    if (!silencioso) setCarregandoMensagens(true)
    try {
      const res = await fetch(`/api/crm/conversas?conversa_id=${idConversa}`)
      if (res.ok) {
        const dados = await res.json()
        const novasMensagens = dados.mensagens || []
        
        // Só atualiza se houver mudança para evitar pulos no scroll
        setMensagens(prev => {
          if (JSON.stringify(prev) === JSON.stringify(novasMensagens)) return prev
          return novasMensagens
        })
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    } finally {
      if (!silencioso) setCarregandoMensagens(false)
    }
  }, [])

  // Efeito inicial e polling
  useEffect(() => {
    carregarConversas()
    
    // Polling de 5 segundos para novas mensagens e conversas
    pollingRef.current = setInterval(() => {
      carregarConversas(true)
      if (conversaSelecionada) {
        carregarMensagens(conversaSelecionada.id, true)
      }
    }, 5000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [carregarConversas, carregarMensagens, conversaSelecionada?.id])

  // Efeito quando troca de conversa
  useEffect(() => {
    if (conversaSelecionada) {
      carregarMensagens(conversaSelecionada.id)
    } else {
      setMensagens([])
    }
  }, [conversaSelecionada?.id, carregarMensagens])

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
    
    const conteudo = novaMensagem.trim()
    setEnviando(true)
    setNovaMensagem('')

    // Otimista: Adiciona mensagem na UI antes da resposta da API
    const msgOtimista: Mensagem = {
      id: 'temp-' + Date.now(),
      conversa_id: conversaSelecionada.id,
      remetente: 'clinica',
      conteudo,
      lida: false,
      criado_em: new Date().toISOString()
    }
    setMensagens(prev => [...prev, msgOtimista])

    try {
      const res = await fetch('/api/crm/conversas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversa_id: conversaSelecionada.id, conteudo, remetente: 'clinica' })
      })
      if (res.ok) {
        const dados = await res.json()
        if (dados.mensagem) {
          // Substitui a otimista pela real se necessário ou apenas remove a flag se tivermos uma
          setMensagens(prev => prev.map(m => m.id === msgOtimista.id ? dados.mensagem : m))
        }
        carregarConversas(true)
      } else {
        // Se falhou, remove a otimista e avisa
        const erro = await res.json()
        setMensagens(prev => prev.filter(m => m.id !== msgOtimista.id))
        alert(erro.erro || 'Falha ao enviar mensagem. Tente novamente.')
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
      setMensagens(prev => prev.filter(m => m.id !== msgOtimista.id))
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
        body: JSON.stringify({ paciente_id: paciente.id, canal: 'whatsapp', conteudo: null })
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
      console.error('Erro ao iniciar conversa:', err)
    } finally {
      setCriandoConversa(false)
    }
  }

  function obterNomePaciente(paciente: Paciente) {
    return paciente.nome_completo || paciente.nome || 'Paciente'
  }

  const conversasFiltradas = conversas.filter(c => {
    const nome = (c.pacientes?.nome_completo || 'Paciente').toLowerCase()
    return nome.includes(buscaConversa.toLowerCase())
  })

  function formatarHora(data: string | null) {
    if (!data) return ''
    const d = new Date(data)
    const agora = new Date()
    const diff = agora.getTime() - d.getTime()
    
    if (diff < 86400000 && d.getDate() === agora.getDate()) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    if (diff < 172800000 && d.getDate() === agora.getDate() - 1) {
      return 'Ontem'
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] lg:h-[calc(100vh-6rem)] bg-white dark:bg-[#111b21] rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/5">
      {/* Lista de conversas */}
      <div className="w-80 sm:w-96 flex-shrink-0 bg-white dark:bg-[#111b21] border-r border-slate-200 dark:border-white/10 flex flex-col z-10">
        <div className="px-4 py-4 bg-slate-50 dark:bg-[#202c33]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link 
                href="/painel/crm"
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Mensagens</h2>
            </div>
            <button
              onClick={() => setModalNovaConversa(true)}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition-colors"
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
              className="w-full pl-10 pr-3 py-1.5 text-sm bg-white dark:bg-[#111b21] border-none rounded-lg focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
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
              <p className="text-sm text-slate-400">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            conversasFiltradas.map(conversa => {
              const selecionada = conversaSelecionada?.id === conversa.id
              return (
                <button
                  key={conversa.id}
                  onClick={() => setConversaSelecionada(conversa)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 dark:border-white/5 ${selecionada ? 'bg-slate-100 dark:bg-[#2a3942]' : 'hover:bg-slate-50 dark:hover:bg-[#202c33]'}`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-slate-500 dark:text-slate-300">
                      {conversa.pacientes?.nome_completo?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {conversa.pacientes?.nome_completo || 'Paciente'}
                      </p>
                      <span className="text-xs text-slate-400">
                        {formatarHora(conversa.ultima_mensagem_em)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 capitalize truncate">
                      {conversa.canal}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Painel de mensagens */}
      {conversaSelecionada ? (
        <div className="flex-1 flex flex-col bg-[#e5ddd5] dark:bg-[#0b141a]">
          {/* Header do Chat */}
          <div className="bg-slate-50 dark:bg-[#202c33] px-4 py-2 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <span className="text-sm font-bold text-slate-500 dark:text-slate-300">
                  {conversaSelecionada.pacientes?.nome_completo?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {conversaSelecionada.pacientes?.nome_completo || 'Paciente'}
                </p>
                <p className="text-[10px] text-green-500 font-medium">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {conversaSelecionada.pacientes?.telefone && (
                <a
                  href={`https://wa.me/${conversaSelecionada.pacientes.telefone.replace(/\D/g,'')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300"
                  title="Abrir no WhatsApp"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
              <Link
                href={`/painel/crm/pacientes/${conversaSelecionada.paciente_id}`}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300"
                title="Ver prontuário"
              >
                <User className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Área de Mensagens - Estilo WhatsApp */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 pattern-whatsapp scrollbar-whatsapp">
            {carregandoMensagens ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-primaria-500" />
              </div>
            ) : mensagens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-white/90 dark:bg-[#111b21]/90 rounded-lg px-4 py-2 shadow-sm text-center max-w-xs">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    As mensagens são criptografadas de ponta a ponta. Ninguém fora desta conversa pode ler ou ouvi-las.
                  </p>
                </div>
              </div>
            ) : (
              mensagens.map(msg => {
                const daCli = msg.remetente === 'clinica'
                const isTemp = msg.id.startsWith('temp-')
                
                return (
                  <div key={msg.id} className={`flex ${daCli ? 'justify-end' : 'justify-start'}`}>
                    <div className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-1.5 shadow-sm ${
                      daCli 
                        ? 'bg-[#dcf8c6] dark:bg-[#056162] text-slate-800 dark:text-slate-100 rounded-tr-none' 
                        : 'bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-100 rounded-tl-none'
                    }`}>
                      <p className="text-[13px] leading-snug whitespace-pre-wrap">{msg.conteudo}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5 ml-8">
                        <span className="text-[9px] text-slate-500 dark:text-slate-300/60 uppercase">
                          {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {daCli && (
                          isTemp ? <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-400" /> :
                          msg.lida ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={fimMensagensRef} />
          </div>

          {/* Input de Mensagem */}
          <div className="bg-slate-50 dark:bg-[#202c33] px-3 py-2 flex items-end gap-2">
            <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-3 py-2 shadow-sm flex items-end">
              <textarea
                value={novaMensagem}
                onChange={e => setNovaMensagem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem() } }}
                placeholder="Digite uma mensagem..."
                rows={1}
                className="w-full bg-transparent border-none text-[14px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none resize-none max-h-32"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                }}
              />
            </div>
            <button
              onClick={enviarMensagem}
              disabled={enviando || !novaMensagem.trim()}
              className="w-11 h-11 flex items-center justify-center bg-primaria-600 dark:bg-[#00a884] text-white rounded-full hover:opacity-90 disabled:opacity-50 transition-all flex-shrink-0"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-[#222e35] relative">
          <div className="max-w-md px-6">
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-[#2a3942] flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-500" />
            </div>
            <h1 className="text-2xl font-light text-slate-800 dark:text-slate-100 mb-4">Clinio Chat</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Inicie conversas com seus pacientes via WhatsApp diretamente por aqui. Suas mensagens são sincronizadas em tempo real.
            </p>
            <button
              onClick={() => setModalNovaConversa(true)}
              className="px-6 py-2.5 bg-primaria-600 dark:bg-[#00a884] text-white rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Nova Mensagem
            </button>
          </div>
          <div className="absolute bottom-8 text-[11px] text-slate-400 dark:text-slate-500">
            Criptografado de ponta a ponta
          </div>
        </div>
      )}

      {/* Modal Nova Conversa */}
      {modalNovaConversa && (
        <div className="fixed inset-0 bg-white/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202c33] rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border border-white/5">
            <div className="flex items-center gap-4 px-4 py-5 bg-primaria-600 dark:bg-[#008069] text-white">
              <button onClick={() => { setModalNovaConversa(false); setBuscaPaciente(''); setPacientesEncontrados([]) }}>
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-lg font-medium">Nova conversa</h3>
            </div>

            <div className="px-3 py-3">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar pacientes..."
                  value={buscaPaciente}
                  onChange={e => setBuscaPaciente(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-3 py-2 text-sm bg-slate-100 dark:bg-[#111b21] border-none rounded-lg focus:outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="space-y-1 overflow-y-auto max-h-80 custom-scrollbar">
                {buscandoPaciente ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primaria-500" />
                  </div>
                ) : pacientesEncontrados.length > 0 ? (
                  pacientesEncontrados.map(paciente => (
                    <button
                      key={paciente.id}
                      onClick={() => iniciarConversa(paciente)}
                      disabled={criandoConversa}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-[#2a3942] transition-colors rounded-lg group"
                    >
                      <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-300">
                          {obterNomePaciente(paciente).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{obterNomePaciente(paciente)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{paciente.telefone || 'Sem telefone'}</p>
                      </div>
                    </button>
                  ))
                ) : buscaPaciente.trim() ? (
                  <p className="text-center py-8 text-sm text-slate-400">Nenhum paciente encontrado</p>
                ) : (
                  <p className="text-center py-8 text-sm text-slate-400">Inicie uma pesquisa para encontrar pacientes</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
