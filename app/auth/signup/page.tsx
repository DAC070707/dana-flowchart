'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) throw new Error('No user returned')

      // 2. Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName || 'Mi Empresa',
          slug: orgName.toLowerCase().replace(/\s+/g, '-') || 'mi-empresa',
          plan: 'free',
          max_users: 3,
          max_processes: 5,
        })
        .select()
        .single()

      if (orgError) throw orgError

      // 3. Add user as admin
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          org_id: orgData.id,
          user_id: authData.user.id,
          role: 'admin',
        })

      if (memberError) throw memberError

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
      <h1 className="text-3xl font-bold mb-6 text-center">Crear cuenta</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Nombre de empresa</label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Mi Empresa"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-white font-medium py-2 rounded-lg hover:bg-brand-ink disabled:opacity-50 transition-colors"
        >
          {loading ? 'Registrando...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-slate-600 dark:text-slate-400 mt-6 text-sm">
        ¿Ya tienes cuenta?{' '}
        <Link href="/auth/login" className="text-brand font-medium hover:text-brand-ink">
          Ingresar
        </Link>
      </p>
    </div>
  )
}
