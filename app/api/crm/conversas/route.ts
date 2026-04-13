import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import {
  listarConversas,
  obterConversa,
  criarOuObterConversa,
  listarMensagens,
  enviarMensagem,
} from '@/servicos/crm'
import type { CanalConversa } from '@/tipos'

// GET /api/crm/conversas | /api/crm/conversas?id=... | /api/crm/conversas?id=...&mensagens=true
export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const id = req.nextUrl.searchParams.get('id')
    const mensagensFlag = req.nextUrl.searchParams.get('mensagens')

    if (id && mensagensFlag === 'true') {
      const dados = await listarMensagens(usuario.clinica_id, id)
      return NextResponse.json({ dados })
    }

    if (id) {
      const dados = await obterConversa(usuario.clinica_id, id)
      if (!dados) return NextResponse.json({ erro: 'Conversa não encontrada' }, { status: 404 })
      return NextResponse.json({ dados })
    }

    const status = req.nextUrl.searchParams.get('status') ?? undefined
    const canal = req.nextUrl.searchParams.get('canal') as CanalConversa | null
    const limite = req.nextUrl.searchParams.get('limite')

    const dados = await listarConversas(usuario.clinica_id, {
      status,
      canal: canal ?? undefined,
      limite: limite ? parseInt(limite) : 50,
    })
    return NextResponse.json({ dados })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

// POST /api/crm/conversas — criar ou obter conversa e enviar mensagem
export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const corpo = await req.json()
    const { paciente_id, canal, conteudo, tipo_conteudo } = corpo

    if (!paciente_id) {
      return NextResponse.json({ erro: 'paciente_id obrigatório' }, { status: 400 })
    }

    const conversa = await criarOuObterConversa(
      usuario.clinica_id,
      paciente_id,
      (canal as CanalConversa) ?? 'whatsapp'
    )

    // Se tiver conteúdo, envia mensagem
    if (conteudo) {
      const mensagem = await enviarMensagem(
        usuario.clinica_id,
        conversa.id,
        paciente_id,
        {
          conteudo,
          tipo_mensagem: 'enviada',
          tipo_conteudo: tipo_conteudo ?? 'texto',
          usuario_id: user.id,
        }
      )
      return NextResponse.json({ dados: { conversa, mensagem } }, { status: 201 })
    }

    return NextResponse.json({ dados: conversa }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
