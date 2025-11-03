# Plan de Implementación: Modo Offline (PWA) - Sistema POS

## 📋 Información del Documento

**Versión:** 1.0
**Fecha:** 2025-01-25
**Duración Estimada:** 4-5 semanas (20-25 días hábiles)
**Prioridad:** Alta
**Complejidad:** Alta

---

## 🎯 Objetivo

Implementar capacidad offline completa (Progressive Web App) que permita:
- ✅ Continuar operando sin conexión a Internet
- ✅ Almacenar transacciones offline localmente
- ✅ Sincronizar automáticamente cuando se recupere la conexión
- ✅ Resolver conflictos de datos de forma inteligente
- ✅ Instalar la aplicación como PWA en dispositivos móviles y desktop

**SIN AFECTAR LA OPERACIÓN EN PRODUCCIÓN** - Todos los cambios son retrocompatibles.

---

## 📊 Estado Actual del Sistema

### Tecnologías Actuales:
- ✅ Next.js 15.4.6 (App Router)
- ✅ React 19.1.0
- ✅ PostgreSQL + Prisma ORM 6.14.0
- ✅ TanStack Query 5.85.6 (React Query)
- ✅ Zustand 5.0.7 con sessionStorage
- ✅ JWT Authentication (jose + jsonwebtoken)

### Análisis de Compatibilidad:
- ✅ **Service Workers:** Soportado por Next.js 15+
- ✅ **IndexedDB:** Soportado nativamente por todos los navegadores modernos
- ✅ **Background Sync API:** Disponible en Chrome, Edge, Opera (fallback para otros)
- ✅ **PWA Manifest:** Next.js soporta nativamente
- ✅ **Cache API:** Disponible en todos los navegadores modernos

---

## 🏗️ Arquitectura de la Solución

### Componentes Principales:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Next.js)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ UI Components│◄────►│ React Query  │                    │
│  └──────────────┘      └───────┬──────┘                    │
│                                 │                            │
│                                 ▼                            │
│                    ┌─────────────────────┐                  │
│                    │  Offline Manager    │                  │
│                    │  (Nuevo Componente) │                  │
│                    └──────────┬──────────┘                  │
│                               │                              │
│          ┌────────────────────┼────────────────────┐        │
│          ▼                    ▼                     ▼        │
│   ┌────────────┐      ┌────────────┐      ┌──────────────┐ │
│   │ IndexedDB  │      │   Queue    │      │Service Worker│ │
│   │  Storage   │      │  Manager   │      │   + Cache    │ │
│   └────────────┘      └────────────┘      └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │ Network Monitor │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
         [ONLINE MODE]              [OFFLINE MODE]
                │                         │
                ▼                         ▼
    ┌──────────────────┐      ┌──────────────────┐
    │ Server API       │      │ Local Storage    │
    │ (Supabase)       │      │ (IndexedDB)      │
    └──────────────────┘      └──────────────────┘
                │                         │
                └───────────┬─────────────┘
                            ▼
                  ┌───────────────────┐
                  │  Sync Service     │
                  │  (Reconciliation) │
                  └───────────────────┘
```

### Flujo de Datos:

**Modo Online:**
1. Usuario realiza acción (ej: crear venta)
2. React Query envía request al servidor
3. Servidor procesa y responde
4. IndexedDB se actualiza con la respuesta (caché local)
5. UI se actualiza

**Modo Offline:**
1. Usuario realiza acción (ej: crear venta)
2. Offline Manager detecta que no hay conexión
3. Operación se guarda en IndexedDB
4. Operación se agrega a la cola de sincronización
5. UI se actualiza optimísticamente con datos locales
6. Cuando vuelve la conexión → Sync Service procesa la cola

**Sincronización:**
1. Network Monitor detecta conexión
2. Sync Service toma operaciones de la cola
3. Envía operaciones al servidor en orden FIFO
4. Maneja conflictos (last-write-wins o merge inteligente)
5. Actualiza IndexedDB con respuestas del servidor
6. Invalida queries de React Query

---

## 🔧 Cambios en el Esquema Prisma (SAFE - Retrocompatibles)

### ⚠️ REGLAS CRÍTICAS:
1. ✅ **SOLO campos opcionales (nullable)**
2. ✅ **Valores por defecto cuando sea posible**
3. ✅ **NO campos requeridos nuevos**
4. ✅ **Migraciones seguras con `@default`**
5. ✅ **Testing exhaustivo antes de deploy**

### Modelo Nuevo: `OfflineQueue`

```prisma
// ============================================
// MODELO OFFLINE QUEUE - COLA DE SINCRONIZACIÓN
// ============================================
model OfflineQueue {
  id             String   @id @default(cuid())

  // Usuario y organización
  userId         String
  organizationId String?

  // Identificación de la operación
  operation      String   // "CREATE_SALE", "UPDATE_PRODUCT", etc.
  entity         String   // "Sale", "Product", "Customer", etc.
  entityId       String?  // ID local temporal (uuid)

  // Datos de la operación
  data           Json     // Payload completo de la operación

  // Control de sincronización
  status         OfflineQueueStatus @default(PENDING)
  attempts       Int      @default(0)
  maxAttempts    Int      @default(3)
  lastError      String?

  // Metadata
  clientId       String?  // Device/Browser fingerprint
  createdAt      DateTime @default(now()) // Timestamp local cuando se creó
  processedAt    DateTime? // Cuando se sincronizó exitosamente

  // Relación
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Índices
  @@index([userId, status])
  @@index([status, createdAt])
  @@index([organizationId, status])
  @@map("offline_queue")
}

enum OfflineQueueStatus {
  PENDING      // En cola, esperando sincronización
  PROCESSING   // Siendo procesada
  COMPLETED    // Sincronizada exitosamente
  FAILED       // Falló después de N intentos
  CONFLICT     // Conflicto detectado, requiere resolución manual
}
```

### Campos Opcionales en Modelos Existentes (SAFE)

**NO vamos a modificar modelos existentes en esta fase inicial.**

En su lugar, usaremos:
1. `OfflineQueue` para operaciones pendientes
2. `createdAt`/`updatedAt` existentes para detección de conflictos
3. IndexedDB con esquema independiente para caché local

**Justificación:**
- ✅ Cero riesgo de romper producción
- ✅ No requiere migración de datos existentes
- ✅ Permite rollback instantáneo
- ✅ Facilita testing incremental

---

## 📦 Dependencias Nuevas a Instalar

```json
{
  "dependencies": {
    "workbox-webpack-plugin": "^7.3.0",
    "workbox-window": "^7.3.0",
    "idb": "^8.0.0",
    "next-pwa": "^5.6.0"
  },
  "devDependencies": {
    "@types/serviceworker": "^0.0.101"
  }
}
```

**Descripción:**
- `workbox-webpack-plugin`: Generación de Service Worker optimizado
- `workbox-window`: Cliente para comunicación con Service Worker
- `idb`: Wrapper moderno de IndexedDB con Promises
- `next-pwa`: Plugin de Next.js para PWA (manifest, iconos, etc.)

---

## 🚀 FASES DE IMPLEMENTACIÓN

---

## 📅 FASE 1: Configuración PWA Base (3-4 días)

**Objetivo:** Configurar la infraestructura básica de PWA sin funcionalidad offline aún.

### Prioridad: 🔴 Alta
### Riesgo: 🟢 Bajo (no afecta funcionalidad existente)

---

### TASK 1.1: Instalación de Dependencias PWA

**Responsable:** `database-architect` o `pos-fullstack-dev`

**Archivos a modificar:**
- `package.json`

**Pasos:**

```bash
# 1. Instalar dependencias
pnpm add next-pwa workbox-window idb

# 2. Instalar dev dependencies
pnpm add -D workbox-webpack-plugin @types/serviceworker

# 3. Verificar instalación
pnpm list next-pwa workbox-window idb
```

**Validación:**
- ✅ `pnpm build` ejecuta sin errores
- ✅ Dependencias aparecen en `node_modules`

**Tiempo estimado:** 30 minutos

---

### TASK 1.2: Crear Migración Prisma para `OfflineQueue`

**Responsable:** `database-architect`

**Archivos a crear/modificar:**
1. `prisma/schema.prisma` (agregar modelo y enum)
2. Migración generada automáticamente

**Código a agregar en `schema.prisma`:**

```prisma
// Agregar al final del archivo, después de los enums existentes

// ============================================
// OFFLINE SYNC MODELS
// ============================================
model OfflineQueue {
  id             String   @id @default(cuid())

  // Usuario y organización
  userId         String
  organizationId String?

  // Identificación de la operación
  operation      String
  entity         String
  entityId       String?

  // Datos de la operación
  data           Json

  // Control de sincronización
  status         OfflineQueueStatus @default(PENDING)
  attempts       Int      @default(0)
  maxAttempts    Int      @default(3)
  lastError      String?

  // Metadata
  clientId       String?
  createdAt      DateTime @default(now())
  processedAt    DateTime?

  // Relación
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Índices
  @@index([userId, status])
  @@index([status, createdAt])
  @@index([organizationId, status])
  @@map("offline_queue")
}

enum OfflineQueueStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CONFLICT
}
```

**También modificar el modelo `User` para agregar la relación:**

```prisma
model User {
  // ... campos existentes ...

  // Nuevas relaciones de autenticación
  sessions           Session[]
  passwordResets     PasswordReset[]
  emailVerifications EmailVerification[]
  auditLogs          AuditLog[]
  offlineQueue       OfflineQueue[]  // ⬅️ AGREGAR ESTA LÍNEA

  // ... resto del modelo ...
}
```

**Ejecutar migración:**

```bash
# 1. Generar migración
npx prisma migrate dev --name add_offline_queue_model

# 2. Verificar que la migración se creó
# Se debe crear en prisma/migrations/YYYYMMDDHHMMSS_add_offline_queue_model/

# 3. Aplicar a base de datos de desarrollo
# (ya se aplicó con migrate dev)

# 4. Regenerar Prisma Client
npx prisma generate
```

**⚠️ IMPORTANTE - Estrategia de Deploy Seguro:**

```bash
# EN PRODUCCIÓN (cuando esté listo):
# NO usar migrate dev, usar migrate deploy

# 1. Hacer commit de la migración
git add prisma/migrations/
git commit -m "Add OfflineQueue model for offline sync"

# 2. En producción, ejecutar:
npx prisma migrate deploy

# Esto aplicará SOLO las migraciones pendientes sin resetear datos
```

**Validación:**
- ✅ Migración creada en `prisma/migrations/`
- ✅ `npx prisma migrate status` muestra "Database is up to date"
- ✅ Modelo `OfflineQueue` aparece en `src/generated/prisma`
- ✅ Build ejecuta sin errores: `pnpm build`

**Rollback en caso de error:**
```bash
# Si algo sale mal, revertir:
npx prisma migrate resolve --rolled-back YYYYMMDDHHMMSS_add_offline_queue_model
```

**Tiempo estimado:** 1 hora

---

### TASK 1.3: Configurar `next-pwa` en `next.config.ts`

**Responsable:** `pos-fullstack-dev`

**Archivo a modificar:** `next.config.ts`

**Código:**

```typescript
import type { NextConfig } from "next";
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [new URL('https://toeustbcqq.ufs.sh/f/**')],
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
  outputFileTracingIncludes: {
    '/**/*': ['./src/generated/prisma/**/*'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@prisma/client');
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

// Configuración PWA
const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Deshabilitado en dev para facilitar debugging
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 año
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 semana
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 semana
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 horas
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 horas
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 horas
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-style-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 horas
        },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 horas
        },
      },
    },
    {
      urlPattern: /\/api\/.*$/i,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 5 * 60, // 5 minutos
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

export default pwaConfig(nextConfig);
```

**Validación:**
- ✅ `pnpm build` ejecuta sin errores
- ✅ Se genera `public/sw.js` automáticamente
- ✅ Se genera `public/workbox-*.js`

**Tiempo estimado:** 1 hora

---

### TASK 1.4: Crear Manifest PWA

**Responsable:** `ui-ux-designer` o `pos-fullstack-dev`

**Archivo a crear:** `public/manifest.json`

**Código:**

```json
{
  "name": "Sistema POS - Punto de Venta",
  "short_name": "POS System",
  "description": "Sistema de Punto de Venta multi-tenant con capacidad offline",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "categories": ["business", "finance", "productivity"],
  "scope": "/",
  "lang": "es-ES",
  "dir": "ltr"
}
```

**NOTA:** Los iconos deben generarse usando una herramienta como [PWA Asset Generator](https://www.npmjs.com/package/pwa-asset-generator) o [RealFaviconGenerator](https://realfavicongenerator.net/).

**Comando para generar iconos:**
```bash
# Opción 1: Usar pwa-asset-generator
npx pwa-asset-generator public/logo.svg public/icons --manifest public/manifest.json

# Opción 2: Manualmente crear los tamaños usando Figma, Photoshop, etc.
```

**Tiempo estimado:** 1-2 horas (incluyendo generación de iconos)

---

### TASK 1.5: Agregar Metadata PWA al Layout Root

**Responsable:** `pos-fullstack-dev`

**Archivo a modificar:** `src/app/layout.tsx`

**Código a agregar:**

```typescript
import type { Metadata, Viewport } from 'next'

// ... imports existentes ...

export const metadata: Metadata = {
  // ... metadata existente ...

  // PWA Metadata
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'POS System',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-152x152.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Meta tags para PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="POS System" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="POS System" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>
        {/* ... body content existente ... */}
      </body>
    </html>
  )
}
```

**Validación:**
- ✅ Lighthouse PWA audit pasa (mínimo 80/100)
- ✅ Chrome DevTools → Application → Manifest muestra el manifest correctamente
- ✅ Aparece el banner "Add to Home Screen" en móviles

**Tiempo estimado:** 1 hora

---

### TASK 1.6: Testing de PWA Base

**Responsable:** `pos-fullstack-dev`

**Pasos:**

1. **Build de producción:**
```bash
pnpm build
pnpm start
```

2. **Lighthouse Audit:**
   - Abrir Chrome DevTools
   - Tab "Lighthouse"
   - Seleccionar "Progressive Web App"
   - Click "Analyze page load"
   - **Meta:** Score mínimo 80/100

3. **Verificar Service Worker:**
   - Chrome DevTools → Application → Service Workers
   - Debe aparecer el SW registrado
   - Estado: "Activated and running"

4. **Verificar Manifest:**
   - Chrome DevTools → Application → Manifest
   - Todos los campos deben mostrarse correctamente
   - Iconos deben cargarse

5. **Test de Instalación:**
   - Móvil Android: Debe aparecer banner "Agregar a pantalla de inicio"
   - Desktop Chrome: Icono de instalación en la barra de direcciones
   - Instalar y verificar que abre como app standalone

**Checklist de validación:**
- [ ] Service Worker registrado correctamente
- [ ] Manifest cargado sin errores
- [ ] Iconos visibles en todos los tamaños
- [ ] App instalable en móvil
- [ ] App instalable en desktop
- [ ] Lighthouse PWA score ≥ 80

**Tiempo estimado:** 2 horas

---

### 📊 ENTREGABLES FASE 1:

- ✅ PWA instalable
- ✅ Service Worker básico funcionando
- ✅ Manifest configurado
- ✅ Caché de assets estáticos
- ✅ Modelo `OfflineQueue` en base de datos
- ✅ Lighthouse PWA score ≥ 80

**CHECKPOINT:** Antes de continuar a Fase 2, validar que TODO lo anterior funciona.

---

## 📅 FASE 2: Almacenamiento Local con IndexedDB (4-5 días)

**Objetivo:** Implementar sistema de almacenamiento local para datos críticos.

### Prioridad: 🔴 Alta
### Riesgo: 🟡 Medio (complejidad técnica)

---

### TASK 2.1: Crear Esquema de IndexedDB

**Responsable:** `database-architect` o `pos-fullstack-dev`

**Archivo a crear:** `src/lib/offline/db-schema.ts`

**Código:**

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ============================================
// SCHEMA DE INDEXEDDB
// ============================================

export interface PosOfflineDB extends DBSchema {
  // Organizaciones (caché)
  organizations: {
    key: string; // organizationId
    value: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      address: string | null;
      syncedAt: number; // timestamp
    };
    indexes: { 'by-synced': number };
  };

  // Tiendas (caché)
  stores: {
    key: string; // storeId
    value: {
      id: string;
      organizationId: string;
      name: string;
      address: string;
      saleNumberPrefix: string;
      lastSaleNumber: number;
      syncedAt: number;
    };
    indexes: { 'by-organization': string; 'by-synced': number };
  };

  // Productos (caché completo)
  products: {
    key: string; // productId
    value: {
      id: string;
      organizationId: string;
      name: string;
      description: string | null;
      image: string | null;
      barcode: string | null;
      sku: string | null;
      categoryId: string | null;
      brandId: string | null;
      unitMeasureId: string | null;
      costPrice: number;
      salePrice: number;
      minStock: number;
      currentStock: number;
      isActive: boolean;
      syncedAt: number;
    };
    indexes: {
      'by-organization': string;
      'by-barcode': string;
      'by-sku': string;
      'by-synced': number;
    };
  };

  // Clientes (caché)
  customers: {
    key: string; // customerId
    value: {
      id: string;
      organizationId: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      document: string | null;
      syncedAt: number;
    };
    indexes: { 'by-organization': string; 'by-synced': number };
  };

  // Categorías (caché)
  categories: {
    key: string;
    value: {
      id: string;
      organizationId: string;
      name: string;
      description: string | null;
      syncedAt: number;
    };
    indexes: { 'by-organization': string };
  };

  // Marcas (caché)
  brands: {
    key: string;
    value: {
      id: string;
      organizationId: string;
      name: string;
      logo: string | null;
      syncedAt: number;
    };
    indexes: { 'by-organization': string };
  };

  // Unidades de medida (caché)
  unitMeasures: {
    key: string;
    value: {
      id: string;
      organizationId: string;
      name: string;
      abbreviation: string;
      syncedAt: number;
    };
    indexes: { 'by-organization': string };
  };

  // Métodos de pago (caché)
  paymentMethods: {
    key: string;
    value: {
      id: string;
      organizationId: string;
      name: string;
      type: string;
      syncedAt: number;
    };
    indexes: { 'by-organization': string };
  };

  // Ventas OFFLINE (pendientes de sincronización)
  offlineSales: {
    key: string; // tempId (uuid local)
    value: {
      tempId: string;
      organizationId: string;
      storeId: string;
      customerId: string | null;
      userId: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
        unitMeasureId: string | null;
      }>;
      payments: Array<{
        paymentMethodId: string;
        amount: number;
        reference: string | null;
      }>;
      subtotal: number;
      total: number;
      status: string;
      notes: string | null;
      createdAt: number; // timestamp local
      syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
      syncAttempts: number;
      lastSyncError: string | null;
    };
    indexes: {
      'by-sync-status': string;
      'by-created': number;
      'by-organization': string;
    };
  };

  // Movimientos de stock OFFLINE
  offlineStockMovements: {
    key: string; // tempId
    value: {
      tempId: string;
      organizationId: string;
      productId: string;
      storeId: string | null;
      type: 'IN' | 'OUT' | 'ADJUSTMENT';
      quantity: number;
      previousStock: number;
      newStock: number;
      reason: string | null;
      userId: string;
      reference: string | null;
      createdAt: number;
      syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
      syncAttempts: number;
      lastSyncError: string | null;
    };
    indexes: {
      'by-sync-status': string;
      'by-product': string;
      'by-organization': string;
    };
  };

  // Metadata de sincronización
  syncMetadata: {
    key: string; // entity name (ej: "products", "customers")
    value: {
      entity: string;
      lastSyncAt: number;
      lastSyncStatus: 'success' | 'failed' | 'partial';
      recordCount: number;
      errorMessage: string | null;
    };
  };
}

// ============================================
// FUNCIÓN PARA ABRIR/CREAR DB
// ============================================

const DB_NAME = 'pos-offline-db';
const DB_VERSION = 1;

export async function openPosDB(): Promise<IDBPDatabase<PosOfflineDB>> {
  return openDB<PosOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);

      // Organizations
      if (!db.objectStoreNames.contains('organizations')) {
        const orgStore = db.createObjectStore('organizations', { keyPath: 'id' });
        orgStore.createIndex('by-synced', 'syncedAt');
      }

      // Stores
      if (!db.objectStoreNames.contains('stores')) {
        const storeStore = db.createObjectStore('stores', { keyPath: 'id' });
        storeStore.createIndex('by-organization', 'organizationId');
        storeStore.createIndex('by-synced', 'syncedAt');
      }

      // Products
      if (!db.objectStoreNames.contains('products')) {
        const prodStore = db.createObjectStore('products', { keyPath: 'id' });
        prodStore.createIndex('by-organization', 'organizationId');
        prodStore.createIndex('by-barcode', 'barcode');
        prodStore.createIndex('by-sku', 'sku');
        prodStore.createIndex('by-synced', 'syncedAt');
      }

      // Customers
      if (!db.objectStoreNames.contains('customers')) {
        const custStore = db.createObjectStore('customers', { keyPath: 'id' });
        custStore.createIndex('by-organization', 'organizationId');
        custStore.createIndex('by-synced', 'syncedAt');
      }

      // Categories
      if (!db.objectStoreNames.contains('categories')) {
        const catStore = db.createObjectStore('categories', { keyPath: 'id' });
        catStore.createIndex('by-organization', 'organizationId');
      }

      // Brands
      if (!db.objectStoreNames.contains('brands')) {
        const brandStore = db.createObjectStore('brands', { keyPath: 'id' });
        brandStore.createIndex('by-organization', 'organizationId');
      }

      // Unit Measures
      if (!db.objectStoreNames.contains('unitMeasures')) {
        const unitStore = db.createObjectStore('unitMeasures', { keyPath: 'id' });
        unitStore.createIndex('by-organization', 'organizationId');
      }

      // Payment Methods
      if (!db.objectStoreNames.contains('paymentMethods')) {
        const pmStore = db.createObjectStore('paymentMethods', { keyPath: 'id' });
        pmStore.createIndex('by-organization', 'organizationId');
      }

      // Offline Sales
      if (!db.objectStoreNames.contains('offlineSales')) {
        const saleStore = db.createObjectStore('offlineSales', { keyPath: 'tempId' });
        saleStore.createIndex('by-sync-status', 'syncStatus');
        saleStore.createIndex('by-created', 'createdAt');
        saleStore.createIndex('by-organization', 'organizationId');
      }

      // Offline Stock Movements
      if (!db.objectStoreNames.contains('offlineStockMovements')) {
        const movStore = db.createObjectStore('offlineStockMovements', { keyPath: 'tempId' });
        movStore.createIndex('by-sync-status', 'syncStatus');
        movStore.createIndex('by-product', 'productId');
        movStore.createIndex('by-organization', 'organizationId');
      }

      // Sync Metadata
      if (!db.objectStoreNames.contains('syncMetadata')) {
        db.createObjectStore('syncMetadata', { keyPath: 'entity' });
      }
    },
    blocked() {
      console.warn('Database upgrade was blocked');
    },
    blocking() {
      console.warn('This database is blocking a version upgrade');
    },
    terminated() {
      console.error('Database connection was unexpectedly terminated');
    },
  });
}

// ============================================
// UTILIDADES
// ============================================

export async function clearAllData(): Promise<void> {
  const db = await openPosDB();
  const tx = db.transaction(
    [
      'organizations',
      'stores',
      'products',
      'customers',
      'categories',
      'brands',
      'unitMeasures',
      'paymentMethods',
      'offlineSales',
      'offlineStockMovements',
      'syncMetadata',
    ],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('organizations').clear(),
    tx.objectStore('stores').clear(),
    tx.objectStore('products').clear(),
    tx.objectStore('customers').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('brands').clear(),
    tx.objectStore('unitMeasures').clear(),
    tx.objectStore('paymentMethods').clear(),
    tx.objectStore('offlineSales').clear(),
    tx.objectStore('offlineStockMovements').clear(),
    tx.objectStore('syncMetadata').clear(),
  ]);

  await tx.done;
  console.log('All IndexedDB data cleared');
}

export async function getDBStats(): Promise<Record<string, number>> {
  const db = await openPosDB();

  const stats: Record<string, number> = {
    organizations: await db.count('organizations'),
    stores: await db.count('stores'),
    products: await db.count('products'),
    customers: await db.count('customers'),
    categories: await db.count('categories'),
    brands: await db.count('brands'),
    unitMeasures: await db.count('unitMeasures'),
    paymentMethods: await db.count('paymentMethods'),
    offlineSales: await db.count('offlineSales'),
    offlineStockMovements: await db.count('offlineStockMovements'),
  };

  return stats;
}
```

**Validación:**
- ✅ Ejecutar `pnpm build` sin errores
- ✅ Crear test básico que abra la DB

**Tiempo estimado:** 3-4 horas

---

### TASK 2.2: Crear Servicios de Acceso a IndexedDB

**Responsable:** `pos-fullstack-dev`

**Archivos a crear:**

1. `src/lib/offline/db-service.ts` (servicio base)
2. `src/lib/offline/services/product-db-service.ts`
3. `src/lib/offline/services/sale-db-service.ts`
4. `src/lib/offline/services/customer-db-service.ts`

**Ejemplo - `src/lib/offline/db-service.ts`:**

```typescript
import { openPosDB } from './db-schema';

export class OfflineDBService {
  /**
   * Guarda o actualiza datos en caché
   */
  static async saveToCache<T extends Record<string, unknown>>(
    storeName: string,
    data: T | T[]
  ): Promise<void> {
    const db = await openPosDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      await store.put(item as never); // Type assertion necesaria por limitaciones de IndexedDB typing
    }

    await tx.done;
  }

  /**
   * Obtiene un elemento por ID
   */
  static async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    const db = await openPosDB();
    return (await db.get(storeName as never, id)) as T | undefined;
  }

  /**
   * Obtiene todos los elementos
   */
  static async getAll<T>(storeName: string): Promise<T[]> {
    const db = await openPosDB();
    return (await db.getAll(storeName as never)) as T[];
  }

  /**
   * Obtiene elementos por índice
   */
  static async getAllByIndex<T>(
    storeName: string,
    indexName: string,
    value: string | number
  ): Promise<T[]> {
    const db = await openPosDB();
    return (await db.getAllFromIndex(storeName as never, indexName as never, value)) as T[];
  }

  /**
   * Elimina un elemento
   */
  static async delete(storeName: string, id: string): Promise<void> {
    const db = await openPosDB();
    await db.delete(storeName as never, id);
  }

  /**
   * Limpia un store completo
   */
  static async clear(storeName: string): Promise<void> {
    const db = await openPosDB();
    await db.clear(storeName as never);
  }

  /**
   * Cuenta elementos en un store
   */
  static async count(storeName: string): Promise<number> {
    const db = await openPosDB();
    return await db.count(storeName as never);
  }
}
```

**Ejemplo - `src/lib/offline/services/product-db-service.ts`:**

```typescript
import { OfflineDBService } from '../db-service';
import type { PosOfflineDB } from '../db-schema';

type ProductCache = PosOfflineDB['products']['value'];

export class ProductDBService {
  private static readonly STORE_NAME = 'products';

  /**
   * Guarda productos en caché
   */
  static async cacheProducts(products: ProductCache[]): Promise<void> {
    const productsWithTimestamp = products.map((p) => ({
      ...p,
      syncedAt: Date.now(),
    }));

    await OfflineDBService.saveToCache(this.STORE_NAME, productsWithTimestamp);
  }

  /**
   * Obtiene producto por ID
   */
  static async getProductById(productId: string): Promise<ProductCache | undefined> {
    return await OfflineDBService.getById<ProductCache>(this.STORE_NAME, productId);
  }

  /**
   * Obtiene todos los productos de una organización
   */
  static async getProductsByOrganization(organizationId: string): Promise<ProductCache[]> {
    return await OfflineDBService.getAllByIndex<ProductCache>(
      this.STORE_NAME,
      'by-organization',
      organizationId
    );
  }

  /**
   * Busca producto por código de barras
   */
  static async getProductByBarcode(barcode: string): Promise<ProductCache | undefined> {
    const products = await OfflineDBService.getAllByIndex<ProductCache>(
      this.STORE_NAME,
      'by-barcode',
      barcode
    );
    return products[0];
  }

  /**
   * Busca producto por SKU
   */
  static async getProductBySku(sku: string): Promise<ProductCache | undefined> {
    const products = await OfflineDBService.getAllByIndex<ProductCache>(
      this.STORE_NAME,
      'by-sku',
      sku
    );
    return products[0];
  }

  /**
   * Actualiza stock local de un producto
   */
  static async updateProductStock(productId: string, newStock: number): Promise<void> {
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found in cache`);
    }

    product.currentStock = newStock;
    product.syncedAt = Date.now();

    await OfflineDBService.saveToCache(this.STORE_NAME, product);
  }

  /**
   * Limpia caché de productos
   */
  static async clearCache(): Promise<void> {
    await OfflineDBService.clear(this.STORE_NAME);
  }
}
```

**Implementar servicios similares para:**
- `customer-db-service.ts`
- `sale-db-service.ts`
- `category-db-service.ts`
- `brand-db-service.ts`
- `payment-method-db-service.ts`

**Tiempo estimado:** 6-8 horas

---

### TASK 2.3: Implementar Sincronización Inicial de Datos

**Responsable:** `pos-fullstack-dev`

**Archivo a crear:** `src/lib/offline/sync-manager.ts`

**Código:**

```typescript
import { ProductDBService } from './services/product-db-service';
import { CustomerDBService } from './services/customer-db-service';
import { CategoryDBService } from './services/category-db-service';
import { BrandDBService } from './services/brand-db-service';
import { PaymentMethodDBService } from './services/payment-method-db-service';
import { openPosDB } from './db-schema';

// Importar server actions
import { getProductsByOrganization } from '@/actions/product';
import { getCustomersByOrganization } from '@/actions/customer';
import { getCategoriesByOrganization } from '@/actions/category';
import { getBrandsByOrganization } from '@/actions/brand';
import { getPaymentMethodsByOrganization } from '@/actions/payment-methods';

export class SyncManager {
  /**
   * Sincronización inicial: Descarga todos los datos del servidor
   */
  static async syncInitialData(
    organizationId: string,
    onProgress?: (entity: string, progress: number) => void
  ): Promise<void> {
    console.log('Starting initial sync for organization:', organizationId);

    try {
      // 1. Sincronizar productos
      onProgress?.('products', 0);
      const productsResponse = await getProductsByOrganization(organizationId);
      if (productsResponse.status === 200 && productsResponse.data) {
        await ProductDBService.cacheProducts(
          productsResponse.data.map((p) => ({
            id: p.id,
            organizationId: p.organizationId,
            name: p.name,
            description: p.description,
            image: p.image,
            barcode: p.barcode,
            sku: p.sku,
            categoryId: p.categoryId,
            brandId: p.brandId,
            unitMeasureId: p.unitMeasureId,
            costPrice: p.costPrice,
            salePrice: p.salePrice,
            minStock: p.minStock,
            currentStock: p.currentStock,
            isActive: p.isActive,
            syncedAt: Date.now(),
          }))
        );
      }
      onProgress?.('products', 100);

      // 2. Sincronizar clientes
      onProgress?.('customers', 0);
      const customersResponse = await getCustomersByOrganization(organizationId);
      if (customersResponse.status === 200 && customersResponse.data) {
        await CustomerDBService.cacheCustomers(
          customersResponse.data.map((c) => ({
            id: c.id,
            organizationId: c.organizationId,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            document: c.document,
            syncedAt: Date.now(),
          }))
        );
      }
      onProgress?.('customers', 100);

      // 3. Sincronizar categorías
      onProgress?.('categories', 0);
      const categoriesResponse = await getCategoriesByOrganization(organizationId);
      if (categoriesResponse.status === 200 && categoriesResponse.data) {
        await CategoryDBService.cacheCategories(
          categoriesResponse.data.map((c) => ({
            id: c.id,
            organizationId: c.organizationId,
            name: c.name,
            description: c.description,
            syncedAt: Date.now(),
          }))
        );
      }
      onProgress?.('categories', 100);

      // 4. Sincronizar marcas
      onProgress?.('brands', 0);
      const brandsResponse = await getBrandsByOrganization(organizationId);
      if (brandsResponse.status === 200 && brandsResponse.data) {
        await BrandDBService.cacheBrands(
          brandsResponse.data.map((b) => ({
            id: b.id,
            organizationId: b.organizationId,
            name: b.name,
            logo: b.logo,
            syncedAt: Date.now(),
          }))
        );
      }
      onProgress?.('brands', 100);

      // 5. Sincronizar métodos de pago
      onProgress?.('paymentMethods', 0);
      const paymentMethodsResponse = await getPaymentMethodsByOrganization(organizationId);
      if (paymentMethodsResponse.status === 200 && paymentMethodsResponse.data) {
        await PaymentMethodDBService.cachePaymentMethods(
          paymentMethodsResponse.data.map((pm) => ({
            id: pm.id,
            organizationId: pm.organizationId,
            name: pm.name,
            type: pm.type,
            syncedAt: Date.now(),
          }))
        );
      }
      onProgress?.('paymentMethods', 100);

      // Guardar metadata de sincronización
      const db = await openPosDB();
      await db.put('syncMetadata', {
        entity: 'initial_sync',
        lastSyncAt: Date.now(),
        lastSyncStatus: 'success',
        recordCount: 0,
        errorMessage: null,
      });

      console.log('Initial sync completed successfully');
    } catch (error) {
      console.error('Initial sync failed:', error);

      // Guardar error en metadata
      const db = await openPosDB();
      await db.put('syncMetadata', {
        entity: 'initial_sync',
        lastSyncAt: Date.now(),
        lastSyncStatus: 'failed',
        recordCount: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Verifica si hay sincronización inicial
   */
  static async hasInitialSync(): Promise<boolean> {
    const db = await openPosDB();
    const metadata = await db.get('syncMetadata', 'initial_sync');
    return !!metadata && metadata.lastSyncStatus === 'success';
  }

  /**
   * Obtiene última fecha de sincronización
   */
  static async getLastSyncDate(): Promise<Date | null> {
    const db = await openPosDB();
    const metadata = await db.get('syncMetadata', 'initial_sync');
    return metadata?.lastSyncAt ? new Date(metadata.lastSyncAt) : null;
  }
}
```

**Tiempo estimado:** 4-5 horas

---

### TASK 2.4: Crear Hook de Sincronización

**Responsable:** `pos-fullstack-dev`

**Archivo a crear:** `src/hooks/useOfflineSync.ts`

**Código:**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { SyncManager } from '@/lib/offline/sync-manager';
import { toast } from 'sonner';
import { useStore } from '@/store';

interface SyncProgress {
  entity: string;
  progress: number;
}

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress[]>([]);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);

  const user = useStore((state) => state.user);

  /**
   * Ejecuta sincronización inicial
   */
  const syncInitialData = useCallback(async () => {
    if (!user?.organizationId) {
      toast.error('No organization found');
      return;
    }

    setIsSyncing(true);
    setSyncProgress([]);

    try {
      toast.info('Sincronizando datos offline...');

      await SyncManager.syncInitialData(
        user.organizationId,
        (entity, progress) => {
          setSyncProgress((prev) => {
            const existing = prev.find((p) => p.entity === entity);
            if (existing) {
              return prev.map((p) =>
                p.entity === entity ? { ...p, progress } : p
              );
            }
            return [...prev, { entity, progress }];
          });
        }
      );

      const syncDate = new Date();
      setLastSyncDate(syncDate);
      toast.success('Datos sincronizados correctamente');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Error al sincronizar datos');
    } finally {
      setIsSyncing(false);
    }
  }, [user?.organizationId]);

  /**
   * Verifica si hay sincronización inicial
   */
  const checkInitialSync = useCallback(async () => {
    const hasSync = await SyncManager.hasInitialSync();
    if (hasSync) {
      const date = await SyncManager.getLastSyncDate();
      setLastSyncDate(date);
    }
    return hasSync;
  }, []);

  return {
    isSyncing,
    syncProgress,
    lastSyncDate,
    syncInitialData,
    checkInitialSync,
  };
}
```

**Tiempo estimado:** 2 horas

---

### TASK 2.5: Crear UI de Sincronización

**Responsable:** `ui-ux-designer` o `pos-fullstack-dev`

**Archivo a crear:** `src/components/offline/sync-button.tsx`

**Código:**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconRefresh, IconCloudCheck, IconCloudX } from '@tabler/icons-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

export function SyncButton() {
  const { isSyncing, syncProgress, lastSyncDate, syncInitialData } = useOfflineSync();
  const [showDialog, setShowDialog] = useState(false);

  const handleSync = async () => {
    setShowDialog(true);
    await syncInitialData();
    setTimeout(() => setShowDialog(false), 2000);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <IconRefresh className="animate-spin" />
        ) : lastSyncDate ? (
          <IconCloudCheck />
        ) : (
          <IconCloudX />
        )}
        {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronización de Datos</DialogTitle>
            <DialogDescription>
              Descargando datos para uso offline...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {syncProgress.map((item) => (
              <div key={item.entity} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{item.entity}</span>
                  <span>{item.progress}%</span>
                </div>
                <Progress value={item.progress} />
              </div>
            ))}
          </div>

          {lastSyncDate && !isSyncing && (
            <p className="text-sm text-muted-foreground text-center">
              Última sincronización: {lastSyncDate.toLocaleString()}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Agregar este componente en `src/components/site-header.tsx`:**

```typescript
import { SyncButton } from '@/components/offline/sync-button';

// ... en el render:
<div className="ml-auto flex items-center gap-2">
  <SyncButton />
  {/* ... otros botones ... */}
</div>
```

**Tiempo estimado:** 3 horas

---

### 📊 ENTREGABLES FASE 2:

- ✅ Esquema de IndexedDB completo
- ✅ Servicios de acceso a datos locales
- ✅ Sincronización inicial funcional
- ✅ UI de sincronización
- ✅ Hook de React para sync
- ✅ Datos críticos cacheados localmente

**CHECKPOINT:** Validar que la sincronización descarga y almacena datos correctamente.

---

## 📅 FASE 3: Operaciones Offline y Cola de Sincronización (5-6 días)

**Objetivo:** Permitir crear ventas offline y sincronizarlas cuando vuelva la conexión.

### Prioridad: 🔴 Alta
### Riesgo: 🔴 Alto (lógica compleja de sincronización)

---

### TASK 3.1: Crear Monitor de Conexión

**Responsable:** `pos-fullstack-dev`

**Archivo a crear:** `src/lib/offline/network-monitor.ts`

**Código:**

```typescript
'use client';

import { useEffect, useState } from 'react';

export class NetworkMonitor {
  private static listeners: Set<(isOnline: boolean) => void> = new Set();
  private static isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  static {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners(true);
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners(false);
      });
    }
  }

  static subscribe(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  static getStatus(): boolean {
    return this.isOnline;
  }

  private static notifyListeners(isOnline: boolean): void {
    this.listeners.forEach((listener) => listener(isOnline));
  }
}

/**
 * Hook para monitorear conexión
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => NetworkMonitor.getStatus());

  useEffect(() => {
    const unsubscribe = NetworkMonitor.subscribe((online) => {
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  return { isOnline, isOffline: !isOnline };
}
```

**Tiempo estimado:** 2 horas

---

### TASK 3.2: Crear Servicio de Cola de Sincronización

**Responsable:** `pos-fullstack-dev`

**Archivo a crear:** `src/lib/offline/sync-queue-service.ts`

**Código:**

```typescript
import { openPosDB } from './db-schema';
import type { PosOfflineDB } from './db-schema';
import { v4 as uuidv4 } from 'uuid'; // Agregar a dependencies: uuid

type OfflineSale = PosOfflineDB['offlineSales']['value'];

export class SyncQueueService {
  /**
   * Agrega venta a la cola de sincronización
   */
  static async enqueueSale(saleData: Omit<OfflineSale, 'tempId' | 'syncStatus' | 'syncAttempts' | 'lastSyncError' | 'createdAt'>): Promise<string> {
    const db = await openPosDB();
    const tempId = `temp_${uuidv4()}`;

    const offlineSale: OfflineSale = {
      ...saleData,
      tempId,
      createdAt: Date.now(),
      syncStatus: 'pending',
      syncAttempts: 0,
      lastSyncError: null,
    };

    await db.put('offlineSales', offlineSale);
    console.log(`Sale enqueued with tempId: ${tempId}`);

    return tempId;
  }

  /**
   * Obtiene ventas pendientes de sincronización
   */
  static async getPendingSales(): Promise<OfflineSale[]> {
    const db = await openPosDB();
    return await db.getAllFromIndex('offlineSales', 'by-sync-status', 'pending');
  }

  /**
   * Marca venta como sincronizada
   */
  static async markSaleAsSynced(tempId: string): Promise<void> {
    const db = await openPosDB();
    const sale = await db.get('offlineSales', tempId);

    if (!sale) {
      throw new Error(`Sale ${tempId} not found`);
    }

    sale.syncStatus = 'synced';
    sale.processedAt = Date.now();
    await db.put('offlineSales', sale);
  }

  /**
   * Marca venta como fallida
   */
  static async markSaleAsFailed(tempId: string, error: string): Promise<void> {
    const db = await openPosDB();
    const sale = await db.get('offlineSales', tempId);

    if (!sale) {
      throw new Error(`Sale ${tempId} not found`);
    }

    sale.syncAttempts += 1;
    sale.lastSyncError = error;

    if (sale.syncAttempts >= sale.maxAttempts) {
      sale.syncStatus = 'failed';
    }

    await db.put('offlineSales', sale);
  }

  /**
   * Cuenta ventas pendientes
   */
  static async getPendingCount(): Promise<number> {
    const db = await openPosDB();
    const pending = await this.getPendingSales();
    return pending.length;
  }

  /**
   * Limpia ventas sincronizadas (más de 7 días)
   */
  static async cleanSyncedSales(): Promise<number> {
    const db = await openPosDB();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const syncedSales = await db.getAllFromIndex('offlineSales', 'by-sync-status', 'synced');
    const toDelete = syncedSales.filter((sale) => sale.processedAt && sale.processedAt < sevenDaysAgo);

    for (const sale of toDelete) {
      await db.delete('offlineSales', sale.tempId);
    }

    return toDelete.length;
  }
}
```

**Tiempo estimado:** 3-4 horas

---

### TASK 3.3: Modificar Server Action de Ventas para Sincronización

**Responsable:** `pos-fullstack-dev`

**Archivo a crear:** `src/actions/sale/create-sale-offline.ts`

**Código:**

```typescript
'use server';

import { ActionResponse } from '@/interfaces';
import { prisma } from '@/actions/utils';

interface OfflineSaleData {
  organizationId: string;
  storeId: string;
  customerId: string | null;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    unitMeasureId: string | null;
  }>;
  payments: Array<{
    paymentMethodId: string;
    amount: number;
    reference: string | null;
  }>;
  subtotal: number;
  total: number;
  status: string;
  notes: string | null;
  createdAt: number; // timestamp de cuando se creó offline
}

/**
 * Crea una venta desde datos offline
 */
export async function createSaleFromOffline(
  offlineData: OfflineSaleData
): Promise<ActionResponse<{ saleId: string; saleNumber: string }>> {
  try {
    // 1. Obtener store para generar número de venta
    const store = await prisma.store.findUnique({
      where: { id: offlineData.storeId },
    });

    if (!store) {
      return {
        status: 404,
        message: 'Store not found',
        data: null,
      };
    }

    // 2. Generar número de venta
    const newSaleNumber = store.lastSaleNumber + 1;
    const saleNumber = `${store.saleNumberPrefix}${newSaleNumber.toString().padStart(6, '0')}`;

    // 3. Crear venta en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar último número de venta
      await tx.store.update({
        where: { id: offlineData.storeId },
        data: { lastSaleNumber: newSaleNumber },
      });

      // Crear venta
      const sale = await tx.sale.create({
        data: {
          organizationId: offlineData.organizationId,
          storeId: offlineData.storeId,
          saleNumber,
          customerId: offlineData.customerId,
          userId: offlineData.userId,
          subtotal: offlineData.subtotal,
          total: offlineData.total,
          status: offlineData.status as never,
          notes: offlineData.notes,
          saleDate: new Date(offlineData.createdAt), // Usar fecha original offline
          items: {
            create: offlineData.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              unitMeasureId: item.unitMeasureId,
            })),
          },
          payments: {
            create: offlineData.payments.map((payment) => ({
              paymentMethodId: payment.paymentMethodId,
              amount: payment.amount,
              reference: payment.reference,
            })),
          },
        },
      });

      // Actualizar stock de productos
      for (const item of offlineData.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { currentStock: true },
        });

        if (product) {
          const newStock = product.currentStock - item.quantity;

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: newStock },
          });

          // Crear movimiento de stock
          await tx.stockMovement.create({
            data: {
              organizationId: offlineData.organizationId,
              productId: item.productId,
              storeId: offlineData.storeId,
              type: 'OUT',
              quantity: item.quantity,
              previousStock: product.currentStock,
              newStock,
              reason: `Venta ${saleNumber}`,
              userId: offlineData.userId,
              reference: sale.id,
            },
          });
        }
      }

      return { saleId: sale.id, saleNumber };
    });

    return {
      status: 201,
      message: 'Sale synchronized successfully',
      data: result,
    };
  } catch (error) {
    console.error('Error creating sale from offline:', error);
    return {
      status: 500,
      message: error instanceof Error ? error.message : 'Unknown error',
      data: null,
    };
  }
}
```

**Exportar en `src/actions/sale/index.ts`:**

```typescript
export { createSaleFromOffline } from './create-sale-offline';
```

**Tiempo estimado:** 3-4 horas

---

### TASK 3.4: Crear Servicio de Sincronización Automática

**Responsable:** `pos-fullstack-dev`

**Archivo a crear:** `src/lib/offline/auto-sync-service.ts`

**Código:**

```typescript
import { SyncQueueService } from './sync-queue-service';
import { createSaleFromOffline } from '@/actions/sale';
import { NetworkMonitor } from './network-monitor';

export class AutoSyncService {
  private static isSyncing = false;
  private static syncInterval: NodeJS.Timeout | null = null;

  /**
   * Inicia sincronización automática
   */
  static start(): void {
    // Sincronizar inmediatamente si hay conexión
    if (NetworkMonitor.getStatus()) {
      this.syncPendingOperations();
    }

    // Escuchar cambios de conexión
    NetworkMonitor.subscribe((isOnline) => {
      if (isOnline) {
        console.log('Network online - starting auto-sync');
        this.syncPendingOperations();
      } else {
        console.log('Network offline - pausing auto-sync');
      }
    });

    // Sincronizar cada 5 minutos (si hay conexión)
    this.syncInterval = setInterval(() => {
      if (NetworkMonitor.getStatus()) {
        this.syncPendingOperations();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Detiene sincronización automática
   */
  static stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sincroniza operaciones pendientes
   */
  static async syncPendingOperations(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    if (!NetworkMonitor.getStatus()) {
      console.log('Network offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    console.log('Starting sync of pending operations...');

    try {
      // Obtener ventas pendientes
      const pendingSales = await SyncQueueService.getPendingSales();

      if (pendingSales.length === 0) {
        console.log('No pending sales to sync');
        return;
      }

      console.log(`Syncing ${pendingSales.length} pending sales...`);

      // Sincronizar una por una (FIFO)
      for (const sale of pendingSales) {
        try {
          console.log(`Syncing sale ${sale.tempId}...`);

          const result = await createSaleFromOffline({
            organizationId: sale.organizationId,
            storeId: sale.storeId,
            customerId: sale.customerId,
            userId: sale.userId,
            items: sale.items,
            payments: sale.payments,
            subtotal: sale.subtotal,
            total: sale.total,
            status: sale.status,
            notes: sale.notes,
            createdAt: sale.createdAt,
          });

          if (result.status === 201) {
            await SyncQueueService.markSaleAsSynced(sale.tempId);
            console.log(`Sale ${sale.tempId} synced successfully`);
          } else {
            await SyncQueueService.markSaleAsFailed(sale.tempId, result.message);
            console.error(`Failed to sync sale ${sale.tempId}:`, result.message);
          }
        } catch (error) {
          console.error(`Error syncing sale ${sale.tempId}:`, error);
          await SyncQueueService.markSaleAsFailed(
            sale.tempId,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }

      // Limpiar ventas sincronizadas antiguas
      const cleaned = await SyncQueueService.cleanSyncedSales();
      if (cleaned > 0) {
        console.log(`Cleaned ${cleaned} old synced sales`);
      }

      console.log('Sync completed');
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Fuerza sincronización inmediata
   */
  static async forceSyncNow(): Promise<void> {
    return this.syncPendingOperations();
  }
}
```

**Tiempo estimado:** 4 horas

---

### TASK 3.5: Integrar Offline Mode en Formulario de Ventas

**Responsable:** `pos-fullstack-dev`

**Archivo a modificar:** `src/app/dashboard/sales/new/features/new-sale-form.tsx` (o el componente de venta que uses)

**Agregar lógica offline:**

```typescript
'use client';

import { useNetworkStatus } from '@/lib/offline/network-monitor';
import { SyncQueueService } from '@/lib/offline/sync-queue-service';
import { ProductDBService } from '@/lib/offline/services/product-db-service';
import { useState } from 'react';

export function NewSaleForm() {
  const { isOnline } = useNetworkStatus();
  const [items, setItems] = useState([]);
  // ... otros states ...

  const handleSubmit = async (data: SaleFormData) => {
    if (isOnline) {
      // Modo online: enviar al servidor directamente
      const result = await createSale(data);
      // ... manejar resultado ...
    } else {
      // Modo offline: guardar en IndexedDB
      try {
        const tempId = await SyncQueueService.enqueueSale({
          organizationId: user.organizationId!,
          storeId: user.storeId!,
          customerId: data.customerId,
          userId: user.id,
          items: data.items,
          payments: data.payments,
          subtotal: data.subtotal,
          total: data.total,
          status: 'PAID',
          notes: data.notes,
        });

        // Actualizar stock local
        for (const item of data.items) {
          const product = await ProductDBService.getProductById(item.productId);
          if (product) {
            await ProductDBService.updateProductStock(
              item.productId,
              product.currentStock - item.quantity
            );
          }
        }

        toast.success(`Venta guardada offline (${tempId}). Se sincronizará automáticamente.`);
        // Limpiar formulario...
      } catch (error) {
        toast.error('Error al guardar venta offline');
        console.error(error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {!isOnline && (
        <Alert variant="warning">
          <IconCloudX />
          <AlertTitle>Modo Offline</AlertTitle>
          <AlertDescription>
            Las ventas se guardarán localmente y se sincronizarán cuando vuelva la conexión.
          </AlertDescription>
        </Alert>
      )}

      {/* ... resto del formulario ... */}
    </form>
  );
}
```

**Tiempo estimado:** 4-5 horas

---

### TASK 3.6: Crear Indicador de Estado Offline

**Responsable:** `ui-ux-designer` o `pos-fullstack-dev`

**Archivo a crear:** `src/components/offline/offline-indicator.tsx`

**Código:**

```typescript
'use client';

import { useNetworkStatus } from '@/lib/offline/network-monitor';
import { useEffect, useState } from 'react';
import { SyncQueueService } from '@/lib/offline/sync-queue-service';
import { IconCloudCheck, IconCloudX, IconCloudUp } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await SyncQueueService.getPendingCount();
      setPendingCount(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 10000); // Actualizar cada 10s

    return () => clearInterval(interval);
  }, []);

  if (isOnline && pendingCount === 0) {
    return (
      <Badge variant="outline" className="gap-1">
        <IconCloudCheck className="h-3 w-3 text-green-500" />
        Online
      </Badge>
    );
  }

  if (!isOnline) {
    return (
      <Badge variant="destructive" className="gap-1">
        <IconCloudX className="h-3 w-3" />
        Offline
        {pendingCount > 0 && ` (${pendingCount})`}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 animate-pulse">
      <IconCloudUp className="h-3 w-3" />
      Sincronizando ({pendingCount})
    </Badge>
  );
}
```

**Agregar en `src/components/site-header.tsx`:**

```typescript
import { OfflineIndicator } from '@/components/offline/offline-indicator';

// En el render:
<div className="ml-auto flex items-center gap-2">
  <OfflineIndicator />
  {/* ... otros componentes ... */}
</div>
```

**Tiempo estimado:** 2 horas

---

### TASK 3.7: Iniciar Auto-Sync en el Layout Principal

**Responsable:** `pos-fullstack-dev`

**Archivo a modificar:** `src/app/dashboard/layout.tsx`

**Agregar:**

```typescript
'use client';

import { useEffect } from 'react';
import { AutoSyncService } from '@/lib/offline/auto-sync-service';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Iniciar auto-sync
    AutoSyncService.start();

    return () => {
      // Detener al desmontar
      AutoSyncService.stop();
    };
  }, []);

  return (
    <>
      {/* ... layout content ... */}
    </>
  );
}
```

**Tiempo estimado:** 1 hora

---

### 📊 ENTREGABLES FASE 3:

- ✅ Monitor de conexión funcional
- ✅ Cola de sincronización implementada
- ✅ Creación de ventas offline
- ✅ Sincronización automática al recuperar conexión
- ✅ Indicador visual de estado online/offline
- ✅ Contador de operaciones pendientes

**CHECKPOINT:** Validar que se pueden crear ventas offline y sincronizar correctamente.

---

## 📅 FASE 4: Resolución de Conflictos y Manejo de Errores (3-4 días)

**Objetivo:** Manejar conflictos de sincronización y errores robustamente.

### Prioridad: 🟡 Media (para MVP, alta para producción)
### Riesgo: 🟡 Medio

---

### TASK 4.1: Implementar Detección de Conflictos

**Responsable:** `pos-fullstack-dev`

**Archivo a crear:** `src/lib/offline/conflict-resolver.ts`

**Código:**

```typescript
import { prisma } from '@/actions/utils';

export type ConflictType =
  | 'PRODUCT_STOCK_MISMATCH'   // Stock local diferente al servidor
  | 'PRODUCT_DELETED'           // Producto eliminado en servidor
  | 'CUSTOMER_UPDATED'          // Cliente modificado en servidor
  | 'DUPLICATE_SALE';           // Venta ya existe

export interface Conflict {
  type: ConflictType;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown> | null;
  resolution: 'USE_SERVER' | 'USE_LOCAL' | 'MERGE' | 'MANUAL';
}

export class ConflictResolver {
  /**
   * Detecta conflictos en productos
   */
  static async detectProductConflicts(
    productId: string,
    localStock: number
  ): Promise<Conflict | null> {
    const serverProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { currentStock: true, isDeleted: true },
    });

    if (!serverProduct) {
      return {
        type: 'PRODUCT_DELETED',
        localData: { productId, localStock },
        serverData: null,
        resolution: 'MANUAL', // Requiere intervención
      };
    }

    if (serverProduct.isDeleted) {
      return {
        type: 'PRODUCT_DELETED',
        localData: { productId, localStock },
        serverData: serverProduct,
        resolution: 'MANUAL',
      };
    }

    if (Math.abs(serverProduct.currentStock - localStock) > 5) {
      return {
        type: 'PRODUCT_STOCK_MISMATCH',
        localData: { productId, localStock },
        serverData: { serverStock: serverProduct.currentStock },
        resolution: 'USE_SERVER', // Siempre confiar en el servidor
      };
    }

    return null;
  }

  /**
   * Resuelve conflicto automáticamente
   */
  static async resolveConflict(conflict: Conflict): Promise<boolean> {
    switch (conflict.resolution) {
      case 'USE_SERVER':
        // Actualizar dato local con el del servidor
        console.log('Conflict resolved: using server data', conflict);
        return true;

      case 'USE_LOCAL':
        // Mantener dato local (poco común)
        console.log('Conflict resolved: using local data', conflict);
        return true;

      case 'MERGE':
        // Intentar fusionar (caso específico)
        console.log('Conflict resolved: merging data', conflict);
        return true;

      case 'MANUAL':
        // No se puede resolver automáticamente
        console.error('Conflict requires manual resolution', conflict);
        return false;
    }
  }
}
```

**Tiempo estimado:** 4 horas

---

### TASK 4.2: Agregar Retry Logic a la Sincronización

**Responsable:** `pos-fullstack-dev`

**Modificar:** `src/lib/offline/auto-sync-service.ts`

**Agregar lógica de reintentos con backoff exponencial:**

```typescript
// Agregar función auxiliar
private static async retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i); // Exponential backoff
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Modificar syncPendingOperations para usar retry
for (const sale of pendingSales) {
  try {
    const result = await this.retryWithBackoff(
      () => createSaleFromOffline({ ...saleData }),
      3,
      2000
    );

    // ... resto de la lógica ...
  } catch (error) {
    // ... manejo de error ...
  }
}
```

**Tiempo estimado:** 2 horas

---

### TASK 4.3: Crear Dashboard de Conflictos

**Responsable:** `ui-ux-designer` o `pos-fullstack-dev`

**Archivo a crear:** `src/app/dashboard/sync-status/page.tsx`

**Código básico:**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { SyncQueueService } from '@/lib/offline/sync-queue-service';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SyncStatusPage() {
  const [pendingSales, setPendingSales] = useState([]);
  const [failedSales, setFailedSales] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const pending = await SyncQueueService.getPendingSales();
    const failed = pending.filter((s) => s.syncStatus === 'failed');
    setPendingSales(pending.filter((s) => s.syncStatus === 'pending'));
    setFailedSales(failed);
  };

  return (
    <div className="space-y-6">
      <h1>Estado de Sincronización</h1>

      <div className="grid gap-4">
        <div>
          <h2>Ventas Pendientes ({pendingSales.length})</h2>
          {/* Tabla de pendientes */}
        </div>

        <div>
          <h2>Ventas Fallidas ({failedSales.length})</h2>
          {/* Tabla de fallidas con opción de reintento */}
        </div>
      </div>
    </div>
  );
}
```

**Tiempo estimado:** 4-5 horas

---

### TASK 4.4: Testing de Escenarios de Error

**Responsable:** `pos-fullstack-dev`

**Crear archivo:** `TESTING_OFFLINE_MODE.md` con casos de prueba:

```markdown
# Test Cases - Modo Offline

## TC-1: Crear venta offline
1. Desconectar internet
2. Crear venta con productos
3. Verificar que se guarda en IndexedDB
4. Verificar badge "Offline (1)"

## TC-2: Sincronizar al recuperar conexión
1. Con venta offline pendiente
2. Conectar internet
3. Esperar max 30 segundos
4. Verificar venta en servidor
5. Verificar badge "Online"

## TC-3: Conflicto de stock
1. Producto con stock 10 en servidor
2. Offline: vender 5 unidades
3. Manualmente en servidor: vender otras 8 unidades
4. Conectar internet
5. Intentar sincronizar
6. Verificar manejo de conflicto

## TC-4: Producto eliminado
1. Crear venta offline con producto X
2. Eliminar producto X en servidor
3. Conectar internet
4. Verificar error y manejo

## TC-5: Múltiples ventas offline
1. Crear 10 ventas offline
2. Conectar internet
3. Verificar que se sincronizan en orden FIFO
4. Verificar que todas llegan al servidor

## TC-6: Fallo de sincronización
1. Crear venta offline
2. Simular error de servidor (500)
3. Verificar reintentos
4. Verificar que no se pierde la venta
```

**Ejecutar todos los test cases y documentar resultados.**

**Tiempo estimado:** 6-8 horas

---

### 📊 ENTREGABLES FASE 4:

- ✅ Detección de conflictos implementada
- ✅ Retry logic con backoff exponencial
- ✅ Dashboard de estado de sincronización
- ✅ Casos de prueba ejecutados y documentados

---

## 📅 FASE 5: Optimizaciones y Deployment (2-3 días)

**Objetivo:** Optimizar rendimiento y preparar para producción.

### Prioridad: 🟡 Media
### Riesgo: 🟢 Bajo

---

### TASK 5.1: Optimización de Caché

**Responsable:** `pos-fullstack-dev`

- Implementar lazy loading de productos (solo cargar al usar)
- Limitar caché a últimos N productos usados
- Implementar estrategia LRU (Least Recently Used)

**Tiempo estimado:** 4 horas

---

### TASK 5.2: Compresión de Datos

**Responsable:** `pos-fullstack-dev`

- Comprimir payloads antes de guardar en IndexedDB
- Usar `lz-string` o similar
- Reducir tamaño de almacenamiento en 60-80%

**Tiempo estimado:** 3 horas

---

### TASK 5.3: Monitoreo y Analytics

**Responsable:** `pos-fullstack-dev`

- Agregar logs de sincronización
- Métricas de tiempo offline
- Contador de operaciones sincronizadas

**Tiempo estimado:** 3 horas

---

### TASK 5.4: Documentación de Usuario

**Responsable:** `ui-ux-designer`

- Crear guía de uso del modo offline
- Tutorial interactivo al activar por primera vez
- FAQ de troubleshooting

**Tiempo estimado:** 4 horas

---

### TASK 5.5: Deployment a Producción

**Responsable:** `database-architect` + `pos-fullstack-dev`

**Pasos:**

1. **Backup de base de datos de producción**
```bash
# En Supabase Dashboard o CLI
supabase db dump > backup_pre_offline_$(date +%Y%m%d).sql
```

2. **Deploy de migración Prisma**
```bash
# En servidor de producción
npx prisma migrate deploy
```

3. **Build y deploy de frontend**
```bash
pnpm build
# Deploy según plataforma (Vercel, Railway, etc.)
```

4. **Validación post-deployment**
- [ ] Migración aplicada correctamente
- [ ] Service Worker registrado
- [ ] PWA instalable
- [ ] Lighthouse score ≥ 80

5. **Monitoreo**
- Monitorear logs por 24 horas
- Verificar que no hay errores en producción

**Tiempo estimado:** 4-6 horas

---

### 📊 ENTREGABLES FASE 5:

- ✅ Optimizaciones de rendimiento
- ✅ Compresión de datos
- ✅ Monitoreo implementado
- ✅ Documentación de usuario
- ✅ Deployment exitoso a producción

---

## 🔄 ESTRATEGIA DE ROLLBACK

### Escenario 1: Error en Migración Prisma

```bash
# 1. Revertir migración
npx prisma migrate resolve --rolled-back YYYYMMDDHHMMSS_add_offline_queue_model

# 2. Restaurar backup
psql $DATABASE_URL < backup_pre_offline_YYYYMMDD.sql

# 3. Verificar integridad
npx prisma migrate status
```

### Escenario 2: Error en Service Worker

```typescript
// Agregar en public/sw.js
self.addEventListener('install', (event) => {
  // Skip waiting para forzar actualización
  self.skipWaiting();
});

// Desregistrar service worker problemático
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}
```

### Escenario 3: Datos Corruptos en IndexedDB

```typescript
import { clearAllData } from '@/lib/offline/db-schema';

// En caso de emergencia, limpiar todo
await clearAllData();

// Forzar re-sincronización
await SyncManager.syncInitialData(organizationId);
```

---

## 📊 MÉTRICAS DE ÉXITO

### KPIs Técnicos:
- ✅ Lighthouse PWA score ≥ 80
- ✅ Service Worker registrado en >95% de sesiones
- ✅ Tasa de sincronización exitosa >98%
- ✅ Tiempo promedio de sincronización <10 segundos
- ✅ Tamaño de IndexedDB <50 MB por usuario

### KPIs de Negocio:
- ✅ Reducción de quejas por pérdida de conexión >80%
- ✅ Incremento en ventas completadas >15%
- ✅ Satisfacción del usuario >85%
- ✅ Instalaciones de PWA >30% de usuarios activos

### KPIs de Rendimiento:
- ✅ Time to Interactive <3 segundos
- ✅ First Contentful Paint <1.5 segundos
- ✅ Tamaño de bundle de PWA <300 KB

---

## ⚠️ RIESGOS Y MITIGACIONES

### Riesgo 1: Consumo Excesivo de Almacenamiento
**Probabilidad:** Media
**Impacto:** Alto
**Mitigación:**
- Límite de 5000 productos en caché
- Limpieza automática de datos >30 días
- Compresión con lz-string

### Riesgo 2: Conflictos de Sincronización Complejos
**Probabilidad:** Media
**Impacto:** Alto
**Mitigación:**
- Estrategia "server-wins" por defecto
- Dashboard de resolución manual
- Alertas a admins de conflictos no resueltos

### Riesgo 3: Degradación de Rendimiento
**Probabilidad:** Baja
**Impacto:** Medio
**Mitigación:**
- Lazy loading de datos
- Índices optimizados en IndexedDB
- Throttling de sincronización

### Riesgo 4: Incompatibilidad de Navegadores
**Probabilidad:** Baja
**Impacto:** Alto
**Mitigación:**
- Detección de compatibilidad
- Fallback a modo online-only
- Mensaje claro al usuario

---

## 📅 CRONOGRAMA RESUMIDO

| Fase | Duración | Días Hábiles |
|------|----------|--------------|
| Fase 1: PWA Base | 3-4 días | 3-4 |
| Fase 2: IndexedDB | 4-5 días | 4-5 |
| Fase 3: Operaciones Offline | 5-6 días | 5-6 |
| Fase 4: Conflictos y Errores | 3-4 días | 3-4 |
| Fase 5: Optimización y Deploy | 2-3 días | 2-3 |
| **TOTAL** | **17-22 días** | **4-5 semanas** |

**Recomendación:** Planificar 5 semanas completas con buffer para imprevistos.

---

## ✅ CHECKLIST FINAL PRE-DEPLOYMENT

### Técnico:
- [ ] Todos los tests pasan
- [ ] Lighthouse PWA score ≥ 80
- [ ] Service Worker funciona correctamente
- [ ] IndexedDB almacena y recupera datos
- [ ] Sincronización automática funciona
- [ ] Conflictos se manejan correctamente
- [ ] Retry logic implementada
- [ ] Monitoreo activo

### Base de Datos:
- [ ] Migración de `OfflineQueue` aplicada
- [ ] Backup de producción realizado
- [ ] Rollback plan documentado

### UI/UX:
- [ ] Indicador de estado online/offline visible
- [ ] Mensajes de error claros
- [ ] Loading states apropiados
- [ ] Tutorial de primera vez

### Documentación:
- [ ] Guía de usuario creada
- [ ] API docs actualizadas
- [ ] Casos de prueba documentados
- [ ] Runbook de incidentes

### Seguridad:
- [ ] Datos sensibles no se almacenan en IndexedDB
- [ ] Encriptación de datos críticos (opcional)
- [ ] Validación de permisos al sincronizar

---

## 📞 CONTACTOS Y RESPONSABLES

| Rol | Responsable | Fases |
|-----|------------|-------|
| Database Architect | TBD | 1.2, 5.5 |
| Fullstack Developer | TBD | Todas |
| UI/UX Designer | TBD | 1.4, 3.6, 5.4 |
| QA Tester | TBD | 4.4 |
| DevOps | TBD | 5.5 |

---

## 📚 RECURSOS ADICIONALES

### Documentación:
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Background Sync API](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync/)

### Herramientas:
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [PWA Builder](https://www.pwabuilder.com/)
- [Can I Use](https://caniuse.com/) - Verificar compatibilidad

---

## 🎉 CONCLUSIÓN

Este plan provee una ruta clara y segura para implementar el modo offline en el sistema POS sin afectar la operación en producción. Siguiendo las fases en orden y validando cada checkpoint, se garantiza una implementación robusta y confiable.

**Siguiente paso:** Revisar y aprobar este plan con el equipo técnico antes de comenzar la Fase 1.

---

**Documento actualizado:** 2025-01-25
**Próxima revisión:** Al completar cada fase
