# Plan de Implementación - Módulo de Compras

## Resumen Ejecutivo

Este documento define el plan de implementación completo del módulo de compras para el sistema POS. El módulo seguirá exactamente el mismo patrón arquitectónico y de código que el módulo de ventas existente, garantizando consistencia y mantenibilidad.

### Objetivos Principales

1. **Gestión completa de compras** con proveedores obligatorios
2. **Creación inline de proveedores** en el formulario de compra (similar a clientes en ventas)
3. **Creación inline de productos** mediante modal desde el formulario de compra
4. **Vista de listado** con acciones de detalle, editar y cancelar
5. **Actualización automática de inventario** al recibir compras
6. **Trazabilidad completa** mediante stock movements
7. **⚠️ ACCESO EXCLUSIVO PARA ADMIN** - Los usuarios SELLER no tienen acceso al módulo de compras

---

## 🔒 Control de Acceso y Seguridad

### Restricción ADMIN Only

**⚠️ CRÍTICO:** Todo el módulo de compras está restringido exclusivamente para usuarios con rol ADMIN.

#### Capas de seguridad implementadas:

1. **Backend (Server Actions):**
   - Todas las acciones verifican `checkAdminRole(userId)`
   - Retornan `unauthorizedResponse()` si el usuario no es ADMIN
   - Aplica a: suppliers, purchases, purchase-items

2. **Frontend (Rutas Protegidas):**
   - Páginas verifican rol en `useEffect`
   - Redirección automática a `/dashboard` si no es ADMIN
   - Toast de error informativo para el usuario
   - Loading state mientras verifica permisos

3. **UI (Navegación):**
   - Links ocultos del sidebar para usuarios SELLER
   - Propiedad `visible: userRole === 'ADMIN'` en items del menú
   - Sin acceso visual a proveedores ni compras para SELLER

4. **Validaciones adicionales:**
   - Hooks verifican permisos antes de ejecutar queries
   - Componentes de creación inline solo visibles para ADMIN
   - Botones de acción condicionados por rol

#### Usuarios SELLER:
- ❌ No ven "Compras" en navegación principal
- ❌ No ven "Proveedores" en parametrización
- ❌ Reciben error 403 si intentan acceso directo a URL
- ❌ No pueden ejecutar acciones de compras desde el backend

#### Usuarios ADMIN:
- ✅ Acceso completo a gestión de proveedores
- ✅ Creación, edición, recepción y cancelación de compras
- ✅ Creación inline de productos y proveedores
- ✅ Acceso a analytics y reportes de compras

---

## Fase 1: Server Actions - Backend

### 1.1. Supplier Actions (`src/actions/supplier/`)

#### Archivos a crear:
- `src/actions/supplier/supplier.actions.ts`
- `src/actions/supplier/index.ts`

#### Funcionalidades a implementar:

**supplier.actions.ts:**
```typescript
// Incluye constante para supplier includes
const supplierInclude: Prisma.SupplierInclude = {
  purchases: {
    select: {
      id: true,
      purchaseNumber: true,
      total: true,
      status: true,
      purchaseDate: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  },
  _count: {
    select: { purchases: true },
  },
}

// Acciones CRUD:
- createSupplier(orgId, userId, supplierData)
- getSuppliersByOrgId(orgId, filters?, includeDeleted?, pagination?)
- getSupplierById(supplierId)
- getSupplierByTaxId(orgId, taxId)
- getSupplierByEmail(orgId, email)
- updateSupplier(supplierId, userId, updateData)
- softDeleteSupplier(supplierId, userId)
- toggleSupplierActiveStatus(supplierId, userId)

// Acciones analíticas:
- getSupplierPurchaseHistory(supplierId, pagination?)
- getSupplierStatistics(supplierId)
- getTopSuppliersByPurchases(orgId, limit = 10)
```

**Validaciones a incluir:**
- Email único por organización (si se proporciona)
- TaxId único por organización (si se proporciona)
- No eliminar si tiene compras asociadas (solo desactivar)
- **⚠️ Control de acceso SOLO ADMIN** - Usar `checkAdminRole` para autorización

**Patrones importantes:**
- **Usar `checkAdminRole` para autorización** (NO `checkAdminOrSellerRole`)
- Soft delete pattern con `isDeleted`, `deletedAt`
- Unique constraints incluyendo `deletedAt`
- Incluir relaciones con `_count` para estadísticas

---

### 1.2. Purchase Actions (`src/actions/purchase/`)

#### Archivos a crear:
- `src/actions/purchase/purchase.actions.ts`
- `src/actions/purchase/index.ts`

#### Funcionalidades a implementar:

**purchase.actions.ts:**
```typescript
// Incluye constante para purchase includes
const purchaseInclude: Prisma.PurchaseInclude = {
  supplier: true,
  purchaseItems: {
    where: { isDeleted: false },
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          unitMeasure: true,
        },
      },
    },
  },
  _count: {
    select: { purchaseItems: true },
  },
}

// Funciones auxiliares:
- generatePurchaseNumber(): Promise<string>
- validatePurchaseItems(items): void
- calculatePurchaseTotals(items): { subtotal, total }

// Acciones CRUD:
- createPurchase(orgId, userId, purchaseData, purchaseItems)
- getPurchasesByOrgId(orgId, filters?, includeDeleted?, pagination?)
- getPurchaseById(purchaseId)
- getPurchaseByNumber(orgId, purchaseNumber)
- updatePurchase(purchaseId, userId, updateData)
- receivePurchase(purchaseId, userId) // Cambia status a RECEIVED y crea stock IN
- cancelPurchase(purchaseId, userId, reason?)
- softDeletePurchase(purchaseId, userId)

// Acciones analíticas:
- getPurchasesAnalytics(orgId, dateFrom?, dateTo?)
- getPendingPurchases(orgId)
- getReceivedPurchases(orgId)
```

**Lógica crítica de receivePurchase:**
```typescript
// En transacción:
1. Actualizar status de Purchase a RECEIVED
2. Establecer receivedDate
3. Para cada purchaseItem:
   - Crear StockMovement tipo IN
   - Actualizar product.currentStock (sumar cantidad)
4. Retornar purchase actualizada con includes
```

**Validaciones a incluir:**
- **⚠️ Solo usuarios ADMIN pueden crear/modificar compras** - Verificar con `checkAdminRole` en TODAS las acciones
- Supplier es obligatorio y debe existir
- Productos deben existir y estar activos
- No permitir items con quantity <= 0 o unitPrice < 0
- Solo ADMIN puede cancelar compras (en cualquier estado)
- Purchase number único
- Control de transacciones con timeout aumentado

**Control de acceso:**
```typescript
// TODAS las acciones de compra requieren ADMIN
const isAdmin = await checkAdminRole(userId);
if (!isAdmin) return unauthorizedResponse();
```

**Filtros a soportar:**
```typescript
interface PurchaseFilters {
  supplierId?: string;
  status?: PurchaseStatus; // PENDING, RECEIVED, CANCELLED
  dateFrom?: Date;
  dateTo?: Date;
  search?: string; // por purchaseNumber o nombre de proveedor
  minAmount?: number;
  maxAmount?: number;
}
```

---

### 1.3. Purchase Item Actions (`src/actions/purchase-item/`)

#### Archivos a crear:
- `src/actions/purchase-item/purchase-item.actions.ts`
- `src/actions/purchase-item/index.ts`

#### Funcionalidades a implementar:

**purchase-item.actions.ts:**
```typescript
// Acciones:
- createPurchaseItem(purchaseId, itemData)
- getPurchaseItemsByPurchaseId(purchaseId)
- updatePurchaseItem(itemId, userId, updateData)
- softDeletePurchaseItem(itemId, userId)
```

**Nota:** Similar a SaleItem, probablemente no se usarán mucho directamente ya que los items se manejan en conjunto con la compra.

---

## Fase 2: Custom Hooks - Data Fetching

### 2.1. Supplier Hook (`src/hooks/useSuppliers.ts`)

#### Hooks a implementar:

```typescript
// Hook principal
- useSuppliers(filters?, includeDeleted?, pagination?)

// Hooks específicos
- useSupplierById(supplierId)
- useSupplierByTaxId(taxId)
- useSupplierByEmail(email)

// Hooks de mutación
- useCreateSupplier()
- useUpdateSupplier()
- useSoftDeleteSupplier()
- useToggleSupplierActiveStatus()

// Hooks analíticos
- useSupplierPurchaseHistory(supplierId, pagination?)
- useSupplierStatistics(supplierId)
- useTopSuppliersByPurchases(limit = 10)

// Hooks de conveniencia
- useActiveSuppliers(filters?, pagination?)
- useAllSuppliers(filters?, pagination?)
- useSearchSuppliers(searchTerm, filters?, pagination?)
- useDeletedSuppliers(filters?, pagination?)
```

**Configuración TanStack Query:**
```typescript
{
  queryKey: ['suppliers', user?.organizationId, filters, includeDeleted, pagination],
  staleTime: 3 * 60 * 1000, // 3 minutos
  gcTime: 5 * 60 * 1000, // 5 minutos
}
```

**Invalidaciones en mutaciones:**
- Invalidar `['suppliers', organizationId]` en create/update/delete
- Invalidar `['supplier', supplierId]` en operaciones específicas
- Invalidar `['supplier', 'taxId']` y `['supplier', 'email']` en updates

---

### 2.2. Purchase Hook (`src/hooks/usePurchases.ts`)

#### Hooks a implementar:

```typescript
// Hook principal
- usePurchases(filters?, includeDeleted?, pagination?)

// Hooks específicos
- usePurchaseById(purchaseId)
- usePurchaseByNumber(purchaseNumber)

// Hooks de estado
- usePendingPurchases()
- useReceivedPurchases()

// Hooks analíticos
- usePurchasesAnalytics(dateFrom?, dateTo?)

// Hooks de mutación
- useCreatePurchase()
- useUpdatePurchase()
- useReceivePurchase() // ¡IMPORTANTE!
- useCancelPurchase()
- useSoftDeletePurchase()

// Hooks de conveniencia
- usePurchasesBySupplier(supplierId, filters?, pagination?)
- usePurchasesByStatus(status, filters?, pagination?)
- usePurchasesByDateRange(dateFrom, dateTo, filters?, pagination?)
- useSearchPurchases(searchTerm, filters?, pagination?)
- useDeletedPurchases(filters?, pagination?)

// Hooks específicos por estado
- useCancelledPurchases(filters?, pagination?)

// Hooks analíticos específicos
- useTodayPurchasesAnalytics()
- useCurrentMonthPurchasesAnalytics()
- useCurrentYearPurchasesAnalytics()
- useLast7DaysPurchasesAnalytics()
- useLast30DaysPurchasesAnalytics()

// Hook compuesto
- useCriticalPurchasesOverview()
```

**Configuración TanStack Query:**
```typescript
{
  queryKey: ['purchases', user?.organizationId, filters, includeDeleted, pagination],
  staleTime: 2 * 60 * 1000, // 2 minutos
  gcTime: 5 * 60 * 1000, // 5 minutos
}
```

**Invalidaciones importantes en receivePurchase:**
```typescript
onSuccess: () => {
  // Invalidar purchases
  queryClient.invalidateQueries({ queryKey: ['purchases'] })
  queryClient.invalidateQueries({ queryKey: ['purchases', 'pending'] })
  queryClient.invalidateQueries({ queryKey: ['purchases', 'analytics'] })

  // ¡CRÍTICO! Invalidar productos para reflejar nuevo stock
  queryClient.invalidateQueries({ queryKey: ['products'] })
  queryClient.invalidateQueries({ queryKey: ['products', 'lowStock'] })

  // Invalidar stock movements
  queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
}
```

---

## Fase 3: UI Components - Formularios y Vistas

### 3.1. Supplier Components

#### Archivos a crear:

**Estructura de directorios:**
```
src/app/dashboard/suppliers/
├── page.tsx                          # Página principal
└── features/
    ├── suppliers-list.tsx            # Lista con filtros
    ├── data-table.tsx                # TanStack Table
    ├── new-supplier.tsx              # Sheet para crear
    ├── edit-supplier.tsx             # Sheet para editar
    ├── action-component.tsx          # Acciones de fila
    └── supplier-detail-dialog.tsx    # Diálogo de detalle
```

**new-supplier.tsx - Schema de validación:**
```typescript
const schema = yup.object().shape({
  name: yup.string().required('El nombre es requerido').min(2).max(100),
  contactName: yup.string().nullable().notRequired().max(100),
  email: yup.string().nullable().notRequired().email().max(100),
  phone: yup.string().nullable().notRequired().min(7).max(20),
  taxId: yup.string().nullable().notRequired().min(5).max(20),
  address: yup.string().nullable().notRequired().max(200),
  city: yup.string().nullable().notRequired().max(50),
  department: yup.string().nullable().notRequired().max(50),
})
```

**suppliers-list.tsx - Filtros a implementar:**
```typescript
interface SupplierFiltersState {
  search?: string;
  isActive?: boolean;
  city?: string;
  department?: string;
}
```

---

### 3.2. Purchase Form Components

#### Archivos a crear:

**Estructura de directorios:**
```
src/app/dashboard/purchases/
├── page.tsx                          # Lista de compras
├── new/
│   ├── page.tsx                      # Wrapper de formulario
│   ├── new-purchase-form.tsx         # Formulario principal
│   └── features/
│       ├── supplier-combobox.tsx     # Selector de proveedor
│       ├── create-supplier-dialog.tsx # Creación inline de proveedor
│       ├── product-selector.tsx      # Selector/creador de productos
│       └── create-product-dialog.tsx # Creación inline de producto
└── features/
    ├── purchases-list.tsx            # Lista con filtros
    ├── data-table.tsx                # TanStack Table
    ├── action-component.tsx          # Acciones: detalle, recibir, cancelar
    ├── purchase-detail-dialog.tsx    # Diálogo de detalle
    ├── receive-purchase-dialog.tsx   # Diálogo para recibir compra
    └── edit-purchase-status-dialog.tsx # Editar status/notas
```

---

### 3.3. New Purchase Form (Componente Principal)

#### `new-purchase-form.tsx` - Estructura completa:

**Schema de validación:**
```typescript
const schema = yup.object().shape({
  supplier: yup.string().required('El proveedor es requerido').min(1),
  purchaseDate: yup
    .string()
    .required('La fecha de compra es requerida')
    .test('is-valid-date', 'Fecha inválida', (value) => {
      if (!value) return false;
      const date = new Date(value);
      return !isNaN(date.getTime());
    })
    .test('not-future', 'La fecha no puede ser futura', (value) => {
      if (!value) return false;
      const date = new Date(value);
      const now = new Date();
      return date <= now;
    }),
  notes: yup.string().nullable().notRequired(),
})
```

**Estados locales:**
```typescript
// Productos seleccionados
const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])

// Proveedor seleccionado (obligatorio)
const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)

// Diálogos
const [createSupplierDialogOpen, setCreateSupplierDialogOpen] = useState(false)
const [createProductDialogOpen, setCreateProductDialogOpen] = useState(false)
```

**Tipos locales:**
```typescript
interface SelectedProduct {
  productId: string;
  product: ProductWithRelations;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
```

**Funciones principales:**
```typescript
// Gestión de productos
- handleAddProduct(product)
- handleCreateProduct() // Abre modal de creación
- handleProductCreated(productId) // Callback después de crear
- handleUpdateQuantity(productId, newQuantity)
- handleUpdatePrice(productId, newPrice)
- handleRemoveProduct(productId)

// Gestión de proveedor
- handleSupplierSelect(supplierId)
- handleCreateSupplier() // Abre diálogo
- handleSupplierCreated(supplierId) // Callback

// Submit
- handleSubmit(data)
```

**Estructura del formulario:**
```tsx
1. Header con navegación
2. Selector de Proveedor (obligatorio)
   - SupplierCombobox
   - Botón "Crear Proveedor" → CreateSupplierDialog
3. Datos de la compra
   - Fecha de compra (datetime-local)
   - Notas (textarea)
4. Sección de Productos
   - Buscador con botón "Crear Producto" → CreateProductDialog
   - Lista de productos seleccionados (tabla)
   - Controles de cantidad y precio
5. Resumen de totales
   - Subtotal
   - Total
6. Botones de acción
   - Cancelar
   - Guardar como Pendiente
   - Guardar y Recibir (crea con status RECEIVED)
```

---

### 3.4. Create Supplier Dialog

#### `create-supplier-dialog.tsx`:

**Props:**
```typescript
interface CreateSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierCreated: (supplierId: string) => void;
}
```

**Campos del formulario:**
```typescript
{
  name: string; // Requerido
  contactName: string | null;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
}
```

**Características:**
- Similar a CreateCustomerDialog
- Validación con Yup
- Auto-reset al cerrar
- Toast de éxito/error
- Loading state durante creación
- Callback con ID del proveedor creado

---

### 3.5. Create Product Dialog (Modal)

#### `create-product-dialog.tsx`:

**Props:**
```typescript
interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated: (productId: string) => void;
}
```

**Campos mínimos requeridos:**
```typescript
{
  name: string; // Requerido
  categoryId: string | null;
  brandId: string | null;
  unitMeasureId: string | null;
  costPrice: number; // Requerido, default 0
  salePrice: number; // Requerido, default 0
  barcode: string | null;
  sku: string | null;
  description: string | null;
}
```

**Características especiales:**
- Formulario simplificado (no requiere imagen ni campos avanzados)
- Auto-populate de precio de venta basado en costPrice (sugerencia)
- Selectores para categoría, marca y unidad de medida
- Validación: salePrice >= costPrice (warning, no error)
- Stock inicial en 0 (se actualizará con la compra)
- Auto-cerrar y callback después de crear

---

### 3.6. Supplier Combobox

#### `supplier-combobox.tsx`:

**Características:**
- Búsqueda filtrable de proveedores activos
- Mostrar: nombre, taxId (si existe)
- Botón inline "Crear Proveedor"
- Actualización automática después de crear nuevo proveedor
- Valor controlado desde formulario padre

**Funcionalidad similar a CustomerCombobox:**
```typescript
- useActiveSuppliers({ search: debouncedSearch })
- Filtrado local adicional
- Highlight de resultados de búsqueda
- Accesibilidad (aria-labels, keyboard navigation)
```

---

### 3.7. Product Selector Component

#### `product-selector.tsx`:

**Características:**
- Búsqueda de productos activos
- Botón "Crear Producto" que abre CreateProductDialog
- Mostrar: nombre, SKU, precio de costo, stock actual
- Indicador visual si producto ya está agregado
- Auto-limpiar búsqueda después de seleccionar

---

### 3.8. Purchases List

#### `purchases-list.tsx`:

**Filtros a implementar:**
```typescript
interface PurchaseFiltersState {
  search?: string; // purchaseNumber o proveedor
  status?: PurchaseStatus;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  minTotal?: string;
  maxTotal?: string;
}
```

**Columnas de la tabla:**
```
- Número de Compra
- Proveedor
- Fecha de Compra
- Total
- Estado (Badge con color)
- Fecha de Recepción (si RECEIVED)
- Acciones
```

---

### 3.9. Purchase Actions Component

#### `action-component.tsx`:

**Acciones disponibles según estado:**

**PENDING:**
- Ver Detalle (ojo)
- Recibir Compra (check) → ReceivePurchaseDialog
- Editar Notas (edit)
- Cancelar (X) → Confirmación con SweetAlert2

**RECEIVED:**
- Ver Detalle (ojo)
- Ver Movimientos de Stock (relacionados)

**CANCELLED:**
- Ver Detalle (ojo)

**Solo ADMIN:**
- Eliminar (soft delete) - solo si PENDING y sin items procesados

---

### 3.10. Receive Purchase Dialog

#### `receive-purchase-dialog.tsx`:

**Propósito:** Confirmar la recepción de una compra pendiente

**Props:**
```typescript
interface ReceivePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: PurchaseWithRelations;
}
```

**Contenido:**
```tsx
1. Resumen de la compra
   - Proveedor
   - Número de compra
   - Total
   - Cantidad de items
2. Lista de productos que se recibirán
   - Producto, Cantidad, Precio
3. Advertencia: "Esta acción actualizará el inventario"
4. Botones:
   - Cancelar
   - Confirmar Recepción → useReceivePurchase mutation
```

**Efectos después de recibir:**
- Toast de éxito
- Cerrar diálogo
- Navegar a lista de compras (opcional)
- Invalidar queries de productos y stock

---

### 3.11. Purchase Detail Dialog

#### `purchase-detail-dialog.tsx`:

**Similar a SaleDetailDialog, mostrar:**

```tsx
1. Header
   - Número de compra
   - Estado (Badge)
   - Fecha de compra
   - Proveedor con datos de contacto
2. Items de compra (tabla)
   - Producto
   - Cantidad
   - Precio unitario
   - Subtotal
3. Totales
   - Subtotal
   - Total
4. Información adicional
   - Fecha de recepción (si aplica)
   - Notas
   - Creado por (usuario)
   - Fechas de creación/actualización
```

---

## Fase 4: Navigation & Routes

### 4.1. Agregar rutas al sidebar

#### `src/components/app-sidebar.tsx`:

**Agregar en sección "Parametrization" (SOLO visible para ADMIN):**
```typescript
{
  title: 'Proveedores',
  url: '/dashboard/suppliers',
  icon: IconTruck,
  isActive: pathname.startsWith('/dashboard/suppliers'),
  // Solo mostrar para ADMIN
  visible: userRole === 'ADMIN',
}
```

**Agregar en sección "Main Nav" (después de Sales) (SOLO visible para ADMIN):**
```typescript
{
  title: 'Compras',
  url: '/dashboard/purchases',
  icon: IconShoppingCart,
  isActive: pathname.startsWith('/dashboard/purchases'),
  // Solo mostrar para ADMIN
  visible: userRole === 'ADMIN',
}
```

**⚠️ IMPORTANTE:** Asegurar que estas rutas se oculten completamente del sidebar para usuarios SELLER.

---

### 4.2. Crear páginas de ruta

**Suppliers:**
- `/dashboard/suppliers/page.tsx`

**Purchases:**
- `/dashboard/purchases/page.tsx`
- `/dashboard/purchases/new/page.tsx`

---

### 4.3. Protección de Rutas - ADMIN Only

#### Implementar verificación de rol en cada página:

**Patrón a seguir en TODAS las páginas del módulo:**

```typescript
// En page.tsx de suppliers, purchases, purchases/new
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { toast } from 'sonner';

export default function PurchasesPage() {
  const router = useRouter();
  const user = useStore((state) => state.user);

  // Verificar que el usuario es ADMIN
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      toast.error('No tienes permisos para acceder a esta sección');
      router.push('/dashboard');
    }
  }, [user, router]);

  // Mostrar loading mientras verifica permisos
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Renderizar contenido solo si es ADMIN
  return (
    // ... contenido de la página
  );
}
```

**Páginas que requieren esta protección:**
- ✅ `/dashboard/suppliers/page.tsx`
- ✅ `/dashboard/purchases/page.tsx`
- ✅ `/dashboard/purchases/new/page.tsx`

**Alternativa (Middleware Pattern):**

Si se prefiere, se puede crear un componente wrapper para proteger rutas:

```typescript
// src/components/admin-route-guard.tsx
'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { toast } from 'sonner';

interface AdminRouteGuardProps {
  children: ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const router = useRouter();
  const user = useStore((state) => state.user);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      toast.error('No tienes permisos para acceder a esta sección');
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
```

**Uso en páginas:**
```typescript
import { AdminRouteGuard } from '@/components/admin-route-guard';

export default function PurchasesPage() {
  return (
    <AdminRouteGuard>
      {/* Contenido de la página */}
    </AdminRouteGuard>
  );
}
```

---

## Fase 5: Integration & Testing

### 5.1. Verificaciones de integración

**Checklist de pruebas:**

1. **Proveedores:**
   - [ ] Crear proveedor con todos los campos
   - [ ] Crear proveedor con campos mínimos (solo nombre)
   - [ ] Editar proveedor
   - [ ] Desactivar/activar proveedor
   - [ ] Intentar eliminar proveedor con compras (debe fallar)
   - [ ] Búsqueda y filtros funcionan
   - [ ] Validación de email/taxId únicos

2. **Productos inline:**
   - [ ] Crear producto desde formulario de compra
   - [ ] Producto creado aparece automáticamente en búsqueda
   - [ ] Producto se agrega automáticamente después de crear
   - [ ] Validación de campos requeridos funciona

3. **Compras PENDING:**
   - [ ] Crear compra con proveedor existente
   - [ ] Crear compra con proveedor creado inline
   - [ ] Crear compra con productos existentes
   - [ ] Crear compra con productos creados inline
   - [ ] Validación: proveedor obligatorio
   - [ ] Validación: al menos un producto requerido
   - [ ] Validación: cantidad > 0, precio >= 0
   - [ ] Número de compra se genera automáticamente

4. **Recepción de compras:**
   - [ ] Recibir compra actualiza stock de productos
   - [ ] Se crean StockMovements tipo IN correctamente
   - [ ] Stock anterior y nuevo se registran correctamente
   - [ ] Status cambia a RECEIVED
   - [ ] receivedDate se establece
   - [ ] No se puede recibir una compra ya recibida
   - [ ] No se puede recibir una compra cancelada

5. **Cancelación de compras:**
   - [ ] Cancelar compra PENDING
   - [ ] Solo ADMIN puede cancelar RECEIVED
   - [ ] Razón de cancelación se registra
   - [ ] Stock NO se revierte automáticamente (decisión de negocio)

6. **Lista y filtros:**
   - [ ] Búsqueda por número de compra funciona
   - [ ] Búsqueda por proveedor funciona
   - [ ] Filtro por estado funciona
   - [ ] Filtro por fechas funciona
   - [ ] Filtro por rango de montos funciona
   - [ ] Paginación funciona correctamente

7. **Detalle de compra:**
   - [ ] Muestra toda la información correctamente
   - [ ] Items se muestran con detalles de producto
   - [ ] Totales calculados correctamente
   - [ ] Datos del proveedor completos

8. **Permisos:**
   - [ ] **SOLO ADMIN puede acceder al módulo de compras**
   - [ ] SELLER NO puede ver proveedores en el sidebar
   - [ ] SELLER NO puede ver compras en el sidebar
   - [ ] SELLER redirigido/error 403 si intenta acceder a /dashboard/purchases
   - [ ] SELLER redirigido/error 403 si intenta acceder a /dashboard/suppliers
   - [ ] ADMIN puede crear compras
   - [ ] ADMIN puede recibir compras
   - [ ] ADMIN puede cancelar compras
   - [ ] ADMIN puede eliminar (soft) compras

9. **Invalidación de cache:**
   - [ ] Crear compra invalida lista de compras
   - [ ] Recibir compra invalida productos y stock
   - [ ] Cancelar compra invalida analytics
   - [ ] Crear proveedor invalida lista de proveedores

10. **Responsividad:**
    - [ ] Formulario responsive en mobile
    - [ ] Tabla responsive con scroll
    - [ ] Diálogos se adaptan a pantalla
    - [ ] Botones se colapsan en mobile

---

### 5.2. Datos de prueba sugeridos

**Proveedores:**
```
1. Distribuidora ABC S.A.
   - TaxId: 900123456-7
   - Email: ventas@distrib-abc.com
   - Phone: 3001234567

2. Importadora XYZ Ltda.
   - TaxId: 800987654-3
   - Email: compras@import-xyz.com
   - Phone: 3109876543

3. Mayorista Los Andes
   - (sin email ni taxId - campos opcionales)
   - Phone: 3201112233
```

**Escenarios de prueba:**
```
Escenario 1: Compra simple
- Proveedor existente
- 3 productos existentes
- Cantidades variadas
- Guardar como PENDING
- Luego recibir

Escenario 2: Compra con creación inline
- Crear nuevo proveedor desde formulario
- Crear 2 nuevos productos desde formulario
- Agregar 1 producto existente
- Guardar y recibir directamente

Escenario 3: Compra grande
- Proveedor existente
- 10+ productos
- Verificar cálculo de totales
- Verificar actualización masiva de stock

Escenario 4: Flujo de cancelación
- Crear compra PENDING
- Cancelarla con razón
- Verificar que no se puede recibir
- Verificar que stock no cambió
```

---

## Fase 6: Documentation Updates

### 6.1. Actualizar CLAUDE.md

**Agregar en sección "Available Action Modules":**
```markdown
- `supplier` - Supplier CRUD operations
- `purchase` - Purchase transactions (create, receive, cancel)
- `purchase-item` - Purchase line items
```

**Agregar en sección "Available Custom Hooks":**
```markdown
- `useSuppliers` - Supplier management
- `usePurchases` - Purchase transactions
```

**Agregar en sección "Available Dashboard Pages":**
```markdown
- `/dashboard/suppliers` - Supplier management (**ADMIN ONLY**)
- `/dashboard/purchases` - Purchases list (**ADMIN ONLY**)
- `/dashboard/purchases/new` - New purchase form (**ADMIN ONLY**)
```

**Agregar en sección "Data Models Overview":**
```markdown
### Transactions
- **Purchase** - Purchase orders from suppliers
- **PurchaseItem** - Purchase order line items
```

---

### 6.2. Crear documentación específica

**Archivo:** `docs/PURCHASES_MODULE.md`

**Contenido:**
```markdown
# Módulo de Compras - Guía de Uso

## Descripción
El módulo de compras permite gestionar las adquisiciones de productos
a proveedores, actualizar automáticamente el inventario y mantener
trazabilidad completa de las operaciones.

## Características principales
1. Gestión de proveedores
2. Creación de compras con múltiples items
3. Creación inline de proveedores y productos
4. Recepción de compras (actualiza inventario)
5. Cancelación con trazabilidad
6. Analytics y reportes

## Flujo típico de trabajo
[Documentar flujo paso a paso]

## Estados de compra
- PENDING: Compra creada pero no recibida
- RECEIVED: Compra recibida, inventario actualizado
- CANCELLED: Compra cancelada

## Permisos

### Control de Acceso por Rol

**ADMIN:**
- ✅ Acceso completo al módulo de compras
- ✅ Crear, editar, recibir y cancelar compras
- ✅ Gestión completa de proveedores
- ✅ Creación inline de productos y proveedores
- ✅ Ver analytics y reportes de compras

**SELLER:**
- ❌ **NO tiene acceso al módulo de compras**
- ❌ NO puede ver proveedores
- ❌ NO puede ver compras
- ❌ Rutas protegidas con redirección/error 403
- ❌ Enlaces ocultos en navegación

## Integración con inventario
[Explicar cómo se actualiza el stock]
```

---

## Fase 7: Advanced Features (Opcional - Futuro)

### 7.1. Features avanzadas a considerar:

1. **Órdenes de compra vs Recepción:**
   - Separar creación de orden de recepción física
   - Permitir recepción parcial de items

2. **Devoluciones a proveedores:**
   - Nuevo modelo `PurchaseReturn`
   - Reversar movimientos de stock

3. **Pagos a proveedores:**
   - Similar a SalePayment
   - Modelo `PurchasePayment`
   - Control de cuentas por pagar

4. **Cotizaciones:**
   - Modelo `Quote` antes de `Purchase`
   - Convertir cotización en compra

5. **Recepción con diferencias:**
   - Permitir recibir cantidades diferentes a las ordenadas
   - Registrar faltantes o sobrantes

6. **Multi-tienda:**
   - Especificar tienda destino en compra
   - Transferencias entre tiendas

7. **Analytics avanzados:**
   - Mejor proveedor por precio
   - Mejor proveedor por tiempo de entrega
   - Análisis de variación de precios
   - Previsión de compras

---

## Checklist Final de Implementación

### Backend (Actions)
- [ ] `src/actions/supplier/supplier.actions.ts`
- [ ] `src/actions/supplier/index.ts`
- [ ] `src/actions/purchase/purchase.actions.ts`
- [ ] `src/actions/purchase/index.ts`
- [ ] `src/actions/purchase-item/purchase-item.actions.ts`
- [ ] `src/actions/purchase-item/index.ts`

### Hooks
- [ ] `src/hooks/useSuppliers.ts`
- [ ] `src/hooks/usePurchases.ts`

### Pages
- [ ] `src/app/dashboard/suppliers/page.tsx`
- [ ] `src/app/dashboard/purchases/page.tsx`
- [ ] `src/app/dashboard/purchases/new/page.tsx`

### Supplier Features
- [ ] `src/app/dashboard/suppliers/features/suppliers-list.tsx`
- [ ] `src/app/dashboard/suppliers/features/data-table.tsx`
- [ ] `src/app/dashboard/suppliers/features/new-supplier.tsx`
- [ ] `src/app/dashboard/suppliers/features/edit-supplier.tsx`
- [ ] `src/app/dashboard/suppliers/features/action-component.tsx`
- [ ] `src/app/dashboard/suppliers/features/supplier-detail-dialog.tsx`

### Purchase List Features
- [ ] `src/app/dashboard/purchases/features/purchases-list.tsx`
- [ ] `src/app/dashboard/purchases/features/data-table.tsx`
- [ ] `src/app/dashboard/purchases/features/action-component.tsx`
- [ ] `src/app/dashboard/purchases/features/purchase-detail-dialog.tsx`
- [ ] `src/app/dashboard/purchases/features/receive-purchase-dialog.tsx`
- [ ] `src/app/dashboard/purchases/features/edit-purchase-status-dialog.tsx`

### Purchase Form Features
- [ ] `src/app/dashboard/purchases/new/new-purchase-form.tsx`
- [ ] `src/app/dashboard/purchases/new/features/supplier-combobox.tsx`
- [ ] `src/app/dashboard/purchases/new/features/create-supplier-dialog.tsx`
- [ ] `src/app/dashboard/purchases/new/features/product-selector.tsx`
- [ ] `src/app/dashboard/purchases/new/features/create-product-dialog.tsx`

### Navigation & Route Protection
- [ ] Actualizar `src/components/app-sidebar.tsx` (agregar condiciones de visibilidad por rol)
- [ ] Crear `src/components/admin-route-guard.tsx` (opcional, patrón wrapper)
- [ ] Implementar protección ADMIN en `/dashboard/suppliers/page.tsx`
- [ ] Implementar protección ADMIN en `/dashboard/purchases/page.tsx`
- [ ] Implementar protección ADMIN en `/dashboard/purchases/new/page.tsx`

### Documentation
- [ ] Actualizar `CLAUDE.md`
- [ ] Crear `docs/PURCHASES_MODULE.md`

### Testing
- [ ] Pruebas de proveedores
- [ ] Pruebas de compras
- [ ] Pruebas de recepción
- [ ] Pruebas de integración con inventario
- [ ] Pruebas de permisos

---

## Estimación de Tiempo

### Por Fase:
- **Fase 1 (Actions):** 6-8 horas
  - Supplier actions: 2-3 horas
  - Purchase actions: 3-4 horas
  - Purchase item actions: 1 hora

- **Fase 2 (Hooks):** 3-4 horas
  - Supplier hooks: 1.5 horas
  - Purchase hooks: 1.5-2.5 horas

- **Fase 3 (UI Components):** 12-16 horas
  - Supplier pages: 4-5 horas
  - Purchase list: 3-4 horas
  - Purchase form: 5-7 horas

- **Fase 4 (Navigation):** 0.5 horas

- **Fase 5 (Testing):** 4-6 horas

- **Fase 6 (Documentation):** 1-2 horas

**Total estimado:** 27-37 horas

---

## Dependencias y Prerequisitos

### Librerías ya instaladas (verificadas):
- ✅ React Hook Form
- ✅ Yup
- ✅ TanStack Query
- ✅ Zustand
- ✅ Tabler Icons
- ✅ Sonner (toasts)
- ✅ SweetAlert2
- ✅ date-fns

### Modelos de Prisma existentes:
- ✅ Supplier
- ✅ Purchase
- ✅ PurchaseItem
- ✅ PurchaseStatus enum

**No se requieren migraciones de base de datos**, todos los modelos ya existen.

---

## Notas Importantes

### Diferencias clave con el módulo de ventas:

1. **⚠️ ACCESO EXCLUSIVO ADMIN** (Ventas es accesible para ADMIN y SELLER)
2. **Proveedor es OBLIGATORIO** (Customer es opcional en ventas)
3. **No hay concepto de "pagos"** en compras (por ahora)
4. **Estados diferentes:**
   - Sales: PAID, PENDING, OVERDUE, CANCELLED
   - Purchases: PENDING, RECEIVED, CANCELLED
5. **Acción crítica: RECEIVE**
   - En ventas se crea directamente y reduce stock
   - En compras se crea PENDING y recibir aumenta stock
6. **No hay número de compra por tienda** (es global por organización)
7. **Creación de productos inline** (no existe en ventas)

### Patrones a seguir estrictamente:

1. **TypeScript strict mode** - NO usar `any`, NO usar `@ts-ignore`
2. **Soft delete pattern** - `isDeleted`, `deletedAt`
3. **Multi-tenancy** - Filtrar siempre por `organizationId`
4. **RBAC** - Usar helpers de `src/actions/utils.ts`
5. **Transaction handling** - Usar timeout aumentado en operaciones críticas
6. **Cache invalidation** - Invalidar todas las queries relacionadas
7. **Error handling** - Try-catch en todas las actions
8. **Validation** - Yup schemas con mensajes en español
9. **Accessibility** - aria-labels, keyboard navigation
10. **Responsive design** - Mobile-first approach

---

## Soporte y Siguientes Pasos

Después de completar este plan:

1. **Revisar con el equipo** las decisiones de negocio:
   - ¿Se permite recepción parcial?
   - ¿Qué hacer con compras canceladas después de recibidas?
   - ¿Se requiere flujo de aprobación?

2. **Planificar features avanzadas** según necesidades

3. **Integrar con dashboards** existentes:
   - KPIs de compras
   - Gráficos de tendencias
   - Alertas de stock bajo

4. **Considerar reportes específicos:**
   - Compras por proveedor
   - Compras por período
   - Análisis de costos

---

**Fin del documento**

Fecha de creación: 2025-10-25
Versión: 1.0
