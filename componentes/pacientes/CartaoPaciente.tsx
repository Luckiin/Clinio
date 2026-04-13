'use client'
// ============================================================
// CLINIO - Cartão de Paciente para lista e CRM
// ============================================================

import Link from 'next/link'
import { User, Phone, Mail, Calendar, Tag } from 'lucide-react'
import { formatarData, obterIniciais, calcularIdade } from '@/lib/formatadores'
import type { Paciente } from '@/tipos'

interface PropsCartaoPaciente {
  paciente: Paciente
  aoClicar?: (paciente: Paciente) => void
  exibirAcoes?: boolean
}

const coresStatus: Record<string, string> = {
  ativo: 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-400',
  inativo: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400',
  bloqueado: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-400',
}

export function CartaoPaciente({
  paciente,
  aoClicar,
  exibirAcoes = true,
}: PropsCartaoPaciente) {
  const iniciais = obterIniciais(paciente.nome)
  const idade = paciente.data_nascimento ? calcularIdade(paciente.data_nascimento) : null

  return (
    <div
      className={`
        bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-5
        hover:shadow-md transition-all duration-150
        ${aoClicar ? 'cursor-pointer' : ''}
      `}
      onClick={() => aoClicar?.(paciente)}
    >
      {/* Cabeçalho: avatar + nome + status */}
      <div className="flex items-start gap-4 mb-4">
        {paciente.foto_url ? (
          <img
            src={paciente.foto_url}
            alt={paciente.nome}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-700 dark:text-blue-400 font-semibold text-sm">{iniciais}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">{paciente.nome}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${coresStatus[paciente.status]}`}>
              {paciente.status}
            </span>
          </div>

          {idade && (
            <p className="text-sm text-gray-500 dark:text-slate-400">{idade} anos</p>
          )}
        </div>
      </div>

      {/* Informações de contato */}
      <div className="space-y-1.5 mb-4">
        {paciente.telefone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{paciente.telefone}</span>
          </div>
        )}
        {paciente.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="truncate">{paciente.email}</span>
          </div>
        )}
        {paciente.ultimo_atendimento && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Última consulta: {formatarData(paciente.ultimo_atendimento)}</span>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{paciente.total_consultas}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Consultas</p>
        </div>

        {paciente.convenio && (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate max-w-[80px]">
              {paciente.convenio}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Convênio</p>
          </div>
        )}

        {/* Tags */}
        {paciente.tags && paciente.tags.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {paciente.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: tag.cor || '#6B7280' }}
                >
                  {tag.tag}
                </span>
              ))}
              {paciente.tags.length > 2 && (
                <span className="text-xs text-gray-400">+{paciente.tags.length - 2}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Link para perfil completo */}
      {exibirAcoes && (
        <Link
          href={`/painel/pacientes/${paciente.id}`}
          onClick={(e) => e.stopPropagation()}
          className="block mt-3 text-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-300 font-medium"
        >
          Ver perfil completo →
        </Link>
      )}
    </div>
  )
}
