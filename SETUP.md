# Setup de DANA Flowchart 🚀

Guía paso a paso para configurar tu instancia de DANA Flowchart.

## 1. Configurar Supabase

### 1.1 Crear proyecto

1. Ve a [supabase.com](https://supabase.com)
2. Click en "New Project"
3. Elige:
   - Nombre del proyecto: `dana-flowchart`
   - Organization: Tu organización
   - Password: Guarda en lugar seguro
   - Region: La más cercana a ti

### 1.2 Obtener credenciales

1. Una vez creado, ve a Settings > API
2. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 1.3 Crear tablas

1. Ve a SQL Editor > New Query
2. Pega el contenido de `supabase/schema.sql`
3. Click "Run"

### 1.4 Habilitar Auth

1. Ve a Authentication > Providers
2. Asegúrate de que "Email" está habilitado
3. Ve a Authentication > Policies
4. Verifica que RLS esté habilitado

## 2. Configurar variables de entorno

1. Crea `.env.local` en la raíz:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

## 3. Instalar dependencias

```bash
npm install
```

## 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 5. Crear cuenta de prueba

1. Ve a Sign up
2. Usa un email de prueba
3. Crea tu primera empresa

## 6. (Opcional) Configurar Stripe para pagos

### 6.1 Crear cuenta Stripe

1. Ve a [stripe.com](https://stripe.com)
2. Crea una cuenta
3. Ve a API keys

### 6.2 Agregar variables

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 6.3 Crear productos en Stripe

1. Ve a Products
2. Crea:
   - **Free** (gratis, uso limitado)
   - **Pro** ($29/mes)
   - **Enterprise** (custom)

## 7. Deploy en Vercel

### 7.1 Preparar repo Git

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/dana-flowchart.git
git push -u origin main
```

### 7.2 Conectar en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Click "New Project"
3. Importa tu repositorio
4. Agrega variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `STRIPE_SECRET_KEY` (si tienes)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (si tienes)
5. Deploy

## 8. Verificar instalación

✅ Accede a tu URL de Vercel
✅ Crea una cuenta
✅ Crea un proceso
✅ Asigna un paso

## Problemas comunes

### Error: "No organization found"

**Causa**: Las RLS policies no se ejecutaron correctamente.

**Solución**: 
1. Ve a SQL Editor en Supabase
2. Ejecuta `supabase/schema.sql` nuevamente
3. Verifica que no haya errores

### Error: "Invalid API key"

**Causa**: Variables de entorno incorrectas

**Solución**:
1. Verifica que copiaste correctamente desde Supabase
2. Reinicia el servidor (`npm run dev`)

### Auth no funciona

**Causa**: Email verification habilitado

**Solución**:
1. Ve a Authentication > Email Templates
2. Desactiva "Confirm email" para desarrollo

## Siguientes pasos

1. ✨ Personaliza colores en `tailwind.config.js`
2. 📧 Configura emails transaccionales en Supabase
3. 💳 Integra Stripe para pagos
4. 📱 Optimiza para mobile
5. 🔔 Agrega notificaciones en tiempo real

## Contacto

¿Preguntas? Abre un issue en el repositorio.
