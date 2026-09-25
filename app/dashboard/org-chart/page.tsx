'use client'

import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Modal from '@/components/Modal'
import { Member, Membership, canManage, getMembership } from '@/lib/org'

interface OrgNode {
  id: string
  parent_id: string | null
  position: string
  person_name: string | null
  area: string | null
}

type Editing = { mode: 'new'; parentId: string | null } | { mode: 'edit'; node: OrgNode }

export default function OrgChartPage() {
  const [me, setMe] = useState<Membership | null>(null)
  const [nodes, setNodes] = useState<OrgNode[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [form, setForm] = useState({ position: '', person_name: '', area: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const m = await getMembership()
    setMe(m)
    if (!m) return setLoading(false)
    const supabase = createClient()
    const [{ data, error: loadError }, { data: mem }] = await Promise.all([
      supabase.from('org_chart_nodes').select('id, parent_id, position, person_name, area').eq('org_id', m.orgId).order('created_at'),
      supabase.rpc('org_members', { p_org: m.orgId }),
    ])
    if (loadError) setError(loadError.message)
    setNodes((data as OrgNode[]) || [])
    setMembers((mem as Member[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = (parentId: string | null) => {
    setForm({ position: '', person_name: '', area: '' })
    setEditing({ mode: 'new', parentId })
  }

  const openEdit = (node: OrgNode) => {
    setForm({ position: node.position, person_name: node.person_name || '', area: node.area || '' })
    setEditing({ mode: 'edit', node })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me || !editing || !form.position.trim()) return
    const payload = {
      position: form.position.trim(),
      person_name: form.person_name.trim() || null,
      area: form.area.trim() || null,
    }
    setSaving(true)
    const supabase = createClient()
    const { error: saveError } =
      editing.mode === 'new'
        ? await supabase.from('org_chart_nodes').insert({ ...payload, org_id: me.orgId, parent_id: editing.parentId })
        : await supabase.from('org_chart_nodes').update(payload).eq('id', editing.node.id)
    setSaving(false)
    if (saveError) return setError(saveError.message)
    setEditing(null)
    load()
  }

  const remove = async (node: OrgNode) => {
    const hasChildren = nodes.some((n) => n.parent_id === node.id)
    const msg = hasChildren
      ? `¿Eliminar "${node.position}"? También se eliminarán todos los cargos que dependen de él.`
      : `¿Eliminar "${node.position}"?`
    if (!confirm(msg)) return
    const { error: deleteError } = await createClient().from('org_chart_nodes').delete().eq('id', node.id)
    if (deleteError) return setError(deleteError.message)
    load()
  }

  const manage = canManage(me?.role)
  const childrenOf = (id: string | null) => nodes.filter((n) => n.parent_id === id)

  const renderNode = (node: OrgNode) => {
    const children = childrenOf(node.id)
    return (
      <li key={node.id}>
        <div className="group relative w-48 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-3 shadow-sm text-center hover:border-brand">
          {node.area && (
            <p className="text-[10px] uppercase tracking-wide font-semibold text-brand mb-1 truncate">{node.area}</p>
          )}
          <p className="font-bold text-sm text-slate-900 dark:text-white break-words">{node.position}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{node.person_name || 'Vacante'}</p>
          {manage && (
            <div className="flex justify-center gap-1 mt-2">
              <button onClick={() => openNew(node.id)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Agregar cargo a su cargo">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => openEdit(node)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Editar">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(node)} className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Eliminar">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {children.length > 0 && <ul>{children.map(renderNode)}</ul>}
      </li>
    )
  }

  const roots = childrenOf(null)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Organigrama</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Arma la estructura de cargos de tu equipo</p>
        </div>
        {manage && roots.length > 0 && (
          <button
            onClick={() => openNew(null)}
            className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Plus className="w-4 h-4" /> Cargo principal
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
      ) : roots.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-600 dark:text-slate-400">
          <p className="text-lg mb-2">Tu organigrama está vacío</p>
          <p className="text-sm mb-4">Empieza por el cargo más alto, por ejemplo "Gerente General".</p>
          {manage && (
            <button onClick={() => openNew(null)} className="bg-brand text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-ink">
              Agregar primer cargo
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-8 overflow-x-auto">
          <div className="orgchart min-w-max mx-auto">
            <ul>{roots.map(renderNode)}</ul>
          </div>
        </div>
      )}

      {editing && (
        <Modal title={editing.mode === 'new' ? 'Nuevo cargo' : 'Editar cargo'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            {editing.mode === 'new' && editing.parentId && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Reporta a: <strong>{nodes.find((n) => n.id === editing.parentId)?.position}</strong>
              </p>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">Cargo</label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="Ej: Contador Senior"
                required
                autoFocus
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Persona (opcional)</label>
              <input
                type="text"
                list="org-members"
                value={form.person_name}
                onChange={(e) => setForm({ ...form, person_name: e.target.value })}
                placeholder="Déjalo vacío si el cargo está vacante"
                className="w-full"
              />
              <datalist id="org-members">
                {members.map((m) => (
                  <option key={m.user_id} value={m.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Área (opcional)</label>
              <input
                type="text"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="Ej: Contabilidad"
                className="w-full"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving || !form.position.trim()} className="flex-1 bg-brand text-white py-2 rounded-lg hover:bg-brand-ink disabled:opacity-50">
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
