'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
      <h1 className="text-3xl font-bold mb-6 text-center">Ingresar</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
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
          {loading ? 'Cargando...' : 'Ingresar'}
        </button>
      </form>

      <p className="text-center text-slate-600 dark:text-slate-400 mt-6 text-sm">
        ¿No tienes cuenta?{' '}
        <Link href="/auth/signup" className="text-brand font-medium hover:text-brand-ink">
          Registrarse
        </Link>
      </p>
    </div>
  )
}
