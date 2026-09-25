'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Project } from '@/lib/projects'

export default function ProjectPicker({
  projects,
  selected,
  onChange,
}: {
  projects: Project[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const visible = projects.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.ruc || '').includes(q))
  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.includes(p.id))

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  const toggleVisible = () => {
    const ids = visible.map((p) => p.id)
    onChange(allVisibleSelected ? selected.filter((id) => !ids.includes(id)) : Array.from(new Set([...selected, ...ids])))
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
      <div className="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-700">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o RUC"
            className="w-full pl-8"
          />
        </div>
        <button type="button" onClick={toggleVisible} className="text-sm text-brand hover:text-brand-ink whitespace-nowrap px-2">
          {allVisibleSelected ? 'Quitar todos' : 'Seleccionar todos'}
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
        {visible.map((p) => (
          <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
            <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
            <span className="text-sm flex-1 min-w-0">
              <span className="font-medium">{p.name}</span>
              <span className="text-slate-500 dark:text-slate-400"> · {p.kind === 'external' ? `RUC ${p.ruc}` : 'Interno'}</span>
            </span>
          </label>
        ))}
        {visible.length === 0 && <p className="px-3 py-4 text-sm text-slate-500">Sin resultados</p>}
      </div>
      <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
        {selected.length} seleccionado(s) · cada mes se creará una tarea por proyecto
      </p>
    </div>
  )
}
