# Guía de Despliegue y Configuración de Entornos

Esta guía explica cómo configurar la aplicación para desarrollo local y producción.

## Arquitectura

### Opción Recomendada: Todo en Vercel (100% Free)
- **Frontend + API Routes**: Vercel (Next.js incluye las API routes)
- **Base de Datos**: Supabase
- **Autenticación**: Supabase Auth

### Opción Alternativa: Separar API (si es necesario en el futuro)
Si en el futuro necesitas separar las API routes a un servidor independiente:
- **Frontend**: Vercel
- **API Backend**: Render / Railway
- **Base de Datos**: Supabase
- **Autenticación**: Supabase Auth

> **Nota**: Actualmente las API routes están en Next.js, por lo que se ejecutan en el mismo servidor que el frontend. Esto es eficiente y suficiente para la mayoría de casos de uso.

## Configuración de Entornos

### 1. Desarrollo Local

#### Paso 1: Crear proyecto Supabase para Desarrollo
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Crea un nuevo proyecto (o usa uno existente para desarrollo)
3. Anota la URL y la clave pública

#### Paso 2: Configurar variables de entorno local
1. Copia `env.local.template` a `.env.local`:
   ```bash
   cp env.local.template .env.local
   ```

2. Edita `.env.local` y completa con tus valores:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-dev.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=tu_clave_publica_dev
   ```

#### Paso 3: Ejecutar localmente
```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### 2. Producción en Vercel

#### Paso 1: Crear proyecto Supabase para Producción
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Crea un **nuevo proyecto** separado para producción
3. Ejecuta las migraciones en este proyecto:
   ```bash
   # Conecta a tu proyecto de producción y ejecuta schema.sql
   ```
4. Anota la URL y la clave pública del proyecto de producción

#### Paso 2: Preparar el repositorio
1. Asegúrate de que tu código esté en GitHub/GitLab/Bitbucket
2. Verifica que `.env.local` esté en `.gitignore` (ya está configurado)

#### Paso 3: Desplegar en Vercel
1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en "Add New Project"
3. Importa tu repositorio
4. Configura las variables de entorno en Vercel:
   - Ve a Settings > Environment Variables
   - Agrega las siguientes variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-prod.supabase.co
     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=tu_clave_publica_prod
     NODE_ENV=production
     ```
5. Selecciona el framework: **Next.js** (se detecta automáticamente)
6. Click en "Deploy"

#### Paso 4: Configurar dominio (opcional)
1. En Vercel, ve a Settings > Domains
2. Agrega tu dominio personalizado si lo deseas

## Comparación: Render vs Railway para API

Si en el futuro necesitas separar las API routes:

### Render
- ✅ Plan gratuito generoso (750 horas/mes)
- ✅ Auto-deploy desde Git
- ✅ Sleep después de 15 min de inactividad (gratis)
- ✅ Fácil configuración
- ⚠️ Cold start puede ser lento después del sleep

### Railway
- ✅ Plan gratuito con $5 de crédito/mes
- ✅ No duerme (siempre activo)
- ✅ Mejor para APIs que necesitan estar siempre disponibles
- ✅ Deploy rápido
- ⚠️ Créditos limitados en plan gratuito

**Recomendación**: Para la mayoría de casos, **Vercel es suficiente** ya que Next.js API routes son eficientes. Si necesitas separar, usa **Railway** si necesitas que la API esté siempre activa, o **Render** si puedes tolerar cold starts.

## Estructura de Variables de Entorno

### Variables Requeridas
- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`: Clave pública/anónima de Supabase

### Variables Opcionales
- `NODE_ENV`: `development` o `production`
- `NEXT_PUBLIC_APP_URL`: URL base de la aplicación (se configura automáticamente en Vercel)

## Migración de Datos

Si necesitas migrar datos del entorno de desarrollo a producción:

1. **Exportar desde Supabase Dev**:
   - Ve a Database > Backups
   - Descarga el backup o usa pg_dump

2. **Importar a Supabase Prod**:
   - Ve a SQL Editor en el proyecto de producción
   - Ejecuta el script SQL o restaura el backup

## Troubleshooting

### Error: "Unauthorized" en producción
- Verifica que las variables de entorno estén configuradas correctamente en Vercel
- Asegúrate de usar las credenciales del proyecto de **producción** de Supabase

### Error de conexión a Supabase
- Verifica que la URL y la clave sean correctas
- Asegúrate de que el proyecto de Supabase esté activo
- Revisa los logs en Vercel (Deployments > View Function Logs)

### Variables de entorno no se aplican
- En Vercel, asegúrate de que las variables estén configuradas para el entorno correcto (Production, Preview, Development)
- Después de agregar variables, necesitas hacer un nuevo deploy

## Checklist de Despliegue

- [ ] Proyecto Supabase de desarrollo creado y configurado
- [ ] `.env.local` configurado con credenciales de desarrollo
- [ ] Aplicación funciona correctamente en local
- [ ] Proyecto Supabase de producción creado
- [ ] Migraciones ejecutadas en Supabase producción
- [ ] Repositorio en GitHub/GitLab/Bitbucket
- [ ] Proyecto creado en Vercel
- [ ] Variables de entorno configuradas en Vercel (producción)
- [ ] Deploy exitoso en Vercel
- [ ] Aplicación funciona correctamente en producción
- [ ] Dominio personalizado configurado (opcional)

## Recursos

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)

