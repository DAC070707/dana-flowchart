'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Process {
  id: string
  name: string
}

interface TeamMember {
  id: string
  email: string
}

export default function NewTaskPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [processId, setProcessId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [processes, setProcesses] = useState<Process[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
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

      // Get processes
      const { data: processesData } = await supabase
        .from('processes')
        .select('id, name')
        .eq('org_id', memberData.org_id)

      setProcesses(processesData || [])

      // Get team members
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('user:auth.users(id, email)')
        .eq('org_id', memberData.org_id)

      if (membersData) {
        setTeamMembers(
          membersData
            .filter((m: any) => m.user)
            .map((m: any) => ({
              id: m.user.id,
              email: m.user.email,
            }))
        )
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Get user's organization
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()

      if (!memberData) throw new Error('No organization found')

      // Create task
      const { error: taskError } = await supabase
        .from('task_assignments')
        .insert({
          org_id: memberData.org_id,
          process_id: processId,
          assigned_to: assignedTo,
          assigned_by: user.id,
          title,
          description,
          due_date: dueDate,
        })

      if (taskError) throw taskError

      router.push('/dashboard/tasks')
    } catch (err: any) {
      setError(err.message || 'Error al crear tarea')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Crear nueva tarea</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Asigna un proceso a un miembro de tu equipo</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Título de la tarea</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Cierre de nómina - Octubre"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles de la tarea"
              rows={3}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Proceso</label>
              <select value={processId} onChange={(e) => setProcessId(e.target.value)} required className="w-full">
                <option value="">Selecciona un proceso</option>
                {processes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Asignar a</label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} required className="w-full">
                <option value="">Selecciona un miembro</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Fecha de vencimiento</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || !title.trim() || !processId || !assignedTo}
            className="flex-1 bg-brand text-white font-medium py-3 rounded-lg hover:bg-brand-ink disabled:opacity-50 transition-colors"
          >
            {loading ? 'Asignando...' : 'Asignar tarea'}
          </button>
          <Link
            href="/dashboard/tasks"
            className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
