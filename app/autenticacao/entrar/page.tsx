'use client'
// ============================================================
// CLINIO - Tela de Login Premium
// Animada, dark mode, SaaS
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { criarClienteNavegador } from '@/lib/supabase-cliente'
import { validarEmail } from '@/lib/validadores'
import {
  Eye, EyeOff, Moon, Sun, ArrowRight, Stethoscope,
  Users, Calendar, TrendingUp, Zap, Shield, Clock
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────

interface No {
  x: number; y: number
  vx: number; vy: number
  label: string
  tamanho: number
  fase: number
  destaque: boolean
}

// ─── Constantes ───────────────────────────────────────────────

const TERMOS_CLINICA = [
  { label: 'Agenda', destaque: true },
  { label: 'Pacientes', destaque: true },
  { label: 'Faturamento', destaque: true },
  { label: 'CRM', destaque: false },
  { label: 'WhatsApp', destaque: false },
  { label: 'Automações', destaque: false },
  { label: 'Campanhas', destaque: false },
  { label: 'Relatórios', destaque: false },
  { label: 'Funil', destaque: false },
  { label: 'Lembretes', destaque: false },
  { label: 'Retorno', destaque: false },
  { label: 'Dashboard', destaque: false },
  { label: 'Metas', destaque: false },
  { label: 'Prontuário', destaque: false },
  { label: 'Check-in', destaque: false },
  { label: 'Financeiro', destaque: false },
]

const STATS = [
  { icone: Users, valor: '12.000+', label: 'Pacientes gerenciados' },
  { icone: Calendar, valor: '98%', label: 'Taxa de agendamento' },
  { icone: TrendingUp, valor: '+40%', label: 'Aumento de retorno' },
  { icone: Shield, valor: '99.9%', label: 'Uptime garantido' },
]

// ─── Componente de Rede Animada ───────────────────────────────

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

    // Zona segura: nós ficam entre 22% e 70% da altura do canvas
    // Isso evita sobreposição com logo (topo) e stats (base)
    const safeMinY = () => h() * 0.22
    const safeMaxY = () => h() * 0.70
    const FADE_ZONE = 55   // pixels de fade suave antes da barreira
    const REPULSE = 0.18   // força de repulsão

    nosRef.current = TERMOS_CLINICA.map(t => ({
      x: 50 + Math.random() * (w() - 100),
      y: safeMinY() + Math.random() * (safeMaxY() - safeMinY()),
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      label: t.label,
      tamanho: t.destaque ? 5.5 : 3.5,
      fase: Math.random() * Math.PI * 2,
      destaque: t.destaque,
    }))

    const desenhar = () => {
      ctx.clearRect(0, 0, w(), h())

      const nos = nosRef.current
      const mouse = mouseRef.current
      const minY = safeMinY()
      const maxY = safeMaxY()

      // Mover nós com repulsão suave nas bordas da zona segura
      nos.forEach(no => {
        no.fase += 0.018
        const dx = mouse.x - no.x
        const dy = mouse.y - no.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) {
          no.vx -= (dx / dist) * 0.08
          no.vy -= (dy / dist) * 0.08
        }
        // Repulsão suave vertical (zona segura)
        if (no.y < minY + FADE_ZONE) {
          no.vy += REPULSE * (1 - (no.y - minY) / FADE_ZONE)
        }
        if (no.y > maxY - FADE_ZONE) {
          no.vy -= REPULSE * (1 - (maxY - no.y) / FADE_ZONE)
        }
        no.vx *= 0.99
        no.vy *= 0.99
        no.x += no.vx
        no.y += no.vy
        // Barreira horizontal
        if (no.x < 30) { no.x = 30; no.vx = Math.abs(no.vx) }
        if (no.x > w() - 30) { no.x = w() - 30; no.vx = -Math.abs(no.vx) }
        // Barreira vertical (zona segura)
        if (no.y < minY) { no.y = minY; no.vy = Math.abs(no.vy) * 0.4 }
        if (no.y > maxY) { no.y = maxY; no.vy = -Math.abs(no.vy) * 0.4 }
      })

      // Calcula opacidade do nó com base na proximidade das bordas (fade)
      const calcAlpha = (y: number) => {
        const minY = safeMinY()
        const maxY = safeMaxY()
        if (y < minY + FADE_ZONE) return Math.max(0, (y - minY) / FADE_ZONE)
        if (y > maxY - FADE_ZONE) return Math.max(0, (maxY - y) / FADE_ZONE)
        return 1
      }

      // Linhas de conexão
      nos.forEach((a, i) => {
        nos.slice(i + 1).forEach(b => {
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 160) {
            const fadeA = calcAlpha(a.y)
            const fadeB = calcAlpha(b.y)
            const fade = Math.min(fadeA, fadeB)
            const alpha = (1 - dist / 160) * (escuro ? 0.25 : 0.18) * fade
            if (alpha <= 0) return
            ctx.strokeStyle = escuro
              ? `rgba(56, 189, 248, ${alpha})`
              : `rgba(2, 132, 199, ${alpha})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        })
      })

      // Nós e labels
      nos.forEach(no => {
        const fade = calcAlpha(no.y)
        if (fade <= 0) return
        const pulso = no.tamanho + Math.sin(no.fase) * 1.2

        // Halo
        const grad = ctx.createRadialGradient(no.x, no.y, 0, no.x, no.y, pulso * 4)
        grad.addColorStop(0, escuro
          ? `rgba(14, 165, 233, ${(no.destaque ? 0.25 : 0.12) * fade})`
          : `rgba(2, 132, 199, ${(no.destaque ? 0.18 : 0.08) * fade})`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(no.x, no.y, pulso * 4, 0, Math.PI * 2)
        ctx.fill()

        // Ponto central
        const corPonto = escuro
          ? (no.destaque ? `rgba(56,189,248,${fade})` : `rgba(125,211,252,${fade})`)
          : (no.destaque ? `rgba(2,132,199,${fade})` : `rgba(56,189,248,${fade})`)
        ctx.fillStyle = corPonto
        ctx.beginPath()
        ctx.arc(no.x, no.y, pulso, 0, Math.PI * 2)
        ctx.fill()

        // Label
        const fontSize = no.destaque ? 12 : 10
        ctx.font = `${no.destaque ? '600' : '400'} ${fontSize}px Inter, sans-serif`
        ctx.fillStyle = escuro
          ? (no.destaque ? `rgba(224,242,254,${0.95 * fade})` : `rgba(186,230,253,${0.7 * fade})`)
          : (no.destaque ? `rgba(3,105,161,${0.95 * fade})` : `rgba(7,89,133,${0.7 * fade})`)
        ctx.textAlign = 'center'
        ctx.fillText(no.label, no.x, no.y - pulso - 5)
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

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: 'none' }}
    />
  )
}

// ─── Componente Principal ─────────────────────────────────────

export default function PaginaEntrar() {
  const roteador = useRouter()
  const [escuro, setEscuro] = useState(true)
  const [destino, setDestino] = useState('/painel')

  useEffect(() => {
    // Captura o parâmetro de redirecionamento (apenas rotas internas)
    const params = new URLSearchParams(window.location.search)
    const redir = params.get('redirecionamento')
    if (redir && redir.startsWith('/') && !redir.startsWith('//')) {
      setDestino(redir)
    }
  }, [])
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    const salvo = localStorage.getItem('clinio-tema')
    if (salvo !== null) setEscuro(salvo === 'escuro')
    setTimeout(() => setMontado(true), 80)
  }, [])

  const alternarTema = () => {
    setEscuro(prev => {
      localStorage.setItem('clinio-tema', !prev ? 'escuro' : 'claro')
      return !prev
    })
  }

  async function aoSubmeter(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!validarEmail(email)) { setErro('Informe um email válido'); return }
    if (senha.length < 6) { setErro('Senha deve ter ao menos 6 caracteres'); return }
    setCarregando(true)
    try {
      const supabase = criarClienteNavegador()
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) { setErro('Email ou senha incorretos.'); return }
      roteador.push(destino)
      roteador.refresh()
    } catch {
      setErro('Erro ao fazer login. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div
      className="min-h-screen flex overflow-hidden transition-colors duration-500"
      style={{ background: escuro ? '#020617' : '#F8FAFC' }}
    >
      {/* ── Painel Esquerdo ─────────────────────────────── */}
      <div className="relative hidden lg:flex flex-col flex-1 overflow-hidden">
        {/* Canvas animado */}
        <RedeAnimada escuro={escuro} />

        {/* Gradiente de proteção — esconde nós perto das zonas de conteúdo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: escuro
              ? `linear-gradient(to bottom,
                  rgba(2,6,23,1)    0%,
                  rgba(2,6,23,0.98) 10%,
                  rgba(2,6,23,0.55) 18%,
                  rgba(2,6,23,0)    26%,
                  rgba(2,6,23,0)    62%,
                  rgba(2,6,23,0.55) 72%,
                  rgba(2,6,23,0.98) 82%,
                  rgba(2,6,23,1)    100%)`
              : `linear-gradient(to bottom,
                  rgba(248,250,252,1)    0%,
                  rgba(248,250,252,0.98) 10%,
                  rgba(248,250,252,0.55) 18%,
                  rgba(248,250,252,0)    26%,
                  rgba(248,250,252,0)    62%,
                  rgba(248,250,252,0.55) 72%,
                  rgba(248,250,252,0.98) 82%,
                  rgba(248,250,252,1)    100%)`,
          }}
        />

        {/* Conteúdo sobre o canvas */}
        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div
            className="flex items-center gap-3"
            style={{
              opacity: montado ? 1 : 0,
              transform: montado ? 'translateY(0)' : 'translateY(-12px)',
              transition: 'all 0.6s ease',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}
            >
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: escuro ? '#F0F9FF' : '#0C4A6E' }}
            >
              Clinio
            </span>
          </div>

          {/* Tagline central */}
          <div className="flex-1 flex flex-col justify-center max-w-xl">
            <div
              style={{
                opacity: montado ? 1 : 0,
                transform: montado ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.7s ease 0.15s',
              }}
            >
              <p
                className="text-sm font-semibold uppercase tracking-widest mb-3"
                style={{ color: '#0EA5E9' }}
              >
                Plataforma SaaS para Clínicas
              </p>
              <h1
                className="text-4xl xl:text-5xl font-bold leading-tight mb-4"
                style={{ color: escuro ? '#F0F9FF' : '#0C4A6E' }}
              >
                Gestão completa.<br />
                <span style={{ color: '#0EA5E9' }}>Resultados reais.</span>
              </h1>
              <p
                className="text-base leading-relaxed"
                style={{ color: escuro ? 'rgba(186,230,253,0.7)' : 'rgba(7,89,133,0.7)' }}
              >
                CRM, agenda inteligente, automações de WhatsApp e faturamento em uma única plataforma.
                Aumente o retorno dos seus pacientes e o faturamento da sua clínica.
              </p>
            </div>

            {/* Features */}
            <div
              className="flex flex-col gap-2 mt-6"
              style={{
                opacity: montado ? 1 : 0,
                transform: montado ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.7s ease 0.3s',
              }}
            >
              {[
                'Agenda online com confirmação automática',
                'CRM com radar de oportunidades e funil',
                'Campanhas de WhatsApp segmentadas',
                'Relatórios financeiros em tempo real',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(14, 165, 233, 0.2)', border: '1px solid rgba(14, 165, 233, 0.4)' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#0EA5E9' }} />
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: escuro ? 'rgba(186,230,253,0.75)' : 'rgba(7,89,133,0.8)' }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div
            className="grid grid-cols-4 gap-3"
            style={{
              opacity: montado ? 1 : 0,
              transform: montado ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.7s ease 0.45s',
            }}
          >
            {STATS.map((s, i) => (
              <div
                key={i}
                className="rounded-xl px-3 py-3"
                style={{
                  background: escuro ? 'rgba(14,165,233,0.08)' : 'rgba(2,132,199,0.06)',
                  border: `1px solid ${escuro ? 'rgba(14,165,233,0.18)' : 'rgba(2,132,199,0.15)'}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <s.icone
                  className="w-4 h-4 mb-1.5"
                  style={{ color: '#0EA5E9' }}
                />
                <p
                  className="text-lg font-bold"
                  style={{ color: escuro ? '#E0F2FE' : '#075985' }}
                >
                  {s.valor}
                </p>
                <p
                  className="text-[11px] leading-tight"
                  style={{ color: escuro ? 'rgba(186,230,253,0.55)' : 'rgba(7,89,133,0.6)' }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Painel Direito (Login) ──────────────────────── */}
      <div
        className="relative w-full lg:w-[440px] xl:w-[480px] flex-shrink-0 flex flex-col items-center justify-center p-8"
        style={{
          background: escuro
            ? 'rgba(2,6,23,0.95)'
            : 'rgba(255,255,255,0.98)',
          borderLeft: escuro
            ? '1px solid rgba(14,165,233,0.12)'
            : '1px solid rgba(2,132,199,0.1)',
        }}
      >
        {/* Toggle tema */}
        <button
          onClick={alternarTema}
          className="absolute top-6 right-6 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{
            background: escuro ? 'rgba(14,165,233,0.1)' : 'rgba(2,132,199,0.08)',
            border: `1px solid ${escuro ? 'rgba(14,165,233,0.2)' : 'rgba(2,132,199,0.15)'}`,
            color: escuro ? '#38BDF8' : '#0284C7',
          }}
          title="Alternar tema"
        >
          {escuro ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Logo mobile */}
        <div className="flex lg:hidden items-center gap-2 mb-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}
          >
            <Stethoscope className="w-4.5 h-4.5 text-white" />
          </div>
          <span
            className="text-xl font-bold"
            style={{ color: escuro ? '#F0F9FF' : '#0C4A6E' }}
          >
            Clinio
          </span>
        </div>

        {/* Card de login */}
        <div
          className="w-full max-w-sm"
          style={{
            opacity: montado ? 1 : 0,
            transform: montado ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
            transition: 'all 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
          }}
        >
          {/* Cabeçalho */}
          <div className="mb-8">
            <h2
              className="text-2xl font-bold mb-1"
              style={{ color: escuro ? '#F0F9FF' : '#0C4A6E' }}
            >
              Bem-vindo de volta
            </h2>
            <p className="text-sm" style={{ color: escuro ? 'rgba(186,230,253,0.55)' : 'rgba(7,89,133,0.6)' }}>
              Entre na sua conta para continuar
            </p>
          </div>

          {/* Erro */}
          {erro && (
            <div
              className="rounded-xl px-4 py-3 mb-6 text-sm"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#FCA5A5',
              }}
            >
              {erro}
            </div>
          )}

          <form onSubmit={aoSubmeter} className="space-y-4">
            {/* Email */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                style={{ color: escuro ? 'rgba(186,230,253,0.6)' : 'rgba(7,89,133,0.7)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200"
                style={{
                  background: escuro ? 'rgba(14,165,233,0.06)' : 'rgba(2,132,199,0.04)',
                  border: `1.5px solid ${escuro ? 'rgba(14,165,233,0.18)' : 'rgba(2,132,199,0.2)'}`,
                  color: escuro ? '#E0F2FE' : '#0C4A6E',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#0EA5E9'
                  e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.12)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = escuro ? 'rgba(14,165,233,0.18)' : 'rgba(2,132,199,0.2)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="block text-xs font-semibold uppercase tracking-wider"
                  style={{ color: escuro ? 'rgba(186,230,253,0.6)' : 'rgba(7,89,133,0.7)' }}
                >
                  Senha
                </label>
                <Link
                  href="/recuperar-senha"
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#0EA5E9' }}
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={senhaVisivel ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all duration-200"
                  style={{
                    background: escuro ? 'rgba(14,165,233,0.06)' : 'rgba(2,132,199,0.04)',
                    border: `1.5px solid ${escuro ? 'rgba(14,165,233,0.18)' : 'rgba(2,132,199,0.2)'}`,
                    color: escuro ? '#E0F2FE' : '#0C4A6E',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#0EA5E9'
                    e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.12)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = escuro ? 'rgba(14,165,233,0.18)' : 'rgba(2,132,199,0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setSenhaVisivel(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: escuro ? 'rgba(186,230,253,0.4)' : 'rgba(7,89,133,0.4)' }}
                >
                  {senhaVisivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200 mt-2"
              style={{
                background: carregando
                  ? 'rgba(2,132,199,0.6)'
                  : 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                boxShadow: carregando ? 'none' : '0 4px 24px rgba(14,165,233,0.35)',
                cursor: carregando ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => {
                if (!carregando) {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(14,165,233,0.45)'
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = carregando ? 'none' : '0 4px 24px rgba(14,165,233,0.35)'
              }}
            >
              {carregando ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: escuro ? 'rgba(14,165,233,0.12)' : 'rgba(2,132,199,0.12)' }} />
            <span className="text-xs" style={{ color: escuro ? 'rgba(186,230,253,0.3)' : 'rgba(7,89,133,0.35)' }}>
              novo por aqui?
            </span>
            <div className="flex-1 h-px" style={{ background: escuro ? 'rgba(14,165,233,0.12)' : 'rgba(2,132,199,0.12)' }} />
          </div>

          {/* Cadastro */}
          <Link
            href="/registrar"
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200"
            style={{
              background: escuro ? 'rgba(14,165,233,0.08)' : 'rgba(2,132,199,0.06)',
              border: `1.5px solid ${escuro ? 'rgba(14,165,233,0.18)' : 'rgba(2,132,199,0.18)'}`,
              color: escuro ? '#38BDF8' : '#0284C7',
            }}
          >
            Cadastrar minha clínica
          </Link>
        </div>

        {/* Rodapé */}
        <p
          className="absolute bottom-6 text-xs"
          style={{ color: escuro ? 'rgba(186,230,253,0.25)' : 'rgba(7,89,133,0.3)' }}
        >
          © {new Date().getFullYear()} Clinio · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
