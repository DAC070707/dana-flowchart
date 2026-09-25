'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { currentMonthKey, monthLabel, shiftMonth } from '@/lib/period'

export default function MonthNav({ month, onChange }: { month: string; onChange: (key: string) => void }) {
  const isCurrent = month === currentMonthKey()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
        aria-label="Mes anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="min-w-[10rem] text-center text-lg font-bold text-slate-900 dark:text-white">{monthLabel(month)}</span>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
        aria-label="Mes siguiente"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      {!isCurrent && (
        <button onClick={() => onChange(currentMonthKey())} className="text-sm text-brand font-medium hover:text-brand-ink ml-1">
          Ir al mes actual
        </button>
      )}
    </div>
  )
}
