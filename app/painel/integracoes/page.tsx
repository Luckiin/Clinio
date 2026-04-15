'use client'
// ============================================================
// CLINIO - Integrações
// Configuração de WhatsApp Business API com guia passo a passo
// ============================================================

import { useEffect, useState } from 'react'
import {
  MessageCircle, Copy, Check, ExternalLink, CheckCircle2,
  AlertCircle, Loader2, Save, RefreshCw, Eye, EyeOff,
  ChevronDown, ChevronRight, Zap, Shield, Wifi
} from 'lucide-react'

interface WhatsAppConfig {
  access_token: string
  phone_number_id: string
  business_account_id: string
}

interface IntegrationRecord {
  id: string
  type: string
  config: WhatsAppConfig
  active: boolean
}

// ─── Campo copiável ───────────────────────────────────────────

function CampoCopia({ label, valor, sensivel = false }: { label: string; valor: string; sensivel?: boolean }) {
  const [copiado, setCopiado] = useState(false)
  const [visivel, setVisivel] = useState(sensivel === false)

  function copiar() {
    navigator.clipboard.writeText(valor)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
        <code className="flex-1 text-sm text-slate-800 dark:text-slate-200 font-mono truncate">
          {visivel ? valor : '•'.repeat(Math.min(valor.length, 32))}
        </code>
        {sensivel && (
          <button
            onClick={() => setVisivel(v => { return !v })}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            {visivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={copiar}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all"
          style={{
            background: copiado ? 'rgba(16,185,129,0.1)' : 'rgba(2,132,199,0.08)',
            color: copiado ? '#10B981' : '#0284C7',
          }}
        >
          {copiado
            ? <><Check className="w-3.5 h-3.5" />Copiado</>
            : <><Copy className="w-3.5 h-3.5" />Copiar</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Passo do setup ───────────────────────────────────────────

function Passo({
  numero, titulo, completo, children, aberto, onToggle,
}: {
  numero: number; titulo: string; completo: boolean
  children: React.ReactNode; aberto: boolean; onToggle: () => void
}) {
  return (
    <div className={`rounded-2xl border transition-all duration-200 ${
      completo
        ? 'border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10'
        : aberto
          ? 'border-primaria-200 dark:border-primaria-800/50 bg-primaria-50/30 dark:bg-primaria-900/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
    }`}>
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-6 py-4 text-left">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors ${
          completo
            ? 'bg-green-500 text-white'
            : aberto
              ? 'bg-primaria-600 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        }`}>
          {completo ? <Check className="w-4 h-4" /> : numero}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${
            completo
              ? 'text-green-700 dark:text-green-400'
              : aberto
                ? 'text-primaria-700 dark:text-primaria-400'
                : 'text-slate-700 dark:text-slate-200'
          }`}>{titulo}</p>
        </div>
        {aberto
          ? <ChevronDown className="w-4 h-4 text-slate-400" />
          : <ChevronRight className="w-4 h-4 text-slate-400" />
        }
      </button>
      {aberto && <div className="px-6 pb-6 space-y-4">{children}</div>}
    </div>
  )
}

// ─── Campo de input ───────────────────────────────────────────

function CampoInput({
  label, value, onChange, placeholder, tipo = 'text', hint,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; tipo?: string; hint?: string
}) {
  const [visivel, setVisivel] = useState(false)
  const ehSenha = tipo === 'password'

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={ehSenha && !visivel ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primaria-500 transition-all"
          style={{ paddingRight: ehSenha ? '2.75rem' : undefined }}
        />
        {ehSenha && (
          <button
            type="button"
            onClick={() => setVisivel(v => { return !v })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {visivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────

export default function PaginaIntegracoes() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [integracao, setIntegracao] = useState<IntegrationRecord | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [statusTeste, setStatusTeste] = useState<'idle' | 'ok' | 'erro'>('idle')
  const [passoAberto, setPassoAberto] = useState<number>(1)
  const [erroSalvar, setErroSalvar] = useState('')
  const [form, setForm] = useState<WhatsAppConfig>({
    access_token: '',
    phone_number_id: '',
    business_account_id: '',
  })

  // ── Carregamento inicial ──────────────────────────────────────
  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      try {
        const [resConfig, resInteg] = await Promise.all([
          fetch('/api/whatsapp/config'),
          fetch('/api/integrations/save?type=whatsapp'),
        ])
        const [dadosConfig, dadosInteg] = await Promise.all([
          resConfig.json(),
          resInteg.json(),
        ])
        if (dadosConfig.webhook_url) setWebhookUrl(dadosConfig.webhook_url)
        if (dadosConfig.verify_token) setVerifyToken(dadosConfig.verify_token)
        if (dadosInteg.dados) {
          setIntegracao(dadosInteg.dados)
          setForm(dadosInteg.dados.config ?? {
            access_token: '',
            phone_number_id: '',
            business_account_id: '',
          })
          if (dadosInteg.dados.active) setPassoAberto(0)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  // ── Salvar credenciais ────────────────────────────────────────
  async function salvar() {
    if (!form.access_token || !form.phone_number_id || !form.business_account_id) {
      setErroSalvar('Preencha todos os campos antes de salvar.')
      return
    }
    setSalvando(true)
    setErroSalvar('')
    try {
      const res = await fetch('/api/integrations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'whatsapp', config: form, active: true }),
      })
      const dados = await res.json()
      if (!res.ok) throw new Error(dados.erro ?? 'Erro ao salvar')
      setIntegracao(dados.dados)
      setPassoAberto(0)
    } catch (err: unknown) {
      setErroSalvar((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  // ── Testar conexão com a API do Meta ─────────────────────────
  async function testarConexao() {
    if (!form.access_token || !form.phone_number_id) return
    setTestando(true)
    setStatusTeste('idle')
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${form.phone_number_id}`,
        { headers: { Authorization: `Bearer ${form.access_token}` } }
      )
      setStatusTeste(res.ok ? 'ok' : 'erro')
    } catch {
      setStatusTeste('erro')
    } finally {
      setTestando(false)
    }
  }

  // ── Desativar integração ──────────────────────────────────────
  async function desativar() {
    const confirmou = window.confirm('Desativar a integração com WhatsApp?')
    if (!confirmou) return
    await fetch('/api/integrations/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'whatsapp', active: false }),
    })
    setIntegracao(prev => (prev ? { ...prev, active: false } : null))
  }

  const estaAtiva = Boolean(integracao?.active)
  const toggle = (n: number) => setPassoAberto(prev => (prev === n ? 0 : n))

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primaria-500" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Integrações</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Conecte canais externos ao CRM
          </p>
        </div>
        {estaAtiva && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            WhatsApp Ativo
          </div>
        )}
      </div>

      {/* Card WhatsApp */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">WhatsApp Business API</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Receba mensagens dos pacientes diretamente no CRM
            </p>
          </div>
          {estaAtiva && (
            <button
              onClick={desativar}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Desativar
            </button>
          )}
        </div>

        {/* Badges de benefícios */}
        <div className="grid grid-cols-3 gap-px bg-slate-100 dark:bg-slate-700">
          {[
            { icone: Zap, label: 'Mensagens em tempo real' },
            { icone: Shield, label: 'API oficial da Meta' },
            { icone: Wifi, label: 'Multi-número suportado' },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center gap-2.5">
              <item.icone className="w-4 h-4 text-primaria-500 flex-shrink-0" />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Passos */}
        <div className="p-6 space-y-3">

          {/* Passo 1 */}
          <Passo
            numero={1}
            titulo="Criar um App no Meta for Developers"
            completo={false}
            aberto={passoAberto === 1}
            onToggle={() => toggle(1)}
          >
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Você precisará de uma conta de desenvolvedor no Meta e um App configurado com o produto <strong>WhatsApp</strong>.
            </p>
            <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-2">
                <span className="font-bold text-primaria-600">1.</span>
                Acesse <a href="https://developers.facebook.com" target="_blank" rel="noopener" className="text-primaria-600 underline">developers.facebook.com</a>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primaria-600">2.</span>
                Clique em <strong>"Meus apps"</strong> → <strong>"Criar app"</strong>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primaria-600">3.</span>
                Escolha tipo <strong>"Empresa"</strong> e adicione o produto <strong>"WhatsApp"</strong>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primaria-600">4.</span>
                Associe a uma <strong>conta do WhatsApp Business</strong>
              </li>
            </ol>
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primaria-600 text-white rounded-xl text-sm font-medium hover:bg-primaria-700 transition-colors"
            >
              Abrir Meta for Developers
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Passo>

          {/* Passo 2 */}
          <Passo
            numero={2}
            titulo="Configurar o Webhook no Meta"
            completo={false}
            aberto={passoAberto === 2}
            onToggle={() => toggle(2)}
          >
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No painel do seu App Meta, vá em <strong>WhatsApp → Configuração</strong> e preencha o webhook com os valores abaixo:
            </p>
            <div className="space-y-3">
              <CampoCopia label="URL de callback (cole no Meta)" valor={webhookUrl || 'Carregando...'} />
              <CampoCopia label="Token de verificação (cole no Meta)" valor={verifyToken || 'Carregando...'} />
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                Campos de assinatura obrigatórios
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Após adicionar o webhook, ative os campos:{' '}
                <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">messages</code> e{' '}
                <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">message_deliveries</code>
              </p>
            </div>
            <ol className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-2">
                <span className="font-bold text-primaria-600">1.</span>
                Vá em <strong>WhatsApp → Configuração → Webhooks</strong>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primaria-600">2.</span>
                Cole a URL e o Token acima e clique em <strong>"Verificar e salvar"</strong>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primaria-600">3.</span>
                Assine os campos <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">messages</code> e <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">message_deliveries</code>
              </li>
            </ol>
          </Passo>

          {/* Passo 3 */}
          <Passo
            numero={3}
            titulo={estaAtiva ? 'Credenciais configuradas ✓' : 'Inserir credenciais da API'}
            completo={estaAtiva}
            aberto={passoAberto === 3}
            onToggle={() => toggle(3)}
          >
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Encontre as credenciais em <strong>WhatsApp → Configuração da API</strong> no seu App Meta.
            </p>
            <div className="space-y-3">
              <CampoInput
                label="Access Token (token de acesso permanente)"
                value={form.access_token}
                onChange={v => setForm(f => ({ ...f, access_token: v }))}
                placeholder="EAAxxxxxxxxxxxxx..."
                tipo="password"
                hint="Gere um token permanente em: WhatsApp → Configuração → Gerar token"
              />
              <CampoInput
                label="Phone Number ID"
                value={form.phone_number_id}
                onChange={v => setForm(f => ({ ...f, phone_number_id: v }))}
                placeholder="123456789012345"
                hint="ID do número que receberá e enviará mensagens"
              />
              <CampoInput
                label="Business Account ID (WABA ID)"
                value={form.business_account_id}
                onChange={v => setForm(f => ({ ...f, business_account_id: v }))}
                placeholder="987654321098765"
                hint="ID da conta do WhatsApp Business"
              />
            </div>

            {erroSalvar && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {erroSalvar}
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={testarConexao}
                disabled={testando || !form.access_token || !form.phone_number_id}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {testando
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Testando...</>
                  : <><RefreshCw className="w-4 h-4" />Testar conexão</>
                }
              </button>

              {statusTeste === 'ok' && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />Conexão OK!
                </span>
              )}
              {statusTeste === 'erro' && (
                <span className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
                  <AlertCircle className="w-4 h-4" />Token inválido
                </span>
              )}

              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-2 px-4 py-2.5 bg-primaria-600 text-white rounded-xl text-sm font-medium hover:bg-primaria-700 disabled:opacity-50 transition-colors ml-auto"
              >
                {salvando
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
                  : <><Save className="w-4 h-4" />{estaAtiva ? 'Atualizar' : 'Ativar integração'}</>
                }
              </button>
            </div>
          </Passo>

          {/* Passo 4 */}
          <Passo
            numero={4}
            titulo="Aprovar número de telefone para produção"
            completo={false}
            aberto={passoAberto === 4}
            onToggle={() => toggle(4)}
          >
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Em modo de desenvolvimento você só envia para testadores cadastrados. Para produção:
            </p>
            <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-2">
                <span className="font-bold text-primaria-600">1.</span>
                Vá em <strong>WhatsApp → Gerenciamento de números</strong>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primaria-600">2.</span>
                Solicite a <strong>verificação do número</strong> pelo processo de aprovação da Meta
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primaria-600">3.</span>
                Aguarde aprovação (normalmente 1–2 dias úteis)
              </li>
            </ol>
            <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                💡 <strong>Dica:</strong> Para testar antes da aprovação, adicione seu número pessoal como testador em{' '}
                <strong>Funções → Testadores</strong> no App Meta.
              </p>
            </div>
          </Passo>
        </div>

        {/* Status ativo */}
        {estaAtiva && (
          <div className="mx-6 mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-5 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Integração ativa e funcionando
                </p>
                <p className="text-xs text-green-600/80 dark:text-green-500 mt-0.5">
                  Phone Number ID:{' '}
                  <code className="font-mono">{integracao?.config?.phone_number_id}</code>
                  {' · '}
                  As mensagens recebidas aparecem automaticamente no CRM
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Link para o chat */}
      {estaAtiva && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ver mensagens recebidas</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              As conversas aparecem em CRM → Chat
            </p>
          </div>
          <a
            href="/painel/crm/chat"
            className="flex items-center gap-2 px-4 py-2 bg-primaria-600 text-white rounded-xl text-sm font-medium hover:bg-primaria-700 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Abrir Chat CRM
          </a>
        </div>
      )}
    </div>
  )
}
