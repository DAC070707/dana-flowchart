# DANA Flowchart 🚀

Plataforma SaaS para gestión de procesos y equipos colaborativos. Permite a las empresas definir circuitos de trabajo, asignar tareas y hacer seguimiento en tiempo real.

## Características principales

✨ **Gestión de Procesos**
- Crear circuitos de trabajo personalizados
- Definir pasos con duración estimada
- Asignar procesos a miembros del equipo

👥 **Equipos Colaborativos**
- Invitar a colegas a tu organización
- Asignar roles (Admin, Manager, Worker)
- Seguimiento del progreso en tiempo real

📊 **Reportes y Analytics**
- Ver progreso de cada tarea
- Identificar cuellos de botella
- Exportar reportes

💰 **Planes de Pago**
- **Free**: 3 usuarios, 5 procesos
- **Pro**: $29/mes, 10 usuarios, 30 procesos, reportes avanzados
- **Enterprise**: Plan custom con soporte

## Tech Stack

- **Frontend**: Next.js 15 + React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Autenticación**: Supabase Auth
- **Pagos**: Stripe
- **Hosting**: Vercel (Frontend)

## Requisitos

- Node.js 18+
- Cuenta en Supabase
- Cuenta en Stripe (para pagos)

## Instalación

### 1. Clonar repositorio

```bash
git clone https://github.com/tu-usuario/dana-flowchart.git
cd dana-flowchart
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Copia la URL y anon key
3. Crea `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### 4. Crear tablas

En el SQL editor de Supabase, ejecuta el contenido de `supabase/schema.sql`

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Estructura del Proyecto

```
dana-flowchart/
├── app/
│   ├── page.tsx              # Landing page
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── dashboard/
│       ├── page.tsx          # Dashboard principal
│       ├── processes/        # Gestión de procesos
│       ├── tasks/            # Gestión de tareas
│       └── reports/          # Reportes
├── lib/
│   ├── supabase.ts          # Cliente Supabase
│   └── types.ts             # Types TypeScript
├── supabase/
│   └── schema.sql           # Schema de BD
└── README.md
```

## Flujo de la Aplicación

### Para Admin/Manager:
1. ✅ Crear empresa
2. ✅ Definir procesos con pasos
3. ✅ Invitar miembros del equipo
4. ✅ Asignar tareas/procesos a workers
5. ✅ Ver reportes de progreso

### Para Workers:
1. ✅ Recibir tareas asignadas
2. ✅ Ver el proceso y pasos
3. ✅ Marcar pasos como completados
4. ✅ Ver su progreso

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit los cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo licencia MIT.

## Soporte

Para soporte, contacta a [support@danaflowchart.com](mailto:support@danaflowchart.com)

---

Hecho con ❤️ por [Tu nombre]
