'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FolderCog, Plus, Power, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Modal from '@/components/Modal'
import ProjectPicker from '@/components/ProjectPicker'
import { Membership, canManage, getMembership } from '@/lib/org'
import { MONTH_NAMES, monthLabel } from '@/lib/period'
import { Project } from '@/lib/projects'

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
  process_projects: { project_id: string; active: boolean; projects: { name: string; active: boolean } }[]
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
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [editingProjects, setEditingProjects] = useState<ProcessRow | null>(null)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    setProjectFilter(new URLSearchParams(window.location.search).get('project') || '')
  }, [])

  const changeFilter = (id: string) => {
    setProjectFilter(id)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('project', id)
    else url.searchParams.delete('project')
    window.history.replaceState(null, '', url)
  }

  const load = async () => {
    const m = await getMembership()
    setMe(m)
    if (!m) return setLoading(false)
    const supabase = createClient()
    const [{ data, error: loadError }, { data: proj }] = await Promise.all([
      supabase
        .from('processes')
        .select('id, name, description, color, recurrence, months, once_period, due_day, active, process_projects(project_id, active, projects(name, active)), steps(count)')
        .eq('org_id', m.orgId)
        .order('active', { ascending: false })
        .order('name'),
      supabase.from('projects').select('id, kind, name, business_name, ruc, active').eq('org_id', m.orgId).order('name'),
    ])
    if (loadError) setError(loadError.message)
    setProcesses((data as unknown as ProcessRow[]) || [])
    setProjects((proj as Project[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const toggleActive = async (p: ProcessRow) => {
    const verb = p.active ? 'inhabilitar' : 'rehabilitar'
    const note = p.active
      ? 'Dejará de generarse en todos sus proyectos para los meses abiertos y futuros. Lo ya completado se conserva.'
      : 'Volverá a generarse en los meses abiertos y futuros que correspondan.'
    if (!confirm(`¿Seguro que quieres ${verb} "${p.name}"?\n\n${note}`)) return

    setBusyId(p.id)
    const { error: updateError } = await createClient().from('processes').update({ active: !p.active }).eq('id', p.id)
    setBusyId('')
    if (updateError) return setError(updateError.message)
    load()
  }

  const openProjects = (p: ProcessRow) => {
    setSelectedProjects(p.process_projects.filter((pp) => pp.active).map((pp) => pp.project_id))
    setModalError('')
    setEditingProjects(p)
  }

  const saveProjects = async () => {
    if (!editingProjects) return
    if (selectedProjects.length === 0) return setModalError('El proceso debe pertenecer al menos a un proyecto')
    const { error: saveError } = await createClient().rpc('set_process_projects', {
      p_process: editingProjects.id,
      p_project_ids: selectedProjects,
    })
    if (saveError) return setModalError(saveError.message)
    setEditingProjects(null)
    load()
  }

  const manage = canManage(me?.role)
  const visible = projectFilter
    ? processes.filter((p) => p.process_projects.some((pp) => pp.project_id === projectFilter))
    : processes
  const pickerProjects = editingProjects
    ? projects.filter((pr) => pr.active || editingProjects.process_projects.some((pp) => pp.project_id === pr.id))
    : []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Procesos</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Plantillas que generan una tarea por proyecto en cada mes que corresponda
          </p>
        </div>
        {manage && (
          <Link
            href={`/dashboard/processes/new${projectFilter ? `?project=${projectFilter}` : ''}`}
            className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-ink transition-colors"
          >
            <Plus className="w-5 h-5" /> Nuevo proceso
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {projects.length > 1 && (
        <select value={projectFilter} onChange={(e) => changeFilter(e.target.value)} className="w-full sm:w-80">
          <option value="">Todos los proyectos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">Cargando...</div>
      ) : visible.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-600 dark:text-slate-400">
          <p className="text-lg mb-2">{projectFilter ? 'Este proyecto no tiene procesos' : 'No tienes procesos aún'}</p>
          <p className="text-sm mb-4">Crea un proceso fijo, por ejemplo "PLAME mensual", y asígnalo a tus proyectos</p>
          {manage && (
            <Link href="/dashboard/processes/new" className="inline-block bg-brand text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-ink transition-colors">
              Crear proceso
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => {
            const links = [...p.process_projects].sort((a, b) => a.projects.name.localeCompare(b.projects.name))
            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 ${p.active ? '' : 'opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
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
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => openProjects(p)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <FolderCog className="w-4 h-4" /> Proyectos
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        disabled={busyId === p.id}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                          p.active
                            ? 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                      >
                        {p.active ? <Power className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                        {p.active ? 'Inhabilitar' : 'Rehabilitar'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  {links.map((pp) => (
                    <span
                      key={pp.project_id}
                      className={`text-xs px-2 py-1 rounded-full border ${
                        pp.active && pp.projects.active
                          ? 'border-brand/30 bg-brand/5 text-brand-ink dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                      }`}
                    >
                      {pp.projects.name}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingProjects && (
        <Modal title={`Proyectos de "${editingProjects.name}"`} onClose={() => setEditingProjects(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Los proyectos que desmarques dejarán de generar esta tarea en los meses abiertos y futuros. Lo ya completado se conserva.
            </p>
            <ProjectPicker projects={pickerProjects} selected={selectedProjects} onChange={setSelectedProjects} />
            {modalError && <p className="text-sm text-red-600 dark:text-red-400">{modalError}</p>}
            <div className="flex gap-3">
              <button onClick={saveProjects} className="flex-1 bg-brand text-white py-2 rounded-lg hover:bg-brand-ink">
                Guardar
              </button>
              <button
                onClick={() => setEditingProjects(null)}
                className="flex-1 border border-slate-300 dark:border-slate-600 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
