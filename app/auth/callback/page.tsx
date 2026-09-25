'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function CallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const params = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.slice(1))
      const urlError = params.get('error_description') || hash.get('error_description')
      if (urlError) {
        setError(urlError)
        return
      }

      // getSession waits for the client's automatic URL detection to finish
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
        return
      }

      const code = params.get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!exchangeError) {
          router.replace('/dashboard')
          return
        }
        setError(exchangeError.message)
        return
      }

      setError('No se recibió ninguna sesión desde el proveedor.')
    }
    run()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md px-4">
        {error ? (
          <>
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">No se pudo iniciar sesión</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 break-words">{error}</p>
            <Link href="/auth/login" className="text-brand font-medium hover:text-brand-ink">
              Volver a ingresar
            </Link>
          </>
        ) : (
          <>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Completando registro...</p>
          </>
        )}
      </div>
    </div>
  )
}
