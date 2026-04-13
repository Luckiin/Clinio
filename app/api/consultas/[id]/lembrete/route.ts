// ============================================================
// CLINIO - API: Enviar Lembrete de Consulta
// POST /api/consultas/[id]/lembrete
// Cria mensagem de lembrete via WhatsApp/SMS para o paciente
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    // Buscar consulta com dados do paciente
    const { data: consulta, error } = await supabase
      .from('consultas')
      .select(`
        *,
        paciente:pacientes(nome, telefone),
        medico:medicos(nome),
        tipo_consulta:tipos_consulta(nome)
      `)
      .eq('id', params.id)
      .single()

    if (error || !consulta) {
      return NextResponse.json({ erro: 'Consulta não encontrada' }, { status: 404 })
    }

    if (!consulta.paciente?.telefone) {
      return NextResponse.json({ erro: 'Paciente sem telefone cadastrado' }, { status: 422 })
    }

    // Formatar data/hora para o lembrete
    const dataHora = new Date(consulta.data_hora_inicio)
    const dataFormatada = dataHora.toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    const horaFormatada = dataHora.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit',
    })

    const mensagem = [
      `Olá, ${consulta.paciente.nome}! 👋`,
      ``,
      `Lembramos que você tem uma consulta agendada:`,
      `📅 ${dataFormatada} às ${horaFormatada}`,
      consulta.medico ? `👨‍⚕️ ${consulta.medico.nome}` : '',
      consulta.tipo_consulta ? `🩺 ${consulta.tipo_consulta.nome}` : '',
      ``,
      `Por favor, confirme sua presença respondendo SIM ou entre em contato caso precise reagendar.`,
    ].filter(Boolean).join('\n')

    // Registrar mensagem no banco (será processada pela fila de envio)
    await supabase.from('mensagens').insert({
      clinica_id: consulta.clinica_id,
      paciente_id: consulta.paciente_id,
      canal: 'whatsapp',
      direcao: 'saida',
      conteudo: mensagem,
      status: 'pendente',
      origem: 'lembrete_manual',
      referencia_id: consulta.id,
    })

    // Marcar que lembrete foi enviado
    await supabase
      .from('consultas')
      .update({ lembrete_enviado_em: new Date().toISOString() })
      .eq('id', params.id)

    return NextResponse.json({
      ok: true,
      mensagem: 'Lembrete agendado para envio',
      destinatario: consulta.paciente.telefone,
    })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
