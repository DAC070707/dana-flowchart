'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, CheckCircle } from 'lucide-react'

interface Step {
  id: string
  title: string
  description: string
  order: number
  completed: boolean
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string
  const [task, setTask] = useState<any>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadTask()
  }, [])

  const loadTask = async () => {
    try {
      // Mock data for now
      const mockSteps: Step[] = [
        {
          id: '1',
          title: 'Obtener planilla de pago',
          description: 'Descargar desde el sistema',
          order: 1,
          completed: true,
        },
        {
          id: '2',
          title: 'Consolidar planillas',
          description: 'Unir pago y liquidaciones',
          order: 2,
          completed: true,
        },
        {
          id: '3',
          title: 'Presentar PLAME',
          description: 'Enviar al sistema',
          order: 3,
          completed: false,
        },
        {
          id: '4',
          title: 'Declarar AFP',
          description: 'Realizar declaración',
          order: 4,
          completed: false,
        },
      ]

      setTask({
        id: taskId,
        title: 'Cierre de nómina - Octubre',
        description: 'Completar el cierre mensual de nómina',
        due_date: '2024-10-05',
        assigned_to: 'Juan Pérez',
      })

      setSteps(mockSteps)
    } finally {
      setLoading(false)
    }
  }

  const toggleStep = async (stepId: string) => {
    setSteps(
      steps.map((s) =>
        s.id === stepId ? { ...s, completed: !s.completed } : s
      )
    )
  }

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>
  }

  const completedSteps = steps.filter((s) => s.completed).length
  const progress = Math.round((completedSteps / steps.length) * 100)

  return (
    <div className="space-y-8">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-brand hover:text-brand-ink transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Task header */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{task.title}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{task.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Asignado a</p>
            <p className="font-bold text-slate-900 dark:text-white">{task.assigned_to}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Vencimiento</p>
            <p className="font-bold text-slate-900 dark:text-white">
              {new Date(task.due_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Progreso</p>
            <p className="font-bold text-brand text-lg">{progress}%</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Pasos</p>
            <p className="font-bold text-slate-900 dark:text-white">
              {completedSteps} de {steps.length}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-brand to-brand-ink h-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pasos del proceso</h2>

        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-6 rounded-lg border transition-all ${
              step.completed
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-4">
              <button
                onClick={() => toggleStep(step.id)}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  step.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-slate-300 dark:border-slate-600 hover:border-brand'
                }`}
              >
                {step.completed && <CheckCircle className="w-5 h-5 text-white" />}
              </button>

              <div className="flex-1">
                <h3
                  className={`font-bold text-lg transition-colors ${
                    step.completed
                      ? 'text-slate-500 dark:text-slate-400 line-through'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  Paso {step.order}: {step.title}
                </h3>
                {step.description && (
                  <p
                    className={`mt-1 text-sm ${
                      step.completed
                        ? 'text-slate-500 dark:text-slate-500'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mark as complete */}
      {progress === 100 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-lg">
          <h3 className="font-bold text-green-900 dark:text-green-300 mb-2">¡Tarea completada!</h3>
          <p className="text-green-800 dark:text-green-400 text-sm">Todos los pasos han sido completados exitosamente.</p>
        </div>
      )}
    </div>
  )
}
