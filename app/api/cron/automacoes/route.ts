import { NextRequest, NextResponse } from 'next/server'
import {
  processarConsultasAmanha,
  processarConsultasHoje,
  processarAniversariantes,
  processarPacientesInativos,
  processarExecucoesAgendadas,
} from '@/servicos/motorAutomacoes'

// Vercel Cron Jobs chamam via GET — toda a lógica fica aqui.
// POST é mantido como alias para chamadas manuais/externas.
// Protegido por CRON_SECRET no header Authorization.

async function executarCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const agora = new Date()
  const hora = agora.getHours()
  const resultados: Record<string, unknown> = {}

  try {
    // Execuções agendadas: sempre processa (a cada chamada do cron)
    resultados.execucoes_agendadas = await processarExecucoesAgendadas()

    // Consultas de amanhã: roda às 10h
    if (hora === 10) {
      resultados.consultas_amanha = await processarConsultasAmanha()
    }

    // Consultas de hoje: roda às 7h
    if (hora === 7) {
      resultados.consultas_hoje = await processarConsultasHoje()
    }

    // Aniversariantes: roda às 8h
    if (hora === 8) {
      resultados.aniversariantes = await processarAniversariantes()
    }

    // Pacientes inativos: roda às 9h, segunda-feira (getDay() === 1)
    if (hora === 9 && agora.getDay() === 1) {
      resultados.pacientes_inativos = await processarPacientesInativos(180)
    }

    return NextResponse.json({
      sucesso: true,
      hora_execucao: agora.toISOString(),
      resultados,
    })
  } catch (err: any) {
    console.error('[CRON] Erro ao processar automações:', err)
    return NextResponse.json({ erro: err.message, resultados }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return executarCron(req)
}

export async function POST(req: NextRequest) {
  return executarCron(req)
}
