'use client'
// ============================================================
// CLINIO - Página de Campanhas de Marketing
// Criação e gerenciamento de campanhas de comunicação
// ============================================================

import { useState, useEffect } from 'react'
import { Plus, Megaphone, Send, Users, Eye, Play, Pause } from 'lucide-react'
import { BotaoAcao } from '@/componentes/ui/BotaoAcao'
import { formatarData, formatarDataHora } from '@/lib/formatadores'

import type { Campanha, StatusCampanha, TipoCampanha, CanalComunicacao } from '@/tipos'

const coresStatus: Record<StatusCampanha, string> = {
  rascunho: 'bg-gray-100 text-gray-600',
  agendada: 'bg-blue-100 text-blue-700',
  enviando: 'bg-yellow-100 text-yellow-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
  pausada: 'bg-orange-100 text-orange-700',
}

const rotulosStatus: Record<StatusCampanha, string> = {
  rascunho: 'Rascunho',
  agendada: 'Agendada',
  enviando: 'Enviando',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  pausada: 'Pausada',
}

const templates: Record<string, string> = {
  lembrete_consulta:
    'Olá {nome}! 👋 Lembramos que você tem uma consulta agendada para *{data}* às *{hora}* com o Dr(a). {medico}. Confirme sua presença respondendo SIM. Em caso de dúvidas, entre em contato conosco. {clinica}',
  confirmacao_consulta:
    'Ótimo! ✅ Sua consulta do dia *{data}* às *{hora}* está confirmada. Aguardamos você na clínica. {clinica}',
  pos_consulta:
    'Olá {nome}! Esperamos que esteja se sentindo bem após sua consulta. Caso tenha alguma dúvida ou precise de algo, estamos à disposição. Obrigado por confiar em nossa clínica! 💙',
  reativacao_paciente:
    'Olá {nome}! Sentimos sua falta por aqui 😊 Já faz um tempo desde sua última visita e gostaríamos de convidá-lo(a) para um check-up. Entre em contato e agende sua consulta com facilidade! {clinica}',
  aniversario:
    'Feliz Aniversário, {nome}! 🎂🎉 Toda a equipe deseja a você um dia muito especial cheio de saúde e alegria. Como presente, temos uma surpresa especial esperando por você na sua próxima visita! {clinica}',
  falta_consulta:
    'Olá {nome}, notamos que você não compareceu à consulta agendada para hoje. Isso acontece! Quando quiser reagendar, estamos aqui para ajudar. {clinica}',
  boas_vindas:
    'Bem-vindo(a), {nome}! 🌟 Ficamos muito felizes em tê-lo(a) como paciente. Nossa equipe está comprometida em oferecer o melhor cuidado para você. Qualquer dúvida, estamos sempre disponíveis! {clinica}',
}


export default function PaginaCampanhas() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalNovaCampanha, setModalNovaCampanha] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<StatusCampanha | ''>('')

  // Estado do formulário de nova campanha
  const [formCampanha, setFormCampanha] = useState({
    nome: '',
    tipo: 'marketing' as TipoCampanha,
    canal: 'whatsapp' as CanalComunicacao,
    mensagem_template: '',
    agendada_para: '',
  })

  useEffect(() => {
    buscarCampanhas()
  }, [filtroStatus])

  async function buscarCampanhas() {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      if (filtroStatus) params.set('status', filtroStatus)

      const resposta = await fetch(`/api/campanhas?${params}`)
      const dados = await resposta.json()
      setCampanhas(dados.dados || [])
    } catch (erro) {
      console.error('Erro ao buscar campanhas:', erro)
    } finally {
      setCarregando(false)
    }
  }

  async function criarCampanha() {
    if (!formCampanha.nome || !formCampanha.mensagem_template) {
      alert('Nome e mensagem são obrigatórios')
      return
    }

    try {
      const resposta = await fetch('/api/campanhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCampanha),
      })

      if (resposta.ok) {
        setModalNovaCampanha(false)
        setFormCampanha({ nome: '', tipo: 'marketing', canal: 'whatsapp', mensagem_template: '', agendada_para: '' })
        buscarCampanhas()
      }
    } catch (erro) {
      console.error('Erro ao criar campanha:', erro)
    }
  }


  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
          <p className="text-gray-500 text-sm">Marketing e comunicação com pacientes</p>
        </div>
        <BotaoAcao
          variante="primario"
          icone={<Plus className="w-4 h-4" />}
          onClick={() => setModalNovaCampanha(true)}
        >
          Nova Campanha
        </BotaoAcao>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'rascunho', 'agendada', 'concluida'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              filtroStatus === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'Todas' : rotulosStatus[s]}
          </button>
        ))}
      </div>

      {/* Lista de campanhas */}
      {carregando ? (
        <div className="text-center py-16 text-gray-400">Carregando campanhas...</div>
      ) : campanhas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-500 font-medium mb-2">Nenhuma campanha criada</h3>
          <p className="text-sm text-gray-400 mb-6">
            Crie campanhas para se comunicar com seus pacientes
          </p>
          <BotaoAcao
            variante="primario"
            icone={<Plus className="w-4 h-4" />}
            onClick={() => setModalNovaCampanha(true)}
          >
            Criar primeira campanha
          </BotaoAcao>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {campanhas.map((campanha) => (
            <div key={campanha.id} className="cartao hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{campanha.nome}</h3>
                  {campanha.descricao && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{campanha.descricao}</p>
                  )}
                </div>
                <span className={`badge ${coresStatus[campanha.status]}`}>
                  {rotulosStatus[campanha.status]}
                </span>
              </div>

              {/* Canal e tipo */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  campanha.canal === 'whatsapp' ? 'bg-green-100 text-green-700' :
                  campanha.canal === 'email' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {campanha.canal === 'whatsapp' ? '📱 WhatsApp' :
                   campanha.canal === 'email' ? '📧 Email' : '💬 SMS'}
                </span>
                <span className="text-xs text-gray-500 capitalize">{campanha.tipo}</span>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-800">{campanha.total_destinatarios}</p>
                  <p className="text-xs text-gray-500">Destinatários</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{campanha.total_enviadas}</p>
                  <p className="text-xs text-gray-500">Enviadas</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{campanha.total_lidas}</p>
                  <p className="text-xs text-gray-500">Lidas</p>
                </div>
              </div>

              {/* Taxa de abertura */}
              {campanha.total_enviadas > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Taxa de abertura</span>
                    <span className="font-medium text-gray-700">
                      {Math.round((campanha.total_lidas / campanha.total_enviadas) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div
                      className="h-1.5 bg-green-500 rounded-full"
                      style={{
                        width: `${Math.round((campanha.total_lidas / campanha.total_enviadas) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Data de agendamento */}
              {campanha.agendada_para && (
                <p className="text-xs text-gray-400 mb-3">
                  Agendada para: {formatarDataHora(campanha.agendada_para)}
                </p>
              )}

              {/* Ações */}
              <div className="flex gap-2">
                <button className="flex-1 text-xs flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                  Ver detalhes
                </button>
                {campanha.status === 'rascunho' && (
                  <button className="flex-1 text-xs flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    <Send className="w-3.5 h-3.5" />
                    Enviar agora
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nova Campanha */}
      {modalNovaCampanha && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Nova Campanha</h2>
              <button
                onClick={() => setModalNovaCampanha(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Nome */}
              <div>
                <label className="rotulo-campo">Nome da Campanha *</label>
                <input
                  type="text"
                  value={formCampanha.nome}
                  onChange={(e) => setFormCampanha({ ...formCampanha, nome: e.target.value })}
                  placeholder="Ex: Promoção de Julho"
                  className="campo-input"
                />
              </div>

              {/* Canal e tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="rotulo-campo">Canal de Envio</label>
                  <select
                    value={formCampanha.canal}
                    onChange={(e) => setFormCampanha({ ...formCampanha, canal: e.target.value as CanalComunicacao })}
                    className="campo-input"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="rotulo-campo">Tipo de Campanha</label>
                  <select
                    value={formCampanha.tipo}
                    onChange={(e) => setFormCampanha({ ...formCampanha, tipo: e.target.value as TipoCampanha })}
                    className="campo-input"
                  >
                    <option value="marketing">Marketing</option>
                    <option value="reativacao">Reativação</option>
                    <option value="promocional">Promocional</option>
                    <option value="informativa">Informativa</option>
                    <option value="aniversario">Aniversário</option>
                  </select>
                </div>
              </div>

              {/* Template de mensagem */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="rotulo-campo">Mensagem *</label>
                  <button
                    onClick={() => {
                      const template = templates[`${formCampanha.tipo}`] || templates['marketing']
                      setFormCampanha({ ...formCampanha, mensagem_template: template })
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Usar template padrão
                  </button>
                </div>
                <textarea
                  value={formCampanha.mensagem_template}
                  onChange={(e) => setFormCampanha({ ...formCampanha, mensagem_template: e.target.value })}
                  placeholder="Use {nome} para o nome do paciente, {data} para a data..."
                  rows={5}
                  className="campo-input resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variáveis disponíveis: {'{nome}'}, {'{data}'}, {'{hora}'}, {'{clinica}'}
                </p>
              </div>

              {/* Agendamento */}
              <div>
                <label className="rotulo-campo">Agendar para (opcional)</label>
                <input
                  type="datetime-local"
                  value={formCampanha.agendada_para}
                  onChange={(e) => setFormCampanha({ ...formCampanha, agendada_para: e.target.value })}
                  className="campo-input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Deixe em branco para salvar como rascunho
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <BotaoAcao
                variante="secundario"
                onClick={() => setModalNovaCampanha(false)}
              >
                Cancelar
              </BotaoAcao>
              <BotaoAcao
                variante="primario"
                onClick={criarCampanha}
              >
                Criar Campanha
              </BotaoAcao>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
