'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Member, Membership, canManage, getMembership } from '@/lib/org'
import { monthLabel } from '@/lib/period'

interface Step {
  id: string
  title: string
  description: string | null
  order: number
}

interface Task {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'completed' | 'cancelled'
  due_date: string | null
  assigned_to: string | null
  process_id: string | null
  periods: { period: string; status: 'open' | 'closed' }
  processes: { name: string; steps: Step[] } | null
  step_progress: { step_id: string; completed: boolean }[]
}

export default function TaskDetailPage() {
  const taskId = useParams().id as string
  const [me, setMe] = useState<Membership | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const m = await getMembership()
    setMe(m)
    const { data, error: loadError } = await supabase
      .from('task_assignments')
      .select('id, title, description, status, due_date, assigned_to, process_id, periods(period, status), processes(name, steps(id, title, description, order)), step_progress(step_id, completed)')
      .eq('id', taskId)
      .maybeSingle()
    if (loadError) setError(loadError.message)
    setTask(data as unknown as Task)
    if (m) {
      const { data: mem } = await supabase.rpc('org_members', { p_org: m.orgId })
      setMembers((mem as Member[]) || [])
    }
    setLoading(false)
  }, [taskId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="text-center py-12">Cargando...</div>
  if (!task) return <div className="text-center py-12">No se encontró la tarea.</div>

  const monthKey = task.periods.period.slice(0, 7)
  const steps = [...(task.processes?.steps || [])].sort((a, b) => a.order - b.order)
  const doneIds = new Set(task.step_progress.filter((s) => s.completed).map((s) => s.step_id))
  const completedSteps = steps.filter((s) => doneIds.has(s.id)).length
  const progress = task.status === 'completed' ? 100 : steps.length ? Math.round((completedSteps / steps.length) * 100) : 0
  const isOpen = task.periods.status === 'open'
  const canEdit = isOpen && task.status !== 'cancelled' && (canManage(me?.role) || task.assigned_to === me?.userId)

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setSaving(true)
    setError('')
    const { error: opError } = await fn()
    if (opError) setError(opError.message)
    await load()
    setSaving(false)
  }

  const toggleStep = (stepId: string) =>
    run(() =>
      createClient().from('step_progress').upsert(
        {
          task_id: task.id,
          step_id: stepId,
          completed: !doneIds.has(stepId),
          completed_at: doneIds.has(stepId) ? null : new Date().toISOString(),
          completed_by: doneIds.has(stepId) ? null : me?.userId,
        },
        { onConflict: 'task_id,step_id' }
      )
    )

  const setStatus = (status: 'pending' | 'completed') =>
    run(() =>
      createClient()
        .from('task_assignments')
        .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
        .eq('id', task.id)
    )

  const assignee = members.find((m) => m.user_id === task.assigned_to)?.name || 'Sin asignar'

  return (
    <div className="space-y-8">
      <Link href={`/dashboard/tasks?m=${monthKey}`} className="inline-flex items-center gap-2 text-brand hover:text-brand-ink font-medium">
        <ArrowLeft className="w-4 h-4" /> Volver a {monthLabel(monthKey)}
      </Link>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{task.title}</h1>
          {!isOpen && (
            <span className="inline-flex items-center gap-1.5 text-sm bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">
              <Lock className="w-4 h-4" /> Mes cerrado
            </span>
          )}
        </div>
        {task.description && <p className="text-slate-600 dark:text-slate-400 mb-6">{task.description}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
          <Info label="Mes" value={monthLabel(monthKey)} />
          <Info label="Asignado a" value={assignee} />
          <Info label="Vence" value={task.due_date ? task.due_date.split('-').reverse().join('/') : '—'} />
          <Info
            label="Estado"
            value={task.status === 'completed' ? 'Completada' : task.status === 'cancelled' ? 'Inhabilitada' : `${progress}%`}
          />
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
          <div className="bg-gradient-to-r from-brand to-brand-ink h-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {steps.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pasos</h2>
          {steps.map((step, idx) => {
            const done = doneIds.has(step.id)
            return (
              <div
                key={step.id}
                className={`p-5 rounded-lg border transition-all ${
                  done
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleStep(step.id)}
                    disabled={!canEdit || saving}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all disabled:cursor-not-allowed ${
                      done ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-600 hover:border-brand'
                    }`}
                    aria-label={done ? 'Desmarcar paso' : 'Marcar paso'}
                  >
                    {done && <CheckCircle className="w-5 h-5 text-white" />}
                  </button>
                  <div className="flex-1">
                    <h3 className={`font-bold ${done ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>
                      Paso {idx + 1}: {step.title}
                    </h3>
                    {step.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{step.description}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        canEdit && (
          <button
            onClick={() => setStatus(task.status === 'completed' ? 'pending' : 'completed')}
            disabled={saving}
            className={`px-6 py-3 rounded-lg font-medium disabled:opacity-50 ${
              task.status === 'completed'
                ? 'border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                : 'bg-brand text-white hover:bg-brand-ink'
            }`}
          >
            {task.status === 'completed' ? 'Marcar como pendiente' : 'Marcar como completada'}
          </button>
        )
      )}

      {task.status === 'completed' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-lg">
          <h3 className="font-bold text-green-900 dark:text-green-300">¡Tarea completada!</h3>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
      <p className="font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
