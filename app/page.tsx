'use client'

import Link from 'next/link'
import { ArrowRight, Users, Zap, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-brand">DANA Flowchart</div>
          <nav className="flex gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand">
              Ingresar
            </Link>
            <Link href="/auth/signup" className="text-sm font-medium bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-ink transition-colors">
              Registrarse
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-slate-900 dark:text-white">
            Gestiona tus procesos en <span className="text-brand">tiempo real</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            DANA Flowchart permite que tus equipos colaborativos establezcan circuitos de trabajo,
            asignen tareas y vean el progreso en cada etapa.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-brand text-white px-8 py-3 rounded-lg font-medium hover:bg-brand-ink transition-colors">
              Comenzar gratis <ArrowRight className="w-4 h-4" />
            </Link>
            <button className="px-8 py-3 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Ver demo
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <Users className="w-12 h-12 text-brand mb-4" />
            <h3 className="text-xl font-bold mb-2">Equipos Colaborativos</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Invita a tu equipo, asigna roles y supervisa el progreso en tiempo real.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <Zap className="w-12 h-12 text-brand mb-4" />
            <h3 className="text-xl font-bold mb-2">Procesos Flexibles</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Crea procesos, define pasos y aterriza nuevas tareas en cualquier momento.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <BarChart3 className="w-12 h-12 text-brand mb-4" />
            <h3 className="text-xl font-bold mb-2">Reportes Detallados</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Analiza el progreso de tus equipos con reportes visuales y métricas clave.
            </p>
          </div>
        </div>

        {/* Pricing preview */}
        <div className="text-center mb-20">
          <h2 className="text-3xl font-bold mb-12">Planes simples y transparentes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Free', price: '0', users: '3', processes: '5' },
              { name: 'Pro', price: '29', users: '10', processes: '30' },
              { name: 'Enterprise', price: 'Custom', users: 'Ilimitados', processes: 'Ilimitados' },
            ].map((plan) => (
              <div key={plan.name} className={`p-8 rounded-lg border ${plan.name === 'Pro' ? 'border-brand bg-blue-50 dark:bg-slate-800 shadow-lg' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-brand mb-4">
                  ${plan.price}
                </div>
                <ul className="text-left text-sm text-slate-600 dark:text-slate-400 space-y-2 mb-6">
                  <li>✓ {plan.users} usuarios</li>
                  <li>✓ {plan.processes} procesos</li>
                  <li>✓ Reportes básicos</li>
                </ul>
                <button className={`w-full py-2 rounded-lg font-medium transition-colors ${plan.name === 'Pro' ? 'bg-brand text-white hover:bg-brand-ink' : 'border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  Seleccionar
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-600 dark:text-slate-400 text-sm">
          <p>&copy; 2024 DANA Flowchart. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
