# Setup Rápido - Guía en Español

## 🚀 Configuración Inicial

### 1. Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de configuración local
cp env.local.template .env.local

# 3. Editar .env.local con tus credenciales de Supabase (desarrollo)
# Obtén las credenciales desde: https://supabase.com/dashboard
# Settings > API

# 4. Verificar configuración
npm run check-env:local

# 5. Ejecutar en desarrollo
npm run dev
```

### 2. Producción en Vercel

#### Paso 1: Crear proyecto Supabase de Producción
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Crea un **nuevo proyecto** para producción
3. Ejecuta las migraciones (schema.sql) en este proyecto
4. Anota la URL y clave pública

#### Paso 2: Desplegar en Vercel
1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en "Add New Project"
3. Conecta tu repositorio de GitHub/GitLab
4. En "Environment Variables", agrega:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-prod.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=tu_clave_publica_prod
   NODE_ENV=production
   ```
5. Click en "Deploy"

## 📋 Estructura de Entornos

### Desarrollo Local
- **Next.js**: Ejecuta localmente (`npm run dev`)
- **Supabase**: Proyecto en la nube (desarrollo)
- **Archivo**: `.env.local`

### Producción
- **Next.js**: Vercel
- **Supabase**: Proyecto en la nube (producción)
- **Configuración**: Variables de entorno en Vercel

## ✅ Verificación

```bash
# Verificar configuración local
npm run check-env:local

# Verificar configuración de producción (antes de deploy)
npm run check-env:prod
```

## 🔧 Troubleshooting

### Error: Variables de entorno no encontradas
- Asegúrate de haber creado `.env.local` desde `.env.local.example`
- Verifica que las variables no tengan espacios extra

### Error en Vercel: "Unauthorized"
- Verifica que las variables de entorno en Vercel sean correctas
- Asegúrate de usar las credenciales del proyecto de **producción** de Supabase
- Después de cambiar variables, haz un nuevo deploy

## 📚 Documentación Completa

Para más detalles, consulta [DEPLOYMENT.md](./DEPLOYMENT.md)

