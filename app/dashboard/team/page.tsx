'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Trash2, Users } from 'lucide-react'

interface Member {
  id: string
  email: string
  role: 'admin' | 'manager' | 'worker'
  joined_at: string
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'worker'>('worker')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's organization
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()

      if (!memberData) return

      // Get all members
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('id, role, created_at, user:auth.users(id, email)')
        .eq('org_id', memberData.org_id)

      if (membersData) {
        const formatted = membersData
          .filter((m: any) => m.user)
          .map((m: any) => ({
            id: m.id,
            email: m.user.email,
            role: m.role,
            joined_at: m.created_at,
          }))
        setMembers(formatted)
      }
    } catch (err) {
      console.error('Error loading members:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Get user's organization
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()

      if (!memberData) throw new Error('No organization found')

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', inviteEmail)
        .single()

      if (existingUser) {
        // Add existing user to organization
        const { error: addError } = await supabase
          .from('organization_members')
          .insert({
            org_id: memberData.org_id,
            user_id: existingUser.id,
            role: inviteRole,
          })

        if (addError) throw addError
      } else {
        // Create new user (note: in production, this would be done via a magic link/invite flow)
        throw new Error('Usuario no existe. Deben registrarse primero.')
      }

      setInviteEmail('')
      loadMembers()
    } catch (err: any) {
      setError(err.message || 'Error al invitar miembro')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('¿Eliminar este miembro de la organización?')) {
      try {
        await supabase.from('organization_members').delete().eq('id', memberId)
        loadMembers()
      } catch (err) {
        setError('Error al eliminar miembro')
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Equipo</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Gestiona los miembros de tu organización</p>
      </div>

      {/* Invite section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Invitar nuevo miembro
        </h2>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleInvite} className="flex gap-3 flex-wrap">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            required
            className="flex-1 min-w-64"
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} className="flex-1 min-w-40">
            <option value="worker">Worker</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={inviting || !inviteEmail}
            className="bg-brand text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-ink disabled:opacity-50 transition-colors"
          >
            {inviting ? 'Invitando...' : 'Invitar'}
          </button>
        </form>
      </div>

      {/* Members list */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Users className="w-5 h-5" /> Miembros del equipo ({members.length})
        </h2>

        {loading ? (
          <div className="text-center py-12 text-slate-600 dark:text-slate-400">Cargando...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            No hay miembros aún. Invita a los primeros.
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">{member.email}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Rol: <span className="font-medium">{member.role}</span> • Se unió{' '}
                    {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Eliminar miembro"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roles explanation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-lg">
        <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-3">Roles de usuario</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>
            <strong>Admin:</strong> Acceso total a la organización, configuración y miembros
          </li>
          <li>
            <strong>Manager:</strong> Puede crear procesos y asignar tareas
          </li>
          <li>
            <strong>Worker:</strong> Puede ver y marcar tareas asignadas
          </li>
        </ul>
      </div>
    </div>
  )
}
