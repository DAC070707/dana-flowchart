'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Member, getMembership } from '@/lib/org'
import { monthLabel, monthStart, useMonth } from '@/lib/period'
import { Project, projectLabel } from '@/lib/projects'

interface DraftStep {
  key: number
  title: string
  due_date: string
}

export default function NewMonthTaskPage() {
  const [month] = useMonth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [steps, setSteps] = useState<DraftStep[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    getMembership().then(async (me) => {
      if (!me) return
      const supabase = createClient()
      const [{ data }, { data: proj }] = await Promise.all([
        supabase.rpc('org_members', { p_org: me.orgId }),
        supabase.from('projects').select('id, kind, name, business_name, ruc, active').eq('org_id', me.orgId).eq('active', true).order('name'),
      ])
      setMembers((data as Member[]) || [])
      const list = (proj as Project[]) || []
      setProjects(list)
      if (list.length === 1) setProjectId(list[0].id)
    })
  }, [])

  if (!month) return null

  const minDate = monthStart(month)

  const addStep = () => setSteps([...steps, { key: Date.now(), title: '', due_date: '' }])
  const updateStep = (key: number, field: 'title' | 'due_date', value: string) =>
    setSteps(steps.map((s) => (s.key === key ? { ...s, [field]: value } : s)))
  const removeStep = (key: number) => setSteps(steps.filter((s) => s.key !== key))
  const moveStep = (idx: number, delta: number) => {
    const next = [...steps]
    const [item] = next.splice(idx, 1)
    next.splice(idx + delta, 0, item)
    setSteps(next)
  }

  const lastStepDate = steps.map((s) => s.due_date).filter(Boolean).sort().slice(-1)[0] || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const filled = steps.filter((s) => s.title.trim())
    if (dueDate && filled.some((s) => s.due_date && s.due_date > dueDate)) {
      return setError('Hay pasos con fecha posterior al vencimiento de la tarea')
    }

    setLoading(true)
    try {
      const me = await getMembership()
      if (!me) throw new Error('No se encontró tu organización')

      const { error: taskError } = await createClient().rpc('create_task', {
        p_org: me.orgId,
        p_period: monthStart(month),
        p_project: projectId,
        p_title: title,
        p_description: description,
        p_assigned_to: assignedTo || null,
        p_due_date: dueDate || null,
        p_steps: filled.map((s) => ({ title: s.title.trim(), due_date: s.due_date || null })),
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
            <label className="block text-sm font-medium mb-2">Proyecto</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required className="w-full">
              <option value="">Selecciona un proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{projectLabel(p)}</option>
              ))}
            </select>
          </div>

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
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full" />
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
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full"
              />
              {!dueDate && lastStepDate && (
                <p className="text-xs text-slate-500 mt-1">Si lo dejas vacío, vencerá con el último paso ({lastStepDate.split('-').reverse().join('/')}).</p>
              )}
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div>
            <h2 className="text-xl font-bold">Pasos (opcional)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Divide la tarea en pasos con su propia fecha. La tarea se completa sola cuando se marcan todos.
            </p>
          </div>

          {steps.map((s, idx) => (
            <div key={s.key} className="flex items-start gap-2">
              <span className="mt-2 w-7 h-7 flex-shrink-0 rounded-full bg-brand/10 text-brand text-sm font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-2">
                <input
                  type="text"
                  value={s.title}
                  onChange={(e) => updateStep(s.key, 'title', e.target.value)}
                  placeholder="Qué hay que hacer"
                  className="w-full"
                  autoFocus={idx === steps.length - 1 && !s.title}
                />
                <input
                  type="date"
                  value={s.due_date}
                  min={minDate}
                  max={dueDate || undefined}
                  onChange={(e) => updateStep(s.key, 'due_date', e.target.value)}
                  className="w-full"
                  aria-label={`Fecha del paso ${idx + 1}`}
                />
              </div>
              <div className="flex flex-col">
                <button type="button" onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="p-1 text-slate-500 disabled:opacity-20" aria-label="Subir paso">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className="p-1 text-slate-500 disabled:opacity-20" aria-label="Bajar paso">
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
              <button type="button" onClick={() => removeStep(s.key)} className="mt-1.5 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" aria-label="Quitar paso">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addStep}
            className="inline-flex items-center gap-2 border border-dashed border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Plus className="w-4 h-4" /> Agregar paso
          </button>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || !title.trim() || !projectId}
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
