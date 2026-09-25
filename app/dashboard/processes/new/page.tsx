'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getMembership } from '@/lib/org'
import { MONTH_NAMES, currentMonthKey, monthStart } from '@/lib/period'
import { Plus, Trash2 } from 'lucide-react'

type Recurrence = 'monthly' | 'months' | 'once'

interface Step {
  id: string
  title: string
  description: string
  duration_days?: number
}

export default function NewProcessPage() {
  const [processName, setProcessName] = useState('')
  const [processDescription, setProcessDescription] = useState('')
  const [color, setColor] = useState('#1F6F63')
  const [recurrence, setRecurrence] = useState<Recurrence>('monthly')
  const [months, setMonths] = useState<number[]>([])
  const [onceMonth, setOnceMonth] = useState(currentMonthKey)
  const [dueDay, setDueDay] = useState('')
  const [steps, setSteps] = useState<Step[]>([])
  const [newStepTitle, setNewStepTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const addStep = () => {
    if (newStepTitle.trim()) {
      setSteps([
        ...steps,
        {
          id: Date.now().toString(),
          title: newStepTitle,
          description: '',
          duration_days: undefined,
        },
      ])
      setNewStepTitle('')
    }
  }

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id))
  }

  const updateStep = (id: string, field: string, value: any) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (recurrence === 'months' && months.length === 0) {
        throw new Error('Selecciona al menos un mes')
      }

      const me = await getMembership()
      if (!me) throw new Error('No se encontró tu organización')

      const { data: processData, error: processError } = await supabase
        .from('processes')
        .insert({
          org_id: me.orgId,
          name: processName,
          description: processDescription,
          color,
          created_by: me.userId,
          recurrence,
          months: recurrence === 'months' ? [...months].sort((a, b) => a - b) : [],
          once_period: recurrence === 'once' ? monthStart(onceMonth) : null,
          due_day: dueDay ? parseInt(dueDay) : null,
        })
        .select()
        .single()

      if (processError) throw processError

      // Create steps
      if (steps.length > 0) {
        const stepsToInsert = steps.map((step, idx) => ({
          process_id: processData.id,
          title: step.title,
          description: step.description,
          order: idx + 1,
          duration_days: step.duration_days,
        }))

        const { error: stepsError } = await supabase
          .from('steps')
          .insert(stepsToInsert)

        if (stepsError) throw stepsError
      }

      router.push('/dashboard/processes')
    } catch (err: any) {
      setError(err.message || 'Error al crear proceso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Crear nuevo proceso</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Define el circuito de trabajo y los pasos que lo componen</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic info */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <h2 className="text-xl font-bold">Información del proceso</h2>

          <div>
            <label className="block text-sm font-medium mb-2">Nombre del proceso</label>
            <input
              type="text"
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              placeholder="Ej: Cierre de nómina"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              value={processDescription}
              onChange={(e) => setProcessDescription(e.target.value)}
              placeholder="Describe el propósito de este proceso"
              rows={3}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-16 h-10 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Recurrence */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <h2 className="text-xl font-bold">¿Cuándo se aplica?</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              ['monthly', 'Todos los meses', 'Se repite cada mes'],
              ['months', 'Meses específicos', 'Solo en los meses que elijas'],
              ['once', 'Solo un mes', 'Una sola vez'],
            ] as const).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRecurrence(value)}
                className={`text-left p-4 rounded-lg border-2 transition-colors ${
                  recurrence === value
                    ? 'border-brand bg-brand/5'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <p className="font-medium">{label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>
              </button>
            ))}
          </div>

          {recurrence === 'months' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MONTH_NAMES.map((name, idx) => {
                const m = idx + 1
                const checked = months.includes(m)
                return (
                  <label
                    key={m}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                      checked ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setMonths(checked ? months.filter((x) => x !== m) : [...months, m])}
                    />
                    {name}
                  </label>
                )
              })}
            </div>
          )}

          {recurrence === 'once' && (
            <div>
              <label className="block text-sm font-medium mb-2">Mes</label>
              <input type="month" value={onceMonth} onChange={(e) => setOnceMonth(e.target.value)} required />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Día de vencimiento (opcional)</label>
            <input
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="Ej: 15"
              className="w-32"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Cada mes la tarea vencerá ese día. Si el mes tiene menos días, vence el último día.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <h2 className="text-xl font-bold">Pasos del proceso</h2>

          {steps.length > 0 && (
            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div key={step.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Paso {idx + 1}</label>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                          placeholder="Título del paso"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={step.description || ''}
                          onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                          placeholder="Descripción (opcional)"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={step.duration_days || ''}
                          onChange={(e) => updateStep(step.id, 'duration_days', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="Duración estimada (días)"
                          className="w-full"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mt-1"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
              placeholder="Nombre del nuevo paso..."
              className="flex-1"
            />
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-ink transition-colors"
            >
              <Plus className="w-4 h-4" /> Agregar paso
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || !processName.trim()}
            className="flex-1 bg-brand text-white font-medium py-3 rounded-lg hover:bg-brand-ink disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creando...' : 'Crear proceso'}
          </button>
          <Link
            href="/dashboard/processes"
            className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
