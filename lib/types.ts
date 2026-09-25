export type UserRole = 'admin' | 'manager' | 'worker'

export interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
  plan: 'free' | 'pro' | 'enterprise'
  max_users: number
  max_processes: number
}

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  created_at: string
}

export interface OrganizationMember {
  id: string
  org_id: string
  user_id: string
  role: UserRole
  created_at: string
  user: User
}

export interface Process {
  id: string
  org_id: string
  name: string
  description: string
  color: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Step {
  id: string
  process_id: string
  title: string
  description: string
  order: number
  duration_days?: number
  created_at: string
  updated_at: string
}

export interface TaskAssignment {
  id: string
  process_id: string
  assigned_to: string
  assigned_by: string
  title: string
  description: string
  due_date: string
  created_at: string
  updated_at: string
}

export interface StepProgress {
  id: string
  task_id: string
  step_id: string
  completed: boolean
  completed_at?: string
  completed_by?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Report {
  task_id: string
  process_name: string
  assigned_to: string
  progress_percentage: number
  completed_steps: number
  total_steps: number
  due_date: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
}
