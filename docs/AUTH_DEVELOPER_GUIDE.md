# 🚀 GUÍA DE DESARROLLO - AUTENTICACIÓN MANUAL

**Para Developers del POS System**
**Versión:** 1.0
**Fecha:** 2025-01-10

---

## 📚 TABLA DE CONTENIDOS

1. [Quick Start](#-quick-start)
2. [Autenticación en Server Actions](#-autenticación-en-server-actions)
3. [Autenticación en Server Components](#-autenticación-en-server-components)
4. [Autenticación en Client Components](#-autenticación-en-client-components)
5. [Middleware y Protección de Rutas](#️-middleware-y-protección-de-rutas)
6. [Mejores Prácticas](#-mejores-prácticas)
7. [Ejemplos Completos](#-ejemplos-completos)
8. [Troubleshooting](#-troubleshooting)

---

## 🎯 QUICK START

### Instalación y Setup

**1. Variables de entorno** (`.env`)
```bash
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
```

**2. Importar utilidades**
```typescript
// Para Server Actions
import { getCurrentUser, loginUser, logoutUser } from '@/actions/auth';

// Para Server Components
import { getUserFromHeaders, requireUser } from '@/lib/auth/server';

// Para validaciones
import { validateEmail, validatePassword } from '@/lib/auth';
```

---

## 🔐 AUTENTICACIÓN EN SERVER ACTIONS

### Obtener Usuario Actual

```typescript
'use server';

import { getCurrentUser } from '@/actions/auth';

export async function myAction() {
  const result = await getCurrentUser();

  if (result.status !== 200) {
    return {
      status: 401,
      message: 'No autenticado',
      data: null,
    };
  }

  const user = result.data.user;

  // Usar user.id, user.email, user.role, etc.
  console.log('User ID:', user.id);
  console.log('Org ID:', user.organizationId);

  return {
    status: 200,
    message: 'Success',
    data: { user },
  };
}
```

### Verificar Rol de Usuario

```typescript
'use server';

import { getCurrentUser } from '@/actions/auth';
import { ActionResponse } from '@/interfaces';

export async function adminOnlyAction(): Promise<ActionResponse> {
  // Obtener usuario actual
  const userResult = await getCurrentUser();

  if (userResult.status !== 200) {
    return {
      status: 401,
      message: 'No autenticado',
      data: null,
    };
  }

  const user = userResult.data.user;

  // Verificar rol ADMIN
  if (user.role !== 'ADMIN') {
    return {
      status: 403,
      message: 'Solo administradores pueden realizar esta acción',
      data: null,
    };
  }

  // Continuar con la lógica...
  return {
    status: 200,
    message: 'Acción ejecutada',
    data: null,
  };
}
```

### Query con Organization ID

```typescript
'use server';

import { getCurrentUser } from '@/actions/auth';
import { prisma } from '@/actions/utils';

export async function getMyProducts() {
  const userResult = await getCurrentUser();

  if (userResult.status !== 200) {
    return { status: 401, message: 'No autenticado', data: null };
  }

  const user = userResult.data.user;

  if (!user.organizationId) {
    return {
      status: 400,
      message: 'Usuario no tiene organización',
      data: null,
    };
  }

  // Query con organizationId para multi-tenancy
  const products = await prisma.product.findMany({
    where: {
      organizationId: user.organizationId,
      isDeleted: false,
    },
  });

  return {
    status: 200,
    message: 'Productos obtenidos',
    data: { products },
  };
}
```

---

## 🖥️ AUTENTICACIÓN EN SERVER COMPONENTS

### Opción 1: Helper Functions (Recomendado)

```typescript
// app/dashboard/page.tsx
import { requireUser } from '@/lib/auth/server';

export default async function DashboardPage() {
  // Requiere usuario autenticado (lanza error si no lo está)
  const user = await requireUser();

  return (
    <div>
      <h1>Welcome {user.email}</h1>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

### Opción 2: Verificación Manual

```typescript
// app/dashboard/products/page.tsx
import { getUserFromHeaders } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export default async function ProductsPage() {
  const user = await getUserFromHeaders();

  // Si no hay usuario, redirigir a login
  if (!user) {
    redirect('/auth/login');
  }

  // Si no hay organización, redirigir a onboarding
  if (!user.organizationId) {
    redirect('/onboarding');
  }

  return (
    <div>
      <h1>Products - Organization: {user.organizationId}</h1>
    </div>
  );
}
```

### Verificar Rol en Server Component

```typescript
// app/dashboard/admin/page.tsx
import { isAdminUser, requireUser } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const user = await requireUser();
  const isAdmin = await isAdminUser();

  if (!isAdmin) {
    redirect('/dashboard'); // Solo admins
  }

  return <div>Admin Panel</div>;
}
```

### Obtener Organization ID

```typescript
// app/dashboard/settings/page.tsx
import { requireOrganizationId } from '@/lib/auth/server';
import { prisma } from '@/actions/utils';

export default async function SettingsPage() {
  const organizationId = await requireOrganizationId();

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  return (
    <div>
      <h1>Settings</h1>
      <p>Organization: {organization?.name}</p>
    </div>
  );
}
```

---

## 💻 AUTENTICACIÓN EN CLIENT COMPONENTS

### Opción 1: Usar Server Action (Recomendado)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/actions/auth';

export default function MyClientComponent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const result = await getCurrentUser();

      if (result.status === 200) {
        setUser(result.data.user);
      }

      setLoading(false);
    }

    fetchUser();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <h1>Welcome {user.email}</h1>
    </div>
  );
}
```

### Opción 2: Context Provider (Para toda la app)

```typescript
// app/providers/auth-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser } from '@/actions/auth';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refetch: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const result = await getCurrentUser();
    if (result.status === 200) {
      setUser(result.data.user);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**Uso:**
```typescript
'use client';

import { useAuth } from '@/app/providers/auth-provider';

export default function MyComponent() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return <div>Welcome {user?.email}</div>;
}
```

---

## 🛡️ MIDDLEWARE Y PROTECCIÓN DE RUTAS

### Rutas Protegidas Automáticamente

El middleware protege automáticamente:
- `/dashboard/*`
- `/onboarding/*`
- `/api/auth/logout`

### Rutas Públicas

Estas rutas NO requieren autenticación:
- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`
- `/api/auth/*` (excepto logout)

### Agregar Nueva Ruta Protegida

```typescript
// src/middleware.ts

const PROTECTED_ROUTES = [
  '/dashboard',
  '/onboarding',
  '/admin',      // ← Nueva ruta protegida
];
```

### Agregar Nueva Ruta Pública

```typescript
// src/middleware.ts

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/public-page',  // ← Nueva ruta pública
];
```

---

## ✅ MEJORES PRÁCTICAS

### 1. Siempre Usar Multi-Tenancy

```typescript
// ✅ CORRECTO
const products = await prisma.product.findMany({
  where: {
    organizationId: user.organizationId,
    isDeleted: false,
  },
});

// ❌ INCORRECTO (leak de datos entre organizaciones)
const products = await prisma.product.findMany({
  where: {
    isDeleted: false,
  },
});
```

### 2. Verificar Organización Antes de Queries

```typescript
// ✅ CORRECTO
if (!user.organizationId) {
  return {
    status: 400,
    message: 'Usuario debe tener una organización',
    data: null,
  };
}

const products = await prisma.product.findMany({
  where: { organizationId: user.organizationId },
});
```

### 3. Usar requireUser en Server Components

```typescript
// ✅ CORRECTO
export default async function MyPage() {
  const user = await requireUser(); // Lanza error si no autenticado
  // ...
}

// ⚠️ ALTERNATIVA (manual)
export default async function MyPage() {
  const user = await getUserFromHeaders();
  if (!user) redirect('/auth/login');
  // ...
}
```

### 4. No Exponer Datos Sensibles

```typescript
// ✅ CORRECTO
return {
  status: 200,
  message: 'Usuario obtenido',
  data: {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    // NO incluir password
  },
};

// ❌ INCORRECTO
return {
  status: 200,
  data: user, // Incluye password hasheado
};
```

### 5. Validar Inputs SIEMPRE

```typescript
// ✅ CORRECTO
import { validateEmail, validatePassword } from '@/lib/auth';

const emailValid = validateEmail(email);
const passwordValid = validatePassword(password);

// ❌ INCORRECTO
// Sin validación, vulnerable a inyecciones
```

---

## 📖 EJEMPLOS COMPLETOS

### Example 1: Página de Login

```typescript
// app/auth/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = await loginUser(formData);

    if (result.status === 200) {
      router.push('/dashboard');
    } else {
      setError(result.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Example 2: Server Action con Auth

```typescript
// actions/products/create-product.ts
'use server';

import { getCurrentUser } from '@/actions/auth';
import { prisma } from '@/actions/utils';
import { ActionResponse } from '@/interfaces';

export async function createProduct(
  formData: FormData
): Promise<ActionResponse> {
  // 1. Verificar autenticación
  const userResult = await getCurrentUser();

  if (userResult.status !== 200) {
    return {
      status: 401,
      message: 'No autenticado',
      data: null,
    };
  }

  const user = userResult.data.user;

  // 2. Verificar organización
  if (!user.organizationId) {
    return {
      status: 400,
      message: 'Usuario debe tener una organización',
      data: null,
    };
  }

  // 3. Verificar rol (solo ADMIN)
  if (user.role !== 'ADMIN') {
    return {
      status: 403,
      message: 'Solo administradores pueden crear productos',
      data: null,
    };
  }

  // 4. Extraer datos del formulario
  const name = formData.get('name') as string;
  const price = parseFloat(formData.get('price') as string);

  // 5. Crear producto
  const product = await prisma.product.create({
    data: {
      name,
      salePrice: price,
      organizationId: user.organizationId,
      // ... otros campos
    },
  });

  return {
    status: 201,
    message: 'Producto creado exitosamente',
    data: { product },
  };
}
```

### Example 3: Server Component con Role Check

```typescript
// app/dashboard/admin/users/page.tsx
import { requireUser, isAdminUser } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/actions/utils';

export default async function UsersManagementPage() {
  // Requerir autenticación
  const user = await requireUser();

  // Verificar rol ADMIN
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    redirect('/dashboard');
  }

  // Obtener usuarios de la organización
  const users = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      isDeleted: false,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
    },
  });

  return (
    <div>
      <h1>Users Management</h1>
      <p>Organization: {user.organizationId}</p>
      <ul>
        {users.map(u => (
          <li key={u.id}>
            {u.firstName} {u.lastName} - {u.email} ({u.role})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🔍 TROUBLESHOOTING

### Error: "JWT_SECRET is not defined"

**Causa:** Falta JWT_SECRET en `.env`

**Solución:**
```bash
# .env
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
```

### Error: "Session expired. Please login again"

**Causa:** Token JWT expirado (después de 7 días por defecto)

**Solución:** Usuario debe hacer login nuevamente

### Error: "Not authenticated" en Server Component

**Causa:** No hay token o es inválido

**Solución:**
```typescript
const user = await getUserFromHeaders();
if (!user) {
  redirect('/auth/login');
}
```

### Usuario Queda Atrapado en Loop de Redirects

**Causa:** Usuario sin organizationId intenta acceder a `/dashboard`

**Solución:** Middleware redirige automáticamente a `/onboarding`

### Headers No Disponibles en Server Component

**Causa:** Middleware no se ejecutó (ruta pública o error)

**Solución:** Verificar que la ruta está en `PROTECTED_ROUTES`

---

## 📚 API REFERENCE RÁPIDA

### Server Actions

```typescript
// Autenticación
loginUser(formData: FormData): Promise<ActionResponse>
registerUser(formData: FormData): Promise<ActionResponse>
logoutUser(): Promise<ActionResponse>
logoutAllDevices(): Promise<ActionResponse>

// Usuario actual
getCurrentUser(): Promise<ActionResponse>
isAuthenticated(): Promise<ActionResponse>
getCurrentUserId(): Promise<string | null>
```

### Server Component Helpers

```typescript
// Obtener usuario
getUserFromHeaders(): Promise<UserFromHeaders | null>
getUserIdFromHeaders(): Promise<string | null>
getOrganizationIdFromHeaders(): Promise<string | null>
getStoreIdFromHeaders(): Promise<string | null>

// Verificar roles
hasRole(requiredRole: string): Promise<boolean>
isAdminUser(): Promise<boolean>

// Requerir autenticación
requireUser(): Promise<UserFromHeaders>
requireOrganizationId(): Promise<string>
```

### Validations

```typescript
// Email
validateEmail(email: string): boolean
normalizeEmail(email: string): string

// Password
validatePassword(password: string): PasswordValidationResult
validatePasswordComplete(password: string, confirmPassword: string): PasswordValidationResult
verifyPasswordMatch(password: string, confirmPassword: string): boolean
```

---

## 🎓 RECURSOS ADICIONALES

- **Middleware Documentation:** `docs/MIDDLEWARE_AUTH.md`
- **Migration Guide:** `docs/MIGRATION_COMPLETED.md`
- **Dependencies Update:** `docs/DEPENDENCIES_UPDATE.md`
- **Auth Types:** `src/lib/auth/types.ts`

---

**Última actualización:** 2025-01-10
**Versión:** 1.0
**Autor:** POS System Team
