'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface Task {
  id: string
  title: string
  process_name: string
  assigned_to: string
  due_date: string
  progress: number
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's organization
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()

      if (!memberData) return

      // Get tasks
      const { data: tasksData } = await supabase
        .from('task_assignments')
        .select('id, title, process_id, assigned_to, due_date, completed')
        .eq('org_id', memberData.org_id)

      // Mock data for now - will be connected to real data
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Cierre de nómina - Octubre',
          process_name: 'Cierre de nómina',
          assigned_to: 'Juan Pérez',
          due_date: '2024-10-05',
          progress: 60,
          status: 'in_progress',
        },
        {
          id: '2',
          title: 'Validación de compras - Proveedor XYZ',
          process_name: 'Validación de compras',
          assigned_to: 'María García',
          due_date: '2024-09-28',
          progress: 100,
          status: 'completed',
        },
      ]

      setTasks(mockTasks)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tareas</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Asigna y sigue tareas de tu equipo</p>
        </div>
        <Link href="/dashboard/tasks/new" className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-ink transition-colors">
          <Plus className="w-5 h-5" /> Nueva tarea
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {status === 'all' && 'Todas'}
            {status === 'pending' && 'Pendientes'}
            {status === 'in_progress' && 'En progreso'}
            {status === 'completed' && 'Completadas'}
          </button>
        ))}
      </div>

      {/* Tasks list */}
      {loading ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">Cargando...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">No hay tareas</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">Crea tu primera tarea para comenzar</p>
          <Link href="/dashboard/tasks/new" className="inline-block bg-brand text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-ink transition-colors">
            Crear tarea
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <Link
              key={task.id}
              href={`/dashboard/tasks/${task.id}`}
              className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-brand transition-all block"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">{task.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Proceso: <span className="font-medium">{task.process_name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {task.status === 'completed' && <CheckCircle className="w-6 h-6 text-green-500" />}
                  {task.status === 'in_progress' && <Clock className="w-6 h-6 text-blue-500" />}
                  {task.status === 'overdue' && <AlertCircle className="w-6 h-6 text-red-500" />}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Asignado a: {task.assigned_to}</span>
                  <span className="text-slate-600 dark:text-slate-400">Vence: {new Date(task.due_date).toLocaleDateString()}</span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand h-full transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{task.progress}% completado</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
