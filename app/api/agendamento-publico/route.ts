// ============================================================
// CLINIO - API de Agendamento Público
// Rota pública para pacientes agendarem online sem login
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { criarClienteAdmin } from '@/lib/supabase-servidor'
import { validarTelefone, validarEmail } from '@/lib/validadores'

/**
 * POST /api/agendamento-publico
 * Cria um agendamento a partir do portal público
 * Cria o paciente automaticamente se não existir
 */
export async function POST(requisicao: NextRequest) {
  try {
    const supabase = criarClienteAdmin()
    const corpo = await requisicao.json()

    const {
      clinica_id,
      medico_id,
      tipo_consulta_id,
      data_hora,
      duracao_minutos,
      nome,
      telefone,
      email,
      cpf,
      observacoes,
    } = corpo

    // Validações básicas
    if (!clinica_id || !medico_id || !data_hora || !nome || !telefone) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: clínica, médico, data/hora, nome e telefone' },
        { status: 400 }
      )
    }

    if (!validarTelefone(telefone)) {
      return NextResponse.json({ erro: 'Telefone inválido' }, { status: 400 })
    }

    if (email && !validarEmail(email)) {
      return NextResponse.json({ erro: 'Email inválido' }, { status: 400 })
    }

    // Verificar se a clínica está ativa e aceita agendamento online
    const { data: clinica } = await supabase
      .from('clinicas')
      .select('id, configuracoes')
      .eq('id', clinica_id)
      .eq('ativo', true)
      .single()

    if (!clinica) {
      return NextResponse.json({ erro: 'Clínica não encontrada' }, { status: 404 })
    }

    const configuracoes = clinica.configuracoes as any
    if (configuracoes?.permite_agendamento_online === false) {
      return NextResponse.json(
        { erro: 'Esta clínica não aceita agendamentos online no momento' },
        { status: 403 }
      )
    }

    // Verificar conflito de horário
    const inicio = new Date(data_hora)
    const fim = new Date(inicio.getTime() + (duracao_minutos || 30) * 60 * 1000)

    const { data: conflito } = await supabase
      .from('consultas')
      .select('id')
      .eq('clinica_id', clinica_id)
      .eq('medico_id', medico_id)
      .not('status', 'in', '("cancelado","faltou")')
      .lt('data_hora_inicio', fim.toISOString())
      .gt('data_hora_fim', inicio.toISOString())
      .limit(1)

    if (conflito && conflito.length > 0) {
      return NextResponse.json(
        { erro: 'Este horário não está mais disponível. Por favor, escolha outro.' },
        { status: 409 }
      )
    }

    // Verificar se o paciente já existe (por CPF ou telefone)
    let pacienteId: string | null = null

    if (cpf) {
      const cpfLimpo = cpf.replace(/\D/g, '')
      const { data: pacienteExistente } = await supabase
        .from('pacientes')
        .select('id')
        .eq('clinica_id', clinica_id)
        .eq('cpf', cpfLimpo)
        .single()

      if (pacienteExistente) {
        pacienteId = pacienteExistente.id
      }
    }

    if (!pacienteId) {
      const telefoneLimpo = telefone.replace(/\D/g, '')
      const { data: pacientePorTelefone } = await supabase
        .from('pacientes')
        .select('id')
        .eq('clinica_id', clinica_id)
        .or(`telefone.eq.${telefoneLimpo},telefone_whatsapp.eq.${telefoneLimpo}`)
        .single()

      if (pacientePorTelefone) {
        pacienteId = pacientePorTelefone.id
      }
    }

    // Criar paciente se não existir
    if (!pacienteId) {
      const { data: novoPaciente, error: erroPaciente } = await supabase
        .from('pacientes')
        .insert({
          clinica_id,
          nome,
          telefone: telefone.replace(/\D/g, ''),
          telefone_whatsapp: telefone.replace(/\D/g, ''),
          email: email || null,
          cpf: cpf ? cpf.replace(/\D/g, '') : null,
          status: 'ativo',
        })
        .select('id')
        .single()

      if (erroPaciente) {
        return NextResponse.json(
          { erro: 'Erro ao cadastrar paciente' },
          { status: 500 }
        )
      }

      pacienteId = novoPaciente.id
    }

    // Criar o agendamento
    const { data: consulta, error: erroConsulta } = await supabase
      .from('consultas')
      .insert({
        clinica_id,
        paciente_id: pacienteId,
        medico_id,
        tipo_consulta_id: tipo_consulta_id || null,
        data_hora_inicio: inicio.toISOString(),
        data_hora_fim: fim.toISOString(),
        status: 'agendado',
        tipo: 'presencial',
        observacoes,
        agendado_online: true,
      })
      .select('id')
      .single()

    if (erroConsulta) {
      return NextResponse.json(
        { erro: 'Erro ao criar agendamento' },
        { status: 500 }
      )
    }

    // Registrar mensagem de boas-vindas/confirmação (automação)
    // Aqui seria acionada a automação de confirmação se existir
    await supabase.from('mensagens').insert({
      clinica_id,
      paciente_id: pacienteId,
      consulta_id: consulta.id,
      canal: 'whatsapp',
      conteudo: `Olá ${nome.split(' ')[0]}! Seu agendamento foi confirmado para ${new Date(inicio).toLocaleDateString('pt-BR')} às ${new Date(inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Aguardamos você! 😊`,
      status: 'pendente',
    })

    return NextResponse.json(
      {
        dados: { consulta_id: consulta.id },
        mensagem: 'Agendamento realizado com sucesso',
      },
      { status: 201 }
    )
  } catch (erro: any) {
    console.error('[API Agendamento Público] Erro:', erro)
    return NextResponse.json({ erro: 'Erro interno no servidor' }, { status: 500 })
  }
}
