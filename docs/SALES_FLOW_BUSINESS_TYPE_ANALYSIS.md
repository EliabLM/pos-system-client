# Análisis: Flujo de Ventas y Visualización por Tipo de Negocio

## Resumen Ejecutivo

Este documento analiza el flujo de ventas actual y determina qué ajustes se requieren para diferenciar la experiencia entre **licoreras** y **zapaterías** en el sistema POS.

---

## 1. Análisis del Flujo de Ventas Actual

### 1.1 Componentes del Flujo de Venta

**Ubicación**: `src/app/dashboard/sales/new/new-sale-form.tsx`

**Proceso actual**:
1. Selección de tienda
2. Selección de fecha de venta
3. Selección de estado (PAID/PENDING)
4. Selección de cliente (opcional)
5. **Búsqueda y selección de productos**
6. Configuración de cantidad y precio unitario
7. Métodos de pago
8. Notas adicionales
9. Resumen y finalización

### 1.2 Visualización de Productos en Ventas

Actualmente muestra:
- Imagen del producto
- Nombre del producto
- Stock disponible
- Precio de venta
- **NO muestra campos específicos del negocio** (talla, color, modelo, grado alcohólico, volumen)

---

## 2. Consideraciones Clave por Tipo de Negocio

### 2.1 Diferencias Operativas

#### Zapaterías (Calzado Deportivo)
- **Variantes críticas**: Talla y color son fundamentales para identificar un producto
- **Ejemplo**: "Nike Air Max 90" tiene múltiples SKUs según talla y color
- **Problema actual**: Si hay 10 tallas diferentes del mismo modelo, todas aparecen como productos separados en la lista
- **Necesidad**: Mostrar talla y color en la vista de productos para facilitar selección

#### Licoreras (Bebidas Alcohólicas)
- **Variantes críticas**: Volumen y grado alcohólico son diferenciadores
- **Ejemplo**: "Johnnie Walker Black Label" existe en 750ml, 1L, 1.75L
- **Problema actual**: Si hay 3 presentaciones del mismo whisky, aparecen como productos separados
- **Necesidad**: Mostrar volumen y grado alcohólico en la vista de productos

### 2.2 Impacto en UX del Vendedor

**Sin información específica visible**:
- Vendedor debe memorizar qué SKU corresponde a qué variante
- Mayor probabilidad de error en selección
- Más tiempo en buscar el producto correcto
- Experiencia de usuario deficiente

**Con información específica visible**:
- Identificación rápida del producto exacto
- Reducción de errores de venta
- Proceso de venta más ágil
- Mejor experiencia de usuario

---

## 3. Áreas del Sistema que Requieren Adaptación

### 3.1 Vista de Búsqueda de Productos (NEW SALE FORM)

**Ubicación**: `src/app/dashboard/sales/new/new-sale-form.tsx` (líneas 686-741)

**Estado actual**:
```tsx
{products.data.map((product) => (
  <button onClick={() => handleAddProduct(product)}>
    <Image src={product.image} />
    <div>
      <p>{product.name}</p>
      <p>Stock: {product.currentStock}</p>
    </div>
    <span>{formatCurrency(product.salePrice)}</span>
  </button>
))}
```

**Necesidad**:
- Agregar campos condicionales según `businessType`
- Para licoreras: mostrar `volume` y `alcoholGrade`
- Para zapaterías: mostrar `size` y `color`

**Propuesta de mejora**:
```tsx
{products.data.map((product) => (
  <button onClick={() => handleAddProduct(product)}>
    <Image src={product.image} />
    <div>
      <p>{product.name}</p>

      {/* Campos condicionales según businessType */}
      {businessType === 'liquor_store' && (
        <p className="text-xs">
          {product.volume && `${product.volume}ml`}
          {product.alcoholGrade && ` • ${product.alcoholGrade}% Vol.`}
        </p>
      )}

      {businessType === 'shoe_store' && (
        <p className="text-xs">
          {product.size && `Talla: ${product.size}`}
          {product.color && ` • ${product.color}`}
        </p>
      )}

      <p>Stock: {product.currentStock}</p>
    </div>
    <span>{formatCurrency(product.salePrice)}</span>
  </button>
))}
```

### 3.2 Vista de Productos Seleccionados (Carrito de Venta)

**Ubicación**: `src/app/dashboard/sales/new/new-sale-form.tsx` (líneas 775-862)

**Estado actual**:
```tsx
{selectedProducts.map((item) => (
  <div>
    <Image src={item.product.image} />
    <div>
      <p>{item.product.name}</p>
      <p>Stock disponible: {item.product.currentStock}</p>
    </div>
    {/* Cantidad y precio */}
  </div>
))}
```

**Necesidad**:
- Mostrar información específica del producto seleccionado
- Ayudar al vendedor a confirmar que seleccionó el producto correcto

**Propuesta de mejora**:
```tsx
{selectedProducts.map((item) => (
  <div>
    <Image src={item.product.image} />
    <div>
      <p>{item.product.name}</p>

      {/* Información específica del negocio */}
      {businessType === 'liquor_store' && (
        <p className="text-xs text-muted-foreground">
          {item.product.volume && `${item.product.volume}ml`}
          {item.product.alcoholGrade && ` • ${item.product.alcoholGrade}% Vol.`}
        </p>
      )}

      {businessType === 'shoe_store' && (
        <p className="text-xs text-muted-foreground">
          {item.product.size && `Talla: ${item.product.size}`}
          {item.product.color && ` • ${item.product.color}`}
          {item.product.model && ` • Modelo: ${item.product.model}`}
        </p>
      )}

      <p>Stock disponible: {item.product.currentStock}</p>
    </div>
    {/* Cantidad y precio */}
  </div>
))}
```

### 3.3 Vista de Lista de Ventas (Sales List)

**Ubicación**: `src/app/dashboard/sales/features/sale-list.tsx`

**Análisis**:
- Esta vista muestra **datos agregados** de la venta (número, fecha, total, estado)
- **NO muestra detalles de productos individuales**
- ✅ **NO REQUIERE CAMBIOS** para diferenciación por tipo de negocio

### 3.4 Vista de Detalle de Venta (Sale Detail/View)

**Necesidad futura** (no existe actualmente):
Si se implementa una vista de detalle de venta, debería mostrar:
- Para licoreras: volumen y grado alcohólico de cada producto vendido
- Para zapaterías: talla, color y modelo de cada producto vendido

---

## 4. Reportes de Ventas

### 4.1 Reportes Actuales del Sistema

**Ubicación**: `src/app/dashboard/reports/sales/`

Reportes existentes:
- Por categoría (`by-category/`)
- Por método de pago (`by-payment/`)
- Por producto (`by-product/`)
- Por vendedor (`by-seller/`)
- Detallado (`detailed/`)

### 4.2 Análisis de Impacto en Reportes

#### Reporte por Producto
**Necesidad**:
- Mostrar campos específicos para ayudar a identificar productos
- Para licoreras: incluir volumen y grado alcohólico en la tabla
- Para zapaterías: incluir talla y color en la tabla

**Justificación**:
Sin esta información, el reporte muestra solo nombres, dificultando identificar qué variante de un producto se vendió más.

#### Reportes por Categoría, Pago, Vendedor
- ✅ **NO REQUIEREN CAMBIOS** - Son agregaciones que no muestran detalles de producto

#### Reporte Detallado
**Necesidad**:
- Similar al reporte por producto
- Incluir campos específicos en las columnas de productos

---

## 5. Data Tables y Columnas Dinámicas

### 5.1 Patrón de Columnas Condicionales

**Estrategia**: Usar TanStack Table con columnas condicionales basadas en `businessType`

**Ejemplo de implementación**:
```typescript
const columns = useMemo(() => {
  const baseColumns: ColumnDef<Product>[] = [
    // Columnas comunes
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'salePrice', header: 'Precio' },
    { accessorKey: 'currentStock', header: 'Stock' },
  ];

  // Columnas específicas según businessType
  if (businessType === 'liquor_store') {
    baseColumns.splice(2, 0,
      {
        accessorKey: 'volume',
        header: 'Volumen (ml)',
        cell: ({ row }) => row.original.volume ? `${row.original.volume}ml` : '-'
      },
      {
        accessorKey: 'alcoholGrade',
        header: 'Graduación',
        cell: ({ row }) => row.original.alcoholGrade ? `${row.original.alcoholGrade}%` : '-'
      }
    );
  } else if (businessType === 'shoe_store') {
    baseColumns.splice(2, 0,
      { accessorKey: 'size', header: 'Talla' },
      { accessorKey: 'color', header: 'Color' }
    );
  }

  return baseColumns;
}, [businessType]);
```

---

## 6. Consideraciones de Rendimiento

### 6.1 Query de Productos

**Situación actual**:
- Hook `useActiveProducts` ya trae todos los campos del producto
- No requiere cambios en el backend

**Validación**:
✅ Los campos `alcoholGrade`, `volume`, `size`, `color`, `model` ya están en el modelo Product
✅ No hay costo adicional de query

### 6.2 Impacto en Performance

**Conclusión**:
- CERO impacto en performance
- Solo cambios en la capa de presentación (condicionales de render)
- No hay queries adicionales ni JOINs nuevos

---

## 7. Plan de Implementación para Vistas de Venta

### Fase 5A: Flujo de Nueva Venta (CRÍTICO)

**Prioridad**: ALTA - Impacta directamente la operación diaria

**Archivos a modificar**:
1. `src/app/dashboard/sales/new/new-sale-form.tsx`
   - Importar `useBusinessType` hook
   - Agregar renderizado condicional en búsqueda de productos (líneas 692-738)
   - Agregar renderizado condicional en lista de productos seleccionados (líneas 775-862)

**Cambios específicos**:

```typescript
// 1. Importar hook
import { useBusinessType } from '@/hooks/useSystemConfig';

// 2. Obtener businessType
const { data: businessType } = useBusinessType();

// 3. Crear componente auxiliar para información de producto
const ProductSpecificInfo = ({
  product,
  businessType
}: {
  product: Product;
  businessType: 'liquor_store' | 'shoe_store' | null;
}) => {
  if (businessType === 'liquor_store') {
    return (
      <p className="text-xs text-muted-foreground">
        {product.volume && `${product.volume}ml`}
        {product.alcoholGrade && ` • ${product.alcoholGrade}% Vol.`}
      </p>
    );
  }

  if (businessType === 'shoe_store') {
    return (
      <p className="text-xs text-muted-foreground">
        {product.size && `Talla: ${product.size}`}
        {product.color && ` • ${product.color}`}
      </p>
    );
  }

  return null;
};

// 4. Usar en búsqueda de productos
<div className="text-left min-w-0">
  <p className="font-medium truncate">{product.name}</p>
  <ProductSpecificInfo product={product} businessType={businessType} />
  <p className="text-xs text-muted-foreground">
    {product.currentStock > 0 ? (
      <span className="text-green-600">Stock: {product.currentStock}</span>
    ) : (
      <span className="text-destructive">Sin stock</span>
    )}
  </p>
</div>

// 5. Usar en productos seleccionados
<div className="flex-1 min-w-0">
  <p className="font-medium text-sm truncate">{item.product.name}</p>
  <ProductSpecificInfo product={item.product} businessType={businessType} />
  <p className="text-xs text-muted-foreground">
    Stock disponible: {item.product.currentStock}
  </p>
</div>
```

**Tests necesarios**:
- ✅ Verificar que campos específicos se muestran solo para el tipo de negocio correcto
- ✅ Verificar que NO se muestran campos de otros tipos de negocio
- ✅ Verificar que maneja valores null/undefined correctamente
- ✅ Verificar que no hay regresión en zapaterías existentes

### Fase 5B: Reportes de Ventas (OPCIONAL - UX)

**Prioridad**: MEDIA - Mejora UX pero no es crítico para operación

**Archivos a modificar**:
1. `src/app/dashboard/reports/sales/by-product/page.tsx`
   - Agregar columnas condicionales según businessType
2. `src/app/dashboard/reports/sales/detailed/page.tsx`
   - Agregar información específica en detalle de productos

**Estrategia**:
- Usar el patrón de columnas dinámicas con `useMemo`
- Agregar columnas entre "Nombre" y "Precio" para mantener consistencia visual

### Fase 5C: Lista de Productos (Dashboard)

**Nota**: Ya cubierto en Fase 2 (Frontend - Formularios de Productos)

---

## 8. Testing y Validación

### 8.1 Casos de Prueba Críticos

#### TC-SALES-01: Búsqueda de productos en licorera
- **Given**: Usuario en organización tipo licorera
- **When**: Busca productos en nueva venta
- **Then**: Debe ver volumen y grado alcohólico en resultados
- **And**: NO debe ver talla, color ni modelo

#### TC-SALES-02: Búsqueda de productos en zapatería
- **Given**: Usuario en organización tipo zapatería
- **When**: Busca productos en nueva venta
- **Then**: Debe ver talla y color en resultados
- **And**: NO debe ver volumen ni grado alcohólico

#### TC-SALES-03: Carrito de compra en licorera
- **Given**: Usuario en licorera con productos agregados
- **When**: Revisa productos seleccionados
- **Then**: Debe ver volumen y grado alcohólico de cada producto

#### TC-SALES-04: Carrito de compra en zapatería
- **Given**: Usuario en zapatería con productos agregados
- **When**: Revisa productos seleccionados
- **Then**: Debe ver talla y color de cada producto

#### TC-SALES-05: Productos sin campos específicos
- **Given**: Producto sin volumen ni grado alcohólico en licorera
- **When**: Se muestra en búsqueda
- **Then**: No debe mostrar información específica ni errores
- **And**: Solo muestra nombre y stock

### 8.2 Regresión en Zapaterías Existentes

**Crítico**: Ejecutar suite completa de ventas en organización tipo zapatería:
- ✅ Crear nueva venta
- ✅ Buscar productos
- ✅ Agregar productos al carrito
- ✅ Completar venta PAID
- ✅ Completar venta PENDING
- ✅ Ver reportes de ventas

---

## 9. Mejoras Futuras (Fuera de Scope Actual)

### 9.1 Filtros Avanzados en Búsqueda de Productos

**Idea**: Agregar filtros específicos del negocio
- Licorera: Filtrar por rango de grado alcohólico, filtrar por volumen
- Zapatería: Filtrar por talla, filtrar por color

**Complejidad**: Media
**Valor**: Alto para operaciones con inventarios grandes

### 9.2 Vista Detallada de Venta (Sale View)

**Idea**: Crear página de detalle de venta individual
- Mostrar todos los productos con sus características específicas
- Permitir impresión de factura con información completa

**Complejidad**: Media
**Valor**: Alto para trazabilidad y servicio al cliente

### 9.3 Búsqueda por Campos Específicos

**Idea**: Permitir buscar productos por:
- Licorera: "40%" para encontrar todos los productos con ese grado alcohólico
- Zapatería: "42" para encontrar todos los productos talla 42

**Complejidad**: Baja (ya existe búsqueda, solo agregar campos al query)
**Valor**: Alto para agilizar ventas

---

## 10. Resumen de Decisiones

### ✅ IMPLEMENTAR (Scope Actual)

1. **Información específica en búsqueda de productos** (Fase 5A)
   - Justificación: Crítico para operación eficiente
   - Esfuerzo: Bajo
   - Impacto: Alto

2. **Información específica en productos seleccionados** (Fase 5A)
   - Justificación: Confirmación visual para el vendedor
   - Esfuerzo: Bajo
   - Impacto: Medio-Alto

### 📋 CONSIDERAR (Scope Futuro)

3. **Columnas dinámicas en reportes** (Fase 5B)
   - Justificación: Mejora análisis de ventas
   - Esfuerzo: Medio
   - Impacto: Medio

### ❌ NO IMPLEMENTAR (Fuera de Scope)

4. **Vista de lista de ventas**
   - Justificación: No muestra detalles de productos, solo agregados
   - Cambio requerido: Ninguno

---

## 11. Estimación de Esfuerzo

| Fase | Descripción | Complejidad | Tiempo Estimado |
|------|-------------|-------------|-----------------|
| **5A** | Flujo de nueva venta | Baja | 2-3 horas |
| **5B** | Reportes de ventas | Media | 4-5 horas |
| **Total Fase 5** | | | **6-8 horas** |

---

## 12. Checklist de Implementación

### Fase 5A: Nueva Venta
- [ ] Importar `useBusinessType` en `new-sale-form.tsx`
- [ ] Crear componente `ProductSpecificInfo`
- [ ] Agregar información específica en búsqueda de productos
- [ ] Agregar información específica en productos seleccionados
- [ ] Verificar manejo de valores null/undefined
- [ ] Ejecutar tests de regresión en zapaterías

### Fase 5B: Reportes (Opcional)
- [ ] Modificar reporte por producto con columnas dinámicas
- [ ] Modificar reporte detallado con información específica
- [ ] Verificar que columnas se ordenan correctamente
- [ ] Verificar que exportación incluye nuevas columnas (si aplica)

---

**Última actualización**: 2025-10-22
**Autor**: Sistema POS - Adaptación Multi-tenant
**Estado**: DRAFT - Pendiente de aprobación para Fase 5
