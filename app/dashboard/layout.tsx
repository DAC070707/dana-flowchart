'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Menu, X, LogOut, Settings } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      } else {
        setUser(user)
      }
    }
    getUser()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 fixed h-screen left-0 top-0 z-40`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          {sidebarOpen && <span className="text-xl font-bold text-brand">DANA</span>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <NavLink href="/dashboard" icon="📊" label="Dashboard" expanded={sidebarOpen} />
          <NavLink href="/dashboard/processes" icon="⚙️" label="Procesos" expanded={sidebarOpen} />
          <NavLink href="/dashboard/tasks" icon="✓" label="Tareas" expanded={sidebarOpen} />
          <NavLink href="/dashboard/reports" icon="📈" label="Reportes" expanded={sidebarOpen} />
          <NavLink href="/dashboard/team" icon="👥" label="Equipo" expanded={sidebarOpen} />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
          <NavLink href="/dashboard/settings" icon="⚙️" label="Configuración" expanded={sidebarOpen} />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && 'Salir'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Top bar */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{user.email}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Admin</p>
              </div>
            )}
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt="Avatar"
              className="w-10 h-10 rounded-full"
            />
          </div>
        </header>

        {/* Page content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function NavLink({
  href,
  icon,
  label,
  expanded,
}: {
  href: string
  icon: string
  label: string
  expanded: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
    >
      <span className="text-lg">{icon}</span>
      {expanded && label}
    </Link>
  )
}
