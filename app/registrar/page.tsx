'use client'
// ============================================================
// CLINIO - Página de Cadastro de Clínica
// Visual premium com animação e dark mode
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Eye, EyeOff, Moon, Sun, ArrowRight, Stethoscope,
  Building2, User, Mail, Lock, CheckCircle2, AlertCircle, ChevronDown
} from 'lucide-react'

// ─── Telefone: países, máscara, componente ────────────────────

const PAISES = [
  { ddi: '+55', flag: '🇧🇷', nome: 'Brasil',    mask: '(##) #####-####', maxDigitos: 11 },
  { ddi: '+1',  flag: '🇺🇸', nome: 'EUA',       mask: '(###) ###-####',  maxDigitos: 10 },
  { ddi: '+351',flag: '🇵🇹', nome: 'Portugal',  mask: '### ### ###',     maxDigitos: 9  },
  { ddi: '+54', flag: '🇦🇷', nome: 'Argentina', mask: '(##) ####-####',  maxDigitos: 10 },
  { ddi: '+34', flag: '🇪🇸', nome: 'Espanha',   mask: '### ### ###',     maxDigitos: 9  },
  { ddi: '+52', flag: '🇲🇽', nome: 'México',    mask: '(##) ####-####',  maxDigitos: 10 },
  { ddi: '+57', flag: '🇨🇴', nome: 'Colômbia',  mask: '### ### ####',    maxDigitos: 10 },
  { ddi: '+44', flag: '🇬🇧', nome: 'UK',        mask: '#### ### ####',   maxDigitos: 10 },
]

function aplicarMascara(digitos: string, mask: string): string {
  let idx = 0
  let resultado = ''
  for (const char of mask) {
    if (idx >= digitos.length) break
    if (char === '#') { resultado += digitos[idx++] }
    else { resultado += char }
  }
  return resultado
}

function CampoTelefone({
  valor, onChange, escuro, erro
}: {
  valor: string
  onChange: (telefoneCompleto: string) => void
  escuro: boolean
  erro?: string
}) {
  const [paisSel, setPaisSel] = useState(PAISES[0])
  const [numeroExibido, setNumeroExibido] = useState('')
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, '').slice(0, paisSel.maxDigitos)
    const formatado = aplicarMascara(digitos, paisSel.mask)
    setNumeroExibido(formatado)
    // Salva o valor limpo com DDI para o banco: +5511999999999
    onChange(digitos.length > 0 ? `${paisSel.ddi}${digitos}` : '')
  }

  function selecionarPais(p: typeof PAISES[0]) {
    setPaisSel(p)
    setDropdownAberto(false)
    // Reformata o número atual com a nova máscara
    const digitos = numeroExibido.replace(/\D/g, '').slice(0, p.maxDigitos)
    const formatado = aplicarMascara(digitos, p.mask)
    setNumeroExibido(formatado)
    onChange(digitos.length > 0 ? `${p.ddi}${digitos}` : '')
  }

  const borderColor = erro
    ? 'rgba(239,68,68,0.5)'
    : escuro ? 'rgba(14,165,233,0.18)' : 'rgba(2,132,199,0.2)'

  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
        style={{ color: escuro ? 'rgba(186,230,253,0.6)' : 'rgba(7,89,133,0.7)' }}>
        Telefone da clínica <span style={{ color: escuro ? 'rgba(186,230,253,0.3)' : 'rgba(7,89,133,0.4)', fontWeight: 400 }}>(opcional)</span>
      </label>

      <div className="flex rounded-xl overflow-visible relative" style={{ border: `1.5px solid ${borderColor}` }}
        onFocus={() => {}} >

        {/* Seletor de país */}
        <div ref={dropdownRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setDropdownAberto(v => !v)}
            className="h-full flex items-center gap-1.5 px-3 text-sm font-medium rounded-l-xl transition-colors"
            style={{
              background: escuro ? 'rgba(14,165,233,0.1)' : 'rgba(2,132,199,0.07)',
              color: escuro ? '#BAE6FD' : '#075985',
              borderRight: `1px solid ${borderColor}`,
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>{paisSel.flag}</span>
            <span className="text-xs font-semibold">{paisSel.ddi}</span>
            <ChevronDown className="w-3 h-3" style={{
              transition: 'transform 0.2s',
              transform: dropdownAberto ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </button>

          {/* Dropdown de países */}
          {dropdownAberto && (
            <div
              className="absolute left-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-xl"
              style={{
                background: escuro ? '#0F172A' : '#FFFFFF',
                border: `1px solid ${escuro ? 'rgba(14,165,233,0.2)' : 'rgba(2,132,199,0.15)'}`,
                minWidth: '180px',
              }}
            >
              {PAISES.map(p => (
                <button
                  key={p.ddi}
                  type="button"
                  onClick={() => selecionarPais(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors"
                  style={{
                    background: paisSel.ddi === p.ddi
                      ? escuro ? 'rgba(14,165,233,0.12)' : 'rgba(2,132,199,0.08)'
                      : 'transparent',
                    color: escuro ? '#E0F2FE' : '#0C4A6E',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = escuro ? 'rgba(14,165,233,0.08)' : 'rgba(2,132,199,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = paisSel.ddi === p.ddi ? (escuro ? 'rgba(14,165,233,0.12)' : 'rgba(2,132,199,0.08)') : 'transparent'}
                >
                  <span style={{ fontSize: '16px' }}>{p.flag}</span>
                  <span className="flex-1 font-medium">{p.nome}</span>
                  <span className="text-xs" style={{ color: escuro ? 'rgba(186,230,253,0.45)' : 'rgba(7,89,133,0.5)' }}>{p.ddi}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input do número */}
        <input
          type="tel"
          value={numeroExibido}
          onChange={handleInput}
          placeholder={paisSel.mask.replace(/#/g, '9')}
          className="flex-1 py-2.5 pl-3 pr-3 text-sm outline-none rounded-r-xl"
          style={{
            background: escuro ? 'rgba(14,165,233,0.06)' : 'rgba(2,132,199,0.04)',
            color: escuro ? '#E0F2FE' : '#0C4A6E',
          }}
          onFocus={e => {
            const parent = e.target.closest('div[style]') as HTMLElement | null
            if (parent) {
              parent.style.borderColor = '#0EA5E9'
              parent.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.12)'
            }
          }}
          onBlur={e => {
            const parent = e.target.closest('div[style]') as HTMLElement | null
            if (parent) {
              parent.style.borderColor = borderColor
              parent.style.boxShadow = 'none'
            }
          }}
        />
      </div>
      {erro && <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>{erro}</p>}
    </div>
  )
}

// ─── Rede Animada (reutilizada do login) ─────────────────────

interface No { x: number; y: number; vx: number; vy: number; label: string; tamanho: number; fase: number; destaque: boolean }

const TERMOS = [
  { label: 'Agenda', destaque: true }, { label: 'Pacientes', destaque: true },
  { label: 'Faturamento', destaque: true }, { label: 'CRM', destaque: false },
  { label: 'WhatsApp', destaque: false }, { label: 'Automações', destaque: false },
  { label: 'Campanhas', destaque: false }, { label: 'Relatórios', destaque: false },
  { label: 'Funil', destaque: false }, { label: 'Lembretes', destaque: false },
  { label: 'Retorno', destaque: false }, { label: 'Dashboard', destaque: false },
  { label: 'Metas', destaque: false }, { label: 'Prontuário', destaque: false },
  { label: 'Check-in', destaque: false }, { label: 'Financeiro', destaque: false },
]

function RedeAnimada({ escuro }: { escuro: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nosRef = useRef<No[]>([])
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const rafRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const redimensionar = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    redimensionar()

    const onMouse = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    canvas.addEventListener('mousemove', onMouse)
    window.addEventListener('resize', redimensionar)

    const w = () => canvas.offsetWidth
    const h = () => canvas.offsetHeight

    nosRef.current = TERMOS.map(t => ({
      x: 60 + Math.random() * (w() - 120),
      y: 60 + Math.random() * (h() - 120),
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      label: t.label, tamanho: t.destaque ? 5.5 : 3.5,
      fase: Math.random() * Math.PI * 2, destaque: t.destaque,
    }))

    const desenhar = () => {
      ctx.clearRect(0, 0, w(), h())
      const nos = nosRef.current
      const mouse = mouseRef.current

      nos.forEach(no => {
        no.fase += 0.018
        const dx = mouse.x - no.x; const dy = mouse.y - no.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) { no.vx -= (dx / dist) * 0.08; no.vy -= (dy / dist) * 0.08 }
        no.vx *= 0.99; no.vy *= 0.99
        no.x += no.vx; no.y += no.vy
        if (no.x < 40) { no.x = 40; no.vx = Math.abs(no.vx) }
        if (no.x > w() - 40) { no.x = w() - 40; no.vx = -Math.abs(no.vx) }
        if (no.y < 30) { no.y = 30; no.vy = Math.abs(no.vy) }
        if (no.y > h() - 30) { no.y = h() - 30; no.vy = -Math.abs(no.vy) }
      })

      nos.forEach((a, i) => {
        nos.slice(i + 1).forEach(b => {
          const dx = a.x - b.x; const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 160) {
            const alpha = (1 - dist / 160) * (escuro ? 0.25 : 0.18)
            ctx.strokeStyle = escuro ? `rgba(56,189,248,${alpha})` : `rgba(2,132,199,${alpha})`
            ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
        })
      })

      nos.forEach(no => {
        const pulso = no.tamanho + Math.sin(no.fase) * 1.2
        const grad = ctx.createRadialGradient(no.x, no.y, 0, no.x, no.y, pulso * 4)
        grad.addColorStop(0, escuro ? `rgba(14,165,233,${no.destaque ? 0.25 : 0.12})` : `rgba(2,132,199,${no.destaque ? 0.18 : 0.08})`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(no.x, no.y, pulso * 4, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = escuro ? (no.destaque ? '#38BDF8' : '#7DD3FC') : (no.destaque ? '#0284C7' : '#38BDF8')
        ctx.beginPath(); ctx.arc(no.x, no.y, pulso, 0, Math.PI * 2); ctx.fill()
        const fontSize = no.destaque ? 12 : 10
        ctx.font = `${no.destaque ? '600' : '400'} ${fontSize}px Inter, sans-serif`
        ctx.fillStyle = escuro ? (no.destaque ? 'rgba(224,242,254,0.95)' : 'rgba(186,230,253,0.7)') : (no.destaque ? 'rgba(3,105,161,0.95)' : 'rgba(7,89,133,0.7)')
        ctx.textAlign = 'center'; ctx.fillText(no.label, no.x, no.y - pulso - 5)
      })

      rafRef.current = requestAnimationFrame(desenhar)
    }

    desenhar()
    return () => {
      canvas.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', redimensionar)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [escuro])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ cursor: 'none' }} />
}

// ─── Campo de Input ───────────────────────────────────────────

function Campo({
  icone: Icone, label, tipo = 'text', valor, onChange, placeholder, escuro,
  acaoDir, erro
}: {
  icone: React.ElementType; label: string; tipo?: string; valor: string
  onChange: (v: string) => void; placeholder: string; escuro: boolean
  acaoDir?: React.ReactNode; erro?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
        style={{ color: escuro ? 'rgba(186,230,253,0.6)' : 'rgba(7,89,133,0.7)' }}>
        {label}
      </label>
      <div className="relative">
        <Icone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: escuro ? 'rgba(186,230,253,0.35)' : 'rgba(7,89,133,0.4)' }} />
        <input
          type={tipo} value={valor} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoComplete="off"
          className="w-full rounded-xl pl-10 py-2.5 text-sm outline-none transition-all duration-200"
          style={{
            paddingRight: acaoDir ? '2.75rem' : '1rem',
            background: escuro ? 'rgba(14,165,233,0.06)' : 'rgba(2,132,199,0.04)',
            border: `1.5px solid ${erro ? 'rgba(239,68,68,0.5)' : escuro ? 'rgba(14,165,233,0.18)' : 'rgba(2,132,199,0.2)'}`,
            color: escuro ? '#E0F2FE' : '#0C4A6E',
          }}
          onFocus={e => { e.target.style.borderColor = '#0EA5E9'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.12)' }}
          onBlur={e => {
            e.target.style.borderColor = erro ? 'rgba(239,68,68,0.5)' : escuro ? 'rgba(14,165,233,0.18)' : 'rgba(2,132,199,0.2)'
            e.target.style.boxShadow = 'none'
          }}
        />
        {acaoDir && <div className="absolute right-3 top-1/2 -translate-y-1/2">{acaoDir}</div>}
      </div>
      {erro && <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>{erro}</p>}
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────

export default function PaginaRegistrar() {
  const roteador = useRouter()
  const [escuro, setEscuro] = useState(true)
  const [montado, setMontado] = useState(false)
  const [etapa, setEtapa] = useState<1 | 2>(1)   // passo 1: clínica / passo 2: acesso

  // Campos
  const [nomeClinica, setNomeClinica] = useState('')
  const [telefone, setTelefone] = useState('')
  const [nomeAdmin, setNomeAdmin] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [confirmVisivel, setConfirmVisivel] = useState(false)

  // Estado
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erroGeral, setErroGeral] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})

  useEffect(() => {
    const salvo = localStorage.getItem('clinio-tema')
    if (salvo !== null) setEscuro(salvo === 'escuro')
    setTimeout(() => setMontado(true), 80)
  }, [])

  const alternarTema = () => {
    setEscuro(prev => { localStorage.setItem('clinio-tema', !prev ? 'escuro' : 'claro'); return !prev })
  }

  // Validação do passo 1
  const validarEtapa1 = () => {
    const e: Record<string, string> = {}
    if (!nomeClinica.trim()) e.nomeClinica = 'Nome da clínica é obrigatório'
    if (!nomeAdmin.trim())   e.nomeAdmin = 'Seu nome é obrigatório'
    setErros(e)
    return Object.keys(e).length === 0
  }

  // Validação do passo 2
  const validarEtapa2 = () => {
    const e: Record<string, string> = {}
    if (!email.includes('@')) e.email = 'Email inválido'
    if (senha.length < 6)    e.senha = 'Mínimo 6 caracteres'
    if (senha !== confirmSenha) e.confirmSenha = 'Senhas não coincidem'
    setErros(e)
    return Object.keys(e).length === 0
  }

  const avancar = () => {
    if (validarEtapa1()) { setErroGeral(''); setEtapa(2) }
  }

  const voltar = () => { setEtapa(1); setErroGeral('') }

  async function aoSubmeter(e: React.FormEvent) {
    e.preventDefault()
    if (!validarEtapa2()) return
    setCarregando(true)
    setErroGeral('')
    try {
      const resp = await fetch('/api/clinicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_clinica: nomeClinica,
          nome_admin: nomeAdmin,
          email,
          senha,
          telefone,
        }),
      })
      const dados = await resp.json()
      if (!resp.ok) {
        setErroGeral(dados.erro || 'Erro ao cadastrar. Tente novamente.')
        return
      }
      setSucesso(true)
      // Redirecionar para login após 2s
      setTimeout(() => roteador.push('/autenticacao/entrar'), 2500)
    } catch {
      setErroGeral('Erro de conexão. Verifique sua internet.')
    } finally {
      setCarregando(false)
    }
  }

  // ── Tela de sucesso ──────────────────────────────────────────
  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: escuro ? '#020617' : '#F8FAFC' }}>
        <div className="text-center" style={{
          opacity: 1, transform: 'scale(1)',
          transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: '#10B981' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: escuro ? '#F0F9FF' : '#0C4A6E' }}>
            Clínica cadastrada!
          </h2>
          <p className="text-sm" style={{ color: escuro ? 'rgba(186,230,253,0.55)' : 'rgba(7,89,133,0.6)' }}>
            Redirecionando para o login...
          </p>
          <div className="mt-4 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#0EA5E9', borderTopColor: 'transparent' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex overflow-hidden transition-colors duration-500"
      style={{ background: escuro ? '#020617' : '#F8FAFC' }}>

      {/* ── Painel Esquerdo ──────────────────────────────── */}
      <div className="relative hidden lg:flex flex-col flex-1 overflow-hidden">
        <RedeAnimada escuro={escuro} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: escuro
            ? 'linear-gradient(to bottom, rgba(2,6,23,0.3) 0%, rgba(2,6,23,0.0) 40%, rgba(2,6,23,0.7) 100%)'
            : 'linear-gradient(to bottom, rgba(248,250,252,0.3) 0%, rgba(248,250,252,0.0) 40%, rgba(248,250,252,0.8) 100%)',
        }} />

        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-3" style={{
            opacity: montado ? 1 : 0, transform: montado ? 'translateY(0)' : 'translateY(-12px)',
            transition: 'all 0.6s ease',
          }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}>
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: escuro ? '#F0F9FF' : '#0C4A6E' }}>
              Clinio
            </span>
          </div>

          {/* Texto central */}
          <div className="flex-1 flex flex-col justify-center max-w-xl">
            <div style={{
              opacity: montado ? 1 : 0, transform: montado ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.7s ease 0.15s',
            }}>
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#0EA5E9' }}>
                Comece gratuitamente
              </p>
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4"
                style={{ color: escuro ? '#F0F9FF' : '#0C4A6E' }}>
                Sua clínica no<br />
                <span style={{ color: '#0EA5E9' }}>próximo nível.</span>
              </h1>
              <p className="text-base leading-relaxed"
                style={{ color: escuro ? 'rgba(186,230,253,0.7)' : 'rgba(7,89,133,0.7)' }}>
                Configure em menos de 2 minutos. Sem cartão de crédito. Cancele quando quiser.
              </p>
            </div>

            {/* Benefícios */}
            <div className="flex flex-col gap-3 mt-8" style={{
              opacity: montado ? 1 : 0, transform: montado ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.7s ease 0.3s',
            }}>
              {[
                { titulo: 'Configuração em 2 minutos', desc: 'Sem instalação, funciona no navegador' },
                { titulo: 'Dados seguros e criptografados', desc: 'Conformidade com LGPD garantida' },
                { titulo: 'Suporte completo no plano básico', desc: 'Agenda, pacientes e financeiro inclusos' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: '#0EA5E9' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: escuro ? '#BAE6FD' : '#075985' }}>
                      {item.titulo}
                    </p>
                    <p className="text-xs" style={{ color: escuro ? 'rgba(186,230,253,0.5)' : 'rgba(7,89,133,0.55)' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badge */}
          <div style={{
            opacity: montado ? 1 : 0, transition: 'all 0.7s ease 0.45s',
          }}>
            <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5" style={{
              background: escuro ? 'rgba(14,165,233,0.08)' : 'rgba(2,132,199,0.06)',
              border: `1px solid ${escuro ? 'rgba(14,165,233,0.2)' : 'rgba(2,132,199,0.15)'}`,
            }}>
              <span style={{ color: '#0EA5E9', fontSize: '18px' }}>🏥</span>
              <p className="text-xs" style={{ color: escuro ? 'rgba(186,230,253,0.65)' : 'rgba(7,89,133,0.7)' }}>
                Junte-se a centenas de clínicas que já usam o Clinio
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Painel Direito (Formulário) ──────────────────── */}
      <div className="relative w-full lg:w-[460px] xl:w-[500px] flex-shrink-0 flex flex-col items-center justify-center p-8"
        style={{
          background: escuro ? 'rgba(2,6,23,0.95)' : 'rgba(255,255,255,0.98)',
          borderLeft: escuro ? '1px solid rgba(14,165,233,0.12)' : '1px solid rgba(2,132,199,0.1)',
        }}>

        {/* Toggle tema */}
        <button onClick={alternarTema}
          className="absolute top-6 right-6 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{
            background: escuro ? 'rgba(14,165,233,0.1)' : 'rgba(2,132,199,0.08)',
            border: `1px solid ${escuro ? 'rgba(14,165,233,0.2)' : 'rgba(2,132,199,0.15)'}`,
            color: escuro ? '#38BDF8' : '#0284C7',
          }}>
          {escuro ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="w-full max-w-sm" style={{
          opacity: montado ? 1 : 0,
          transform: montado ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'all 0.65s cubic-bezier(0.16,1,0.3,1) 0.2s',
        }}>

          {/* Cabeçalho + indicador de etapa */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              {/* Steps */}
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                    style={{
                      background: etapa >= s ? 'linear-gradient(135deg, #0EA5E9, #0284C7)' : escuro ? 'rgba(14,165,233,0.12)' : 'rgba(2,132,199,0.1)',
                      color: etapa >= s ? 'white' : escuro ? 'rgba(186,230,253,0.4)' : 'rgba(7,89,133,0.4)',
                    }}>
                    {s}
                  </div>
                  <span className="text-xs" style={{ color: etapa === s ? '#0EA5E9' : escuro ? 'rgba(186,230,253,0.35)' : 'rgba(7,89,133,0.4)' }}>
                    {s === 1 ? 'Sua clínica' : 'Seu acesso'}
                  </span>
                  {s < 2 && <div className="w-6 h-px mx-1" style={{ background: escuro ? 'rgba(14,165,233,0.2)' : 'rgba(2,132,199,0.2)' }} />}
                </div>
              ))}
            </div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: escuro ? '#F0F9FF' : '#0C4A6E' }}>
              {etapa === 1 ? 'Cadastre sua clínica' : 'Crie seu acesso'}
            </h2>
            <p className="text-sm" style={{ color: escuro ? 'rgba(186,230,253,0.55)' : 'rgba(7,89,133,0.6)' }}>
              {etapa === 1 ? 'Passo 1 de 2 — informações básicas' : 'Passo 2 de 2 — email e senha de acesso'}
            </p>
          </div>

          {/* Erro geral */}
          {erroGeral && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm" style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5',
            }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erroGeral}
            </div>
          )}

          {/* ── Etapa 1 ── */}
          {etapa === 1 && (
            <div className="space-y-4">
              <Campo icone={Building2} label="Nome da clínica" valor={nomeClinica}
                onChange={setNomeClinica} placeholder="Ex: Clínica Odonto Sorriso" escuro={escuro}
                erro={erros.nomeClinica} />
              <Campo icone={User} label="Seu nome completo" valor={nomeAdmin}
                onChange={setNomeAdmin} placeholder="Ex: Dr. João Silva" escuro={escuro}
                erro={erros.nomeAdmin} />
              <CampoTelefone valor={telefone} onChange={setTelefone} escuro={escuro} />

              <button onClick={avancar}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200 mt-2"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', boxShadow: '0 4px 24px rgba(14,165,233,0.35)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(14,165,233,0.45)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(14,165,233,0.35)' }}>
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Etapa 2 ── */}
          {etapa === 2 && (
            <form onSubmit={aoSubmeter} className="space-y-4">
              <Campo icone={Mail} label="Email de acesso" tipo="email" valor={email}
                onChange={setEmail} placeholder="seu@email.com" escuro={escuro}
                erro={erros.email} />

              <Campo icone={Lock} label="Senha" tipo={senhaVisivel ? 'text' : 'password'}
                valor={senha} onChange={setSenha} placeholder="Mínimo 6 caracteres" escuro={escuro}
                erro={erros.senha}
                acaoDir={
                  <button type="button" onClick={() => setSenhaVisivel(v => !v)}
                    style={{ color: escuro ? 'rgba(186,230,253,0.4)' : 'rgba(7,89,133,0.4)' }}>
                    {senhaVisivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                } />

              <Campo icone={Lock} label="Confirmar senha" tipo={confirmVisivel ? 'text' : 'password'}
                valor={confirmSenha} onChange={setConfirmSenha} placeholder="Repita a senha" escuro={escuro}
                erro={erros.confirmSenha}
                acaoDir={
                  <button type="button" onClick={() => setConfirmVisivel(v => !v)}
                    style={{ color: escuro ? 'rgba(186,230,253,0.4)' : 'rgba(7,89,133,0.4)' }}>
                    {confirmVisivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                } />

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={voltar}
                  className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all duration-200"
                  style={{
                    background: escuro ? 'rgba(14,165,233,0.08)' : 'rgba(2,132,199,0.06)',
                    border: `1.5px solid ${escuro ? 'rgba(14,165,233,0.18)' : 'rgba(2,132,199,0.18)'}`,
                    color: escuro ? '#38BDF8' : '#0284C7',
                  }}>
                  Voltar
                </button>
                <button type="submit" disabled={carregando}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200"
                  style={{
                    background: carregando ? 'rgba(2,132,199,0.6)' : 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                    boxShadow: carregando ? 'none' : '0 4px 24px rgba(14,165,233,0.35)',
                    cursor: carregando ? 'not-allowed' : 'pointer',
                  }}>
                  {carregando ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Criando...</>
                  ) : (
                    <>Criar minha conta <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Divider + Link de login */}
          <div className="flex items-center gap-3 mt-6 mb-4">
            <div className="flex-1 h-px" style={{ background: escuro ? 'rgba(14,165,233,0.12)' : 'rgba(2,132,199,0.12)' }} />
            <span className="text-xs" style={{ color: escuro ? 'rgba(186,230,253,0.3)' : 'rgba(7,89,133,0.35)' }}>
              já tem conta?
            </span>
            <div className="flex-1 h-px" style={{ background: escuro ? 'rgba(14,165,233,0.12)' : 'rgba(2,132,199,0.12)' }} />
          </div>

          <Link href="/autenticacao/entrar"
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200"
            style={{
              background: escuro ? 'rgba(14,165,233,0.08)' : 'rgba(2,132,199,0.06)',
              border: `1.5px solid ${escuro ? 'rgba(14,165,233,0.18)' : 'rgba(2,132,199,0.18)'}`,
              color: escuro ? '#38BDF8' : '#0284C7',
            }}>
            Fazer login
          </Link>
        </div>

        <p className="absolute bottom-6 text-xs" style={{ color: escuro ? 'rgba(186,230,253,0.25)' : 'rgba(7,89,133,0.3)' }}>
          © {new Date().getFullYear()} Clinio · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
