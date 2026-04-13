'use client'
// ============================================================
// CLINIO - Gestão de Pacientes
// Listagem, Busca e Cadastro dos Pacientes da Clínica
// ============================================================

import { useState, useEffect } from 'react'
import { Search, Plus, UserCircle, Phone, Calendar, Mail, Edit, Trash2, CheckCircle, Ban, Activity } from 'lucide-react'
import { BotaoAcao } from '@/componentes/ui/BotaoAcao'
import type { Paciente } from '@/tipos'

export default function PaginaPacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  
  const [modalAberto, setModalAberto] = useState(false)
  const [pacienteEmEdicao, setPacienteEmEdicao] = useState<Partial<Paciente> | null>(null)

  useEffect(() => {
    // Sistema de Debounce rudimentar
    const timeoutId = setTimeout(() => {
      buscarDados()
    }, 400)
    return () => clearTimeout(timeoutId)
  }, [busca])

  async function buscarDados() {
    setCarregando(true)
    try {
      const qs = busca ? `?busca=${encodeURIComponent(busca)}` : ''
      const res = await fetch(`/api/pacientes${qs}`)
      const { dados } = await res.json()
      setPacientes(dados || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  function abrirModal(paciente?: Paciente) {
    if (paciente) {
      setPacienteEmEdicao(paciente)
    } else {
      setPacienteEmEdicao({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        sexo: 'nao_informado',
        data_nascimento: '',
        convenio: '',
        status: 'ativo'
      })
    }
    setModalAberto(true)
  }

  async function salvarPaciente(e: React.FormEvent) {
    e.preventDefault()
    if (!pacienteEmEdicao) return

    const url = pacienteEmEdicao.id 
      ? `/api/pacientes?id=${pacienteEmEdicao.id}` 
      : `/api/pacientes`
    
    const method = pacienteEmEdicao.id ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pacienteEmEdicao)
      })

      const json = await res.json()

      if (res.ok) {
        setModalAberto(false)
        buscarDados() // Atualiza tabela
      } else {
        alert(json.erro || 'Erro ao salvar paciente.')
      }
    } catch (e) {
      console.error(e)
      alert('Erro de conexão.')
    }
  }

  async function inativarExcluir(p: Paciente) {
    const opcao = confirm(`Deseja EXCLUIR DEFINITIVAMENTE o paciente ${p.nome}? (Isso só funciona se ele não tiver histórico). Para apenas inativar, cancele e altere o Status em Editar.`)
    if (opcao) {
      try {
        const res = await fetch(`/api/pacientes?id=${p.id}`, { method: 'DELETE' })
        const json = await res.json()
        if (res.ok) {
          buscarDados()
        } else {
          alert(json.erro)
        }
      } catch(e) {
        alert('Erro ao excluir')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Base de Pacientes</h1>
          <p className="text-slate-500 text-sm">Gerencie o portfólio de clientes e históricos</p>
        </div>
        <BotaoAcao variante="primario" icone={<Plus className="w-4 h-4" />} onClick={() => abrirModal()}>
          Novo Paciente
        </BotaoAcao>
      </div>

      {/* Caixa de Busca e Tabela Principal */}
      <div className="cartao p-0 overflow-hidden">
        {/* Barra superior de ferramentas (Toolbar) */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisar por Nome, CPF ou Telefone..." 
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="campo-input pl-10"
            />
          </div>
          <span className="text-xs text-slate-400 hidden sm:block">
            Mostrando os {pacientes.length} mais recentes
          </span>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="tabela-padrao w-full truncate">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Contatos</th>
                <th>Convênio / Nasc.</th>
                <th>Presença</th>
                <th>Status</th>
                <th className="text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando && pacientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 animate-pulse text-slate-400 font-medium">Buscando base de clientes...</td>
                </tr>
              ) : pacientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <UserCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Nenhum paciente localizado</p>
                    {busca && <p className="text-sm text-slate-400">Tente buscar por outro termo.</p>}
                  </td>
                </tr>
              ) : (
                pacientes.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-primaria-700 bg-primaria-100 font-bold text-sm">
                          {p.nome.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 truncate max-w-[200px]" title={p.nome}>{p.nome}</p>
                          {p.cpf && <p className="text-xs text-slate-500 font-mono tracking-wide">CPF: {p.cpf}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-slate-600 space-y-1">
                        {p.telefone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {p.telefone}</div>}
                        {p.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {p.email}</div>}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-slate-600 space-y-1">
                         {p.convenio ? (
                           <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-semibold">{p.convenio}</span>
                         ) : (
                           <span className="text-xs text-slate-400">Particular</span>
                         )}
                         {p.data_nascimento && <div className="flex items-center gap-1.5 text-xs mt-1"><Calendar className="w-3 h-3 text-slate-400" /> {new Date(p.data_nascimento).toLocaleDateString('pt-BR')}</div>}
                      </div>
                    </td>
                    <td>
                       <div className="flex items-center gap-2">
                         <div className="p-1.5 rounded bg-emerald-50 text-emerald-600">
                           <Activity className="w-4 h-4" />
                         </div>
                         <div>
                           <p className="text-xs font-semibold text-slate-800">{p.total_consultas || 0} visitas</p>
                           <p className="text-[10px] text-slate-500">Última: {p.ultimo_atendimento ? new Date(p.ultimo_atendimento).toLocaleDateString() : 'Nenhuma'}</p>
                         </div>
                       </div>
                    </td>
                    <td>
                      {p.status === 'ativo' ? (
                        <span className="badge bg-green-100 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Ativo</span>
                      ) : p.status === 'inativo' ? (
                        <span className="badge bg-slate-100 text-slate-600 border-slate-200">Inativo</span>
                      ) : (
                        <span className="badge bg-red-100 text-red-700 border-red-200"><Ban className="w-3 h-3 mr-1" /> Bloqueado</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button onClick={() => abrirModal(p)} className="p-2 text-slate-400 hover:text-primaria-600 transition-colors" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => inativarExcluir(p)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Sidebar Formulario Paciente */}
      {modalAberto && pacienteEmEdicao && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center sm:justify-end z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl sm:rounded-none sm:rounded-l-2xl shadow-modal w-full max-w-lg h-auto sm:h-full overflow-hidden animate-fade-in flex flex-col transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-primaria-500" />
                {pacienteEmEdicao.id ? 'Editar Ficha do Paciente' : 'Novo Paciente'}
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={salvarPaciente} className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="rotulo-campo">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={pacienteEmEdicao.nome}
                    onChange={(e) => setPacienteEmEdicao({ ...pacienteEmEdicao, nome: e.target.value })}
                    className="campo-input"
                    placeholder="João Carlos Silva"
                  />
                </div>
                <div>
                  <label className="rotulo-campo">CPF</label>
                  <input
                    type="text"
                    value={pacienteEmEdicao.cpf || ''}
                    onChange={(e) => setPacienteEmEdicao({ ...pacienteEmEdicao, cpf: e.target.value })}
                    className="campo-input"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="rotulo-campo">Data Nasc.</label>
                  <input
                    type="date"
                    value={pacienteEmEdicao.data_nascimento ? pacienteEmEdicao.data_nascimento.split('T')[0] : ''}
                    onChange={(e) => setPacienteEmEdicao({ ...pacienteEmEdicao, data_nascimento: e.target.value })}
                    className="campo-input text-slate-600"
                  />
                </div>
                <div>
                  <label className="rotulo-campo">WhatsApp / Cel</label>
                  <input
                    type="text"
                    value={pacienteEmEdicao.telefone || ''}
                    onChange={(e) => setPacienteEmEdicao({ ...pacienteEmEdicao, telefone: e.target.value })}
                    className="campo-input"
                    placeholder="(00) 90000-0000"
                  />
                </div>
                <div>
                  <label className="rotulo-campo">E-mail</label>
                  <input
                    type="email"
                    value={pacienteEmEdicao.email || ''}
                    onChange={(e) => setPacienteEmEdicao({ ...pacienteEmEdicao, email: e.target.value })}
                    className="campo-input"
                  />
                </div>
                
                <div className="col-span-2 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Informações Clínicas</h3>
                </div>

                <div>
                  <label className="rotulo-campo">Convênio Associado</label>
                  <input
                    type="text"
                    value={pacienteEmEdicao.convenio || ''}
                    onChange={(e) => setPacienteEmEdicao({ ...pacienteEmEdicao, convenio: e.target.value })}
                    className="campo-input bg-blue-50/30"
                    placeholder="Ex: Unimed, Bradesco..."
                  />
                </div>
                <div>
                  <label className="rotulo-campo">Status da Ficha</label>
                  <select
                    value={pacienteEmEdicao.status}
                    onChange={(e) => setPacienteEmEdicao({ ...pacienteEmEdicao, status: e.target.value as any })}
                    className="campo-input font-medium"
                  >
                    <option value="ativo" className="text-green-600">🟢 Ativo (Apto)</option>
                    <option value="inativo" className="text-slate-600">⚪ Inativo (Afastado)</option>
                    <option value="bloqueado" className="text-red-600">🔴 Bloqueado (Faltas/Inadimp.)</option>
                  </select>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6 pb-6">
                <BotaoAcao variante="secundario" onClick={() => setModalAberto(false)} type="button">
                  Cancelar
                </BotaoAcao>
                <BotaoAcao variante="primario" type="submit">
                  {pacienteEmEdicao.id ? 'Atualizar Ficha' : 'Cadastrar Paciente'}
                </BotaoAcao>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
