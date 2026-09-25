'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Lock, Unlock, CheckCircle, Clock, Ban } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import MonthNav from '@/components/MonthNav'
import { Member, Membership, canManage, getMembership } from '@/lib/org'
import { monthLabel, monthStart, useMonth } from '@/lib/period'

interface Period {
  id: string
  status: 'open' | 'closed'
  closed_at: string | null
}

interface TaskRow {
  id: string
  title: string
  status: 'pending' | 'completed' | 'cancelled'
  due_date: string | null
  assigned_to: string | null
  process_id: string | null
  processes: { name: string; color: string; steps: { count: number }[] } | null
  step_progress: { completed: boolean }[]
}

const STATUS_ORDER = { pending: 0, completed: 1, cancelled: 2 }

export default function MonthTasksPage() {
  const [month, setMonth] = useMonth()
  const [me, setMe] = useState<Membership | null>(null)
  const [period, setPeriod] = useState<Period | null>(null)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'mine'>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!month) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const m = await getMembership()
    setMe(m)
    if (!m) return setLoading(false)

    const { data: p, error: periodError } = await supabase.rpc('ensure_period', {
      p_org: m.orgId,
      p_period: monthStart(month),
    })
    if (periodError) {
      setError(periodError.message)
      return setLoading(false)
    }
    setPeriod(p)

    const [{ data: t, error: tasksError }, { data: mem }] = await Promise.all([
      supabase
        .from('task_assignments')
        .select('id, title, status, due_date, assigned_to, process_id, processes(name, color, steps(count)), step_progress(completed)')
        .eq('period_id', p.id),
      supabase.rpc('org_members', { p_org: m.orgId }),
    ])
    if (tasksError) setError(tasksError.message)

    const rows = ((t as unknown as TaskRow[]) || []).sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.due_date || '9999').localeCompare(b.due_date || '9999') ||
        a.title.localeCompare(b.title)
    )
    setTasks(rows)
    setMembers((mem as Member[]) || [])
    setLoading(false)
  }, [month])

  useEffect(() => {
    load()
  }, [load])

  const updateTask = async (id: string, fields: Record<string, string | null>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)))
    const { error: updateError } = await createClient().from('task_assignments').update(fields).eq('id', id)
    if (updateError) {
      setError(updateError.message)
      load()
    }
  }

  const closeMonth = async () => {
    if (!period) return
    if (!confirm(`¿Cerrar ${monthLabel(month)}? Después ya no se podrán modificar las tareas de este mes.`)) return
    setBusy(true)
    const { error: closeError } = await createClient().rpc('close_period', { p_period_id: period.id })
    setBusy(false)
    if (closeError) return setError(closeError.message)
    load()
  }

  const reopenMonth = async () => {
    if (!period || !confirm(`¿Reabrir ${monthLabel(month)}?`)) return
    setBusy(true)
    const { error: reopenError } = await createClient().rpc('reopen_period', { p_period_id: period.id })
    setBusy(false)
    if (reopenError) return setError(reopenError.message)
    load()
  }

  const manage = canManage(me?.role)
  const isOpen = period?.status === 'open'
  const active = tasks.filter((t) => t.status !== 'cancelled')
  const done = active.filter((t) => t.status === 'completed').length
  const pending = active.length - done
  const memberName = (id: string | null) => members.find((m) => m.user_id === id)?.name || 'Sin asignar'

  const visible = tasks.filter((t) => {
    if (filter === 'pending') return t.status === 'pending'
    if (filter === 'completed') return t.status === 'completed'
    if (filter === 'mine') return t.assigned_to === me?.userId
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Mes de trabajo</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Tareas generadas por tus procesos y tareas puntuales del mes</p>
        </div>
        {month && <MonthNav month={month} onChange={setMonth} />}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Month status bar */}
      {period && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {isOpen ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
                <Unlock className="w-4 h-4" /> Mes abierto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-full">
                <Lock className="w-4 h-4" /> Mes cerrado
              </span>
            )}
            <span className="text-sm text-slate-600 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-white">{done}</strong> de {active.length} completadas
              {pending > 0 && <> · <strong className="text-orange-600">{pending}</strong> pendientes</>}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {manage && isOpen && (
              <Link
                href={`/dashboard/tasks/new?m=${month}`}
                className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Plus className="w-4 h-4" /> Tarea del mes
              </Link>
            )}
            {manage && isOpen && (
              <button
                onClick={closeMonth}
                disabled={busy || pending > 0}
                title={pending > 0 ? `Faltan ${pending} tarea(s) por completar` : undefined}
                className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-ink disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Lock className="w-4 h-4" /> Cerrar mes
              </button>
            )}
            {me?.role === 'admin' && !isOpen && (
              <button
                onClick={reopenMonth}
                disabled={busy}
                className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" /> Reabrir mes
              </button>
            )}
          </div>
        </div>
      )}
      {manage && isOpen && pending > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3">
          Para cerrar el mes, todas las tareas deben estar completadas (o su proceso inhabilitado).
        </p>
      )}

      {/* Filters */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {([
          ['all', 'Todas'],
          ['pending', 'Pendientes'],
          ['completed', 'Completadas'],
          ['mine', 'Mis tareas'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap transition-colors ${
              filter === value
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">Cargando...</div>
      ) : visible.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">No hay tareas en este mes</p>
          <p className="text-sm text-slate-500">
            Las tareas se crean solas a partir de tus <Link href="/dashboard/processes" className="text-brand font-medium">procesos</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((task) => {
            const total = task.processes?.steps[0]?.count ?? 0
            const completedSteps = task.step_progress.filter((s) => s.completed).length
            const progress = task.status === 'completed' ? 100 : total ? Math.round((completedSteps / total) * 100) : 0
            const editable = manage && isOpen && task.status !== 'cancelled'

            return (
              <div
                key={task.id}
                className={`bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 ${
                  task.status === 'cancelled' ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <Link href={`/dashboard/tasks/${task.id}`} className="flex items-start gap-3 min-w-0 group">
                    <span
                      className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: task.processes?.color || '#94a3b8' }}
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand">{task.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {task.process_id ? 'Proceso fijo' : 'Tarea puntual'}
                        {total > 0 && ` · ${completedSteps}/${total} pasos`}
                      </p>
                    </div>
                  </Link>
                  <StatusBadge status={task.status} />
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-brand h-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {editable ? (
                      <>
                        <select
                          value={task.assigned_to || ''}
                          onChange={(e) => updateTask(task.id, { assigned_to: e.target.value || null })}
                          className="text-sm py-1"
                        >
                          <option value="">Sin asignar</option>
                          {members.map((m) => (
                            <option key={m.user_id} value={m.user_id}>{m.name}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={task.due_date || ''}
                          onChange={(e) => updateTask(task.id, { due_date: e.target.value || null })}
                          className="text-sm py-1"
                        />
                      </>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">
                        {memberName(task.assigned_to)}
                        {task.due_date && ` · vence ${task.due_date.split('-').reverse().join('/')}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: TaskRow['status'] }) {
  if (status === 'completed')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
        <CheckCircle className="w-3.5 h-3.5" /> Completada
      </span>
    )
  if (status === 'cancelled')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
        <Ban className="w-3.5 h-3.5" /> Inhabilitada
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
      <Clock className="w-3.5 h-3.5" /> Pendiente
    </span>
  )
}
