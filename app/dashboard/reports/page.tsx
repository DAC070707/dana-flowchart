'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react'

interface Report {
  task_id: string
  process_name: string
  assigned_to: string
  progress_percentage: number
  completed_steps: number
  total_steps: number
  due_date: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month')
  const supabase = createClient()

  const [stats, setStats] = useState({
    total_tasks: 0,
    completed_tasks: 0,
    average_progress: 0,
    overdue_tasks: 0,
  })

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
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

      // Mock data for reporting
      const mockReports: Report[] = [
        {
          task_id: '1',
          process_name: 'Cierre de nómina',
          assigned_to: 'Juan Pérez',
          progress_percentage: 75,
          completed_steps: 3,
          total_steps: 4,
          due_date: '2024-10-05',
          status: 'in_progress',
        },
        {
          task_id: '2',
          process_name: 'Validación de compras',
          assigned_to: 'María García',
          progress_percentage: 100,
          completed_steps: 5,
          total_steps: 5,
          due_date: '2024-09-28',
          status: 'completed',
        },
        {
          task_id: '3',
          process_name: 'Declaración fiscal',
          assigned_to: 'Carlos López',
          progress_percentage: 40,
          completed_steps: 2,
          total_steps: 5,
          due_date: '2024-09-25',
          status: 'overdue',
        },
      ]

      setReports(mockReports)

      // Calculate stats
      const completed = mockReports.filter((r) => r.status === 'completed').length
      const average =
        mockReports.reduce((sum, r) => sum + r.progress_percentage, 0) / mockReports.length
      const overdue = mockReports.filter((r) => r.status === 'overdue').length

      setStats({
        total_tasks: mockReports.length,
        completed_tasks: completed,
        average_progress: Math.round(average),
        overdue_tasks: overdue,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reportes</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Analiza el progreso de tu equipo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-500" />}
          label="Total de tareas"
          value={stats.total_tasks}
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-green-500" />}
          label="Completadas"
          value={stats.completed_tasks}
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-emerald-500" />}
          label="Progreso promedio"
          value={`${stats.average_progress}%`}
        />
        <StatCard
          icon={<AlertCircle className="w-6 h-6 text-red-500" />}
          label="Atrasadas"
          value={stats.overdue_tasks}
        />
      </div>

      {/* Time range filter */}
      <div className="flex gap-2 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        {(['week', 'month', 'all'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              timeRange === range
                ? 'bg-brand text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {range === 'week' && 'Última semana'}
            {range === 'month' && 'Último mes'}
            {range === 'all' && 'Todos'}
          </button>
        ))}
      </div>

      {/* Detailed report */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Progreso detallado</h2>

        {loading ? (
          <div className="text-center py-12 text-slate-600 dark:text-slate-400">Cargando...</div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.task_id}
                className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{report.process_name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Asignado a: <span className="font-medium">{report.assigned_to}</span>
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      report.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : report.status === 'overdue'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {report.status === 'completed' && '✓ Completada'}
                    {report.status === 'overdue' && '⚠ Atrasada'}
                    {report.status === 'in_progress' && 'En progreso'}
                    {report.status === 'pending' && 'Pendiente'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600 dark:text-slate-400">
                      {report.completed_steps} de {report.total_steps} pasos completados
                    </span>
                    <span className="font-bold text-brand">{report.progress_percentage}%</span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-brand to-brand-ink h-full transition-all"
                      style={{ width: `${report.progress_percentage}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Vencimiento: {new Date(report.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export button */}
      <div className="flex gap-3">
        <button className="px-6 py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-ink transition-colors">
          📊 Exportar PDF
        </button>
        <button className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          📋 Exportar CSV
        </button>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</h3>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
