# Especificación Técnica: Venta Rápida (Quick Sale)

## 1. Resumen Ejecutivo

### Objetivo
Crear una funcionalidad de "Venta Rápida" que permita a los usuarios registrar ventas simples en menos de 30 segundos, optimizando el flujo para transacciones al contado con un solo producto.

### Justificación
- Reducir el tiempo de registro de ventas simples
- Mejorar la experiencia de usuario para vendedores
- Optimizar el flujo de caja para ventas al contado
- Complementar (no reemplazar) el flujo de venta completo existente

---

## 2. Historias de Usuario

### Historia 1: Vendedor (SELLER) con tienda asignada
**Como** vendedor con tienda asignada
**Quiero** registrar una venta rápida
**Para** agilizar transacciones simples de un producto al contado

**Criterios de aceptación**:
- El modal se abre al hacer clic en "Venta Rápida"
- La tienda se selecciona automáticamente (no editable)
- Puedo buscar y seleccionar un producto
- Puedo modificar la cantidad y el precio unitario
- Los totales se calculan automáticamente
- Al guardar, la venta se registra como PAID con fecha actual
- El método de pago por defecto es EFECTIVO
- Recibo confirmación de éxito y el modal se cierra

### Historia 2: Administrador (ADMIN) con tienda asignada
**Como** administrador con tienda asignada
**Quiero** registrar una venta rápida en mi tienda
**Para** procesar ventas cuando trabajo en la tienda

**Criterios de aceptación**:
- Mismo flujo que SELLER
- La tienda se selecciona automáticamente de mi `storeId`

### Historia 3: Administrador (ADMIN) sin tienda asignada
**Como** administrador sin tienda asignada
**Quiero** seleccionar la tienda antes de registrar la venta rápida
**Para** poder procesar ventas de cualquier tienda que administro

**Criterios de aceptación**:
- El modal muestra un selector de tienda (obligatorio)
- No puedo continuar sin seleccionar una tienda
- El resto del flujo es idéntico a las otras historias

---

## 3. Requisitos Funcionales

### 3.1 Navegación y Acceso

**Ubicación**: `src/components/nav-main.tsx`

**Cambios**:
- Cambiar texto del botón de "Crear venta" a "Venta Rápida"
- Cambiar el comportamiento de Link a onClick que abre el modal
- Mantener el ícono `IconCirclePlusFilled`
- Mantener el estilo visual actual (botón primario destacado)

### 3.2 Modal de Venta Rápida

**Componente**: `src/components/quick-sale-dialog.tsx` (nuevo)

**Estructura del Modal**:
```
┌─────────────────────────────────────────┐
│ Venta Rápida                        [X] │
├─────────────────────────────────────────┤
│                                         │
│ [Tienda] (auto/selector según usuario) │
│ [Fecha: DD/MM/YYYY]  [Estado: Pagada]  │
│                                         │
│ ─────────────────────                  │
│                                         │
│ Producto *                              │
│ [Buscar producto...]                    │
│                                         │
│ [Producto seleccionado mostrado aquí]  │
│                                         │
│ Cantidad *         Precio Unitario *    │
│ [1] (spinner)      [$.XX] (editable)   │
│                                         │
│ ─────────────────────                  │
│                                         │
│ Método de Pago: Efectivo                │
│                                         │
│ Subtotal:        $X.XX                  │
│ IVA (XX%):       $X.XX                  │
│ Total:           $X.XX                  │
│                                         │
│           [Cancelar]  [Registrar Venta] │
└─────────────────────────────────────────┘
```

### 3.3 Campos del Formulario

#### Campos NO Editables (Read-Only Display)
1. **Tienda**:
   - SELLER/ADMIN con storeId: Muestra nombre de tienda (auto-seleccionada)
   - ADMIN sin storeId: Selector (editable, obligatorio)
   - Formato: Badge o texto con ícono de tienda
   - Validación: Requerido

2. **Fecha**:
   - Valor: `new Date()` (fecha actual)
   - Formato: "DD/MM/YYYY HH:mm"
   - Display: Badge o texto con ícono de calendario
   - No editable

3. **Estado**:
   - Valor fijo: "PAID"
   - Display: Badge verde con texto "Pagada"
   - No editable

4. **Método de Pago**:
   - Valor fijo: "CASH" (Efectivo)
   - Display: Badge o texto con ícono de efectivo
   - No editable

#### Campos Editables
1. **Producto** (Obligatorio):
   - Tipo: Combobox con búsqueda
   - Componente: Reusar `ProductFilterCombobox` o similar
   - Placeholder: "Buscar producto..."
   - Validación:
     - Requerido
     - El producto debe tener stock disponible > 0
     - Mostrar advertencia si stock es bajo
   - Comportamiento:
     - Al seleccionar, cargar precio actual del producto
     - Mostrar imagen del producto si existe
     - Mostrar SKU y stock actual

2. **Cantidad** (Obligatorio):
   - Tipo: Number input (spinner)
   - Valor por defecto: 1
   - Mínimo: 1
   - Máximo: Stock disponible del producto
   - Validación:
     - Requerido
     - Debe ser > 0
     - No puede exceder stock disponible
     - Solo números enteros positivos

3. **Precio Unitario** (Obligatorio):
   - Tipo: Number input (formato moneda)
   - Valor por defecto: Precio del producto seleccionado
   - Mínimo: 0.01
   - Validación:
     - Requerido
     - Debe ser > 0
     - Formato: 2 decimales
   - Comportamiento:
     - Se actualiza automáticamente al seleccionar producto
     - Usuario puede modificarlo manualmente
     - Usar `react-number-format` para formato

#### Campos Calculados (Read-Only Display)
1. **Subtotal**:
   - Fórmula: `cantidad * precioUnitario`
   - Formato: Moneda con 2 decimales

2. **IVA**:
   - Fórmula: `subtotal * (tasaIVA / 100)`
   - Nota: Obtener `tasaIVA` de configuración del sistema o usar 0% por defecto
   - Formato: Moneda con 2 decimales

3. **Total**:
   - Fórmula: `subtotal + iva`
   - Formato: Moneda con 2 decimales
   - Display: Destacado (texto más grande, bold)

### 3.4 Reglas de Negocio

#### Selección de Tienda:
```typescript
if (user.role === 'SELLER' || (user.role === 'ADMIN' && user.storeId)) {
  // Auto-seleccionar tienda del usuario
  storeId = user.storeId;
  showStoreSelector = false;
} else if (user.role === 'ADMIN' && !user.storeId) {
  // Mostrar selector de tienda
  showStoreSelector = true;
  storeId = null; // Usuario debe seleccionar
}
```

#### Validación de Stock:
- Al seleccionar producto, validar `product.currentStock > 0`
- Al cambiar cantidad, validar `cantidad <= product.currentStock`
- Mostrar mensaje: "Stock insuficiente. Disponible: X unidades"

#### Cálculo de Totales:
```typescript
const subtotal = cantidad * precioUnitario;
const iva = subtotal * (tasaIVA / 100); // tasaIVA desde config o 0
const total = subtotal + iva;
```

#### Payload de la Venta:
```typescript
{
  saleData: {
    storeId: string, // Auto o seleccionado
    customerId: null, // No se captura cliente en venta rápida
    userId: user.id,
    date: new Date(),
    status: 'PAID',
    dueDate: null,
    paidDate: new Date(),
    subtotal: number,
    tax: number,
    total: number,
    discount: 0,
    notes: 'Venta rápida'
  },
  saleItems: [{
    productId: string,
    quantity: number,
    unitPrice: number,
    subtotal: number,
    tax: number,
    total: number,
    discount: 0
  }],
  salePayments: [{
    paymentMethodId: string, // ID del método CASH
    amount: total,
    paymentDate: new Date(),
    reference: null
  }]
}
```

### 3.5 Flujo de Interacción

#### Flujo Exitoso:
1. Usuario hace clic en "Venta Rápida" en nav-main
2. Modal se abre con campos inicializados
3. Si es ADMIN sin storeId → selecciona tienda
4. Usuario busca y selecciona producto
   - Precio y stock se cargan automáticamente
5. Usuario ajusta cantidad (opcional)
6. Usuario ajusta precio unitario (opcional)
7. Totales se recalculan automáticamente
8. Usuario hace clic en "Registrar Venta"
9. Loading state en botón
10. Server procesa la venta
11. Success toast: "Venta registrada exitosamente"
12. Modal se cierra
13. Queries se invalidan (ventas, productos, stock)

#### Flujo con Errores:
1. **Sin tienda seleccionada** (ADMIN sin storeId):
   - Botón "Registrar Venta" deshabilitado
   - Mensaje: "Debes seleccionar una tienda"

2. **Sin producto seleccionado**:
   - Validación al hacer clic en "Registrar Venta"
   - Error toast: "Debes seleccionar un producto"

3. **Cantidad inválida**:
   - Validación en tiempo real
   - Input con borde rojo
   - Mensaje: "La cantidad debe ser entre 1 y X"

4. **Stock insuficiente**:
   - Validación al seleccionar producto y cambiar cantidad
   - Warning banner: "Stock bajo. Solo quedan X unidades"
   - Error si cantidad > stock: "Stock insuficiente"

5. **Precio inválido**:
   - Validación en tiempo real
   - Input con borde rojo
   - Mensaje: "El precio debe ser mayor a 0"

6. **Error del servidor**:
   - Error toast con mensaje del servidor
   - Modal permanece abierto
   - Loading state se desactiva
   - Usuario puede reintentar

### 3.6 Validaciones

```typescript
const validationSchema = yup.object({
  storeId: yup.string().required('La tienda es requerida'),
  productId: yup.string().required('El producto es requerido'),
  quantity: yup
    .number()
    .required('La cantidad es requerida')
    .min(1, 'La cantidad mínima es 1')
    .integer('La cantidad debe ser un número entero')
    .test('stock-check', 'Stock insuficiente', function(value) {
      const { product } = this.parent;
      return product && value <= product.currentStock;
    }),
  unitPrice: yup
    .number()
    .required('El precio es requerido')
    .min(0.01, 'El precio debe ser mayor a 0')
    .test('max-decimals', 'Máximo 2 decimales', function(value) {
      return /^\d+(\.\d{1,2})?$/.test(value.toString());
    })
});
```

---

## 4. Requisitos Técnicos

### 4.1 Archivos a Crear

1. **`src/components/quick-sale-dialog.tsx`**:
   - Modal principal
   - Lógica de formulario
   - Integración con hooks

2. **`src/hooks/useQuickSale.ts`** (opcional):
   - Hook personalizado para lógica de negocio
   - Manejo de estado del formulario
   - Cálculos de totales

### 4.2 Archivos a Modificar

1. **`src/components/nav-main.tsx`**:
   - Cambiar texto a "Venta Rápida"
   - Agregar estado para controlar modal
   - Cambiar de Link a onClick

2. **`src/hooks/useSales.ts`**:
   - Ya existe `useCreateSale` hook
   - Reutilizar sin modificaciones

3. **`src/actions/sale/index.ts`**:
   - Ya existe `createSale` action
   - Reutilizar sin modificaciones

### 4.3 Dependencias y Hooks

**Hooks a utilizar**:
- `useCreateSale()` - De `src/hooks/useSales.ts`
- `useProducts()` - Para buscar productos
- `useStores()` - Para selector de tiendas (ADMIN sin storeId)
- `usePaymentMethods()` - Para obtener ID de método CASH
- `useStore()` - Zustand para datos de usuario
- `useForm()` - React Hook Form para manejo de formulario
- `useState()` - Para control del modal

**Componentes a reutilizar**:
- `Dialog` - shadcn/ui para el modal
- `ProductFilterCombobox` - Para búsqueda de productos
- `Input` - Para cantidad y precio
- `Button` - Para acciones
- `Badge` - Para campos read-only
- `Label` - Para etiquetas
- `Select` - Para selector de tienda (si aplica)

### 4.4 Estructura de Estado

```typescript
interface QuickSaleForm {
  storeId: string;
  productId: string;
  product: Product | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  tax: number;
  total: number;
}

const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState<QuickSaleForm>({
  storeId: user.storeId || '',
  productId: '',
  product: null,
  quantity: 1,
  unitPrice: 0,
  subtotal: 0,
  tax: 0,
  total: 0
});
```

### 4.5 Integración con Server Actions

**Server Action**: `createSale` (ya existe)

**Payload**:
```typescript
await createSale(
  user.organizationId,
  user.id,
  {
    storeId: formData.storeId,
    customerId: null,
    userId: user.id,
    date: new Date(),
    status: 'PAID',
    dueDate: null,
    paidDate: new Date(),
    subtotal: formData.subtotal,
    tax: formData.tax,
    total: formData.total,
    discount: 0,
    notes: 'Venta rápida'
  },
  [{
    productId: formData.productId,
    quantity: formData.quantity,
    unitPrice: formData.unitPrice,
    subtotal: formData.subtotal,
    tax: formData.tax,
    total: formData.total,
    discount: 0
  }],
  [{
    paymentMethodId: cashPaymentMethod.id,
    amount: formData.total,
    paymentDate: new Date(),
    reference: null
  }]
);
```

---

## 5. Requisitos de UI/UX

### 5.1 Diseño del Modal

**Dimensiones**:
- Ancho: `max-w-lg` (512px)
- Altura: Automática según contenido
- Máximo: `max-h-[90vh]` con scroll interno si necesario

**Espaciado**:
- Padding interno: `p-6`
- Gap entre secciones: `space-y-4`
- Gap entre campos: `space-y-2`

**Responsive**:
- Mobile: Full width con padding reducido
- Desktop: Centrado con ancho máximo

### 5.2 Componentes Visuales

#### Header:
```tsx
<DialogHeader>
  <DialogTitle className="flex items-center gap-2">
    <IconBolt className="h-5 w-5" />
    Venta Rápida
  </DialogTitle>
  <DialogDescription>
    Registra una venta al contado de forma rápida
  </DialogDescription>
</DialogHeader>
```

#### Campos Read-Only:
```tsx
<div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
  <IconStorefront className="h-4 w-4 text-muted-foreground" />
  <span className="text-sm font-medium">{storeName}</span>
</div>
```

#### Sección de Totales:
```tsx
<div className="rounded-md border bg-muted/30 p-4 space-y-2">
  <div className="flex justify-between text-sm">
    <span>Subtotal:</span>
    <span className="font-medium">${subtotal.toFixed(2)}</span>
  </div>
  <div className="flex justify-between text-sm text-muted-foreground">
    <span>IVA (0%):</span>
    <span>${tax.toFixed(2)}</span>
  </div>
  <Separator />
  <div className="flex justify-between text-lg font-bold">
    <span>Total:</span>
    <span>${total.toFixed(2)}</span>
  </div>
</div>
```

#### Botones:
```tsx
<DialogFooter className="flex gap-2">
  <Button variant="outline" onClick={() => setIsOpen(false)}>
    Cancelar
  </Button>
  <Button
    onClick={handleSubmit}
    disabled={isSubmitting || !isValid}
    loading={isSubmitting}
  >
    <IconCheck className="h-4 w-4 mr-2" />
    Registrar Venta
  </Button>
</DialogFooter>
```

### 5.3 Estados Visuales

**Loading**:
- Skeleton en selector de producto
- Spinner en botón "Registrar Venta"
- Overlay en modal durante submit

**Success**:
- Toast verde: "✓ Venta registrada exitosamente"
- Modal se cierra automáticamente

**Error**:
- Toast rojo con mensaje de error
- Campos inválidos con borde rojo
- Mensajes de error debajo de campos

**Warning**:
- Banner amarillo para stock bajo
- Icono de advertencia junto a cantidad

### 5.4 Accesibilidad

- Todos los campos con `aria-label`
- Errores asociados con `aria-describedby`
- Modal con `role="dialog"`
- Botón de cerrar con `aria-label="Cerrar"`
- Navegación por teclado completa
- Focus trap en modal
- Escape key cierra modal

---

## 6. Casos de Uso y Flujos

### Caso 1: Vendedor registra venta rápida
1. Vendedor hace clic en "Venta Rápida"
2. Modal abre con tienda pre-seleccionada
3. Busca "Coca Cola"
4. Selecciona "Coca Cola 500ml"
5. Cantidad: 2 (modifica de 1 a 2)
6. Precio: $1.50 (pre-cargado, no modifica)
7. Totales: Subtotal $3.00, IVA $0.00, Total $3.00
8. Hace clic en "Registrar Venta"
9. Venta se crea exitosamente
10. Toast: "Venta registrada exitosamente"
11. Modal se cierra
12. Stock de Coca Cola se reduce en 2

### Caso 2: Admin sin tienda selecciona tienda
1. Admin hace clic en "Venta Rápida"
2. Modal abre con selector de tienda
3. Selecciona "Tienda Centro"
4. Busca "Pan"
5. Selecciona "Pan Francés"
6. Cantidad: 5
7. Precio: $0.50 (pre-cargado)
8. Modifica precio a $0.40 (descuento)
9. Totales: Subtotal $2.00, IVA $0.00, Total $2.00
10. Hace clic en "Registrar Venta"
11. Venta se crea para "Tienda Centro"
12. Stock se actualiza en "Tienda Centro"

### Caso 3: Error por stock insuficiente
1. Usuario hace clic en "Venta Rápida"
2. Busca "Producto X"
3. Selecciona "Producto X" (stock: 3)
4. Intenta poner cantidad: 5
5. Input muestra error: "Stock insuficiente. Disponible: 3"
6. Cantidad se limita a 3
7. Usuario ajusta a 3
8. Continúa con la venta

---

## 7. Criterios de Aceptación

### Funcionales:
- ✅ Modal se abre desde nav-main
- ✅ Tienda se auto-selecciona según rol y storeId
- ✅ ADMIN sin storeId puede seleccionar tienda
- ✅ Búsqueda de productos funciona
- ✅ Precio se carga automáticamente
- ✅ Cantidad es editable (mínimo 1)
- ✅ Precio unitario es editable
- ✅ Totales se calculan automáticamente
- ✅ Validación de stock funciona
- ✅ Venta se registra como PAID
- ✅ Método de pago es CASH
- ✅ Stock se descuenta correctamente
- ✅ Movimiento de stock se registra
- ✅ Número de venta se genera automáticamente

### UI/UX:
- ✅ Modal responsive (mobile + desktop)
- ✅ Campos read-only claramente identificados
- ✅ Campos editables tienen estilos adecuados
- ✅ Loading states en todos los lugares
- ✅ Error messages claros y útiles
- ✅ Success feedback inmediato
- ✅ Accesibilidad WCAG 2.1 AA
- ✅ Navegación por teclado funciona
- ✅ Diseño consistente con sistema existente

### Performance:
- ✅ Modal abre en < 200ms
- ✅ Búsqueda de productos debounced (300ms)
- ✅ Cálculos instantáneos (< 50ms)
- ✅ Submit completo en < 2s (red normal)

---

## 8. Plan de Pruebas

### Pruebas Unitarias:
- Cálculo de subtotal
- Cálculo de IVA
- Cálculo de total
- Validación de cantidad
- Validación de precio
- Validación de stock

### Pruebas de Integración:
- Creación de venta completa
- Descuento de stock
- Registro de movimiento
- Invalidación de queries

### Pruebas de UI:
- Apertura/cierre de modal
- Búsqueda de productos
- Selección de producto
- Edición de campos
- Submit de formulario
- Mensajes de error
- Mensajes de éxito

### Pruebas de Roles:
- SELLER con storeId
- ADMIN con storeId
- ADMIN sin storeId

### Pruebas de Edge Cases:
- Sin conexión a internet
- Producto sin stock
- Precio en 0
- Cantidad en 0
- Tienda sin método de pago CASH configurado
- Usuario sin permisos
- Stock cambia durante la transacción

---

## 9. Cronograma de Implementación

### Fase 1: Preparación (UI/UX Subagent)
- Crear componente `QuickSaleDialog`
- Implementar estructura del modal
- Diseñar formulario y layout
- Implementar campos read-only
- Implementar campos editables
- Diseñar sección de totales
- Implementar responsive design

### Fase 2: Integración (Fullstack Subagent)
- Integrar con `useCreateSale` hook
- Implementar lógica de selección de tienda
- Integrar búsqueda de productos
- Implementar cálculo de totales
- Implementar validaciones
- Conectar con server actions
- Manejar estados de loading/error/success
- Invalidar queries apropiadas

### Fase 3: Navegación (Fullstack Subagent)
- Modificar `nav-main.tsx`
- Cambiar texto a "Venta Rápida"
- Implementar onClick para abrir modal
- Integrar componente QuickSaleDialog

---

## 10. Notas de Implementación

### Consideraciones Técnicas:
- Reutilizar componente `ProductFilterCombobox` existente
- No crear nuevos server actions (usar `createSale` existente)
- Usar hook `useCreateSale` existente
- Seguir patrones de validación con Yup/Zod
- Usar React Hook Form para manejo de formulario
- Aplicar pattern de loading states ya establecido

### Decisiones de Diseño:
- No incluir campo de cliente (simplificar)
- No permitir descuentos (simplificar)
- No permitir múltiples productos (simplificar)
- No permitir notas personalizadas (usar "Venta rápida")
- Método de pago siempre CASH (simplificar)
- Estado siempre PAID (simplificar)

### Puntos de Extensión Futuros:
- Permitir seleccionar cliente (opcional)
- Permitir aplicar descuento rápido
- Permitir múltiples productos
- Permitir seleccionar método de pago
- Guardar últimos productos vendidos
- Shortcuts de teclado
- Impresión de ticket automática
- Envío de recibo por email/WhatsApp

---

## 11. Definición de Completado (DoD)

La funcionalidad se considera completa cuando:
- ✅ Código implementado siguiendo especificación
- ✅ Todos los criterios de aceptación cumplidos
- ✅ Validaciones funcionando correctamente
- ✅ UI responsive en mobile y desktop
- ✅ Accesibilidad verificada
- ✅ No hay errores de TypeScript
- ✅ No hay errores de ESLint
- ✅ Integración con server actions funciona
- ✅ Estados de loading/error/success implementados
- ✅ Toast notifications funcionan
- ✅ Queries se invalidan correctamente
- ✅ Stock se descuenta correctamente
- ✅ Probado en diferentes roles de usuario
- ✅ Probado en diferentes escenarios de tienda
- ✅ Documentación actualizada si es necesario

