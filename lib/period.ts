'use client'

import { useCallback, useEffect, useState } from 'react'

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const monthStart = (key: string) => `${key}-01`

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

// Month kept in the ?m=YYYY-MM query param; empty until mounted so prerendered HTML never bakes in the build month
export function useMonth(): [string, (key: string) => void] {
  const [month, setMonthState] = useState('')

  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get('m')
    setMonthState(m && KEY_RE.test(m) ? m : currentMonthKey())
  }, [])

  const setMonth = useCallback((key: string) => {
    setMonthState(key)
    const url = new URL(window.location.href)
    url.searchParams.set('m', key)
    window.history.replaceState(null, '', url)
  }, [])

  return [month, setMonth]
}
