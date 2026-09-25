'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Power, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Membership, canManage, getMembership } from '@/lib/org'
import { MONTH_NAMES, monthLabel } from '@/lib/period'

interface ProcessRow {
  id: string
  name: string
  description: string | null
  color: string
  recurrence: 'monthly' | 'months' | 'once'
  months: number[]
  once_period: string | null
  due_day: number | null
  active: boolean
  steps: { count: number }[]
}

function recurrenceLabel(p: ProcessRow): string {
  if (p.recurrence === 'monthly') return 'Todos los meses'
  if (p.recurrence === 'once') return p.once_period ? `Solo ${monthLabel(p.once_period.slice(0, 7))}` : 'Solo un mes'
  return p.months.map((m) => MONTH_NAMES[m - 1].slice(0, 3)).join(', ')
}

export default function ProcessesPage() {
  const [me, setMe] = useState<Membership | null>(null)
  const [processes, setProcesses] = useState<ProcessRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = async () => {
    const m = await getMembership()
    setMe(m)
    if (!m) return setLoading(false)

    const { data, error: loadError } = await createClient()
      .from('processes')
      .select('id, name, description, color, recurrence, months, once_period, due_day, active, steps(count)')
      .eq('org_id', m.orgId)
      .order('active', { ascending: false })
      .order('name')

    if (loadError) setError(loadError.message)
    setProcesses((data as ProcessRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const toggleActive = async (p: ProcessRow) => {
    const verb = p.active ? 'inhabilitar' : 'rehabilitar'
    const note = p.active
      ? 'Dejará de generarse en los meses abiertos y futuros. Lo ya completado se conserva.'
      : 'Volverá a generarse en los meses abiertos y futuros que correspondan.'
    if (!confirm(`¿Seguro que quieres ${verb} "${p.name}"?\n\n${note}`)) return

    setBusyId(p.id)
    const { error: updateError } = await createClient().from('processes').update({ active: !p.active }).eq('id', p.id)
    setBusyId('')
    if (updateError) return setError(updateError.message)
    load()
  }

  const manage = canManage(me?.role)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Procesos</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Plantillas que se generan automáticamente como tareas en cada mes que corresponda
          </p>
        </div>
        {manage && (
          <Link href="/dashboard/processes/new" className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-ink transition-colors">
            <Plus className="w-5 h-5" /> Nuevo proceso
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">Cargando...</div>
      ) : processes.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-600 dark:text-slate-400">
          <p className="text-lg mb-2">No tienes procesos aún</p>
          <p className="text-sm mb-4">Crea tu primer proceso fijo, por ejemplo "Declaración mensual" o "Cierre de planilla"</p>
          {manage && (
            <Link href="/dashboard/processes/new" className="inline-block bg-brand text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-ink transition-colors">
              Crear primer proceso
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {processes.map((p) => (
            <div
              key={p.id}
              className={`bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 ${
                p.active ? '' : 'opacity-60'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-3 h-3 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: p.color }} />
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white">{p.name}</h3>
                  {p.description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{p.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                      {recurrenceLabel(p)}
                    </span>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                      {p.steps[0]?.count ?? 0} pasos
                    </span>
                    {p.due_day && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded">
                        Vence día {p.due_day}
                      </span>
                    )}
                    {!p.active && (
                      <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                        Inhabilitado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {manage && (
                <button
                  onClick={() => toggleActive(p)}
                  disabled={busyId === p.id}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 flex-shrink-0 ${
                    p.active
                      ? 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                >
                  {p.active ? <Power className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                  {p.active ? 'Inhabilitar' : 'Rehabilitar'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
