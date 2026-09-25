'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { TrendingUp, Users, CheckCircle, Clock } from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    processes: 0,
    tasks: 0,
    completed: 0,
    pending: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadStats = async () => {
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

        const orgId = memberData.org_id

        // Get processes
        const { data: processes } = await supabase
          .from('processes')
          .select('id')
          .eq('org_id', orgId)

        // Get tasks
        const { data: tasks } = await supabase
          .from('task_assignments')
          .select('id, completed')
          .eq('org_id', orgId)

        setStats({
          processes: processes?.length || 0,
          tasks: tasks?.length || 0,
          completed: tasks?.filter((t: any) => t.completed)?.length || 0,
          pending: tasks?.filter((t: any) => !t.completed)?.length || 0,
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [supabase])

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-brand to-brand-ink text-white p-8 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold mb-2">Bienvenido a DANA Flowchart</h1>
        <p className="text-lg opacity-90">Gestiona tus procesos y equipos en un solo lugar</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-blue-500" />}
          label="Procesos"
          value={stats.processes}
          loading={loading}
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-green-500" />}
          label="Tareas"
          value={stats.tasks}
          loading={loading}
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-emerald-500" />}
          label="Completadas"
          value={stats.completed}
          loading={loading}
        />
        <StatCard
          icon={<Clock className="w-6 h-6 text-orange-500" />}
          label="Pendientes"
          value={stats.pending}
          loading={loading}
        />
      </div>

      {/* Quick actions */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-bold mb-6">Acciones rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionButton
            title="Crear proceso"
            description="Define un nuevo circuito de trabajo"
            href="/dashboard/processes/new"
          />
          <QuickActionButton
            title="Asignar tarea"
            description="Asigna una tarea a un miembro del equipo"
            href="/dashboard/tasks/new"
          />
          <QuickActionButton
            title="Ver reportes"
            description="Analiza el progreso de tu equipo"
            href="/dashboard/reports"
          />
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-bold mb-6">Actividad reciente</h2>
        <div className="space-y-4 text-center text-slate-600 dark:text-slate-400 py-12">
          <p>No hay actividad reciente aún</p>
          <p className="text-sm">Comienza creando tu primer proceso o asignando una tarea</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: number
  loading: boolean
}) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</h3>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white">
        {loading ? '—' : value}
      </p>
    </div>
  )
}

function QuickActionButton({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <a
      href={href}
      className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-brand hover:shadow-md transition-all group"
    >
      <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
    </a>
  )
}
