'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Member, getMembership } from '@/lib/org'
import { monthLabel, monthStart, useMonth } from '@/lib/period'

export default function NewMonthTaskPage() {
  const [month] = useMonth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    getMembership().then(async (me) => {
      if (!me) return
      const { data } = await createClient().rpc('org_members', { p_org: me.orgId })
      setMembers((data as Member[]) || [])
    })
  }, [])

  if (!month) return null

  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const minDate = monthStart(month)
  const maxDate = `${month}-${String(lastDay).padStart(2, '0')}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const me = await getMembership()
      if (!me) throw new Error('No se encontró tu organización')

      const { data: period, error: periodError } = await supabase.rpc('ensure_period', {
        p_org: me.orgId,
        p_period: monthStart(month),
      })
      if (periodError) throw periodError
      if (period.status === 'closed') throw new Error('Este mes ya está cerrado')

      const { error: taskError } = await supabase.from('task_assignments').insert({
        org_id: me.orgId,
        period_id: period.id,
        assigned_to: assignedTo || null,
        assigned_by: me.userId,
        title,
        description,
        due_date: dueDate || null,
      })
      if (taskError) throw taskError

      router.push(`/dashboard/tasks?m=${month}`)
    } catch (err: any) {
      setError(err.message || 'Error al crear la tarea')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Nueva tarea de {monthLabel(month)}</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Una tarea puntual solo para este mes. Para algo que se repite, crea un proceso.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Enviar reporte de gastos al cliente"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Asignar a</label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full">
                <option value="">Sin asignar</option>
                {members.map((mem) => (
                  <option key={mem.user_id} value={mem.user_id}>{mem.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Vence</label>
              <input
                type="date"
                value={dueDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="flex-1 bg-brand text-white font-medium py-3 rounded-lg hover:bg-brand-ink disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creando...' : 'Crear tarea'}
          </button>
          <Link
            href={`/dashboard/tasks?m=${month}`}
            className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
