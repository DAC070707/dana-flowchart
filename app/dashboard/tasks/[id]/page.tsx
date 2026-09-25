'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  FolderOpen,
  List,
  Lock,
  Network,
  User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import ProcessDiagram from '@/components/ProcessDiagram'
import { Member, Membership, canManage, getMembership } from '@/lib/org'
import { monthLabel } from '@/lib/period'

interface Step {
  id: string
  title: string
  description: string | null
  order: number
  due_date: string | null
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
  projects: { name: string; kind: 'internal' | 'external'; ruc: string | null } | null
  processes: { name: string; steps: Step[] } | null
  own_steps: Step[]
  step_progress: { step_id: string; completed: boolean }[]
}

const VIEW_KEY = 'dana.taskView'

export default function TaskDetailPage() {
  const taskId = useParams().id as string
  const [me, setMe] = useState<Membership | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<'diagram' | 'list'>('diagram')

  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === 'list') setView('list')
    } catch {}
  }, [])

  const changeView = (v: 'diagram' | 'list') => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {}
  }

  const load = useCallback(async () => {
    const supabase = createClient()
    const m = await getMembership()
    setMe(m)
    const { data, error: loadError } = await supabase
      .from('task_assignments')
      .select(
        'id, title, description, status, due_date, assigned_to, process_id, periods(period, status), projects(name, kind, ruc), processes(name, steps(id, title, description, order, due_date)), own_steps:steps!steps_task_id_fkey(id, title, description, order, due_date), step_progress(step_id, completed)'
      )
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
  const steps = [...(task.processes?.steps || []), ...(task.own_steps || [])].sort((a, b) => a.order - b.order)
  const doneIds = new Set(task.step_progress.filter((s) => s.completed).map((s) => s.step_id))
  const completedSteps = steps.filter((s) => doneIds.has(s.id)).length
  const progress = task.status === 'completed' ? 100 : steps.length ? Math.round((completedSteps / steps.length) * 100) : 0
  const isOpen = task.periods.status === 'open'
  const canEdit = isOpen && task.status !== 'cancelled' && (canManage(me?.role) || task.assigned_to === me?.userId)
  const today = new Date().toLocaleDateString('en-CA')
  const overdue = task.status === 'pending' && !!task.due_date && task.due_date < today

  const statusText =
    task.status === 'completed'
      ? 'Completada'
      : task.status === 'cancelled'
        ? 'Inhabilitada'
        : completedSteps > 0
          ? 'En proceso'
          : 'Pendiente'

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setSaving(true)
    setError('')
    const { error: opError } = await fn()
    if (opError) setError(opError.message)
    await load()
    setSaving(false)
  }

  const toggleStep = (stepId: string) => {
    if (saving) return
    const done = doneIds.has(stepId)
    run(() =>
      createClient().from('step_progress').upsert(
        {
          task_id: task.id,
          step_id: stepId,
          completed: !done,
          completed_at: done ? null : new Date().toISOString(),
          completed_by: done ? null : me?.userId,
        },
        { onConflict: 'task_id,step_id' }
      )
    )
  }

  const setStatus = (status: 'pending' | 'completed') =>
    run(() =>
      createClient()
        .from('task_assignments')
        .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
        .eq('id', task.id)
    )

  const assignee = members.find((m) => m.user_id === task.assigned_to)?.name || 'Sin asignar'

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/tasks?m=${monthKey}`} className="inline-flex items-center gap-2 text-brand hover:text-brand-ink font-medium">
        <ArrowLeft className="w-4 h-4" /> Volver a {monthLabel(monthKey)}
      </Link>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center gap-5 px-6 py-5 bg-gradient-to-r from-blue-50 via-white to-rose-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800">
          <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex-shrink-0">
            <ClipboardList className="w-9 h-9 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white break-words">{task.title}</h1>
            {task.description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{task.description}</p>}
          </div>
          {!isOpen && (
            <span className="inline-flex items-center gap-1.5 text-sm bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full flex-shrink-0">
              <Lock className="w-4 h-4" /> Mes cerrado
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-700 border-t border-slate-200 dark:border-slate-700">
          <InfoCell icon={<FolderOpen className="w-6 h-6 text-blue-600" />} label="Proyecto">
            <span className="block truncate" title={task.projects?.name}>{task.projects?.name || '—'}</span>
            {task.projects?.kind === 'external' && (
              <span className="block text-xs font-normal text-slate-500">RUC {task.projects.ruc}</span>
            )}
          </InfoCell>
          <InfoCell icon={<CalendarDays className="w-6 h-6 text-blue-600" />} label="Mes">
            {monthLabel(monthKey)}
          </InfoCell>
          <InfoCell icon={<User className="w-6 h-6 text-blue-600" />} label="Asignado a">
            <span className="block truncate">{assignee}</span>
          </InfoCell>
          <InfoCell icon={<CalendarClock className="w-6 h-6 text-blue-600" />} label="Vence">
            <span className={overdue ? 'text-red-600' : ''}>
              {task.due_date ? task.due_date.split('-').reverse().join('/') : '—'}
            </span>
            {overdue && <span className="block text-xs font-normal text-red-600">Vencida</span>}
          </InfoCell>
          <InfoCell icon={<ProgressRing value={progress} />} label="Estado">
            {statusText}
          </InfoCell>
        </div>
      </div>

      {steps.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Diagrama de proceso</h2>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
              <ViewButton active={view === 'diagram'} onClick={() => changeView('diagram')} icon={<Network className="w-4 h-4" />}>
                Vista diagrama
              </ViewButton>
              <ViewButton active={view === 'list'} onClick={() => changeView('list')} icon={<List className="w-4 h-4" />}>
                Vista lista
              </ViewButton>
            </div>
          </div>

          {canEdit && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Haz clic en un paso para marcarlo como hecho.</p>
          )}

          {view === 'diagram' ? (
            <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 ${saving ? 'opacity-70' : ''}`}>
              <ProcessDiagram
                steps={steps.map((s) => ({
                  id: s.id,
                  title: s.title,
                  description: s.description,
                  due_date: s.due_date,
                  done: doneIds.has(s.id),
                }))}
                today={today}
                canEdit={canEdit && !saving}
                onToggle={toggleStep}
              />
            </div>
          ) : (
            <div className="space-y-3">
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
                      {step.due_date && (
                        <span
                          className={`text-sm font-medium flex-shrink-0 ${
                            !done && step.due_date < today ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {step.due_date.split('-').reverse().join('/')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-5 rounded-lg">
          <h3 className="font-bold text-green-900 dark:text-green-300">¡Tarea completada!</h3>
        </div>
      )}
    </div>
  )
}

function InfoCell({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 min-w-0">
      <div className="flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <div className="font-bold text-slate-900 dark:text-white">{children}</div>
      </div>
    </div>
  )
}

function ProgressRing({ value }: { value: number }) {
  const r = 20
  const c = 2 * Math.PI * r
  return (
    <div className="relative w-12 h-12">
      <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200 dark:text-slate-700" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (value / 100) * c}
          className={value === 100 ? 'text-green-500' : 'text-blue-500'}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">{value}%</span>
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
        active ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
