import { createClient } from '@/lib/supabase'
import type { UserRole } from '@/lib/types'

export interface Membership {
  userId: string
  orgId: string
  role: UserRole
}

export interface Member {
  user_id: string
  email: string
  name: string
  role: UserRole
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Supervisor',
  worker: 'Colaborador',
}

export async function getMembership(): Promise<Membership | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return { userId: user.id, orgId: data.org_id, role: data.role }
}

export const canManage = (role?: UserRole) => role === 'admin' || role === 'manager'
