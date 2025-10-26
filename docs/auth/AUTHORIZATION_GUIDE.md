# 🔐 GUÍA DE AUTORIZACIÓN - POS SYSTEM

**Sistema de Permisos y Control de Acceso**
**Versión:** 1.0
**Fecha:** 2025-01-10

---

## 📋 ÍNDICE

1. [Descripción General](#-descripción-general)
2. [Conceptos Clave](#-conceptos-clave)
3. [API Reference](#-api-reference)
4. [Ejemplos de Uso](#-ejemplos-de-uso)
5. [Patrones Comunes](#-patrones-comunes)
6. [Multi-Tenancy](#-multi-tenancy)
7. [Manejo de Errores](#-manejo-de-errores)
8. [Mejores Prácticas](#-mejores-prácticas)

---

## 🎯 DESCRIPCIÓN GENERAL

El sistema de autorización proporciona helpers para:

- ✅ Verificar autenticación de usuarios
- ✅ Validar roles (ADMIN/SELLER)
- ✅ Controlar acceso a organizaciones
- ✅ Controlar acceso a tiendas
- ✅ Verificar ownership de recursos
- ✅ Validar permisos complejos

**Ubicación:** `src/lib/auth/authorization.ts`

---

## 🔑 CONCEPTOS CLAVE

### Roles de Usuario

```typescript
enum UserRole {
  ADMIN   // Administrador (acceso total a su organización)
  SELLER  // Vendedor (acceso limitado a su tienda)
}
```

### Jerarquía de Permisos

```
ADMIN
  ├─ Puede acceder a todas las tiendas de su organización
  ├─ Puede modificar cualquier recurso de su organización
  ├─ Puede gestionar usuarios
  └─ Puede configurar parámetros del sistema

SELLER
  ├─ Solo puede acceder a su tienda asignada
  ├─ Solo puede modificar sus propios recursos
  └─ No puede gestionar usuarios ni parámetros
```

### Multi-Tenancy

Todos los recursos están aislados por `organizationId`:

```
Organization A
  ├─ Store 1
  ├─ Store 2
  └─ Users (solo pueden ver datos de Organization A)

Organization B
  ├─ Store 3
  └─ Users (solo pueden ver datos de Organization B)
```

---

## 📚 API REFERENCE

### Obtener Usuario Actual

#### `getCurrentAuthUser()`

Obtiene el usuario autenticado desde JWT + Base de datos.

```typescript
async function getCurrentAuthUser(): Promise<User | null>
```

**Retorna:** Usuario completo o `null` si no autenticado

**Ejemplo:**
```typescript
const user = await getCurrentAuthUser();

if (user) {
  console.log('User:', user.email);
  console.log('Role:', user.role);
  console.log('Org:', user.organizationId);
}
```

---

### Requerir Autenticación

#### `requireAuth()`

Requiere que el usuario esté autenticado. Lanza error si no lo está.

```typescript
async function requireAuth(): Promise<User>
```

**Retorna:** Usuario autenticado

**Lanza:** `AuthorizationError` si no autenticado

**Ejemplo:**
```typescript
export async function myAction() {
  const user = await requireAuth();
  // Si llega aquí, user siempre existe
  console.log('User ID:', user.id);
}
```

---

#### `requireAdmin()`

Requiere que el usuario sea ADMIN. Lanza error si no lo es.

```typescript
async function requireAdmin(): Promise<User>
```

**Retorna:** Usuario ADMIN

**Lanza:** `AuthorizationError` si no es ADMIN

**Ejemplo:**
```typescript
export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  // Solo admins llegan aquí

  await prisma.user.delete({ where: { id: userId } });
}
```

---

#### `requireOrganization(orgId: string)`

Requiere que el usuario pertenezca a una organización específica.

```typescript
async function requireOrganization(orgId: string): Promise<User>
```

**Parámetros:**
- `orgId` - ID de la organización requerida

**Retorna:** Usuario de la organización

**Lanza:** `AuthorizationError` si no pertenece

**Ejemplo:**
```typescript
export async function getOrgData(orgId: string) {
  const user = await requireOrganization(orgId);
  // Solo usuarios de orgId llegan aquí

  return await prisma.organization.findUnique({
    where: { id: orgId },
  });
}
```

---

#### `requireStoreAccess(storeId: string)`

Requiere que el usuario pueda acceder a una tienda.

**Reglas:**
- ADMIN: puede acceder a cualquier tienda de su organización
- SELLER: solo puede acceder a su tienda asignada

```typescript
async function requireStoreAccess(storeId: string): Promise<User>
```

**Ejemplo:**
```typescript
export async function getSales(storeId: string) {
  const user = await requireStoreAccess(storeId);
  // Solo usuarios con acceso a storeId llegan aquí

  return await prisma.sale.findMany({
    where: { storeId },
  });
}
```

---

#### `requireResourceOwner(resourceUserId: string)`

Requiere que el usuario sea propietario del recurso (o ADMIN).

```typescript
async function requireResourceOwner(resourceUserId: string): Promise<User>
```

**Ejemplo:**
```typescript
export async function deleteSale(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
  });

  await requireResourceOwner(sale.userId);
  // Solo el propietario o ADMIN llegan aquí

  await prisma.sale.delete({ where: { id: saleId } });
}
```

---

#### `requireUserOrganization()`

Requiere que el usuario tenga una organización configurada.

```typescript
async function requireUserOrganization(): Promise<User>
```

**Ejemplo:**
```typescript
export async function createProduct() {
  const user = await requireUserOrganization();
  // Solo usuarios con organización llegan aquí

  await prisma.product.create({
    data: {
      organizationId: user.organizationId!,
      // ...
    },
  });
}
```

---

#### `requireActiveOrganization()`

Requiere que el usuario tenga una organización activa.

```typescript
async function requireActiveOrganization(): Promise<User>
```

**Verifica:**
- Usuario tiene organización
- Organización existe y no está eliminada
- Organización está activa

**Ejemplo:**
```typescript
export async function performAction() {
  const user = await requireActiveOrganization();
  // Usuario con organización activa
}
```

---

### Verificaciones (Booleanas)

#### `hasRole(role: UserRole)`

Verifica si el usuario tiene un rol específico.

```typescript
async function hasRole(role: UserRole): Promise<boolean>
```

**Ejemplo:**
```typescript
const isAdmin = await hasRole('ADMIN');

if (isAdmin) {
  // Mostrar opciones de admin
}
```

---

#### `hasOrganization()`

Verifica si el usuario tiene organización configurada.

```typescript
async function hasOrganization(): Promise<boolean>
```

**Ejemplo:**
```typescript
const hasOrg = await hasOrganization();

if (!hasOrg) {
  redirect('/onboarding');
}
```

---

#### `canAccessStore(storeId: string)`

Verifica si el usuario puede acceder a una tienda.

```typescript
async function canAccessStore(storeId: string): Promise<boolean>
```

**Ejemplo:**
```typescript
const canAccess = await canAccessStore('store-123');

if (!canAccess) {
  return <div>Access Denied</div>;
}
```

---

#### `isResourceOwner(resourceUserId: string)`

Verifica si el usuario es propietario del recurso o es ADMIN.

```typescript
async function isResourceOwner(resourceUserId: string): Promise<boolean>
```

**Ejemplo:**
```typescript
const isOwner = await isResourceOwner(sale.userId);

if (!isOwner) {
  return { status: 403, message: 'Cannot modify this resource' };
}
```

---

#### `canModifyResource(resourceUserId: string)`

Verifica si el usuario puede modificar un recurso.

**Reglas:**
- ADMIN: puede modificar cualquier recurso de su organización
- SELLER: solo puede modificar sus propios recursos

```typescript
async function canModifyResource(resourceUserId: string): Promise<boolean>
```

**Ejemplo:**
```typescript
const canModify = await canModifyResource(product.userId);

if (canModify) {
  // Mostrar botón de editar
}
```

---

#### `checkPermissions(checks: (() => Promise<boolean>)[])`

Verifica múltiples permisos a la vez.

```typescript
async function checkPermissions(
  checks: (() => Promise<boolean>)[]
): Promise<boolean>
```

**Ejemplo:**
```typescript
const hasAllPermissions = await checkPermissions([
  () => hasRole('ADMIN'),
  () => canAccessStore('store-123'),
  () => hasOrganization(),
]);

if (hasAllPermissions) {
  // Tiene todos los permisos
}
```

---

### Helpers Rápidos

#### `getCurrentUserOrgId()`

Obtiene solo el organization ID del usuario actual.

```typescript
async function getCurrentUserOrgId(): Promise<string | null>
```

---

#### `getCurrentUserIdAuth()`

Obtiene solo el user ID del usuario actual.

```typescript
async function getCurrentUserIdAuth(): Promise<string | null>
```

---

## 💡 EJEMPLOS DE USO

### Example 1: Server Action con Autorización

```typescript
'use server';

import { requireAuth, requireAdmin } from '@/lib/auth';
import { prisma } from '@/actions/utils';
import { ActionResponse } from '@/interfaces';

export async function deleteUser(userId: string): Promise<ActionResponse> {
  try {
    // Solo ADMIN puede eliminar usuarios
    const admin = await requireAdmin();

    // Verificar que el usuario a eliminar es de la misma organización
    const userToDelete = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: admin.organizationId,
      },
    });

    if (!userToDelete) {
      return {
        status: 404,
        message: 'User not found',
        data: null,
      };
    }

    // Soft delete
    await prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'User deleted successfully',
      data: null,
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        status: error.code === 'UNAUTHORIZED' ? 401 : 403,
        message: error.message,
        data: null,
      };
    }

    return {
      status: 500,
      message: 'Failed to delete user',
      data: null,
    };
  }
}
```

---

### Example 2: Server Component con Verificación de Rol

```typescript
// app/dashboard/admin/page.tsx
import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  try {
    const admin = await requireAdmin();
  } catch {
    redirect('/dashboard');
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      <p>Only admins can see this</p>
    </div>
  );
}
```

---

### Example 3: Verificación de Acceso a Tienda

```typescript
'use server';

import { requireStoreAccess } from '@/lib/auth';
import { prisma } from '@/actions/utils';

export async function getStoreSales(storeId: string) {
  try {
    // Verificar que el usuario puede acceder a la tienda
    const user = await requireStoreAccess(storeId);

    // Obtener ventas de la tienda
    const sales = await prisma.sale.findMany({
      where: {
        storeId,
        isDeleted: false,
      },
      include: {
        saleItems: true,
        salePayments: true,
      },
    });

    return {
      status: 200,
      message: 'Sales retrieved',
      data: { sales },
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        status: 403,
        message: error.message,
        data: null,
      };
    }

    return {
      status: 500,
      message: 'Failed to get sales',
      data: null,
    };
  }
}
```

---

### Example 4: Verificación de Ownership

```typescript
'use server';

import { requireAuth, isResourceOwner } from '@/lib/auth';
import { prisma } from '@/actions/utils';

export async function updateSale(saleId: string, data: any) {
  try {
    const user = await requireAuth();

    // Obtener venta
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      return { status: 404, message: 'Sale not found', data: null };
    }

    // Verificar que el usuario es propietario o ADMIN
    const canModify = await isResourceOwner(sale.userId);

    if (!canModify) {
      return {
        status: 403,
        message: 'You can only modify your own sales',
        data: null,
      };
    }

    // Actualizar venta
    const updated = await prisma.sale.update({
      where: { id: saleId },
      data,
    });

    return {
      status: 200,
      message: 'Sale updated',
      data: { sale: updated },
    };
  } catch (error) {
    return {
      status: 500,
      message: 'Failed to update sale',
      data: null,
    };
  }
}
```

---

### Example 5: Permisos Complejos

```typescript
'use server';

import {
  requireAuth,
  hasRole,
  canAccessStore,
  checkPermissions,
} from '@/lib/auth';

export async function performComplexAction(storeId: string) {
  try {
    const user = await requireAuth();

    // Verificar múltiples permisos
    const hasPermissions = await checkPermissions([
      () => hasRole('ADMIN'),
      () => canAccessStore(storeId),
    ]);

    if (!hasPermissions) {
      return {
        status: 403,
        message: 'Insufficient permissions',
        data: null,
      };
    }

    // Realizar acción...

    return {
      status: 200,
      message: 'Action completed',
      data: null,
    };
  } catch (error) {
    return {
      status: 500,
      message: 'Action failed',
      data: null,
    };
  }
}
```

---

## 🔄 PATRONES COMUNES

### Patrón 1: Server Action Básica

```typescript
export async function myAction() {
  // 1. Requerir autenticación
  const user = await requireAuth();

  // 2. Verificar organización
  if (!user.organizationId) {
    return { status: 400, message: 'Organization required' };
  }

  // 3. Realizar operación con organizationId
  const data = await prisma.model.findMany({
    where: { organizationId: user.organizationId },
  });

  return { status: 200, data };
}
```

---

### Patrón 2: Server Action Solo ADMIN

```typescript
export async function adminAction() {
  // Requiere ADMIN
  const admin = await requireAdmin();

  // Operación de admin...

  return { status: 200, message: 'Success' };
}
```

---

### Patrón 3: Server Action con Store Access

```typescript
export async function storeAction(storeId: string) {
  // Verificar acceso a tienda
  const user = await requireStoreAccess(storeId);

  // Operación en la tienda...

  return { status: 200, message: 'Success' };
}
```

---

### Patrón 4: Modificar Recurso Propio

```typescript
export async function updateResource(resourceId: string, data: any) {
  const user = await requireAuth();

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });

  // Verificar ownership
  await requireResourceOwner(resource.userId);

  // Actualizar...

  return { status: 200, message: 'Updated' };
}
```

---

## 🏢 MULTI-TENANCY

### Aislamiento por Organización

**Siempre** filtrar por `organizationId` en queries:

```typescript
// ✅ CORRECTO
const products = await prisma.product.findMany({
  where: {
    organizationId: user.organizationId,
    isDeleted: false,
  },
});

// ❌ INCORRECTO - Leak de datos
const products = await prisma.product.findMany({
  where: { isDeleted: false },
});
```

---

### Verificar Organización en Operaciones

```typescript
export async function deleteProduct(productId: string) {
  const user = await requireAuth();

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId: user.organizationId, // ← Verificar org
    },
  });

  if (!product) {
    return { status: 404, message: 'Product not found' };
  }

  // Eliminar...
}
```

---

## ⚠️ MANEJO DE ERRORES

### AuthorizationError

El sistema lanza `AuthorizationError` con diferentes códigos:

```typescript
type ErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND';
```

**Mapeo HTTP:**
- `UNAUTHORIZED` → 401
- `FORBIDDEN` → 403
- `NOT_FOUND` → 404

---

### Capturar Errores de Autorización

```typescript
try {
  const user = await requireAdmin();
  // ...
} catch (error) {
  if (error instanceof AuthorizationError) {
    return {
      status: error.code === 'UNAUTHORIZED' ? 401 : 403,
      message: error.message,
      data: error.details || null,
    };
  }

  return {
    status: 500,
    message: 'Internal error',
    data: null,
  };
}
```

---

## ✅ MEJORES PRÁCTICAS

### 1. Usar Helpers en Orden de Especificidad

```typescript
// 1. Autenticación básica
const user = await requireAuth();

// 2. Verificar rol
const admin = await requireAdmin();

// 3. Verificar organización
const user = await requireOrganization(orgId);

// 4. Verificar tienda
const user = await requireStoreAccess(storeId);

// 5. Verificar ownership
await requireResourceOwner(resourceUserId);
```

---

### 2. Siempre Verificar Multi-Tenancy

```typescript
// ✅ CORRECTO
const user = await requireAuth();

const data = await prisma.model.findMany({
  where: {
    organizationId: user.organizationId,
  },
});
```

---

### 3. Validar Ownership en Modificaciones

```typescript
// ✅ CORRECTO
export async function updateResource(id: string) {
  const user = await requireAuth();
  const resource = await getResource(id);

  // Verificar que es propietario o ADMIN
  await requireResourceOwner(resource.userId);

  // Proceder con update...
}
```

---

### 4. Usar try-catch para Errores de Autorización

```typescript
// ✅ CORRECTO
try {
  const user = await requireAdmin();
  // ...
} catch (error) {
  if (error instanceof AuthorizationError) {
    return { status: 403, message: error.message };
  }
  throw error;
}
```

---

### 5. No Exponer Detalles de Error al Cliente

```typescript
// ✅ CORRECTO
return {
  status: 403,
  message: 'Access denied',
  data: null,
};

// ❌ INCORRECTO - Expone info sensible
return {
  status: 403,
  message: error.details,
  data: null,
};
```

---

## 📊 TABLA DE DECISIÓN

| Escenario | Helper Recomendado |
|-----------|-------------------|
| Verificar login | `requireAuth()` |
| Solo admins | `requireAdmin()` |
| Acceso a organización | `requireOrganization(orgId)` |
| Acceso a tienda | `requireStoreAccess(storeId)` |
| Modificar recurso propio | `requireResourceOwner(userId)` |
| Usuario con org | `requireUserOrganization()` |
| Org activa | `requireActiveOrganization()` |
| Verificar rol (bool) | `hasRole(role)` |
| Verificar store (bool) | `canAccessStore(storeId)` |
| Permisos complejos | `checkPermissions([...])` |

---

## 🔗 RECURSOS RELACIONADOS

- **Auth Actions:** `src/actions/auth/`
- **Middleware:** `src/middleware.ts`
- **Server Helpers:** `src/lib/auth/server.ts`
- **JWT Utilities:** `src/lib/auth/jwt.ts`

---

**Última actualización:** 2025-01-10
**Versión:** 1.0
**Estado:** ✅ COMPLETADO
