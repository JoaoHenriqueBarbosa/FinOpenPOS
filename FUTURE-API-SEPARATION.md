# Separación de API en el Futuro

Este documento explica cómo separar las API routes de Next.js a un servidor independiente si es necesario en el futuro.

## Situación Actual

Actualmente, la aplicación usa **Next.js API Routes** que se ejecutan en el mismo servidor que el frontend. Esto es eficiente y suficiente para la mayoría de casos de uso.

Las API routes están en: `src/app/api/**/*.ts`

## ¿Cuándo Separar la API?

Considera separar la API si:
- Necesitas escalar la API independientemente del frontend
- Tienes múltiples clientes (web, mobile, etc.) que consumen la misma API
- Necesitas usar tecnologías específicas del backend que Next.js no soporta bien
- Quieres tener control total sobre el servidor de API

## Opciones de Plataformas

### Render (Recomendado para empezar)
- ✅ Plan gratuito generoso (750 horas/mes)
- ✅ Auto-deploy desde Git
- ✅ Fácil configuración
- ⚠️ Sleep después de 15 min de inactividad (cold start)

### Railway (Recomendado si necesitas siempre activo)
- ✅ Plan gratuito con $5 de crédito/mes
- ✅ No duerme (siempre activo)
- ✅ Deploy rápido
- ⚠️ Créditos limitados en plan gratuito

## Pasos para Separar la API

### 1. Crear Servidor API Independiente

#### Opción A: Express.js (Recomendado)

```bash
# Crear nuevo proyecto para API
mkdir api-server
cd api-server
npm init -y
npm install express cors dotenv
npm install @supabase/supabase-js
npm install -D @types/express @types/cors typescript ts-node nodemon
```

**Estructura sugerida:**
```
api-server/
├── src/
│   ├── routes/
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   └── ...
│   ├── middleware/
│   │   └── auth.ts
│   ├── lib/
│   │   └── supabase.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Ejemplo de servidor (src/index.ts):**
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
```

#### Opción B: Next.js Standalone API

Puedes usar Next.js en modo standalone solo para API:

```bash
# En next.config.mjs
const nextConfig = {
  output: 'standalone',
  // ... resto de configuración
};
```

Luego desplegar solo las rutas de API.

### 2. Migrar las API Routes

Para cada archivo en `src/app/api/**/*.ts`:

1. Extraer la lógica a funciones reutilizables
2. Crear rutas en el nuevo servidor
3. Mantener la misma estructura de respuesta

**Ejemplo de migración:**

**Antes (Next.js API Route):**
```typescript
// src/app/api/products/route.ts
import { NextResponse } from 'next/server';
import { createRepositories } from '@/lib/repository-factory';

export async function GET(request: Request) {
  const repos = await createRepositories();
  const products = await repos.products.findAll();
  return NextResponse.json(products);
}
```

**Después (Express Route):**
```typescript
// api-server/src/routes/products.ts
import { Router } from 'express';
import { createRepositories } from '../lib/repository-factory';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const repos = await createRepositories(req);
    const products = await repos.products.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### 3. Actualizar el Frontend

En el frontend, actualizar las llamadas a la API:

**Antes:**
```typescript
const response = await fetch('/api/products');
```

**Después:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const response = await fetch(`${API_URL}/api/products`);
```

### 4. Configurar Variables de Entorno

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

**API Server (.env):**
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 5. Desplegar

#### Render
1. Crear nuevo servicio "Web Service"
2. Conectar repositorio
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Agregar variables de entorno

#### Railway
1. Crear nuevo proyecto
2. Conectar repositorio
3. Railway detecta automáticamente Node.js
4. Agregar variables de entorno
5. Deploy automático

### 6. Actualizar Frontend para Producción

En Vercel, agregar:
```
NEXT_PUBLIC_API_URL=https://tu-api.render.com
# o
NEXT_PUBLIC_API_URL=https://tu-api.railway.app
```

## Autenticación entre Frontend y API

### Opción 1: JWT Tokens (Recomendado)
1. Frontend obtiene token de Supabase
2. Envía token en header `Authorization: Bearer <token>`
3. API valida token con Supabase

### Opción 2: Service Role Key (Solo para APIs internas)
- ⚠️ **No usar en producción** si la API es pública
- Solo para APIs completamente privadas

## Ejemplo de Middleware de Autenticación

```typescript
// api-server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = user;
  next();
}
```

## Checklist de Migración

- [ ] Crear servidor API independiente
- [ ] Migrar todas las rutas de API
- [ ] Configurar autenticación
- [ ] Actualizar frontend para usar nueva URL de API
- [ ] Configurar variables de entorno
- [ ] Desplegar API en Render/Railway
- [ ] Actualizar variables de entorno en Vercel
- [ ] Probar en producción
- [ ] Configurar CORS correctamente
- [ ] Monitorear logs y errores

## Notas Importantes

1. **CORS**: Asegúrate de configurar CORS correctamente para permitir requests desde el frontend
2. **Autenticación**: Mantén la seguridad, nunca expongas service role keys en el frontend
3. **Variables de Entorno**: Usa diferentes proyectos de Supabase para desarrollo y producción
4. **Logs**: Configura logging adecuado en el servidor de API
5. **Monitoreo**: Considera usar servicios de monitoreo (Sentry, LogRocket, etc.)

## Recursos

- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Supabase Auth with Express](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

