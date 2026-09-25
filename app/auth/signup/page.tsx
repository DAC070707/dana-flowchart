'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GoogleButton from '@/components/GoogleButton'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Organization + admin membership are created by the on_auth_user_created trigger
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, org_name: orgName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) throw authError

      if (!data.session) {
        setInfo('Te enviamos un correo de confirmación. Ábrelo para activar tu cuenta.')
        return
      }

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

      {info && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6 text-sm">
          {info}
        </div>
      )}

      <GoogleButton onError={setError} />

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
