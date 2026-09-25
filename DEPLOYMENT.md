# Deploy DANA Flowchart a Vercel 🚀

Guía paso a paso para subir el proyecto a GitHub y deployar en Vercel.

## Paso 1: Crear repositorio en GitHub

### 1.1 Ir a GitHub
1. Ve a https://github.com/new
2. **Repository name**: `dana-flowchart`
3. **Description**: "SaaS platform for process management and collaborative teams"
4. **Visibility**: Public (o Private si prefieres)
5. **No inicializar** con README, .gitignore, o license (ya tenemos)
6. Click **Create repository**

### 1.2 Conectar con tu máquina

Después de crear, GitHub te mostrará comandos. Reemplaza `TU-USUARIO` en los comandos abajo:

```bash
# En la carpeta del proyecto (C:\CLAUDE\dana-flowchart)
git remote add origin https://github.com/TU-USUARIO/dana-flowchart.git
git branch -M main
git push -u origin main
```

**Ejemplo si tu usuario es "juanperez"**:
```bash
git remote add origin https://github.com/juanperez/dana-flowchart.git
git branch -M main
git push -u origin main
```

Esto pedirá tus credenciales. Usa:
- **Username**: Tu usuario de GitHub
- **Password**: Tu personal access token (o GitHub CLI)

Si no tienes token, crea uno:
1. GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Generate new token
3. Dale permisos: `repo` (todo)
4. Copia y usa como contraseña en la terminal

## Paso 2: Verificar en GitHub

1. Ve a https://github.com/TU-USUARIO/dana-flowchart
2. Deberías ver:
   - ✅ 30 archivos
   - ✅ Branch `main`
   - ✅ Initial commit

## Paso 3: Preparar Vercel

### 3.1 Crear cuenta en Vercel
1. Ve a https://vercel.com
2. Click "Sign up"
3. Click "Continue with GitHub"
4. Autoriza Vercel

### 3.2 Crear proyecto en Vercel
1. Vas a https://vercel.com/new
2. Click "Import Git Repository"
3. Busca `dana-flowchart`
4. Click "Import"

### 3.3 Configurar variables de entorno

**En Vercel (durante el import):**

1. Encontrarás una sección "Environment Variables"
2. Agrega estas 2 variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Dónde obtenerlas:**
- Ve a tu proyecto en supabase.com
- Settings > API
- Copia "Project URL" y "anon public" key

### 3.4 Deploy

1. Click **Deploy**
2. Espera 2-3 minutos
3. ¡Listo! Vercel te dará una URL como:
   ```
   https://dana-flowchart-xxxxx.vercel.app
   ```

## Paso 4: Conectar Supabase

### 4.1 En tu máquina

1. Copia `.env.local.example` a `.env.local`
2. Llena con tus credenciales de Supabase
3. Haz commit y push:

```bash
git add .env.local
git commit -m "Add environment variables"
git push
```

⚠️ **IMPORTANTE**: Nunca hagas push de `.env.local` en producción. En Vercel ya lo configuraste en las variables de entorno.

### 4.2 Crear tablas en Supabase

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. SQL Editor > New Query
4. Copia TODO el contenido de `supabase/schema.sql`
5. Pega en el editor
6. Click **Run**

**Resultado esperado**: 
- ✅ 6 tablas creadas (organizations, organization_members, processes, steps, task_assignments, step_progress)
- ✅ Índices creados
- ✅ RLS habilitado

### 4.3 Habilitar Auth

En Supabase:
1. Ve a Authentication > Providers
2. Asegúrate de que "Email" esté ✅ habilitado
3. Ve a Email Templates
4. Desactiva "Confirm email" para desarrollo (opcional)

## Paso 5: Probar todo

### 5.1 Localmente

```bash
npm install
npm run dev
# Abre http://localhost:3000
```

- Intenta crear una cuenta
- Ve que se cree la organización
- Intenta crear un proceso

### 5.2 En Vercel

1. Ve a https://dana-flowchart-xxxxx.vercel.app
2. Intenta el mismo flujo
3. Verifica que funcione igual

## Paso 6: Próximas actualizaciones

Cada vez que hagas cambios:

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

Vercel automáticamente re-deployará tu app. Puedes ver el progreso en vercel.com/dashboard

## 🔍 Troubleshooting

### Error: "Invalid API key"
- Verifica que copiaste correctamente de Supabase
- Recarga la página
- Limpia caché del navegador

### Error: "No organization found" al login
- Las RLS policies no se ejecutaron
- Re-ejecuta `supabase/schema.sql`
- Verifica que no haya errores en la terminal de SQL

### Vercel muestra error 500
- Revisa los logs en Vercel: https://vercel.com/dashboard
- Verifica que las variables de entorno estén correctas

### Cambios no aparecen en Vercel
- Espera a que terminen de deployarse
- Limpia caché: Ctrl+Shift+R (o Cmd+Shift+R en Mac)
- Revisa que el push se completó: `git log`

## 📊 Monitoreo

### En Vercel
- Dashboard > Deployments: Ver todos los deploys
- Analytics: Ver tráfico y performance
- Settings > Domains: Conectar dominio custom

### En Supabase
- Dashboard > Usage: Ver datos guardados
- Logs: Ver errores de BD
- Settings > API: Ver limits y keys

## 🎯 Siguientes pasos

1. ✅ Deploy completado
2. ⏭️ Invita a tu equipo a probar
3. ⏭️ Recopila feedback
4. ⏭️ Integra Stripe para pagos
5. ⏭️ Agrega notificaciones en tiempo real

---

## Resumen de URLs

- **GitHub**: https://github.com/TU-USUARIO/dana-flowchart
- **Vercel**: https://dana-flowchart-xxxxx.vercel.app
- **Supabase**: https://supabase.com/dashboard/project/[tu-proyecto]

---

¿Problemas? Abre un issue en GitHub.
