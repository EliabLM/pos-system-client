# Resumen Ejecutivo - Implementación Feature Licoreras

**Proyecto**: Adaptación del Sistema POS para Licoreras
**Fecha**: 2025-10-22
**Versión**: 3.1
**Duración Estimada Total**: 17-20 días (4 sprints)

---

## 🎯 Objetivo

Adaptar el sistema POS multi-tenant para soportar **licoreras (tiendas de bebidas alcohólicas)** manteniendo **100% de compatibilidad** con zapaterías existentes.

---

## ⚠️ RESTRICCIÓN CRÍTICA

**CERO IMPACTO EN NEGOCIOS EXISTENTES**:
- ✅ CERO cambios en el esquema de base de datos
- ✅ CERO campos obligatorios nuevos en DB
- ✅ CERO cambios en validaciones por defecto
- ✅ 100% compatible con zapaterías existentes
- ✅ Tipo de negocio es **PERMANENTE** (no se puede cambiar después del onboarding)

---

## 📊 Fases de Implementación

### **FASE 1: Configuración y Parametrización (Backend)**
**Duración**: 2-3 días | **Prioridad**: ALTA

#### Archivos a Crear:
1. ✅ `src/actions/system-config/system-config.action.ts` (NUEVO)
   - CRUD completo de SystemConfig
   - `getBusinessType(orgId)` - Obtener tipo de negocio
   - `setBusinessType(orgId, type)` - Establecer tipo (solo en onboarding)
   - Protección contra cambio de `business_type` después del onboarding

2. ✅ `src/actions/system-config/index.ts` (NUEVO)
   - Export barrel

3. ✅ `src/lib/business-type-utils.ts` (NUEVO - OPCIONAL)
   - Helper utilities para tipo de negocio
   - `isLiquorStore(orgId)` - Verificar si es licorera
   - `getRequiredFieldsForProduct(orgId)` - Campos requeridos según tipo

#### Archivos a Modificar:
1. ✅ `src/actions/organization/organization.action.ts`
   - **Agregar** constantes `LIQUOR_CATEGORIES` (15 categorías)
   - **Agregar** constantes `LIQUOR_BRANDS_NATIONAL` (7 marcas colombianas)
   - **Agregar** constantes `LIQUOR_BRANDS_INTERNATIONAL` (10 marcas internacionales)
   - **Modificar** `createInitialConfigurations(orgId, userId, businessType)`
   - **Modificar** `createOrganization(userId, orgData, businessType)`
   - Guardar `business_type` en SystemConfig al crear organización

#### Datos de Seed:
**Categorías para Licoreras** (15):
```
Whisky, Ron, Vodka, Tequila, Ginebra, Aguardiente,
Cerveza Nacional, Cerveza Importada, Vino Tinto, Vino Blanco,
Vino Rosado, Champagne/Espumosos, Licores, Brandy/Cognac, Aperitivos
```

**Marcas Nacionales** (7):
```
Aguardiente Antioqueño, Ron Viejo de Caldas, Club Colombia,
Poker, Aguila, Pilsen, Tres Cordilleras
```

**Marcas Internacionales** (10):
```
Johnnie Walker, Jack Daniels, Bacardi, Absolut, Smirnoff,
Jose Cuervo, Heineken, Corona, Budweiser, Stella Artois
```

#### Entregables:
- [ ] Server actions de SystemConfig funcionando
- [ ] Función `createOrganization` actualizada con parámetro `businessType`
- [ ] Seed de categorías y marcas según tipo de negocio
- [ ] Validaciones condicionales en server actions (opcional pero recomendado)

---

### **FASE 2: Interfaz de Usuario - Formularios de Productos (Frontend)**
**Duración**: 3-4 días | **Prioridad**: ALTA

#### Archivos a Crear:
1. ✅ `src/hooks/useSystemConfig.ts` (NUEVO)
   - `useSystemConfig(key)` - Obtener configuración específica
   - `useAllSystemConfigs()` - Obtener todas las configuraciones
   - `useUpdateSystemConfig()` - Actualizar configuración (protegido contra business_type)
   - `useBusinessType()` - Obtener tipo de negocio (SOLO LECTURA)
   - `useSetBusinessType()` - Establecer tipo (solo onboarding)

2. ✅ `src/app/dashboard/products/features/product-fields-liquor.tsx` (NUEVO)
   - Componente con campos: `alcoholGrade` y `volume`
   - Card con icono `IconBottle`
   - Validaciones en inputs (0-100% para alcohol)
   - FormDescription con ejemplos

3. ✅ `src/app/dashboard/products/features/product-fields-footwear.tsx` (NUEVO - OPCIONAL)
   - Componente con campos: `size`, `color`, `model`
   - Card con icono `IconShoe`

#### Archivos a Modificar:
1. ✅ `src/app/dashboard/products/features/new-product.tsx`
   - **Importar** `useBusinessType` hook
   - **Crear** schema dinámico con `useMemo` según `businessType`
   - **Agregar** campos condicionales en `defaultValues`
   - **Agregar** renderizado condicional de componentes:
     ```tsx
     {businessType === 'liquor_store' && <ProductFieldsLiquor form={form} />}
     {businessType === 'shoe_store' && <ProductFieldsFootwear form={form} />}
     ```
   - **Actualizar** useEffect para reset/setValue de campos condicionales

2. ✅ `src/actions/product/create.ts` y `update.ts` (OPCIONAL)
   - Validación backend según `businessType`
   - Verificar campos obligatorios para licoreras

#### Tabla de Visibilidad de Campos:

| Campo | Licorera | Zapatería | Sin Config |
|-------|----------|-----------|------------|
| `alcoholGrade` | ✅ Opcional | ❌ Oculto | ❌ Oculto |
| `volume` | ✅ Opcional | ❌ Oculto | ❌ Oculto |
| `size` | ❌ Oculto | ✅ Opcional | ❌ Oculto |
| `color` | ❌ Oculto | ✅ Opcional | ❌ Oculto |
| `model` | ❌ Oculto | ✅ Opcional | ❌ Oculto |

#### Entregables:
- [ ] Hook `useSystemConfig` funcionando
- [ ] Hook `useBusinessType` devolviendo tipo correcto
- [ ] Componente `ProductFieldsLiquor` creado
- [ ] Formulario de productos con renderizado condicional
- [ ] Schema de validación dinámico funcionando
- [ ] Campos se muestran/ocultan según tipo de negocio

---

### **FASE 3: Onboarding y Configuración Inicial**
**Duración**: 3-4 días | **Prioridad**: ALTA

#### Archivos a Modificar:
1. ✅ `src/app/onboarding/page.tsx` o crear nuevo paso
   - **Agregar** Select para tipo de negocio (OBLIGATORIO)
   - Opciones:
     - 🍺 Licorera / Tienda de Bebidas Alcohólicas
     - 👟 Zapatería / Tienda de Calzado Deportivo
   - **Capturar** selección en estado local
   - **Pasar** `businessType` al llamar `createOrganization(userId, orgData, businessType)`

#### Archivos a Crear (OPCIONAL):
1. ✅ `src/app/dashboard/settings/business-type/page.tsx`
   - Página de **SOLO LECTURA** (no permite cambiar)
   - Mostrar tipo de negocio actual
   - Mensaje: "El tipo de negocio se configuró durante el onboarding y no puede ser modificado"

#### Flujo del Usuario:
```
1. Usuario se registra exitosamente
   ↓
2. Pasa al onboarding
   ↓
3. [NUEVO] Selecciona tipo de negocio (OBLIGATORIO)
   - Licorera 🍺 o Zapatería 👟
   ↓
4. Completa datos de la organización
   ↓
5. Al crear organización:
   a. Se crea registro de Organization
   b. Se guarda business_type en SystemConfig
   c. Se crean categorías según tipo (15 o 3)
   d. Se crean marcas según tipo (17 o 3)
   e. Se crean métodos de pago (comunes)
   ↓
6. Redirige al dashboard
```

#### Entregables:
- [ ] Paso de selección de tipo de negocio en onboarding
- [ ] Categorías y marcas se crean según tipo seleccionado
- [ ] `business_type` se guarda correctamente en SystemConfig
- [ ] Organizaciones nuevas tienen tipo configurado

---

### **FASE 4: Vistas de Lista y Columnas Dinámicas**
**Duración**: 2 días | **Prioridad**: MEDIA

#### Archivos a Modificar:
1. ✅ `src/app/dashboard/products/features/products-list.tsx`
   - **Agregar** columnas condicionales según `businessType`:
     ```tsx
     const columns = [
       ...commonColumns,
       ...(businessType === 'liquor_store' ? liquorColumns : []),
       ...(businessType === 'shoe_store' ? footwearColumns : [])
     ]
     ```
   - Columnas para licoreras: `alcoholGrade`, `volume`
   - Columnas para zapaterías: `size`, `color`

2. ✅ `src/app/dashboard/products/features/products-filters.tsx` (NUEVO o modificar existente)
   - Filtros condicionales según `businessType`
   - Para licoreras: Filtro por rango de grado alcohólico, filtro por volumen
   - Para zapaterías: Filtro por talla, filtro por color

3. ✅ `src/app/dashboard/products/features/product-detail-dialog.tsx` (si existe)
   - Mostrar campos adicionales según tipo de negocio

#### Entregables:
- [ ] Columnas dinámicas en tabla de productos
- [ ] Filtros específicos por tipo de negocio
- [ ] Detalles de producto muestran campos correctos

---

### **FASE 5: Flujo y Vistas de Venta**
**Duración**: 1-2 días | **Prioridad**: ALTA

**📄 Análisis completo**: Ver `docs/SALES_FLOW_BUSINESS_TYPE_ANALYSIS.md`

#### Fase 5A: Nueva Venta - Visualización de Productos (CRÍTICO)
**Justificación**: Sin info específica, el vendedor debe memorizar SKUs para diferenciar variantes del mismo producto (ej: mismo whisky en 3 presentaciones diferentes)

#### Archivos a Modificar:
1. ✅ `src/app/dashboard/sales/new/new-sale-form.tsx`
   - **Importar** `useBusinessType` hook
   - **Crear** componente `ProductSpecificInfo` para renderizado condicional
   - **Modificar** búsqueda de productos (líneas 692-738):
     - Licoreras: Mostrar `volume` (ml) y `alcoholGrade` (%)
     - Zapaterías: Mostrar `size` y `color`
   - **Modificar** productos seleccionados (líneas 775-862):
     - Misma lógica de visualización
     - Confirmación visual de selección correcta

**Ejemplo**:
```tsx
const ProductSpecificInfo = ({ product, businessType }) => {
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
```

#### Fase 5B: Reportes de Ventas - Columnas Dinámicas (OPCIONAL)
**Prioridad**: MEDIA

2. ✅ `src/app/dashboard/reports/sales/by-product/page.tsx`
   - Columnas condicionales con `useMemo`
   - Agregar `volume` y `alcoholGrade` para licoreras
   - Agregar `size` y `color` para zapaterías

3. ✅ `src/app/dashboard/reports/sales/detailed/page.tsx`
   - Información específica en detalle de productos vendidos

**NO requieren cambios**:
- ✅ `sale-list.tsx` - Solo muestra agregados de venta
- ✅ Reportes por categoría, pago, vendedor

#### Entregables:
- [ ] Información específica en búsqueda de productos (Nueva Venta)
- [ ] Información específica en productos seleccionados
- [ ] Columnas dinámicas en reportes (opcional)
- [ ] Tests de regresión en zapaterías

---

### **FASE 6: Reportes y Analytics Específicos (OPCIONAL)**
**Duración**: 3 días | **Prioridad**: BAJA

#### Reportes para Licoreras:
1. ✅ Ventas por Categoría de Licor
   - Gráfico de barras por categoría
   - Top categorías más vendidas

2. ✅ Productos Más Vendidos por Grado Alcohólico
   - Filtrar por rangos: 0-20%, 20-40%, 40%+
   - Top 10 por rango

3. ✅ Inventario por Volumen
   - Total de litros en stock por categoría
   - Alertas de stock bajo por volumen

4. ✅ Dashboard KPIs para Licoreras
   - Total de litros vendidos
   - Categoría más vendida
   - Grado alcohólico promedio
   - Ticket promedio

#### Entregables:
- [ ] Reportes específicos para licoreras
- [ ] KPIs en dashboard adaptados según tipo de negocio

---

### **FASE 6: Mejoras de UX Específicas (OPCIONAL)**
**Duración**: 2 días | **Prioridad**: BAJA

#### Componentes UI Especializados:
1. ✅ `AlcoholGradeIndicator.tsx` - Badge visual del grado alcohólico
2. ✅ `VolumeDisplay.tsx` - Mostrar volumen formateado con iconos
3. ✅ `LiquorCategoryIcon.tsx` - Iconos por categoría de licor

#### Búsqueda y Filtros Avanzados:
- Búsqueda por grado alcohólico
- Filtro por rango de volumen
- Sugerencias de búsqueda específicas

#### Entregables:
- [ ] Componentes UI específicos
- [ ] Búsqueda y filtros mejorados

---

## 🧪 Testing y Validación (CRÍTICO)

### Test Suite 1: Zapaterías NO Afectadas (PRIORIDAD MÁXIMA)
- [ ] Organización de zapatería existente crea productos como antes
- [ ] Formulario se ve igual (sin campos nuevos)
- [ ] Validaciones originales funcionan
- [ ] Productos existentes se listan/editan sin errores
- [ ] Ventas funcionan sin cambios
- [ ] Reportes generan datos correctos
- [ ] Stock e inventario funcionan igual

### Test Suite 2: Organizaciones sin Configuración
- [ ] Organización sin `business_type` funciona por defecto
- [ ] Formularios muestran solo campos comunes
- [ ] Validaciones no requieren campos específicos

### Test Suite 3: Licoreras (Funcionalidad Nueva)
- [ ] Crear producto con alcoholGrade y volume (obligatorios)
- [ ] Validar rangos (alcohol 0-100%, volumen >0)
- [ ] Reportes con datos de licorera
- [ ] Filtros por grado alcohólico y volumen
- [ ] Campos de zapatos NO se muestran

### Test Suite 4: Coexistencia Multi-Tenant
- [ ] Usuario con zapatería y licorera en mismo sistema
- [ ] Cambiar entre organizaciones muestra UI correcta
- [ ] Reportes no cruzan datos entre organizaciones

---

## 📦 Archivos Nuevos a Crear (Resumen)

| # | Archivo | Ubicación | Fase |
|---|---------|-----------|------|
| 1 | `system-config.action.ts` | `src/actions/system-config/` | Fase 1 |
| 2 | `index.ts` | `src/actions/system-config/` | Fase 1 |
| 3 | `useSystemConfig.ts` | `src/hooks/` | Fase 2 |
| 4 | `product-fields-liquor.tsx` | `src/app/dashboard/products/features/` | Fase 2 |
| 5 | `product-fields-footwear.tsx` | `src/app/dashboard/products/features/` | Fase 2 (Opcional) |
| 6 | `business-type/page.tsx` | `src/app/dashboard/settings/` | Fase 3 (Opcional) |
| 7 | `business-type-utils.ts` | `src/lib/` | Fase 1 (Opcional) |

**Total**: 5 archivos obligatorios + 2 opcionales

---

## 🔧 Archivos a Modificar (Resumen)

| # | Archivo | Cambios | Fase |
|---|---------|---------|------|
| 1 | `organization.action.ts` | Agregar constantes, modificar funciones | Fase 1 |
| 2 | `new-product.tsx` | Schema dinámico, renderizado condicional | Fase 2 |
| 3 | `onboarding/page.tsx` | Agregar Select de tipo de negocio | Fase 3 |
| 4 | `products-list.tsx` | Columnas dinámicas | Fase 4 |
| 5 | `product/create.ts` | Validación backend (opcional) | Fase 2 |
| 6 | `product/update.ts` | Validación backend (opcional) | Fase 2 |

**Total**: 4 archivos obligatorios + 2 opcionales

---

## 🔒 Protección contra Cambio de business_type

**4 Capas de Protección**:

1. **Server Action**: `updateSystemConfig` rechaza cambios a `business_type` (403)
2. **Hook Frontend**: `useUpdateSystemConfig` previene cambios a `business_type`
3. **Hook Set**: `useSetBusinessType` verifica que no exista antes de crear
4. **Sin UI**: No existe interfaz para cambiar tipo de negocio

**Si se requiere cambio futuro**: Script SQL directo con supervisión técnica

---

## 📈 Estimación de Esfuerzo

| Fase | Días | Sprint |
|------|------|--------|
| Fase 1: Backend | 2-3 | Sprint 1 |
| Fase 2: Frontend Formularios | 3-4 | Sprint 1-2 |
| Fase 3: Onboarding | 3-4 | Sprint 2 |
| Fase 4: Listas y Columnas | 2 | Sprint 3 |
| Testing | 2 | Sprint 3 |
| Fase 5: Reportes (Opcional) | 3 | Sprint 4 |
| Fase 6: UX (Opcional) | 2 | Sprint 4 |
| Documentación | 1 | Sprint 4 |

**Total Obligatorio**: 12-15 días (3 sprints)
**Total con Opcionales**: 17-20 días (4 sprints)

---

## 🚀 Roadmap de Sprints

### Sprint 1 (Semana 1-2): MVP Backend + Frontend Básico
- ✅ Fase 1: Configuración y parametrización (Backend)
- ✅ Fase 2: Formularios de productos (Frontend)
- Testing de backend y formularios

### Sprint 2 (Semana 3-4): Onboarding y Testing
- ✅ Fase 3: Onboarding con selección de tipo
- Testing de integración completo
- **Milestone**: Nuevas organizaciones pueden seleccionar tipo y crear productos

### Sprint 3 (Semana 5-6): Vistas y Pulido
- ✅ Fase 4: Listas y columnas dinámicas
- Testing de regresión exhaustivo (zapaterías)
- Bugfixes
- **Milestone**: Sistema completo funcionando para ambos tipos

### Sprint 4 (Semana 7-8): Features Avanzados (Opcional)
- ✅ Fase 5: Reportes específicos
- ✅ Fase 6: Mejoras UX
- Documentación
- Preparación para producción

---

## ✅ Criterios de Aceptación para Deploy

**OBLIGATORIOS**:
- [ ] Todos los tests de regresión de zapaterías pasan (Test Suite 1)
- [ ] Validaciones condicionales funcionan correctamente
- [ ] Ningún cambio en esquema de base de datos
- [ ] Documentación técnica actualizada
- [ ] Plan de rollback probado
- [ ] Aprobación de stakeholders (zapatería + licorera)

**RECOMENDADOS**:
- [ ] Fase 5 implementada (reportes)
- [ ] Performance optimizado
- [ ] Documentación de usuario creada

---

## 🔄 Plan de Rollback de Emergencia

**Si algo sale mal**:

1. **Identificar** problema (¿zapaterías afectadas? → CRÍTICO)
2. **Rollback inmediato**:
   ```sql
   DELETE FROM system_configs WHERE key = 'business_type';
   ```
   **Efecto**: Todas las organizaciones vuelven al comportamiento por defecto
   **Pérdida de datos**: NINGUNA (solo configuración)

3. **Revisar** y corregir en desarrollo
4. **Re-testear** con casos de regresión
5. **Re-deploy** con fix

---

## 📊 Métricas de Éxito

**Técnicas**:
- ✅ 0 regresiones en funcionalidad existente
- ✅ 100% tests de regresión pasando
- ✅ Tiempo de respuesta < 200ms en queries
- ✅ 0 cambios en esquema de DB

**Negocio**:
- ✅ Licoreras pueden crear productos con campos específicos
- ✅ Zapaterías operan sin cambios
- ✅ Onboarding intuitivo para nuevos usuarios
- ✅ Reportes útiles por tipo de negocio

---

## 📚 Documentación Relacionada

- **Plan Completo**: `docs/LIQUOR_STORE_ADAPTATION_PLAN.md` (1400+ líneas)
- **Guía de Desarrollo**: `CLAUDE.md`
- **Schema de Base de Datos**: `prisma/schema.prisma`

---

**Documento creado**: 2025-10-22
**Autor**: Claude Code
**Próxima Revisión**: Después de Sprint 1
