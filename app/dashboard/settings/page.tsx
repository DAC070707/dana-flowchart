'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Settings, Lock, DollarSign } from 'lucide-react'

interface Organization {
  id: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  max_users: number
  max_processes: number
}

export default function SettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null)
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadOrganization()
  }, [])

  const loadOrganization = async () => {
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

      // Get organization
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, plan, max_users, max_processes')
        .eq('id', memberData.org_id)
        .single()

      if (orgData) {
        setOrg(orgData)
        setOrgName(orgData.name)
      }
    } catch (err) {
      console.error('Error loading organization:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!org) return

    setSaving(true)
    try {
      await supabase
        .from('organizations')
        .update({ name: orgName })
        .eq('id', org.id)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configuración</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Gestiona tu organización y preferencias</p>
      </div>

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
          ✓ Cambios guardados exitosamente
        </div>
      )}

      {/* Organization settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-brand" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Organización</h2>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Nombre de la organización</label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Plan actual</p>
            <p className="font-bold text-slate-900 dark:text-white capitalize mt-1">{org?.plan}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Usuarios máximos</p>
            <p className="font-bold text-slate-900 dark:text-white mt-1">{org?.max_users}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Procesos máximos</p>
            <p className="font-bold text-slate-900 dark:text-white mt-1">{org?.max_processes}</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || orgName === org?.name}
          className="bg-brand text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-ink disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* Plan settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="w-6 h-6 text-green-500" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Plan de pago</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Free', price: '0', features: ['3 usuarios', '5 procesos', 'Reportes básicos'] },
            { name: 'Pro', price: '29', features: ['10 usuarios', '30 procesos', 'Reportes avanzados', 'Prioridad'], active: org?.plan === 'pro' },
            { name: 'Enterprise', price: 'Custom', features: ['Usuarios ilimitados', 'Procesos ilimitados', 'Soporte 24/7', 'Integraciones'] },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`p-6 rounded-lg border transition-all ${
                plan.active
                  ? 'border-brand bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                  : 'border-slate-200 dark:border-slate-700 hover:border-brand'
              }`}
            >
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{plan.name}</h3>
              <p className="text-3xl font-bold text-brand mb-4">${plan.price}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-400">
                    ✓ {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={plan.active}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  plan.active
                    ? 'bg-brand text-white cursor-default'
                    : 'border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {plan.active ? '✓ Plan actual' : 'Cambiar a ' + plan.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Security settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-orange-500" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Seguridad</h2>
        </div>

        <div>
          <h3 className="font-bold text-slate-900 dark:text-white mb-2">Cambiar contraseña</h3>
          <button className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Actualizar contraseña
          </button>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-2">Peligro</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Eliminar la organización no se puede deshacer.
          </p>
          <button className="px-6 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            Eliminar organización
          </button>
        </div>
      </div>
    </div>
  )
}
