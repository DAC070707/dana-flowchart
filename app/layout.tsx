import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DANA Flowchart - Gestión de Procesos',
  description: 'Plataforma SaaS para gestionar procesos y equipos colaborativos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
