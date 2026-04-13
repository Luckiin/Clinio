'use client'
// ============================================================
// CLINIO - Página de Médicos
// Listagem e Cadastro de Corpo Clínico
// ============================================================

import { useState, useEffect } from 'react'
import { Plus, Search, Stethoscope, Phone, Mail, Edit, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { BotaoAcao } from '@/componentes/ui/BotaoAcao'
import type { Medico } from '@/tipos'

export default function PaginaMedicos() {
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [medicoEmEdicao, setMedicoEmEdicao] = useState<Partial<Medico> | null>(null)

  useEffect(() => {
    buscarDados()
  }, [busca])

  async function buscarDados() {
    setCarregando(true)
    try {
      const qs = busca ? `?busca=${encodeURIComponent(busca)}` : ''
      const res = await fetch(`/api/medicos${qs}`)
      const { dados } = await res.json()
      setMedicos(dados || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  function abrirModal(medico?: Medico) {
    if (medico) {
      setMedicoEmEdicao(medico)
    } else {
      setMedicoEmEdicao({
        nome: '',
        especialidade: '',
        crm: '',
        telefone: '',
        email: '',
        duracao_padrao: 30,
        cor_agenda: '#3B82F6',
        ativo: true
      })
    }
    setModalAberto(true)
  }

  async function salvarMedico(e: React.FormEvent) {
    e.preventDefault()
    if (!medicoEmEdicao) return

    const url = medicoEmEdicao.id 
      ? `/api/medicos?id=${medicoEmEdicao.id}` 
      : `/api/medicos`
    
    const method = medicoEmEdicao.id ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medicoEmEdicao)
      })

      if (res.ok) {
        setModalAberto(false)
        buscarDados()
      } else {
        alert('Erro ao salvar médico.')
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Médicos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gestão do corpo clínico e agenda padrão</p>
        </div>
        <BotaoAcao variante="primario" icone={<Plus className="w-4 h-4" />} onClick={() => abrirModal()}>
          Novo Médico
        </BotaoAcao>
      </div>

      {/* Busca e Tabela */}
      <div className="cartao p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome..." 
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="campo-input pl-10"
            />
          </div>
        </div>
        <table className="tabela-padrao">
          <thead>
            <tr>
              <th>Médico</th>
              <th>Contato</th>
              <th>Agenda</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">Carregando médicos...</td>
              </tr>
            ) : medicos.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 flex flex-col items-center">
                  <Stethoscope className="w-10 h-10 mb-3 text-slate-200" />
                  Nenhum médico encontrado.
                </td>
              </tr>
            ) : (
              medicos.map(med => (
                <tr key={med.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                        style={{ backgroundColor: med.cor_agenda || '#3b82f6' }}
                      >
                        {med.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{med.nome}</p>
                        {med.especialidade && <p className="text-xs text-slate-500 dark:text-slate-400">{med.especialidade} • CRM {med.crm}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      {med.telefone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> {med.telefone}</div>}
                      {med.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" /> {med.email}</div>}
                      {!med.telefone && !med.email && <span className="text-slate-400 text-xs">Sem contato</span>}
                    </div>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <Clock size={12} /> {med.duracao_padrao} min / consulta
                    </span>
                  </td>
                  <td>
                    {med.ativo ? (
                      <span className="badge bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Ativo</span>
                    ) : (
                      <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"><XCircle className="w-3 h-3 mr-1" /> Inativo</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button onClick={() => abrirModal(med)} className="p-2 text-slate-400 hover:text-primaria-600 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 text-slate-400 hover:text-red-600 dark:text-red-400 transition-colors"
                      onClick={async () => {
                        if(confirm('Deseja realmente desativar ou excluir este médico? Se houver consultas amarradas a ele o sistema pode bloquear a exclusão.')) {
                          await fetch(`/api/medicos?id=${med.id}`, { method: 'DELETE' })
                          buscarDados()
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Formulário Médico */}
      {modalAberto && medicoEmEdicao && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal w-full max-w-xl overflow-hidden animate-fade-in transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{medicoEmEdicao.id ? 'Editar Médico' : 'Novo Médico'}</h2>
              <button
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={salvarMedico} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="rotulo-campo">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={medicoEmEdicao.nome}
                    onChange={(e) => setMedicoEmEdicao({ ...medicoEmEdicao, nome: e.target.value })}
                    className="campo-input"
                    placeholder="Dr. João Silva"
                  />
                </div>
                <div>
                  <label className="rotulo-campo">Especialidade</label>
                  <input
                    type="text"
                    value={medicoEmEdicao.especialidade || ''}
                    onChange={(e) => setMedicoEmEdicao({ ...medicoEmEdicao, especialidade: e.target.value })}
                    className="campo-input"
                    placeholder="Cardiologista"
                  />
                </div>
                <div>
                  <label className="rotulo-campo">CRM</label>
                  <input
                    type="text"
                    value={medicoEmEdicao.crm || ''}
                    onChange={(e) => setMedicoEmEdicao({ ...medicoEmEdicao, crm: e.target.value })}
                    className="campo-input"
                    placeholder="00000-SP"
                  />
                </div>
                <div>
                  <label className="rotulo-campo">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={medicoEmEdicao.telefone || ''}
                    onChange={(e) => setMedicoEmEdicao({ ...medicoEmEdicao, telefone: e.target.value })}
                    className="campo-input"
                  />
                </div>
                <div>
                  <label className="rotulo-campo">Email Profissional</label>
                  <input
                    type="email"
                    value={medicoEmEdicao.email || ''}
                    onChange={(e) => setMedicoEmEdicao({ ...medicoEmEdicao, email: e.target.value })}
                    className="campo-input"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="rotulo-campo">Duração Padrão de Consulta (Minutos) *</label>
                  <select
                    value={medicoEmEdicao.duracao_padrao}
                    onChange={(e) => setMedicoEmEdicao({ ...medicoEmEdicao, duracao_padrao: Number(e.target.value) })}
                    className="campo-input"
                    required
                  >
                    <option value="15">15 minutos</option>
                    <option value="20">20 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="40">40 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="90">1 hora e meia</option>
                    <option value="120">2 horas</option>
                  </select>
                </div>
                <div>
                  <label className="rotulo-campo">Cor na Agenda *</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={medicoEmEdicao.cor_agenda}
                      onChange={(e) => setMedicoEmEdicao({ ...medicoEmEdicao, cor_agenda: e.target.value })}
                      className="w-10 h-10 rounded border-0 bg-transparent p-0 cursor-pointer"
                      required
                    />
                    <span className="text-sm font-mono text-slate-500 dark:text-slate-400 uppercase">{medicoEmEdicao.cor_agenda}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="ativo" 
                  checked={medicoEmEdicao.ativo}
                  onChange={(e) => setMedicoEmEdicao({ ...medicoEmEdicao, ativo: e.target.checked })}
                  className="w-4 h-4 text-primaria-600 rounded border-slate-300 focus:ring-primaria-500"
                />
                <label htmlFor="ativo" className="text-sm text-slate-700 dark:text-slate-300 font-medium">Médico Ativo no Sistema</label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                <BotaoAcao variante="secundario" onClick={() => setModalAberto(false)} type="button">
                  Cancelar
                </BotaoAcao>
                <BotaoAcao variante="primario" type="submit">
                  {medicoEmEdicao.id ? 'Salvar Alterações' : 'Cadastrar Médico'}
                </BotaoAcao>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
