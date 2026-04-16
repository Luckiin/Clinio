import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { criarClienteSupabaseAdmin } from '@/lib/supabase/client'
import {
  listarConversas,
  obterConversa,
  listarMensagens,
  enviarMensagem,
} from '@/servicos/crm'
import type { CanalConversa } from '@/tipos'

function normalizarConversaParaUI(conversa: any) {
  if (!conversa) return conversa

  const paciente = conversa.paciente ?? conversa.pacientes ?? null
  const nomePaciente = paciente?.nome ?? paciente?.nome_completo ?? 'Paciente'

  return {
    ...conversa,
    pacientes: paciente
      ? {
          ...paciente,
          nome_completo: nomePaciente,
        }
      : null,
    ultima_mensagem: conversa.ultima_mensagem_conteudo || ''
  }
}

function normalizarMensagemParaUI(mensagem: any) {
  if (!mensagem) return mensagem

  return {
    ...mensagem,
    remetente:
      mensagem.remetente ??
      (mensagem.tipo_mensagem === 'enviada' ? 'clinica' : 'paciente'),
    criado_em: mensagem.criado_em ?? mensagem.data_envio,
  }
}

// GET /api/crm/conversas | /api/crm/conversas?id=... | /api/crm/conversas?id=...&mensagens=true
export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const id = req.nextUrl.searchParams.get('id') ?? req.nextUrl.searchParams.get('conversa_id')
    const mensagensFlag = req.nextUrl.searchParams.get('mensagens') ?? (req.nextUrl.searchParams.get('conversa_id') ? 'true' : null)

    if (id && mensagensFlag === 'true') {
      const dados = await listarMensagens(usuario.clinica_id, id)
      const mensagens = dados.map(normalizarMensagemParaUI)
      return NextResponse.json({ dados: mensagens, mensagens })
    }

    if (id) {
      const dados = await obterConversa(usuario.clinica_id, id)
      if (!dados) return NextResponse.json({ erro: 'Conversa não encontrada' }, { status: 404 })
      const conversa = normalizarConversaParaUI(dados)
      return NextResponse.json({ dados: conversa, conversa })
    }

    const status = req.nextUrl.searchParams.get('status') ?? undefined
    const canal = req.nextUrl.searchParams.get('canal') as CanalConversa | null
    const limite = req.nextUrl.searchParams.get('limite')

    const dados = await listarConversas(usuario.clinica_id, {
      status,
      canal: canal ?? undefined,
      limite: limite ? parseInt(limite) : 50,
    })
    const conversas = dados.map(normalizarConversaParaUI)
    return NextResponse.json({ dados: conversas, conversas })
  } catch (err: unknown) {
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}

// POST /api/crm/conversas — criar ou obter conversa e enviar mensagem
export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const supabaseAdmin = criarClienteSupabaseAdmin()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 403 })

    const corpo = await req.json()
    const { paciente_id, canal, conteudo, tipo_conteudo, conversa_id } = corpo

    if (!paciente_id && !conversa_id) {
      return NextResponse.json({ erro: 'paciente_id obrigatório' }, { status: 400 })
    }

    let conversa = null
    let pacienteIdFinal = paciente_id as string | null

    if (conversa_id) {
      const { data: conversaExistente, error: erroConversaExistente } = await supabaseAdmin
        .from('conversas')
        .select('*')
        .eq('clinica_id', usuario.clinica_id)
        .eq('id', conversa_id)
        .maybeSingle()

      if (erroConversaExistente) {
        throw new Error(`Erro ao buscar conversa: ${erroConversaExistente.message}`)
      }

      conversa = conversaExistente
      if (!conversa) {
        return NextResponse.json({ erro: 'Conversa não encontrada' }, { status: 404 })
      }
      pacienteIdFinal = conversa.paciente_id
    } else {
      const canalFinal = (canal as CanalConversa) ?? 'whatsapp'

      const { data: conversaAtiva, error: erroConversaAtiva } = await supabaseAdmin
        .from('conversas')
        .select('*')
        .eq('clinica_id', usuario.clinica_id)
        .eq('paciente_id', paciente_id)
        .eq('canal', canalFinal)
        .in('status', ['ativa', 'aberta'])
        .maybeSingle()

      if (erroConversaAtiva) {
        throw new Error(`Erro ao verificar conversa ativa: ${erroConversaAtiva.message}`)
      }

      if (conversaAtiva) {
        conversa = conversaAtiva
      } else {
        const { data: novaConversa, error: erroNovaConversa } = await supabaseAdmin
          .from('conversas')
          .insert({
            clinica_id: usuario.clinica_id,
            paciente_id,
            canal: canalFinal,
          })
          .select('*')
          .single()

        if (erroNovaConversa) {
          throw new Error(`Erro ao criar conversa: ${erroNovaConversa.message}`)
        }

        conversa = novaConversa
      }
    }

    // Se tiver conteúdo, envia mensagem
    if (conteudo) {
      const mensagem = await enviarMensagem(
        usuario.clinica_id,
        conversa.id,
        pacienteIdFinal!,
        {
          conteudo,
          tipo_mensagem: 'enviada',
          tipo_conteudo: tipo_conteudo ?? 'texto',
          usuario_id: user.id,
        }
      )
      
      // Busca a conversa atualizada com os joins necessários (paciente)
      const conversaCompleta = await obterConversa(usuario.clinica_id, conversa.id)
      const conversaUI = normalizarConversaParaUI(conversaCompleta || conversa)
      const mensagemUI = normalizarMensagemParaUI(mensagem)
      
      return NextResponse.json(
        { dados: { conversa: conversaUI, mensagem: mensagemUI }, conversa: conversaUI, mensagem: mensagemUI },
        { status: 201 }
      )
    }

    // Busca a conversa atualizada com os joins necessários (paciente)
    const conversaCompleta = await obterConversa(usuario.clinica_id, conversa.id)
    const conversaUI = normalizarConversaParaUI(conversaCompleta || conversa)
    return NextResponse.json({ dados: conversaUI, conversa: conversaUI }, { status: 201 })
  } catch (err: unknown) {
    console.error('Erro em POST /api/crm/conversas:', err)
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
