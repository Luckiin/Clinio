import { NextRequest, NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase-servidor'
import { criarClienteSupabaseAdmin } from '@/lib/supabase/client'
import { getIntegration } from '@/lib/integrations/getIntegration'

export async function GET(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!usuario?.clinica_id) {
      return NextResponse.json({ erro: 'Usuário sem clínica vinculada.' }, { status: 403 })
    }

    const type = req.nextUrl.searchParams.get('type')
    if (!type) return NextResponse.json({ erro: 'type é obrigatório.' }, { status: 400 })

    const integration = await getIntegration(usuario.clinica_id, type)
    return NextResponse.json({ dados: integration })
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao buscar integração.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!usuario?.clinica_id) {
      return NextResponse.json({ erro: 'Usuário sem clínica vinculada.' }, { status: 403 })
    }

    const body = await req.json()
    const { company_id, type, config, active } = body as {
      company_id?: string
      type?: string
      config?: Record<string, unknown>
      active?: boolean
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json({ erro: 'type é obrigatório.' }, { status: 400 })
    }

    const companyId = company_id ?? usuario.clinica_id
    if (companyId !== usuario.clinica_id) {
      return NextResponse.json({ erro: 'company_id inválido para o usuário logado.' }, { status: 403 })
    }

    const admin = criarClienteSupabaseAdmin()
    const existente = await getIntegration(companyId, type)

    if (existente) {
      const { data, error } = await admin
        .from('integrations')
        .update({
          config: config ?? existente.config,
          active: active ?? true,
        })
        .eq('id', existente.id)
        .select('*')
        .single()

      if (error) throw new Error(error.message)
      return NextResponse.json({ dados: data })
    }

    if (!config) {
      return NextResponse.json({ erro: 'config é obrigatório para criar integração.' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('integrations')
      .insert({
        company_id: companyId,
        type,
        config,
        active: active ?? true,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ dados: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao salvar integração.' },
      { status: 500 }
    )
  }
}
