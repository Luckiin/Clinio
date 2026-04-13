'use client'
// ============================================================
// CLINIO - Página Financeira
// Controle de cobranças, pagamentos e relatórios
// ============================================================

import { useState, useEffect } from 'react'
import { DollarSign, Plus, TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react'
import { BotaoAcao } from '@/componentes/ui/BotaoAcao'
import { CartaoMetrica } from '@/componentes/ui/CartaoMetrica'
import { formatarMoeda, formatarData } from '@/lib/formatadores'
import type { Cobranca, StatusCobranca, FormaPagamento } from '@/tipos'

const rotulos_forma: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  pix: 'PIX',
  transferencia: 'Transferência',
  convenio: 'Convênio',
  boleto: 'Boleto',
  outro: 'Outro',
}

const cores_status: Record<StatusCobranca, string> = {
  pendente: 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-700 dark:text-yellow-400',
  pago: 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-400',
  parcialmente_pago: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-400',
  cancelado: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400',
  vencido: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-400',
}

const rotulos_status: Record<StatusCobranca, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  parcialmente_pago: 'Parcialmente Pago',
  cancelado: 'Cancelado',
  vencido: 'Vencido',
}

export default function PaginaFinanceiro() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [resumo, setResumo] = useState<any>(null)
  const [evolucao, setEvolucao] = useState<{ mes: string; receita: number }[]>([])
  const [filtroStatus, setFiltroStatus] = useState<StatusCobranca | ''>('')
  const [carregando, setCarregando] = useState(true)
  const [abaDativa, setAbaAtiva] = useState<'resumo' | 'cobrancas'>('resumo')

  // Estado dos Modais
  const [modalNovaCobranca, setModalNovaCobranca] = useState(false)
  const [modalPagamento, setModalPagamento] = useState<string | null>(null)
  const [pacientesOptions, setPacientesOptions] = useState<{id: string, nome: string}[]>([])

  const [formCobranca, setFormCobranca] = useState({
    paciente_id: '',
    descricao: '',
    valor: '',
    valor_desconto: '0',
    vencimento: ''
  })

  const [formPagamento, setFormPagamento] = useState({
    valor: '',
    forma_pagamento: 'dinheiro' as FormaPagamento,
    parcelas: '1',
    data_pagamento: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    buscarDados()
  }, [filtroStatus])

  async function buscarDados() {
    setCarregando(true)
    try {
      const [resResumo, resCobrancas] = await Promise.all([
        fetch('/api/financeiro?tipo=resumo'),
        fetch(`/api/financeiro?tipo=cobrancas${filtroStatus ? `&status=${filtroStatus}` : ''}`),
      ])

      const dadosResumo = await resResumo.json()
      const dadosCobrancas = await resCobrancas.json()

      setResumo(dadosResumo.dados?.resumo)
      setEvolucao(dadosResumo.dados?.evolucao || [])
      setCobrancas(dadosCobrancas.dados || [])
    } catch (erro) {
      console.error('Erro ao buscar dados financeiros:', erro)
    } finally {
      setCarregando(false)
    }
  }

  async function abrirNovaCobranca() {
    setModalNovaCobranca(true)
    if (pacientesOptions.length === 0) {
      try {
        const res = await fetch('/api/pacientes?por_pagina=100')
        const json = await res.json()
        setPacientesOptions(json.dados || [])
      } catch (e) {
        console.error(e)
      }
    }
  }

  function abrirModalPagamento(cobranca: Cobranca) {
    setFormPagamento({
      ...formPagamento,
      valor: String(cobranca.valor_final)
    })
    setModalPagamento(cobranca.id)
  }

  async function handleCriarCobranca(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/financeiro?acao=criar_cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: formCobranca.paciente_id,
          descricao: formCobranca.descricao,
          valor: parseFloat(formCobranca.valor),
          valor_desconto: parseFloat(formCobranca.valor_desconto) || 0,
          vencimento: formCobranca.vencimento || null
        })
      })
      if (res.ok) {
        setModalNovaCobranca(false)
        setFormCobranca({ paciente_id: '', descricao: '', valor: '', valor_desconto: '0', vencimento: '' })
        buscarDados()
      } else {
        alert('Erro ao criar cobrança')
      }
    } catch(e) { console.error(e) }
  }

  async function handleRegistrarPagamento(e: React.FormEvent) {
    e.preventDefault()
    if (!modalPagamento) return
    const cobranca = cobrancas.find(c => c.id === modalPagamento)
    if (!cobranca) return

    try {
      const res = await fetch('/api/financeiro?acao=registrar_pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cobranca_id: cobranca.id,
          paciente_id: cobranca.paciente_id,
          valor: parseFloat(formPagamento.valor),
          forma_pagamento: formPagamento.forma_pagamento,
          parcelas: parseInt(formPagamento.parcelas) || 1,
          data_pagamento: formPagamento.data_pagamento
        })
      })
      if (res.ok) {
        setModalPagamento(null)
        buscarDados()
      } else {
        alert('Erro ao registrar pagamento')
      }
    } catch(e) { console.error(e) }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Financeiro</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Controle de cobranças e pagamentos</p>
        </div>
        <BotaoAcao variante="primario" icone={<Plus className="w-4 h-4" />} onClick={abrirNovaCobranca}>
          Nova Cobrança
        </BotaoAcao>
      </div>

      {/* Cartões de métricas */}
      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <CartaoMetrica
            titulo="Receita do Mês"
            valor={formatarMoeda(resumo.receita_total || 0)}
            icone={<DollarSign className="w-6 h-6" />}
            corIcone="text-green-600 dark:text-green-400"
          />
          <CartaoMetrica
            titulo="Ticket Médio"
            valor={formatarMoeda(resumo.ticket_medio || 0)}
            icone={<TrendingUp className="w-6 h-6" />}
            corIcone="text-blue-600 dark:text-blue-400"
          />
          <CartaoMetrica
            titulo="A Receber"
            valor={resumo.cobrancas_pendentes || 0}
            icone={<Clock className="w-6 h-6" />}
            corIcone="text-amber-600 dark:text-amber-400"
          />
          <CartaoMetrica
            titulo="Vencidas"
            valor={resumo.cobrancas_vencidas || 0}
            icone={<AlertCircle className="w-6 h-6" />}
            corIcone="text-red-600 dark:text-red-400"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setAbaAtiva('resumo')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            abaDativa === 'resumo'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'
          }`}
        >
          Resumo
        </button>
        <button
          onClick={() => setAbaAtiva('cobrancas')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            abaDativa === 'cobrancas'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'
          }`}
        >
          Cobranças
        </button>
      </div>

      {/* Conteúdo das tabs */}
      {abaDativa === 'resumo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receita por forma de pagamento */}
          {resumo?.receita_por_forma && (
            <div className="cartao">
              <h2 className="titulo-secao mb-5">Receita por Forma de Pagamento</h2>
              <div className="space-y-3">
                {Object.entries(resumo.receita_por_forma as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .map(([forma, valor]) => {
                    const percentual = resumo.receita_total > 0
                      ? (valor / resumo.receita_total) * 100
                      : 0
                    return (
                      <div key={forma}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-slate-300">
                            {rotulos_forma[forma as FormaPagamento] || forma}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-slate-100">
                            {formatarMoeda(valor)} ({percentual.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full">
                          <div
                            className="h-2 bg-blue-50 dark:bg-blue-900/400 rounded-full transition-all"
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Evolução de receita */}
          {evolucao.length > 0 && (
            <div className="cartao">
              <h2 className="titulo-secao mb-5">Evolução de Receita (6 meses)</h2>
              <div className="space-y-3">
                {evolucao.map(({ mes, receita }) => {
                  const maiorReceita = Math.max(...evolucao.map((e) => e.receita))
                  const percentual = maiorReceita > 0 ? (receita / maiorReceita) * 100 : 0
                  const [ano, mesNum] = mes.split('-')
                  const nomeMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

                  return (
                    <div key={mes}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-slate-300">
                          {nomeMeses[parseInt(mesNum) - 1]} {ano}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                          {formatarMoeda(receita)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full">
                        <div
                          className="h-2 bg-green-50 dark:bg-green-900/400 rounded-full transition-all"
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {abaDativa === 'cobrancas' && (
        <div className="space-y-4">
          {/* Filtro de status */}
          <div className="flex gap-2 flex-wrap">
            {(['', 'pendente', 'pago', 'vencido', 'cancelado'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  filtroStatus === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-900/50'
                }`}
              >
                {s === '' ? 'Todas' : rotulos_status[s]}
              </button>
            ))}
          </div>

          {/* Tabela de cobranças */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="tabela-padrao">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      Carregando...
                    </td>
                  </tr>
                ) : cobrancas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      Nenhuma cobrança encontrada
                    </td>
                  </tr>
                ) : (
                  cobrancas.map((cobranca) => (
                    <tr key={cobranca.id}>
                      <td>
                        <span className="font-medium">
                          {(cobranca.paciente as any)?.nome || '-'}
                        </span>
                      </td>
                      <td>{cobranca.descricao}</td>
                      <td>
                        <span className="font-semibold">
                          {formatarMoeda(cobranca.valor_final)}
                        </span>
                        {cobranca.valor_desconto > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Desconto: {formatarMoeda(cobranca.valor_desconto)}
                          </p>
                        )}
                      </td>
                      <td>
                        {cobranca.vencimento
                          ? formatarData(cobranca.vencimento)
                          : '-'}
                      </td>
                      <td>
                        <span className={`badge ${cores_status[cobranca.status]}`}>
                          {rotulos_status[cobranca.status]}
                        </span>
                      </td>
                      <td>
                        {cobranca.status === 'pendente' && (
                          <button onClick={() => abrirModalPagamento(cobranca)} className="text-blue-600 dark:text-blue-400 text-sm hover:text-blue-800 dark:text-blue-300 font-medium">
                            Registrar pagamento
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nova Cobrança */}
      {modalNovaCobranca && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal w-full max-w-md overflow-hidden animate-fade-in transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Nova Cobrança</h2>
              <button
                onClick={() => setModalNovaCobranca(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCriarCobranca} className="p-6 space-y-4">
              <div>
                <label className="rotulo-campo">Paciente *</label>
                <select
                  value={formCobranca.paciente_id}
                  onChange={(e) => setFormCobranca({ ...formCobranca, paciente_id: e.target.value })}
                  className="campo-input"
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {pacientesOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="rotulo-campo">Descrição do Serviço *</label>
                <input
                  type="text"
                  required
                  value={formCobranca.descricao}
                  onChange={(e) => setFormCobranca({ ...formCobranca, descricao: e.target.value })}
                  placeholder="Ex: Consulta Odontológica"
                  className="campo-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="rotulo-campo">Valor Final (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCobranca.valor}
                    onChange={(e) => setFormCobranca({ ...formCobranca, valor: e.target.value })}
                    className="campo-input"
                  />
                </div>
                <div>
                  <label className="rotulo-campo">Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCobranca.valor_desconto}
                    onChange={(e) => setFormCobranca({ ...formCobranca, valor_desconto: e.target.value })}
                    className="campo-input"
                  />
                </div>
              </div>
              <div>
                <label className="rotulo-campo">Data de Vencimento</label>
                <input
                  type="date"
                  value={formCobranca.vencimento}
                  onChange={(e) => setFormCobranca({ ...formCobranca, vencimento: e.target.value })}
                  className="campo-input"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <BotaoAcao variante="secundario" onClick={() => setModalNovaCobranca(false)} type="button">
                  Cancelar
                </BotaoAcao>
                <BotaoAcao variante="primario" type="submit">
                  Criar Cobrança
                </BotaoAcao>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Pagamento */}
      {modalPagamento && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal w-full max-w-md overflow-hidden animate-fade-in transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Registrar Pagamento</h2>
              <button
                onClick={() => setModalPagamento(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRegistrarPagamento} className="p-6 space-y-4">
              <div>
                <label className="rotulo-campo">Valor Recebido (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formPagamento.valor}
                  onChange={(e) => setFormPagamento({ ...formPagamento, valor: e.target.value })}
                  className="campo-input"
                />
              </div>
              <div>
                <label className="rotulo-campo">Forma de Pagamento *</label>
                <select
                  value={formPagamento.forma_pagamento}
                  onChange={(e) => setFormPagamento({ ...formPagamento, forma_pagamento: e.target.value as FormaPagamento })}
                  className="campo-input"
                  required
                >
                  {Object.entries(rotulos_forma).map(([chave, rotulo]) => (
                    <option key={chave} value={chave}>{rotulo}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="rotulo-campo">Parcelas *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formPagamento.parcelas}
                    onChange={(e) => setFormPagamento({ ...formPagamento, parcelas: e.target.value })}
                    className="campo-input"
                  />
                </div>
                <div>
                  <label className="rotulo-campo">Data do Pgto *</label>
                  <input
                    type="date"
                    required
                    value={formPagamento.data_pagamento}
                    onChange={(e) => setFormPagamento({ ...formPagamento, data_pagamento: e.target.value })}
                    className="campo-input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <BotaoAcao variante="secundario" onClick={() => setModalPagamento(null)} type="button">
                  Cancelar
                </BotaoAcao>
                <BotaoAcao variante="primario" type="submit">
                  Confirmar Pagamento
                </BotaoAcao>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

