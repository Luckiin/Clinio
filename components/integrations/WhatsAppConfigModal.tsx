'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface WhatsAppConfig {
  access_token: string
  phone_number_id: string
  business_account_id: string
}

interface PropsWhatsAppConfigModal {
  aberto: boolean
  configuracaoInicial?: Partial<WhatsAppConfig>
  aoFechar: () => void
  aoSalvarSucesso: () => void
}

export default function WhatsAppConfigModal({
  aberto,
  configuracaoInicial,
  aoFechar,
  aoSalvarSucesso,
}: PropsWhatsAppConfigModal) {
  const [form, setForm] = useState<WhatsAppConfig>({
    access_token: '',
    phone_number_id: '',
    business_account_id: '',
  })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setForm({
      access_token: configuracaoInicial?.access_token ?? '',
      phone_number_id: configuracaoInicial?.phone_number_id ?? '',
      business_account_id: configuracaoInicial?.business_account_id ?? '',
    })
  }, [aberto, configuracaoInicial])

  async function salvar() {
    setSalvando(true)
    try {
      const response = await fetch('/api/integrations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'whatsapp',
          config: form,
          active: true,
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.erro ?? 'Falha ao salvar integração.')

      aoSalvarSucesso()
      aoFechar()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao salvar integração.')
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Configurar WhatsApp</h3>
          <button
            onClick={aoFechar}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Access Token
            </label>
            <input
              type="text"
              value={form.access_token}
              onChange={(e) => setForm((prev) => ({ ...prev, access_token: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Phone Number ID
            </label>
            <input
              type="text"
              value={form.phone_number_id}
              onChange={(e) => setForm((prev) => ({ ...prev, phone_number_id: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Business Account ID
            </label>
            <input
              type="text"
              value={form.business_account_id}
              onChange={(e) => setForm((prev) => ({ ...prev, business_account_id: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={salvar}
            disabled={salvando}
            className="inline-flex items-center gap-2 rounded-xl bg-primaria-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primaria-700 disabled:opacity-60"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar integração
          </button>
        </div>
      </div>
    </div>
  )
}
