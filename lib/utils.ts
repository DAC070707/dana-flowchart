export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-ES')
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    case 'in_progress':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
    case 'overdue':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    default:
      return 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return '✓ Completada'
    case 'in_progress':
      return 'En progreso'
    case 'pending':
      return 'Pendiente'
    case 'overdue':
      return '⚠ Atrasada'
    default:
      return status
  }
}

export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export function daysUntilDue(dueDate: string): number {
  const today = new Date()
  const due = new Date(dueDate)
  const diff = due.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getStatusFromDueDate(dueDate: string, completed: boolean): 'completed' | 'overdue' | 'in_progress' | 'pending' {
  if (completed) return 'completed'

  const days = daysUntilDue(dueDate)
  if (days < 0) return 'overdue'
  if (days === 0) return 'in_progress'

  return 'pending'
}
