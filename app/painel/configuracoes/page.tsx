'use client'
// ============================================================
// CLINIO - Configurações Gerais
// Informações da Clínica, Horários de Funcionamento e Mensagens
// ============================================================

import { useState, useEffect } from 'react'
import { Save, Store, Clock, Bell, MapPin } from 'lucide-react'
import { BotaoAcao } from '@/componentes/ui/BotaoAcao'

export default function PaginaConfiguracoes() {
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Estados dos blocos (Divididos por seção p/ não virar bagunça)
  const [dadosBasicos, setDadosBasicos] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: ''
  })

  const [horarios, setHorarios] = useState({
    horario_abertura: '08:00',
    horario_fechamento: '18:00',
    duracao_padrao_consulta: 30
  })

  const [mensagens, setMensagens] = useState({
    mensagem_confirmacao_consulta: 'Olá, sua consulta está confirmada para amanhã!',
    mensagem_lembrete_consulta: 'Lembrete: Você tem uma consulta agendada amanhã.',
    permite_agendamento_online: false
  })

  useEffect(() => {
    buscarConfiguracoes()
  }, [])

  async function buscarConfiguracoes() {
    setCarregando(true)
    try {
      const res = await fetch('/api/configuracoes')
      const json = await res.json()
      
      if (json.dados) {
        const c = json.dados
        setDadosBasicos({
          nome: c.nome || '',
          cnpj: c.cnpj || '',
          telefone: c.telefone || '',
          email: c.email || '',
          endereco: c.endereco || ''
        })

        const conf = c.configuracoes || {}
        setHorarios({
          horario_abertura: conf.horario_abertura || '08:00',
          horario_fechamento: conf.horario_fechamento || '18:00',
          duracao_padrao_consulta: conf.duracao_padrao_consulta || 30
        })

        setMensagens({
          mensagem_confirmacao_consulta: conf.mensagem_confirmacao_consulta || '',
          mensagem_lembrete_consulta: conf.mensagem_lembrete_consulta || '',
          permite_agendamento_online: conf.permite_agendamento_online === true
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)

    try {
      const payload = {
        dadosBasicos,
        configuracoes: {
          ...horarios,
          ...mensagens
        }
      }

      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        alert('Configurações salvas com sucesso!')
      } else {
        const json = await res.json()
        alert(`Erro: ${json.erro}`)
      }
    } catch (e) {
      console.error(e)
      alert('Erro de conexão ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return <div className="text-slate-400 py-10 flex justify-center animate-pulse">Carregando configurações vitais...</div>
  }

  return (
    <form onSubmit={handleSalvar} className="space-y-6 animate-fade-in max-w-4xl">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações da Clínica</h1>
          <p className="text-slate-500 text-sm">Gerencie informações globais, horários e automações</p>
        </div>
        <BotaoAcao variante="primario" icone={<Save className="w-4 h-4" />} type="submit" disabled={salvando}>
          {salvando ? 'Salvando as nuvens...' : 'Salvar Alterações Globais'}
        </BotaoAcao>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* IDENTIDADE DA CLÍNICA */}
        <div className="md:col-span-12 cartao">
          <h2 className="titulo-secao flex items-center gap-2 mb-6 text-primaria-600">
            <Store className="w-5 h-5" /> Identidade Básica
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="rotulo-campo">Nome Fantasia da Clínica *</label>
              <input
                type="text"
                required
                value={dadosBasicos.nome}
                onChange={e => setDadosBasicos({...dadosBasicos, nome: e.target.value})}
                className="campo-input"
              />
            </div>
            <div>
              <label className="rotulo-campo">CNPJ</label>
              <input
                type="text"
                value={dadosBasicos.cnpj}
                onChange={e => setDadosBasicos({...dadosBasicos, cnpj: e.target.value})}
                className="campo-input font-mono"
              />
            </div>
            <div>
              <label className="rotulo-campo">Telefone / Recepção</label>
              <input
                type="text"
                value={dadosBasicos.telefone}
                onChange={e => setDadosBasicos({...dadosBasicos, telefone: e.target.value})}
                className="campo-input font-mono"
              />
            </div>
            <div>
              <label className="rotulo-campo">E-mail Corporativo</label>
              <input
                type="email"
                value={dadosBasicos.email}
                onChange={e => setDadosBasicos({...dadosBasicos, email: e.target.value})}
                className="campo-input"
              />
            </div>
            <div>
              <label className="rotulo-campo flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400"/> Endereço Físico</label>
              <input
                type="text"
                value={dadosBasicos.endereco}
                onChange={e => setDadosBasicos({...dadosBasicos, endereco: e.target.value})}
                className="campo-input"
              />
            </div>
          </div>
        </div>

        {/* FUNCIONAMENTO */}
        <div className="md:col-span-5 cartao">
          <h2 className="titulo-secao flex items-center gap-2 mb-6 text-emerald-600">
            <Clock className="w-5 h-5" /> Relógio & Fluxo
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="rotulo-campo text-xs">Portas Abrem às</label>
                <input
                  type="time"
                  required
                  value={horarios.horario_abertura}
                  onChange={e => setHorarios({...horarios, horario_abertura: e.target.value})}
                  className="campo-input bg-emerald-50/30 font-bold"
                />
              </div>
              <div>
                <label className="rotulo-campo text-xs">Portas Fecham às</label>
                <input
                  type="time"
                  required
                  value={horarios.horario_fechamento}
                  onChange={e => setHorarios({...horarios, horario_fechamento: e.target.value})}
                  className="campo-input text-slate-500 font-bold"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="rotulo-campo">Carga da Consulta Padrão</label>
              <select
                value={horarios.duracao_padrao_consulta}
                onChange={e => setHorarios({...horarios, duracao_padrao_consulta: Number(e.target.value)})}
                className="campo-input"
              >
                <option value="15">Toque rápido (15 min)</option>
                <option value="30">Padrão da Indústria (30 min)</option>
                <option value="45">Consulta Extendida (45 min)</option>
                <option value="60">Completa (60 min)</option>
              </select>
              <p className="text-xs text-slate-400 mt-1.5 leading-snug">O calendário global tentará fatiar o dia baseando-se por este relógio se o médico não tiver um relógio customizado nele.</p>
            </div>
          </div>
        </div>

        {/* NOTIFICAÇÕES GERAIS */}
        <div className="md:col-span-7 cartao">
           <h2 className="titulo-secao flex items-center gap-2 mb-6 text-amber-500">
            <Bell className="w-5 h-5" /> Textos & Notificações
          </h2>
          <div className="space-y-5">
            
            <label className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox" 
                checked={mensagens.permite_agendamento_online}
                onChange={e => setMensagens({...mensagens, permite_agendamento_online: e.target.checked})}
                className="w-5 h-5 rounded border-slate-300 text-primaria-600 focus:ring-primaria-500"
              />
              <div>
                <p className="text-sm font-bold text-slate-800">Liberar Portal de Agendamento Online</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Permite que um link público liste médicos disponíveis</p>
              </div>
            </label>

            <div>
              <label className="rotulo-campo text-[11px] uppercase tracking-wider text-slate-500">
                Template: WhatsApp Confirmação Agendamento
              </label>
              <textarea
                value={mensagens.mensagem_confirmacao_consulta}
                onChange={e => setMensagens({...mensagens, mensagem_confirmacao_consulta: e.target.value})}
                className="campo-input min-h-[80px] resize-y text-xs text-slate-600 font-mono"
              />
            </div>
            
            <div>
              <label className="rotulo-campo text-[11px] uppercase tracking-wider text-slate-500">
                Template: WhatsApp Lembrete no Dia da Consulta
              </label>
              <textarea
                value={mensagens.mensagem_lembrete_consulta}
                onChange={e => setMensagens({...mensagens, mensagem_lembrete_consulta: e.target.value})}
                className="campo-input min-h-[80px] resize-y text-xs text-slate-600 font-mono"
              />
            </div>

          </div>
        </div>

      </div>
    </form>
  )
}
