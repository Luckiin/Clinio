'use client'
// ============================================================
// CLINIO - Página de Login
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { criarClienteNavegador } from '@/lib/supabase-cliente'
import { validarEmail } from '@/lib/validadores'
import { BotaoAcao } from '@/componentes/ui/BotaoAcao'
import { Eye, EyeOff, Stethoscope } from 'lucide-react'
import type { Metadata } from 'next'

export default function PaginaEntrar() {
  const roteador = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function aoSubmeter(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    // Validações básicas
    if (!validarEmail(email)) {
      setErro('Por favor, informe um email válido')
      return
    }

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setCarregando(true)

    try {
      const supabase = criarClienteNavegador()
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

      if (error) {
        setErro('Email ou senha incorretos. Verifique suas credenciais.')
        return
      }

      roteador.push('/painel')
      roteador.refresh()
    } catch {
      setErro('Erro ao fazer login. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Clinio</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Gestão inteligente de clínicas</p>
        </div>

        {/* Formulário */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-6">Entrar na sua conta</h2>

          {erro && (
            <div className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-5 text-sm text-red-700 dark:text-red-400 animar-fade-in">
              {erro}
            </div>
          )}

          <form onSubmit={aoSubmeter} className="space-y-5">
            {/* Campo Email */}
            <div>
              <label htmlFor="email" className="rotulo-campo">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="campo-input"
                autoComplete="email"
                required
              />
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="senha" className="rotulo-campo">
                  Senha
                </label>
                <Link
                  href="/recuperar-senha"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-300 font-medium"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="senha"
                  type={senhaVisivel ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Sua senha"
                  className="campo-input pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setSenhaVisivel(!senhaVisivel)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400"
                  aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {senhaVisivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão de entrar */}
            <BotaoAcao
              type="submit"
              variante="primario"
              tamanho="grande"
              larguraTotal
              carregando={carregando}
            >
              Entrar
            </BotaoAcao>
          </form>
        </div>

        {/* Rodapé */}
        <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-6">
          Precisa de uma conta?{' '}
          <Link href="/registrar" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-300 font-medium">
            Cadastre sua clínica
          </Link>
        </p>
      </div>
    </div>
  )
}
