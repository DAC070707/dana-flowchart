'use client'

import Link from 'next/link'
import { Plus, Edit2, Trash2 } from 'lucide-react'

export default function ProcessesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Procesos</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Gestiona los circuitos de trabajo de tu empresa</p>
        </div>
        <Link href="/dashboard/processes/new" className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-ink transition-colors">
          <Plus className="w-5 h-5" /> Nuevo proceso
        </Link>
      </div>

      {/* Processes list */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-8 text-center text-slate-600 dark:text-slate-400">
          <p className="text-lg mb-2">No tienes procesos aún</p>
          <p className="text-sm mb-4">Crea tu primer proceso para comenzar a gestionar los circuitos de trabajo</p>
          <Link href="/dashboard/processes/new" className="inline-block bg-brand text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-ink transition-colors">
            Crear primer proceso
          </Link>
        </div>
      </div>

      {/* Example structure for when there are processes */}
      {false && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Proceso {i}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Descripción del proceso</p>
                <div className="flex gap-2 mt-3">
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">5 pasos</span>
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">3 asignadas</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <Edit2 className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
