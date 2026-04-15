// ============================================================
// CLINIO - API de Configuração WhatsApp
// Retorna URL do webhook e verify token para o painel
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'

export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '(não configurado)'

    // Em desenvolvimento, usa a URL da própria requisição (funciona com ngrok)
    // Em produção, usa a variável de ambiente NEXT_PUBLIC_URL
    let baseUrl = process.env.NEXT_PUBLIC_URL
    if (!baseUrl || process.env.NODE_ENV === 'development') {
      const host = req.headers.get('x-forwarded-host') ??
                   req.headers.get('host') ?? 'localhost:3000'
      const proto = req.headers.get('x-forwarded-proto') ?? 'http'
      baseUrl = `${proto}://${host}`
    }

    return NextResponse.json({
      webhook_url: `${baseUrl}/api/whatsapp/webhook`,
      verify_token: verifyToken,
    })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
