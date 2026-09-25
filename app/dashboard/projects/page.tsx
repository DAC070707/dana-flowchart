'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Home, Pencil, Plus, Power, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Modal from '@/components/Modal'
import { Membership, canManage, getMembership } from '@/lib/org'
import { Project, isValidRuc } from '@/lib/projects'

type ProjectRow = Project & { process_projects: { count: number }[] }

const EMPTY_FORM = { kind: 'external' as Project['kind'], name: '', business_name: '', ruc: '' }

export default function ProjectsPage() {
  const [me, setMe] = useState<Membership | null>(null)
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<ProjectRow | 'new' | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const m = await getMembership()
    setMe(m)
    if (!m) return setLoading(false)
    const { data, error: loadError } = await createClient()
      .from('projects')
      .select('id, kind, name, business_name, ruc, active, process_projects(count)')
      .eq('org_id', m.orgId)
      .order('active', { ascending: false })
      .order('name')
    if (loadError) setError(loadError.message)
    setProjects((data as ProjectRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setEditing('new')
  }

  const openEdit = (p: ProjectRow) => {
    setForm({ kind: p.kind, name: p.name, business_name: p.business_name || '', ruc: p.ruc || '' })
    setFormError('')
    setEditing(p)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me) return
    setFormError('')

    const businessName = form.business_name.trim()
    const ruc = form.ruc.trim()
    if (form.kind === 'external') {
      if (!businessName) return setFormError('Ingresa la razón social')
      if (!isValidRuc(ruc)) return setFormError('El RUC no es válido (11 dígitos, empieza con 10, 15, 17 o 20)')
    } else if (!form.name.trim()) {
      return setFormError('Ingresa el nombre del proyecto')
    }

    const payload =
      form.kind === 'external'
        ? { kind: 'external', name: businessName, business_name: businessName, ruc }
        : { kind: 'internal', name: form.name.trim(), business_name: null, ruc: null }

    setSaving(true)
    const supabase = createClient()
    const { error: saveError } =
      editing === 'new'
        ? await supabase.from('projects').insert({ ...payload, org_id: me.orgId })
        : await supabase.from('projects').update(payload).eq('id', (editing as ProjectRow).id)
    setSaving(false)

    if (saveError) {
      return setFormError(
        saveError.message.includes('uniq_project_ruc') ? 'Ya tienes un proyecto registrado con ese RUC' : saveError.message
      )
    }
    setEditing(null)
    load()
  }

  const toggleActive = async (p: ProjectRow) => {
    const note = p.active
      ? 'Sus procesos dejarán de generarse en los meses abiertos y futuros.'
      : 'Sus procesos activos volverán a generarse.'
    if (!confirm(`¿${p.active ? 'Inhabilitar' : 'Rehabilitar'} el proyecto "${p.name}"?\n\n${note}`)) return
    const { error: updateError } = await createClient().from('projects').update({ active: !p.active }).eq('id', p.id)
    if (updateError) return setError(updateError.message)
    load()
  }

  const manage = canManage(me?.role)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Proyectos</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Tus clientes y proyectos internos. Cada proceso pertenece a uno.</p>
        </div>
        {manage && (
          <button onClick={openNew} className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-ink">
            <Plus className="w-5 h-5" /> Nuevo proyecto
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">Cargando...</div>
      ) : projects.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-600 dark:text-slate-400">
          <p className="text-lg mb-2">No tienes proyectos aún</p>
          <p className="text-sm mb-4">Registra tus clientes (proyectos externos) o áreas internas para poder crear procesos.</p>
          {manage && (
            <button onClick={openNew} className="bg-brand text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-ink">
              Crear primer proyecto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className={`bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 ${p.active ? '' : 'opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-brand/10 text-brand flex-shrink-0">
                    {p.kind === 'external' ? <Building2 className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white break-words">{p.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {p.kind === 'external' ? `Externo · RUC ${p.ruc}` : 'Interno'}
                    </p>
                  </div>
                </div>
                {!p.active && (
                  <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded flex-shrink-0">
                    Inhabilitado
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
                <Link href={`/dashboard/processes?project=${p.id}`} className="text-sm font-medium">
                  {p.process_projects[0]?.count ?? 0} procesos →
                </Link>
                {manage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Pencil className="w-4 h-4" /> Editar
                    </button>
                    <button
                      onClick={() => toggleActive(p)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border ${
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
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Nuevo proyecto' : 'Editar proyecto'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {([
                ['external', 'Proyecto externo', 'Un cliente (empresa)'],
                ['internal', 'Proyecto interno', 'Tu propia empresa'],
              ] as const).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, kind: value })}
                  className={`text-left p-3 rounded-lg border-2 ${
                    form.kind === value ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
                </button>
              ))}
            </div>

            {form.kind === 'external' ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Razón social</label>
                  <input
                    type="text"
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                    placeholder="Ej: Inversiones Rosita S.A.C."
                    className="w-full"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">RUC</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={form.ruc}
                    onChange={(e) => setForm({ ...form, ruc: e.target.value.replace(/\D/g, '') })}
                    placeholder="20xxxxxxxxx"
                    className="w-full font-mono"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">Nombre del proyecto</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Administración interna"
                  className="w-full"
                  autoFocus
                />
              </div>
            )}

            {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex-1 bg-brand text-white py-2 rounded-lg hover:bg-brand-ink disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 border border-slate-300 dark:border-slate-600 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
