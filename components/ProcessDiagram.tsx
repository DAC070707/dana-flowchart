'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, FileText, Play, Square } from 'lucide-react'

export interface DiagramStep {
  id: string
  title: string
  description: string | null
  done: boolean
}

const CELL_W = 236
const ROW_H = 250
const STEP_R = 88
const END_R = 34
const TOP_PAD = 20

type Node =
  | { kind: 'start' }
  | { kind: 'end' }
  | { kind: 'step'; step: DiagramStep; index: number; state: 'done' | 'current' | 'pending' }

export default function ProcessDiagram({
  steps,
  canEdit,
  onToggle,
}: {
  steps: DiagramStep[]
  canEdit: boolean
  onToggle: (stepId: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const currentIndex = steps.findIndex((s) => !s.done)
  const nodes: Node[] = [
    { kind: 'start' },
    ...steps.map((step, index) => ({
      kind: 'step' as const,
      step,
      index,
      state: step.done ? ('done' as const) : index === currentIndex ? ('current' as const) : ('pending' as const),
    })),
    { kind: 'end' },
  ]

  const cols = Math.max(1, Math.min(nodes.length, Math.floor(width / CELL_W)))
  const rows = Math.ceil(nodes.length / cols)
  const totalW = cols * CELL_W
  const totalH = rows * ROW_H + TOP_PAD

  const pos = nodes.map((n, i) => ({
    cx: (i % cols) * CELL_W + CELL_W / 2,
    cy: Math.floor(i / cols) * ROW_H + ROW_H / 2 + TOP_PAD,
    r: n.kind === 'step' ? STEP_R : END_R,
  }))

  const edges = nodes.slice(0, -1).map((n, i) => {
    const a = pos[i]
    const b = pos[i + 1]
    const done = n.kind === 'start' ? steps[0]?.done ?? false : n.kind === 'step' && n.step.done
    let d: string
    if (a.cy === b.cy) {
      d = `M ${a.cx + a.r + 6} ${a.cy} H ${b.cx - b.r - 10}`
    } else {
      const xr = a.cx + a.r + 22
      const yMid = a.cy + ROW_H / 2
      const xl = b.cx - b.r - 30
      d = `M ${a.cx + a.r + 6} ${a.cy} H ${xr} V ${yMid} H ${xl} V ${b.cy} H ${b.cx - b.r - 10}`
    }
    return { d, done }
  })

  return (
    <div ref={wrapRef} className="w-full overflow-x-auto">
      {width > 0 && (
        <div className="relative mx-auto" style={{ width: totalW, height: totalH }}>
          <svg className="absolute inset-0 pointer-events-none" width={totalW} height={totalH}>
            <defs>
              <marker id="arrow-todo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#60a5fa" />
              </marker>
              <marker id="arrow-done" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
              </marker>
            </defs>
            {edges.map((e, i) => (
              <path
                key={i}
                d={e.d}
                fill="none"
                stroke={e.done ? '#22c55e' : '#60a5fa'}
                strokeWidth={2}
                strokeDasharray={e.done ? undefined : '6 6'}
                strokeLinejoin="round"
                markerEnd={`url(#arrow-${e.done ? 'done' : 'todo'})`}
              />
            ))}
          </svg>

          {nodes.map((n, i) => {
            const p = pos[i]
            const style = { left: p.cx - p.r, top: p.cy - p.r, width: p.r * 2, height: p.r * 2 }

            if (n.kind !== 'step') {
              const isStart = n.kind === 'start'
              return (
                <div key={n.kind} className="absolute flex flex-col items-center" style={{ ...style, height: undefined }}>
                  <div
                    className={`rounded-full flex items-center justify-center shadow-md ring-8 ${
                      isStart ? 'bg-green-500 ring-green-100 dark:ring-green-900/40' : 'bg-red-500 ring-red-100 dark:ring-red-900/40'
                    }`}
                    style={{ width: p.r * 2, height: p.r * 2 }}
                  >
                    {isStart ? <Play className="w-7 h-7 text-white fill-white ml-1" /> : <Square className="w-6 h-6 text-white fill-white" />}
                  </div>
                  <span className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">{isStart ? 'Inicio' : 'Fin'}</span>
                </div>
              )
            }

            const palette = {
              done: {
                circle: 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700',
                badge: 'bg-green-500 text-white',
                icon: 'text-green-600',
              },
              current: {
                circle: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 ring-4 ring-blue-100 dark:ring-blue-900/40',
                badge: 'bg-blue-500 text-white',
                icon: 'text-blue-600',
              },
              pending: {
                circle: 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800',
                badge: 'bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-100',
                icon: 'text-rose-500',
              },
            }[n.state]

            return (
              <button
                key={n.step.id}
                type="button"
                onClick={() => canEdit && onToggle(n.step.id)}
                disabled={!canEdit}
                title={canEdit ? (n.step.done ? 'Clic para desmarcar' : 'Clic para marcar como hecho') : undefined}
                className={`absolute rounded-full border-2 shadow-sm flex flex-col items-center justify-center text-center px-5 transition-transform ${palette.circle} ${
                  canEdit ? 'hover:scale-[1.03] cursor-pointer' : 'cursor-default'
                }`}
                style={style}
              >
                <span
                  className={`absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow ${palette.badge}`}
                >
                  {n.step.done ? <Check className="w-4 h-4" /> : n.index + 1}
                </span>
                <FileText className={`w-7 h-7 mb-1.5 flex-shrink-0 ${palette.icon}`} />
                <span className="text-xs font-extrabold uppercase leading-tight text-slate-900 dark:text-white line-clamp-3">
                  {n.step.title}
                </span>
                {n.step.description && (
                  <span className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-400 line-clamp-3">
                    {n.step.description}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
