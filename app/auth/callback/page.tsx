'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function CallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        // Check if user has an organization
        const { data: member } = await supabase
          .from('organization_members')
          .select('org_id')
          .eq('user_id', user.id)
          .single()

        if (!member) {
          // Create organization for new Google OAuth users
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: user.email?.split('@')[0] || 'Mi Empresa',
              slug: (user.email?.split('@')[0] || 'empresa').toLowerCase().replace(/\s+/g, '-'),
              plan: 'free',
              max_users: 3,
              max_processes: 5,
            })
            .select()
            .single()

          if (orgError) throw orgError

          // Add user as admin
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
              org_id: org.id,
              user_id: user.id,
              role: 'admin',
            })

          if (memberError) throw memberError
        }

        router.push('/dashboard')
      } catch (error) {
        console.error('Callback error:', error)
        router.push('/auth/login')
      }
    }

    handleCallback()
  }, [router, supabase])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">Completando registro...</p>
      </div>
    </div>
  )
}
