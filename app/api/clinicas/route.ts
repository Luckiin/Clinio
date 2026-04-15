// ============================================================
// CLINIO - API de Cadastro de Clínicas
// POST /api/clinicas  →  Cria clínica + usuário administrador
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente com service role (bypassa RLS e tem auth.admin)
function criarClienteServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) throw new Error('Variáveis SUPABASE não configuradas')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Gera slug único a partir do nome da clínica
function gerarSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')     // remove acentos
    .replace(/[^a-z0-9]+/g, '-')         // espaços/especiais → hífen
    .replace(/^-+|-+$/g, '')             // remove hífens das bordas
    + '-' + Math.random().toString(36).slice(2, 7)  // sufixo único
}

export async function POST(req: NextRequest) {
  try {
    const supabase = criarClienteServiceRole()
    const corpo = await req.json()

    const { nome_clinica, nome_admin, email, senha, telefone } = corpo

    // ── Validações ──────────────────────────────────────────
    if (!nome_clinica?.trim()) return NextResponse.json({ erro: 'Nome da clínica é obrigatório' }, { status: 400 })
    if (!nome_admin?.trim())   return NextResponse.json({ erro: 'Seu nome é obrigatório' }, { status: 400 })
    if (!email?.trim())        return NextResponse.json({ erro: 'Email é obrigatório' }, { status: 400 })
    if (!senha || senha.length < 6) return NextResponse.json({ erro: 'Senha deve ter ao menos 6 caracteres' }, { status: 400 })

    // ── 1. Criar clínica ─────────────────────────────────────
    const slug = gerarSlug(nome_clinica)

    const { data: clinica, error: erroCl } = await supabase
      .from('clinicas')
      .insert({
        nome: nome_clinica.trim(),
        slug,
        email: email.trim(),
        telefone: telefone?.trim() || null,
        plano: 'basico',
        ativo: true,
      })
      .select()
      .single()

    if (erroCl) {
      console.error('Erro ao criar clínica:', erroCl)
      return NextResponse.json({ erro: `Erro ao criar clínica: ${erroCl.message}` }, { status: 500 })
    }

    // ── 2. Criar usuário no Supabase Auth ────────────────────
    const { data: authData, error: erroAuth } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: senha,
      email_confirm: true,   // confirma o email automaticamente
      user_metadata: { nome: nome_admin.trim() },
    })

    if (erroAuth) {
      // Rollback: remove a clínica criada
      await supabase.from('clinicas').delete().eq('id', clinica.id)
      console.error('Erro ao criar usuário Auth:', erroAuth)

      if (erroAuth.message?.toLowerCase().includes('already registered')) {
        return NextResponse.json({ erro: 'Este email já está cadastrado.' }, { status: 409 })
      }
      return NextResponse.json({ erro: `Erro ao criar usuário: ${erroAuth.message}` }, { status: 500 })
    }

    const authUser = authData.user!

    // ── 3. Criar registro na tabela usuarios ─────────────────
    const { error: erroUsuario } = await supabase
      .from('usuarios')
      .insert({
        id: authUser.id,
        clinica_id: clinica.id,
        nome: nome_admin.trim(),
        email: email.trim(),
        telefone: telefone?.trim() || null,
        perfil: 'administrador',
        ativo: true,
      })

    if (erroUsuario) {
      // Rollback Auth + Clínica
      await supabase.auth.admin.deleteUser(authUser.id)
      await supabase.from('clinicas').delete().eq('id', clinica.id)
      console.error('Erro ao criar registro de usuário:', erroUsuario)
      return NextResponse.json({ erro: `Erro ao configurar usuário: ${erroUsuario.message}` }, { status: 500 })
    }

    return NextResponse.json({
      mensagem: 'Clínica cadastrada com sucesso!',
      dados: { clinica_id: clinica.id, slug },
    }, { status: 201 })

  } catch (err: unknown) {
    console.error('Erro inesperado no cadastro:', err)
    return NextResponse.json({ erro: (err as Error).message }, { status: 500 })
  }
}
