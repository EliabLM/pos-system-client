# Plan de Adaptación para Licoreras - Sistema POS

## 1. Resumen Ejecutivo

Este documento detalla el análisis del esquema de base de datos actual y el plan completo para adaptar el sistema POS multi-tenant a la operación específica de licoreras (tiendas de bebidas alcohólicas).

**Estado Actual**: El sistema fue diseñado originalmente para dos tipos de negocios:
- Tiendas de zapatos deportivos
- Licoreras

**Objetivo**: Implementar funcionalidades específicas para licoreras manteniendo la flexibilidad multi-tenant del sistema.

---

## ⚠️ RESTRICCIÓN CRÍTICA: CERO IMPACTO EN NEGOCIOS EXISTENTES

**REGLA DE ORO**: Todos los cambios implementados deben cumplir con:

1. ✅ **CERO cambios en el esquema de base de datos** (sin migraciones, sin ALTER TABLE)
2. ✅ **CERO campos obligatorios nuevos** que afecten productos existentes
3. ✅ **CERO cambios en validaciones por defecto** (solo condicionales según tipo de negocio)
4. ✅ **100% compatible con zapaterías existentes** (ningún negocio de zapatos debe verse afectado)
5. ✅ **Todos los campos específicos son OPCIONALES** en el nivel de base de datos
6. ✅ **Validaciones solo en capa de aplicación** según configuración de organización
7. ✅ **Testing obligatorio** de regresión para zapaterías antes de cada deploy

**Consecuencia**: Cualquier cambio que rompa estas reglas será RECHAZADO.

---

## 2. Análisis del Esquema de Base de Datos Actual

### 2.1 Estado del Modelo Product

El modelo `Product` **YA INCLUYE** campos específicos para licoreras:

```prisma
model Product {
  // ... campos básicos ...

  // ✅ Campos específicos para LICORERAS (ya existentes)
  alcoholGrade   Float?    // Grado alcohólico (%)
  volume         Float?    // Volumen (ml, L)

  // ✅ Campos específicos para ZAPATOS (ya existentes)
  size           String?   // Talla
  color          String?   // Color
  model          String?   // Modelo

  // ... resto de campos ...
}
```

**Conclusión**: El esquema actual **ya es flexible** y soporta ambos tipos de negocios sin cambios estructurales críticos.

---

## 3. Campos Críticos para Licoreras

### 3.1 Campos OBLIGATORIOS para Licoreras ✅
Los siguientes campos ya existen en el modelo Product:

| Campo | Tipo | Uso en Licoreras | Estado |
|-------|------|-----------------|--------|
| `alcoholGrade` | Float? | Grado alcohólico (ej: 40%, 12%) | ✅ Existe |
| `volume` | Float? | Volumen del producto (750ml, 1L, etc.) | ✅ Existe |
| `unitMeasureId` | String? | Unidad de medida (botella, caja, litro) | ✅ Existe |
| `brandId` | String? | Marca de la bebida (ej: Johnnie Walker) | ✅ Existe |
| `categoryId` | String? | Categoría (Whisky, Ron, Cerveza, Vino, etc.) | ✅ Existe |

### 3.2 Campos OPCIONALES pero Útiles ✅
| Campo | Tipo | Uso en Licoreras | Estado |
|-------|------|-----------------|--------|
| `barcode` | String? | Código de barras | ✅ Existe |
| `description` | String? | Descripción del producto | ✅ Existe |
| `image` | String? | Imagen del producto | ✅ Existe |

### 3.3 Campos NO APLICABLES para Licoreras ⚠️
Estos campos existen pero no se usarán en licoreras:

| Campo | Tipo | Uso Original | En Licoreras |
|-------|------|-------------|--------------|
| `size` | String? | Talla de zapatos | ❌ No aplica |
| `color` | String? | Color de zapatos | ❌ No aplica |
| `model` | String? | Modelo de zapatos | ❌ No aplica |

---

## 4. Análisis de Impacto en Otros Modelos

### 4.1 Modelos SIN Cambios Requeridos ✅

#### Category (Categorías)
```prisma
model Category {
  id             String
  organizationId String
  name           String        // "Whisky", "Ron", "Cerveza", "Vino", etc.
  description    String?
  // ... campos estándar ...
}
```
**Estado**: ✅ No requiere cambios. Las categorías son configurables por organización.

#### Brand (Marcas)
```prisma
model Brand {
  id             String
  organizationId String
  name           String        // "Johnnie Walker", "Bacardi", "Corona", etc.
  logo           String?
  description    String?
  // ... campos estándar ...
}
```
**Estado**: ✅ No requiere cambios. Soporta cualquier marca de licores.

#### UnitMeasure (Unidades de Medida)
```prisma
model UnitMeasure {
  id             String
  organizationId String
  name           String        // "Botella", "Caja", "Litro", "Six-pack"
  abbreviation   String        // "bot", "cj", "L", "6pk"
  // ... campos estándar ...
}
```
**Estado**: ✅ No requiere cambios. Flexible para licoreras.

#### Sale, SaleItem, SalePayment
**Estado**: ✅ Sin cambios necesarios. El flujo de ventas es genérico.

#### Customer
**Estado**: ✅ Sin cambios necesarios. Aplica igual para ambos negocios.

#### Store, Organization, User
**Estado**: ✅ Sin cambios necesarios. Configuración multi-tenant estándar.

---

## 5. Cambios Requeridos en la Base de Datos

### 5.1 ⚠️ CAMBIOS CRÍTICOS: NINGUNO ✅

**Conclusión**: El esquema actual **NO REQUIERE MIGRACIONES DE BASE DE DATOS** para soportar licoreras.

### 5.2 ⚠️ CAMBIOS SIGNIFICATIVOS: NINGUNO ✅

El modelo de datos es suficientemente flexible para ambos tipos de negocios.

### 5.3 ❌ CAMBIOS OPCIONALES: DESCARTADOS POR RESTRICCIÓN

#### Opción A: Agregar Campo `productType` - ❌ DESCARTADA

**Razón de descarte**:
- ❌ Requiere migración de base de datos (ALTER TABLE)
- ❌ Afectaría productos existentes de zapaterías
- ❌ Viola la restricción de CERO impacto en negocios existentes

**Estado**: **NO IMPLEMENTAR**

#### Opción B: Usar SystemConfig para Tipo de Negocio - ✅ SELECCIONADA

**Objetivo**: Configurar el tipo de negocio a nivel de organización **SIN** cambiar el esquema.

```typescript
// SystemConfig entries per organization (usa tabla existente)
{
  key: "business_type",
  value: "liquor_store" | "shoe_store" | "mixed",
  organizationId: "org_xxx"
}

{
  key: "require_alcohol_fields",
  value: "true" | "false",
  organizationId: "org_xxx"
}
```

**Ventajas**:
- ✅ Sin cambios en el esquema de base de datos
- ✅ CERO impacto en zapaterías existentes
- ✅ Configuración flexible por organización
- ✅ Usa infraestructura existente (`SystemConfig`)
- ✅ Validaciones condicionales en capa de aplicación

**Estado**: **SELECCIONADA COMO ÚNICA OPCIÓN VIABLE**

---

## 6. Plan de Implementación por Fases

### Fase 1: Configuración y Parametrización (Backend)
**Duración estimada**: 2-3 días

#### 6.1 Server Actions (⚠️ SIN AFECTAR ZAPATERÍAS)

- [ ] **Crear helper utilities en `src/lib/business-type-utils.ts`** (NUEVO ARCHIVO)
  ```typescript
  // Funciones de consulta (no modifican nada)
  export async function getBusinessType(organizationId: string): Promise<BusinessType>
  export async function isLiquorStore(organizationId: string): Promise<boolean>
  export async function getRequiredFieldsForProduct(organizationId: string): Promise<string[]>

  // BusinessType = "liquor_store" | "shoe_store" | "mixed" | null
  // Si null o no existe config = comportamiento por defecto (sin validaciones extra)
  ```
  **Regla**: Si no existe configuración, el sistema funciona exactamente como antes.

- [ ] **Agregar actions de configuración en `src/actions/organization/`** (NUEVOS)
  - `setBusinessType(orgId, type)` - Solo CREAR config, nunca MODIFICAR productos
  - `getBusinessType(orgId)` - Consulta sin side effects
  - **IMPORTANTE**: NO modificar action existente `createOrganization`
  - NO tocar organizaciones existentes (zapaterías mantienen su comportamiento)

- [ ] **Actualizar validaciones en `src/actions/product/create.ts`** (SOLO NUEVAS VALIDACIONES)
  ```typescript
  // ANTES (se mantiene como fallback)
  const validationSchema = yup.object({ /* validaciones actuales */ })

  // NUEVO (solo para licoreras)
  const businessType = await getBusinessType(organizationId)
  if (businessType === 'liquor_store') {
    // Agregar validaciones adicionales SOLO para licoreras
    liquorSchema.validate(data)
  } else {
    // Zapaterías usan validaciones originales (sin cambios)
    validationSchema.validate(data)
  }
  ```
  **Regla**: Las validaciones originales NO cambian. Solo se agregan validaciones condicionales.

- [ ] **Actualizar `src/actions/product/update.ts`** (MISMA LÓGICA)
  - Validaciones condicionales según tipo de negocio
  - Zapaterías mantienen validaciones originales

#### 6.2 Configuración Inicial por Tipo de Negocio
```typescript
// Categorías predefinidas para licoreras
const LIQUOR_CATEGORIES = [
  "Whisky", "Ron", "Vodka", "Tequila", "Ginebra",
  "Cerveza", "Vino Tinto", "Vino Blanco", "Vino Rosado",
  "Licores", "Aguardiente", "Brandy", "Champagne"
]

// Unidades de medida para licoreras
const LIQUOR_UNITS = [
  { name: "Botella", abbreviation: "bot" },
  { name: "Litro", abbreviation: "L" },
  { name: "Mililitro", abbreviation: "ml" },
  { name: "Caja", abbreviation: "cj" },
  { name: "Six-pack", abbreviation: "6pk" },
  { name: "Docena", abbreviation: "doc" }
]
```

---

### Fase 2: Interfaz de Usuario (Frontend)
**Duración estimada**: 3-4 días

#### 6.3 Formularios de Productos (⚠️ COMPONENTES CONDICIONALES)

##### 6.3.1 Campos Específicos por Tipo de Negocio

**IMPORTANTE**: Los campos específicos de cada negocio **SOLO se muestran** si el `business_type` está configurado:

| Campo | Base de Datos | Licorera | Zapatería | Sin Config |
|-------|--------------|----------|-----------|------------|
| `alcoholGrade` (Float?) | Opcional | ✅ **Mostrar (opcional)** | ❌ Ocultar | ❌ Ocultar |
| `volume` (Float?) | Opcional | ✅ **Mostrar (opcional)** | ❌ Ocultar | ❌ Ocultar |
| `size` (String?) | Opcional | ❌ Ocultar | ✅ Mostrar (opcional) | ❌ Ocultar |
| `color` (String?) | Opcional | ❌ Ocultar | ✅ Mostrar (opcional) | ❌ Ocultar |
| `model` (String?) | Opcional | ❌ Ocultar | ✅ Mostrar (opcional) | ❌ Ocultar |

**Campos comunes** (siempre visibles): `name`, `description`, `image`, `barcode`, `sku`, `categoryId`, `brandId`, `costPrice`, `salePrice`, `minStock`, `currentStock`, `active`

##### 6.3.2 Crear Componente de Campos de Licorera

- [ ] **Crear `src/app/dashboard/products/features/product-fields-liquor.tsx`** (NUEVO ARCHIVO)
  ```tsx
  import React from 'react';
  import { UseFormReturn } from 'react-hook-form';
  import { NumericFormat } from 'react-number-format';
  import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormDescription,
  } from '@/components/ui/form';
  import { Input } from '@/components/ui/input';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { IconBottle } from '@tabler/icons-react';

  interface ProductFieldsLiquorProps {
    form: UseFormReturn<unknown>; // Usar el tipo de formulario apropiado
  }

  export function ProductFieldsLiquor({ form }: ProductFieldsLiquorProps) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <IconBottle className="h-5 w-5" />
            Información de Bebida Alcohólica
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campo: Grado Alcohólico */}
            <FormField
              control={form.control}
              name="alcoholGrade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grado Alcohólico (%)</FormLabel>
                  <FormControl>
                    <NumericFormat
                      id="alcoholGrade"
                      placeholder="Ej: 40"
                      customInput={Input}
                      decimalScale={2}
                      fixedDecimalScale={false}
                      allowNegative={false}
                      min={0}
                      max={100}
                      value={field.value as number}
                      onValueChange={(values) => {
                        field.onChange(values.floatValue ?? null);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Porcentaje de alcohol por volumen (0-100%). Opcional.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo: Volumen */}
            <FormField
              control={form.control}
              name="volume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Volumen (ml)</FormLabel>
                  <FormControl>
                    <NumericFormat
                      id="volume"
                      placeholder="Ej: 750, 1000"
                      customInput={Input}
                      decimalScale={0}
                      fixedDecimalScale={false}
                      allowNegative={false}
                      min={0}
                      value={field.value as number}
                      onValueChange={(values) => {
                        field.onChange(values.floatValue ?? null);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Volumen en mililitros (ml). Ejemplos: 200, 330, 750, 1000. Opcional.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    );
  }
  ```
  **Regla**: Este componente **SOLO se renderiza** si `business_type === 'liquor_store'`

##### 6.3.3 Crear Componente de Campos de Zapatería (OPCIONAL)

- [ ] **Crear `src/app/dashboard/products/features/product-fields-footwear.tsx`** (OPCIONAL)
  ```tsx
  import React from 'react';
  import { UseFormReturn } from 'react-hook-form';
  import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormDescription,
  } from '@/components/ui/form';
  import { Input } from '@/components/ui/input';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { IconShoe } from '@tabler/icons-react';

  interface ProductFieldsFootwearProps {
    form: UseFormReturn<unknown>;
  }

  export function ProductFieldsFootwear({ form }: ProductFieldsFootwearProps) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <IconShoe className="h-5 w-5" />
            Información de Calzado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Campo: Talla */}
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Talla</FormLabel>
                  <FormControl>
                    <Input
                      id="size"
                      type="text"
                      placeholder="Ej: 8.5, 42"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Talla del calzado</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo: Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input
                      id="color"
                      type="text"
                      placeholder="Ej: Negro, Blanco"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Color principal</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo: Modelo */}
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input
                      id="model"
                      type="text"
                      placeholder="Ej: Air Max 90"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Modelo del producto</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    );
  }
  ```
  **Regla**: Este componente **SOLO se renderiza** si `business_type === 'shoe_store'`

##### 6.3.4 Actualizar Schema de Validación Según Tipo de Negocio

- [ ] **Modificar `src/app/dashboard/products/features/new-product.tsx`** - Schema dinámico
  ```tsx
  // ANTES (línea 54-90): Schema estático
  const schema = yup.object().shape({
    name: yup.string().min(3).required(),
    // ... campos existentes ...
  });

  // DESPUÉS: Schema dinámico según businessType
  import { useBusinessType } from '@/hooks/useSystemConfig'; // NUEVO IMPORT

  const NewProduct = ({ setSheetOpen, itemSelected, setItemSelected }) => {
    // AGREGAR: Obtener tipo de negocio
    const { data: businessType } = useBusinessType();

    // CREAR: Schema dinámico
    const schema = React.useMemo(() => {
      const baseSchema = {
        name: yup.string().min(3, 'Debe ingresar mínimo 3 caracteres').required('El nombre es requerido'),
        description: yup.string().nullable().notRequired().defined(),
        image: yup.string().nullable().notRequired().defined(),
        barcode: yup.string().nullable().notRequired().defined(),
        sku: yup.string().nullable().notRequired().defined(),
        categoryId: yup.string().nullable().notRequired().defined(),
        brandId: yup.string().required('La marca es requerida'),
        costPrice: yup.number().typeError('Debe ingresar un valor válido').required('El costo es requerido').positive().min(0),
        salePrice: yup.number().typeError('Debe ingresar un valor válido').required('El precio de venta es requerido').positive().min(0),
        minStock: yup.number().typeError('Debe ingresar un valor válido').required('El stock mínimo es requerido').min(0).integer(),
        currentStock: yup.number().typeError('Debe ingresar un valor válido').required('El stock actual es requerido').min(0).integer(),
        active: yup.bool().default(true),
      };

      // Agregar validaciones según tipo de negocio
      if (businessType === 'liquor_store') {
        return yup.object().shape({
          ...baseSchema,
          alcoholGrade: yup
            .number()
            .nullable()
            .notRequired()
            .typeError('Debe ingresar un valor válido')
            .transform((value, originalValue) => (originalValue === '' ? null : value))
            .min(0, 'El valor mínimo es 0%')
            .max(100, 'El valor máximo es 100%'),
          volume: yup
            .number()
            .nullable()
            .notRequired()
            .typeError('Debe ingresar un valor válido')
            .transform((value, originalValue) => (originalValue === '' ? null : value))
            .positive('Debe ser un número positivo')
            .min(1, 'El volumen mínimo es 1 ml'),
        });
      } else if (businessType === 'shoe_store') {
        return yup.object().shape({
          ...baseSchema,
          size: yup.string().nullable().notRequired().defined(),
          color: yup.string().nullable().notRequired().defined(),
          model: yup.string().nullable().notRequired().defined(),
        });
      }

      // Sin configuración = schema base (sin campos específicos)
      return yup.object().shape(baseSchema);
    }, [businessType]);

    // ... resto del código del componente ...
  };
  ```

##### 6.3.5 Actualizar Renderizado Condicional en Formulario

- [ ] **Modificar `src/app/dashboard/products/features/new-product.tsx`** - JSX condicional
  ```tsx
  // Dentro del return del componente (después de la sección de precios, antes del SheetFooter)
  // AGREGAR imports:
  import { ProductFieldsLiquor } from './product-fields-liquor';
  import { ProductFieldsFootwear } from './product-fields-footwear';

  // En el JSX, AGREGAR después de la Card de "Información de Precios" (línea ~450):

  {/* SECCIÓN CONDICIONAL: Campos específicos de negocio */}
  {businessType === 'liquor_store' && (
    <ProductFieldsLiquor form={form} />
  )}

  {businessType === 'shoe_store' && (
    <ProductFieldsFootwear form={form} />
  )}

  {/* Si businessType === null, no se muestra ninguna sección adicional */}
  ```

##### 6.3.6 Actualizar DefaultValues Según Tipo de Negocio

- [ ] **Modificar `src/app/dashboard/products/features/new-product.tsx`** - Default values
  ```tsx
  // En el useForm (línea 113-132), ACTUALIZAR defaultValues:
  const form = useForm<StoreFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      // ... campos existentes ...
      name: itemSelected?.name ?? '',
      description: itemSelected?.description ?? '',
      // ... otros campos ...

      // AGREGAR: Campos condicionales para licoreras
      ...(businessType === 'liquor_store' && {
        alcoholGrade: itemSelected?.alcoholGrade ?? null,
        volume: itemSelected?.volume ?? null,
      }),

      // AGREGAR: Campos condicionales para zapaterías
      ...(businessType === 'shoe_store' && {
        size: itemSelected?.size ?? '',
        color: itemSelected?.color ?? '',
        model: itemSelected?.model ?? '',
      }),
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema),
  });
  ```

##### 6.3.7 Actualizar useEffect para Campos Condicionales

- [ ] **Modificar `src/app/dashboard/products/features/new-product.tsx`** - useEffect
  ```tsx
  // En el useEffect que actualiza los valores (línea 228-259), AGREGAR:
  useEffect(() => {
    if (!itemSelected) {
      // ... resets existentes ...

      // AGREGAR: Reset de campos condicionales
      if (businessType === 'liquor_store') {
        form.resetField('alcoholGrade');
        form.resetField('volume');
      }
      if (businessType === 'shoe_store') {
        form.resetField('size');
        form.resetField('color');
        form.resetField('model');
      }
      return;
    }

    // ... setValues existentes ...

    // AGREGAR: Set values de campos condicionales
    if (businessType === 'liquor_store') {
      form.setValue('alcoholGrade', itemSelected.alcoholGrade ?? null);
      form.setValue('volume', itemSelected.volume ?? null);
    }
    if (businessType === 'shoe_store') {
      form.setValue('size', itemSelected.size ?? '');
      form.setValue('color', itemSelected.color ?? '');
      form.setValue('model', itemSelected.model ?? '');
    }
  }, [itemSelected, form, businessType]); // AGREGAR businessType a dependencies
  ```

##### 6.3.8 Actualizar Action de Creación/Edición

**IMPORTANTE**: El server action de productos **NO necesita cambios** porque:
- Los campos `alcoholGrade`, `volume`, `size`, `color`, `model` ya existen en el modelo
- Son opcionales en la base de datos (Float? y String?)
- El frontend enviará los valores solo si el negocio corresponde
- La validación se hace en el frontend según `business_type`

**Sin embargo**, para mayor seguridad, se puede agregar validación en el backend:

- [ ] **Modificar `src/actions/product/create.ts`** y `update.ts` (OPCIONAL pero recomendado)
  ```typescript
  // Al inicio de la función, después de obtener organizationId
  import { getBusinessType } from '@/actions/system-config';

  export async function createProduct(data: ProductData): Promise<ActionResponse<Product>> {
    try {
      // ... código existente ...

      // AGREGAR: Validación según tipo de negocio
      const businessType = await getBusinessType(organizationId);

      if (businessType === 'liquor_store') {
        // Validar campos opcionales para licoreras (si se proporcionan)
        if (data.alcoholGrade !== null && data.alcoholGrade !== undefined) {
          if (data.alcoholGrade < 0 || data.alcoholGrade > 100) {
            return {
              status: 400,
              message: 'El grado alcohólico debe estar entre 0 y 100',
              data: null,
            };
          }
        }
        if (data.volume !== null && data.volume !== undefined) {
          if (data.volume <= 0) {
            return {
              status: 400,
              message: 'El volumen debe ser mayor a 0',
              data: null,
            };
          }
        }
      }

      // Continuar con la creación del producto...
      const product = await prisma.product.create({ data });
      // ... resto del código ...
    }
  }
  ```

**Regla**: Las validaciones del backend son **opcionales** pero recomendadas como capa adicional de seguridad.

#### 6.4 Vistas de Lista y Tabla (⚠️ COLUMNAS DINÁMICAS)

- [ ] **Actualizar `src/app/dashboard/products/features/products-list.tsx`** (COLUMNAS CONDICIONALES)
  ```tsx
  // NUEVO: Definir columnas según tipo de negocio
  const columns = [
    ...commonColumns, // Columnas base (siempre presentes)
    ...(businessType === 'liquor_store' ? liquorColumns : []),
    ...(businessType === 'shoe_store' ? footwearColumns : [])
  ]

  // Si businessType === null, solo columnas comunes (comportamiento original)
  ```
  **Regla**: Las columnas base NO cambian. Solo se agregan columnas condicionales.

- [ ] **Crear filtros NUEVOS específicos** (COMPONENTES ADICIONALES)
  - Filtro por rango de grado alcohólico (solo visible en licoreras)
  - Filtro por volumen (solo visible en licoreras)
  - Filtro por talla/color (solo visible en zapaterías)
  **Regla**: Filtros originales se mantienen. Nuevos filtros son condicionales.

---

### Fase 3: Onboarding y Configuración Inicial
**Duración estimada**: 3-4 días

#### 6.5 Actualizar Flujo de Onboarding (⚠️ SOLO PARA NUEVAS ORGANIZACIONES)

##### 6.5.1 Agregar Paso de Selección en Onboarding

- [ ] **Modificar `src/app/onboarding/page.tsx` o crear nuevo paso**
  ```tsx
  // Paso OBLIGATORIO después del registro exitoso
  // Mostrar antes de crear la organización

  <Select name="businessType" required>
    <SelectItem value="liquor_store">
      🍺 Licorera / Tienda de Bebidas Alcohólicas
    </SelectItem>
    <SelectItem value="shoe_store">
      👟 Zapatería / Tienda de Calzado Deportivo
    </SelectItem>
  </Select>
  ```
  **Regla CRÍTICA**: Campo OBLIGATORIO para nuevas organizaciones.
  **Regla CRÍTICA**: Organizaciones existentes NO son afectadas (ya están creadas).

##### 6.5.2 Crear Server Actions para SystemConfig

- [ ] **Crear `src/actions/system-config/system-config.action.ts`** (NUEVO ARCHIVO)
  ```typescript
  'use server';

  import { SystemConfig } from '@/generated/prisma';
  import { ActionResponse } from '@/interfaces';
  import { prisma, checkAdminRole, unauthorizedResponse } from '../utils';

  // CREATE - Crear configuración del sistema
  export async function createSystemConfig(
    organizationId: string,
    key: string,
    value: string,
    type: string = 'STRING',
    description?: string
  ): Promise<ActionResponse<SystemConfig | null>> {
    try {
      const config = await prisma.systemConfig.create({
        data: {
          organizationId,
          key,
          value,
          type,
          description,
          isDeleted: false,
        },
      });

      return {
        status: 201,
        message: 'Configuración creada exitosamente',
        data: config,
      };
    } catch (error) {
      console.error('Error creating system config:', error);
      return { status: 500, message: 'Error interno del servidor', data: null };
    }
  }

  // GET - Obtener configuración por key
  export async function getSystemConfig(
    organizationId: string,
    key: string
  ): Promise<ActionResponse<SystemConfig | null>> {
    try {
      const config = await prisma.systemConfig.findFirst({
        where: {
          organizationId,
          key,
          isDeleted: false,
        },
      });

      if (!config) {
        return { status: 404, message: 'Configuración no encontrada', data: null };
      }

      return {
        status: 200,
        message: 'Configuración obtenida exitosamente',
        data: config,
      };
    } catch (error) {
      console.error('Error fetching system config:', error);
      return { status: 500, message: 'Error interno del servidor', data: null };
    }
  }

  // GET ALL - Obtener todas las configuraciones
  export async function getAllSystemConfigs(
    organizationId: string
  ): Promise<ActionResponse<SystemConfig[] | null>> {
    try {
      const configs = await prisma.systemConfig.findMany({
        where: {
          organizationId,
          isDeleted: false,
        },
        orderBy: { key: 'asc' },
      });

      return {
        status: 200,
        message: 'Configuraciones obtenidas exitosamente',
        data: configs,
      };
    } catch (error) {
      console.error('Error fetching system configs:', error);
      return { status: 500, message: 'Error interno del servidor', data: null };
    }
  }

  // UPDATE - Actualizar configuración
  export async function updateSystemConfig(
    organizationId: string,
    adminUserId: string,
    key: string,
    value: string
  ): Promise<ActionResponse<SystemConfig | null>> {
    try {
      const isAdmin = await checkAdminRole(adminUserId);
      if (!isAdmin) return unauthorizedResponse();

      // ⚠️ PREVENIR cambio de business_type
      if (key === 'business_type') {
        return {
          status: 403,
          message: 'No se puede cambiar el tipo de negocio después del onboarding',
          data: null,
        };
      }

      const config = await prisma.systemConfig.findFirst({
        where: {
          organizationId,
          key,
          isDeleted: false,
        },
      });

      if (!config) {
        return { status: 404, message: 'Configuración no encontrada', data: null };
      }

      const updatedConfig = await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          value,
          updatedAt: new Date(),
        },
      });

      return {
        status: 200,
        message: 'Configuración actualizada exitosamente',
        data: updatedConfig,
      };
    } catch (error) {
      console.error('Error updating system config:', error);
      return { status: 500, message: 'Error interno del servidor', data: null };
    }
  }

  // Helper: Obtener tipo de negocio
  export async function getBusinessType(
    organizationId: string
  ): Promise<'liquor_store' | 'shoe_store' | null> {
    try {
      const config = await prisma.systemConfig.findFirst({
        where: {
          organizationId,
          key: 'business_type',
          isDeleted: false,
        },
      });

      if (!config) return null;

      const value = config.value as 'liquor_store' | 'shoe_store';
      return value;
    } catch (error) {
      console.error('Error fetching business type:', error);
      return null;
    }
  }

  // Helper: Establecer tipo de negocio
  export async function setBusinessType(
    organizationId: string,
    businessType: 'liquor_store' | 'shoe_store'
  ): Promise<ActionResponse<SystemConfig | null>> {
    return createSystemConfig(
      organizationId,
      'business_type',
      businessType,
      'STRING',
      'Tipo de negocio de la organización'
    );
  }
  ```

- [ ] **Crear `src/actions/system-config/index.ts`** (EXPORT BARREL)
  ```typescript
  export * from './system-config.action';
  ```

##### 6.5.3 Actualizar Actions de Organization

- [ ] **Modificar `src/actions/organization/organization.action.ts`**

  **AGREGAR nuevas constantes para licoreras:**
  ```typescript
  // Después de línea 74 (después de DEFAULT_BRANDS)

  // Categorías para LICORERAS
  const LIQUOR_CATEGORIES = [
    { name: 'Whisky', description: 'Whisky escocés, irlandés, bourbon, etc.' },
    { name: 'Ron', description: 'Ron blanco, añejo, premium' },
    { name: 'Vodka', description: 'Vodka nacional e importado' },
    { name: 'Tequila', description: 'Tequila blanco, reposado, añejo' },
    { name: 'Ginebra', description: 'Ginebra dry, London dry, premium' },
    { name: 'Aguardiente', description: 'Aguardiente nacional' },
    { name: 'Cerveza Nacional', description: 'Cervezas nacionales' },
    { name: 'Cerveza Importada', description: 'Cervezas importadas' },
    { name: 'Vino Tinto', description: 'Vinos tintos nacionales e importados' },
    { name: 'Vino Blanco', description: 'Vinos blancos nacionales e importados' },
    { name: 'Vino Rosado', description: 'Vinos rosados' },
    { name: 'Champagne/Espumosos', description: 'Champagne y vinos espumosos' },
    { name: 'Licores', description: 'Licores cremosos y digestivos' },
    { name: 'Brandy/Cognac', description: 'Brandy y cognac' },
    { name: 'Aperitivos', description: 'Aperitivos y vermut' },
  ] as const;

  // Marcas para LICORERAS (Nacionales Colombia)
  const LIQUOR_BRANDS_NATIONAL = [
    { name: 'Aguardiente Antioqueño', description: 'Aguardiente colombiano' },
    { name: 'Ron Viejo de Caldas', description: 'Ron colombiano' },
    { name: 'Club Colombia', description: 'Cerveza premium colombiana' },
    { name: 'Poker', description: 'Cerveza colombiana' },
    { name: 'Aguila', description: 'Cerveza colombiana' },
    { name: 'Pilsen', description: 'Cerveza colombiana' },
    { name: 'Tres Cordilleras', description: 'Ron colombiano' },
  ] as const;

  // Marcas para LICORERAS (Internacionales)
  const LIQUOR_BRANDS_INTERNATIONAL = [
    { name: 'Johnnie Walker', description: 'Whisky escocés' },
    { name: 'Jack Daniels', description: 'Whisky americano' },
    { name: 'Bacardi', description: 'Ron caribeño' },
    { name: 'Absolut', description: 'Vodka sueco' },
    { name: 'Smirnoff', description: 'Vodka' },
    { name: 'Jose Cuervo', description: 'Tequila mexicano' },
    { name: 'Heineken', description: 'Cerveza holandesa' },
    { name: 'Corona', description: 'Cerveza mexicana' },
    { name: 'Budweiser', description: 'Cerveza americana' },
    { name: 'Stella Artois', description: 'Cerveza belga' },
  ] as const;
  ```

  **MODIFICAR función `createInitialConfigurations`:**
  ```typescript
  // Reemplazar líneas 76-117 con:

  const createInitialConfigurations = async (
    organizationId: string,
    adminUserId: string,
    businessType?: 'liquor_store' | 'shoe_store' | null
  ): Promise<void> => {
    await prisma.$transaction(async (_tx) => {
      // Determinar qué categorías y marcas crear según el tipo de negocio
      const categories = businessType === 'liquor_store'
        ? LIQUOR_CATEGORIES
        : DEFAULT_CATEGORIES;

      const brands = businessType === 'liquor_store'
        ? [...LIQUOR_BRANDS_NATIONAL, ...LIQUOR_BRANDS_INTERNATIONAL]
        : DEFAULT_BRANDS;

      // Crear categorías en paralelo
      const categoryPromises = categories.map((category) =>
        createCategory(organizationId, adminUserId, {
          name: category.name,
          description: category.description,
          isActive: true,
        })
      );

      // Crear métodos de pago (comunes para ambos tipos)
      const paymentMethodPromises = DEFAULT_PAYMENT_METHODS.map((method) =>
        createPaymentMethod(organizationId, adminUserId, {
          name: method.name,
          type: method.type,
          isActive: true,
        })
      );

      // Crear marcas según tipo de negocio
      const brandsPromises = brands.map((brand) =>
        createBrand(organizationId, adminUserId, {
          name: brand.name,
          description: brand.description,
          isActive: true,
        })
      );

      // Ejecutar todas las creaciones en paralelo
      await Promise.all([
        ...categoryPromises,
        ...paymentMethodPromises,
        ...brandsPromises,
      ]);
    });
  };
  ```

  **MODIFICAR función `createOrganization`:**
  ```typescript
  // AGREGAR import al inicio del archivo
  import { setBusinessType } from '../system-config';

  // Agregar parámetro businessType a la firma de la función (línea 120-126)
  export const createOrganization = async (
    adminUserId: string,
    organizationData: Omit<
      Organization,
      'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
    >,
    businessType?: 'liquor_store' | 'shoe_store' | null  // NUEVO PARÁMETRO
  ): Promise<ActionResponse<Organization | null>> => {
    try {
      const isAdmin = await checkAdminRole(adminUserId);
      if (!isAdmin) return unauthorizedResponse();

      // ... código existente de validación de NIT ...

      const newOrganization = await prisma.organization.create({
        data: organizationData,
        include: organizationInclude,
      });

      // MODIFICAR: Pasar businessType a createInitialConfigurations
      createInitialConfigurations(
        newOrganization.id,
        adminUserId,
        businessType  // NUEVO
      ).catch((error) => {
        console.error(
          'Error creating initial configurations for organization:',
          newOrganization.id,
          error
        );
      });

      // NUEVO: Guardar tipo de negocio en SystemConfig si se proporciona
      if (businessType) {
        try {
          await setBusinessType(newOrganization.id, businessType);
        } catch (error) {
          console.error('Error setting business type:', error);
        }
      }

      return {
        status: 201,
        message: 'Organización creada exitosamente',
        data: newOrganization,
      };
    } catch (error) {
      // ... código existente de manejo de errores ...
    }
  };
  ```

##### 6.5.4 Crear Custom Hook para SystemConfig

- [ ] **Crear `src/hooks/useSystemConfig.ts`** (NUEVO ARCHIVO)
  ```typescript
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
  import {
    getSystemConfig,
    getAllSystemConfigs,
    updateSystemConfig,
    getBusinessType,
    setBusinessType
  } from '@/actions/system-config';
  import { useStore } from '@/store';
  import { toast } from 'sonner';

  // Hook para obtener una configuración específica
  export function useSystemConfig(key: string) {
    const user = useStore((state) => state.user);
    const organizationId = user?.organizationId ?? '';

    return useQuery({
      queryKey: ['system-config', organizationId, key],
      queryFn: async () => {
        const response = await getSystemConfig(organizationId, key);
        return response.data;
      },
      enabled: !!organizationId && !!key,
    });
  }

  // Hook para obtener todas las configuraciones
  export function useAllSystemConfigs() {
    const user = useStore((state) => state.user);
    const organizationId = user?.organizationId ?? '';

    return useQuery({
      queryKey: ['system-configs', organizationId],
      queryFn: async () => {
        const response = await getAllSystemConfigs(organizationId);
        return response.data;
      },
      enabled: !!organizationId,
    });
  }

  // Hook para actualizar configuración (NO usar para business_type)
  export function useUpdateSystemConfig() {
    const queryClient = useQueryClient();
    const user = useStore((state) => state.user);
    const organizationId = user?.organizationId ?? '';
    const userId = user?.id ?? '';

    return useMutation({
      mutationFn: async ({ key, value }: { key: string; value: string }) => {
        // Prevenir cambio de business_type
        if (key === 'business_type') {
          throw new Error('No se puede cambiar el tipo de negocio después del onboarding');
        }

        const response = await updateSystemConfig(organizationId, userId, key, value);
        if (response.status !== 200) {
          throw new Error(response.message);
        }
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['system-configs', organizationId] });
        toast.success('Configuración actualizada exitosamente');
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Error al actualizar configuración');
      },
    });
  }

  // Hook específico para obtener tipo de negocio (SOLO LECTURA)
  export function useBusinessType() {
    const user = useStore((state) => state.user);
    const organizationId = user?.organizationId ?? '';

    return useQuery({
      queryKey: ['business-type', organizationId],
      queryFn: async () => {
        return await getBusinessType(organizationId);
      },
      enabled: !!organizationId,
      staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    });
  }

  // Hook para establecer tipo de negocio
  // ⚠️ IMPORTANTE: Solo debe usarse durante el onboarding
  // Una vez establecido, NO puede cambiarse
  export function useSetBusinessType() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        organizationId,
        businessType
      }: {
        organizationId: string;
        businessType: 'liquor_store' | 'shoe_store'
      }) => {
        // Verificar que no exista ya un business_type
        const existing = await getBusinessType(organizationId);
        if (existing) {
          throw new Error('El tipo de negocio ya fue configurado y no puede ser modificado');
        }

        const response = await setBusinessType(organizationId, businessType);
        if (response.status !== 201) {
          throw new Error(response.message);
        }
        return response.data;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['business-type', variables.organizationId]
        });
      },
    });
  }
  ```

##### 6.5.5 Integrar en Flujo de Onboarding

- [ ] **Actualizar componente de onboarding para capturar businessType**
  ```tsx
  // En el formulario de creación de organización durante onboarding
  import { useState } from 'react';
  import { createOrganization } from '@/actions/organization';

  const [businessType, setBusinessType] = useState<'liquor_store' | 'shoe_store'>('shoe_store');

  const handleCreateOrganization = async (formData) => {
    // ... validaciones ...

    const response = await createOrganization(
      userId,
      organizationData,
      businessType  // Pasar el tipo seleccionado
    );

    if (response.status === 201) {
      // Continuar con el flujo de onboarding
      toast.success('Organización creada exitosamente');
      router.push('/dashboard');
    }
  };
  ```

##### 6.5.6 Página de Visualización de Tipo de Negocio (Post-Onboarding) - OPCIONAL

- [ ] **Crear `src/app/dashboard/settings/business-type/page.tsx`** (OPCIONAL)
  - **SOLO LECTURA**: Mostrar tipo de negocio actual
  - **NO permite cambiar** el tipo después del onboarding
  - Mensaje informativo: "El tipo de negocio se configuró durante el onboarding y no puede ser modificado."
  - Contacto de soporte si necesita cambios (decisión de negocio)

  **NOTA**: Si en el futuro se requiere cambiar el tipo de negocio, debe hacerse mediante:
  1. Script de migración de datos (cambio manual en BD por administrador del sistema)
  2. Con aprobación y supervisión técnica
  3. Considerando el impacto en productos, categorías y marcas existentes

---

### Fase 4: Validaciones y Reglas de Negocio
**Duración estimada**: 2 días

#### 6.6 Validaciones en Server Actions
- [ ] **Agregar schemas de validación específicos**
  ```typescript
  // src/lib/validations/product-liquor.ts
  export const liquorProductSchema = yup.object({
    // ... campos base ...
    alcoholGrade: yup.number()
      .required("El grado alcohólico es obligatorio")
      .min(0, "Debe ser mayor o igual a 0")
      .max(100, "Debe ser menor o igual a 100"),
    volume: yup.number()
      .required("El volumen es obligatorio")
      .positive("Debe ser un número positivo"),
    unitMeasureId: yup.string()
      .required("La unidad de medida es obligatoria")
  })
  ```

- [ ] **Implementar validación condicional en server actions**
  ```typescript
  // En src/actions/product/create.ts
  const isLiquorStore = await getBusinessType(organizationId) === 'liquor_store'

  if (isLiquorStore) {
    // Validar con liquorProductSchema
    await liquorProductSchema.validate(data)
  } else {
    // Validar con schema genérico
    await genericProductSchema.validate(data)
  }
  ```

---

### Fase 5: Flujo y Vistas de Venta
**Duración estimada**: 1-2 días

**📄 Documento de análisis**: Ver `SALES_FLOW_BUSINESS_TYPE_ANALYSIS.md` para análisis completo

#### Fase 5A: Nueva Venta - Visualización de Productos (CRÍTICO)
**Prioridad**: ALTA - Impacta operación diaria del vendedor

- [ ] **Modificar `src/app/dashboard/sales/new/new-sale-form.tsx`**
  - [ ] Importar hook `useBusinessType`
  - [ ] Crear componente `ProductSpecificInfo` para información condicional
  - [ ] Agregar visualización condicional en búsqueda de productos (líneas 692-738)
    - Licoreras: Mostrar `volume` (ml) y `alcoholGrade` (%)
    - Zapaterías: Mostrar `size` (talla) y `color`
  - [ ] Agregar visualización condicional en productos seleccionados (líneas 775-862)
    - Misma lógica que búsqueda
    - Ayuda al vendedor a confirmar selección correcta

**Ejemplo de implementación**:
```typescript
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
```

**Justificación**:
- Sin esta información, el vendedor debe memorizar SKUs o adivinar qué variante es
- Crítico para productos con múltiples presentaciones (ej: mismo whisky en 750ml, 1L, 1.75L)
- Reduce errores de venta significativamente
- Mejora velocidad de venta

**Testing**:
- [ ] TC-SALES-01: Verificar campos específicos en licorera
- [ ] TC-SALES-02: Verificar campos específicos en zapatería
- [ ] TC-SALES-03: Verificar productos sin campos específicos no causan errores
- [ ] TC-SALES-04: Regresión en zapaterías existentes

#### Fase 5B: Reportes de Ventas - Columnas Dinámicas (OPCIONAL)
**Prioridad**: MEDIA - Mejora UX pero no crítico

- [ ] **Modificar `src/app/dashboard/reports/sales/by-product/page.tsx`**
  - [ ] Implementar columnas condicionales con `useMemo`
  - [ ] Agregar columnas de `volume` y `alcoholGrade` para licoreras
  - [ ] Agregar columnas de `size` y `color` para zapaterías

- [ ] **Modificar `src/app/dashboard/reports/sales/detailed/page.tsx`**
  - [ ] Agregar información específica en detalle de productos vendidos

**Patrón de implementación**:
```typescript
const columns = useMemo(() => {
  const baseColumns: ColumnDef<Product>[] = [
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'salePrice', header: 'Precio' },
    { accessorKey: 'currentStock', header: 'Stock' },
  ];

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

**NO REQUIERE CAMBIOS**:
- ✅ `src/app/dashboard/sales/features/sale-list.tsx` - Solo muestra agregados de venta
- ✅ Reportes por categoría, pago, vendedor - No muestran detalles de producto

---

### Fase 6: Reportes y Analytics Específicos (FUTURO)
**Duración estimada**: 3 días
**Estado**: OPCIONAL - Fuera del scope inicial

#### 6.7 Reportes para Licoreras
- [ ] **Crear reporte "Ventas por Categoría de Licor"**
  - Gráfico de barras: Whisky, Ron, Vodka, Cerveza, etc.
  - Tabla con detalles por categoría

- [ ] **Crear reporte "Productos Más Vendidos por Grado Alcohólico"**
  - Filtrar por rangos: 0-20%, 20-40%, 40%+
  - Top 10 productos por rango

- [ ] **Crear reporte "Inventario por Volumen"**
  - Total de litros en stock por categoría
  - Alertas de stock bajo por volumen

- [ ] **Crear reporte "Análisis de Márgenes por Tipo de Licor"**
  - Rentabilidad por categoría
  - Comparación precio costo vs precio venta

#### 6.8 Dashboard KPIs Específicos
- [ ] **Agregar KPIs para licoreras en `src/app/dashboard/page.tsx`**
  - Total de litros vendidos en el período
  - Categoría más vendida
  - Grado alcohólico promedio vendido
  - Ticket promedio de compra

---

### Fase 7: Mejoras de UX Específicas (FUTURO)
**Duración estimada**: 2 días
**Estado**: OPCIONAL - Fuera del scope inicial

#### 6.9 Componentes UI Especializados
- [ ] **Crear `AlcoholGradeIndicator.tsx`**
  - Badge visual del grado alcohólico
  - Colores según intensidad (verde: bajo, amarillo: medio, rojo: alto)

- [ ] **Crear `VolumeDisplay.tsx`**
  - Mostrar volumen con unidad formateada (ej: "750 ml", "1 L")
  - Iconos de tamaño de botella

- [ ] **Crear `LiquorCategoryIcon.tsx`**
  - Iconos específicos por categoría (whisky, ron, cerveza, vino)

#### 6.10 Búsqueda y Filtros Avanzados
- [ ] **Agregar búsqueda por grado alcohólico**
- [ ] **Agregar filtro por rango de volumen**
- [ ] **Agregar sugerencias de búsqueda específicas**
  - Autocompletado con nombres comunes de licores
  - Búsqueda por marca popular

---

## 7. Consideraciones Legales y Regulatorias

### 7.1 Advertencias y Compliance
- [ ] **Agregar advertencias legales en facturación**
  - "Prohibida la venta de bebidas alcohólicas a menores de edad"
  - Número de registro de establecimiento (si aplica)

- [ ] **Validación de edad en ventas (opcional)**
  - Campo para registrar verificación de edad del cliente
  - Opción de no vender a menores (configurable)

### 7.2 Impuestos Específicos
- [ ] **Investigar impuestos especiales a bebidas alcohólicas**
  - Algunos países/regiones tienen impuestos adicionales
  - Configurar en `SystemConfig` si aplica

---

## 8. Testing y Validación

### 8.1 Casos de Prueba CRÍTICOS - Testing de Regresión para Zapaterías ⚠️

**PRIORIDAD MÁXIMA**: Estos tests deben pasar ANTES de cualquier deploy.

#### Test Suite 1: Zapaterías NO Afectadas
- [ ] **Test 1.1**: Organización de zapatería existente puede crear productos exactamente como antes
- [ ] **Test 1.2**: Formulario de productos en zapatería se ve exactamente igual (sin campos nuevos)
- [ ] **Test 1.3**: Validaciones originales funcionan sin cambios
- [ ] **Test 1.4**: Productos existentes de zapatería se listan/editan sin errores
- [ ] **Test 1.5**: Ventas en zapatería funcionan sin cambios
- [ ] **Test 1.6**: Reportes de zapatería generan datos correctos
- [ ] **Test 1.7**: Stock y movimientos de inventario funcionan igual

#### Test Suite 2: Organizaciones sin Configuración
- [ ] **Test 2.1**: Organización sin `business_type` funciona con comportamiento por defecto
- [ ] **Test 2.2**: Formularios muestran solo campos comunes
- [ ] **Test 2.3**: Validaciones no requieren campos específicos

#### Test Suite 3: Licoreras (Funcionalidad Nueva)
- [ ] **Test 3.1**: Crear producto tipo licorera con todos los campos obligatorios
- [ ] **Test 3.2**: Validar rangos de grado alcohólico (0-100%)
- [ ] **Test 3.3**: Probar conversiones de volumen (ml a L)
- [ ] **Test 3.4**: Validar reportes con datos de licorería
- [ ] **Test 3.5**: Probar filtros por grado alcohólico y volumen
- [ ] **Test 3.6**: Campos de zapatos NO se muestran en licoreras

#### Test Suite 4: Coexistencia Multi-Tenant
- [ ] **Test 4.1**: Usuario de zapatería y licorera en el mismo sistema
- [ ] **Test 4.2**: Cambiar entre organizaciones muestra UI correcta
- [ ] **Test 4.3**: Reportes globales no cruzan datos entre organizaciones

### 8.2 Datos de Prueba
```typescript
// Productos de ejemplo para testing
const SAMPLE_LIQUOR_PRODUCTS = [
  {
    name: "Johnnie Walker Black Label",
    category: "Whisky",
    brand: "Johnnie Walker",
    alcoholGrade: 40,
    volume: 750,
    unitMeasure: "ml"
  },
  {
    name: "Bacardi Carta Blanca",
    category: "Ron",
    brand: "Bacardi",
    alcoholGrade: 37.5,
    volume: 1000,
    unitMeasure: "ml"
  },
  // ... más ejemplos ...
]
```

---

## 9. Documentación a Crear/Actualizar

### 9.1 Documentación Técnica
- [ ] `docs/LIQUOR_STORE_SETUP_GUIDE.md` - Guía de configuración inicial
- [ ] `docs/LIQUOR_STORE_FEATURES.md` - Características específicas
- [ ] Actualizar `CLAUDE.md` con información de licoreras
- [ ] Actualizar `README.md` con tipos de negocio soportados

### 9.2 Documentación de Usuario
- [ ] Manual de usuario para licoreras
- [ ] Guía de configuración de categorías y productos
- [ ] Ejemplos de reportes específicos

---

## 10. Estimación de Esfuerzo Total

| Fase | Duración | Prioridad | Dependencias |
|------|----------|-----------|--------------|
| Fase 1: Backend | 2-3 días | Alta | Ninguna |
| Fase 2: Frontend | 3-4 días | Alta | Fase 1 |
| Fase 3: Onboarding | 2 días | Media | Fase 1 |
| Fase 4: Validaciones | 2 días | Alta | Fase 1, 2 |
| Fase 5: Reportes | 3 días | Media | Fase 1, 2 |
| Fase 6: UX | 2 días | Baja | Fase 2 |
| Testing | 2 días | Alta | Todas |
| Documentación | 1 día | Media | Todas |

**Total estimado**: 17-20 días de desarrollo

---

## 11. Decisiones Arquitectónicas Clave

### 11.1 ✅ Decisión: NO cambiar el esquema de base de datos

**Razón**:
- El esquema actual ya es flexible y soporta ambos tipos de negocios
- Evita migraciones de datos complejas
- Mantiene la compatibilidad con datos existentes

### 11.2 ✅ Decisión: Usar SystemConfig para tipo de negocio

**Razón**:
- Más simple de implementar
- Usa infraestructura existente
- Permite configuración por organización
- No requiere cambios en el esquema

### 11.3 ✅ Decisión: Validaciones en capa de aplicación (no DB)

**Razón**:
- Mayor flexibilidad para diferentes tipos de negocio
- Permite validaciones contextuales
- Más fácil de mantener y actualizar

### 11.4 ⚠️ Decisión a Tomar: ¿Implementar Opción A (ProductType enum)?

**Pros**:
- Más explícito y tipado en el modelo
- Mejor para queries y reportes
- Preparado para más tipos de productos

**Contras**:
- Requiere migración de datos
- Mayor complejidad inicial

**Recomendación**: Implementar en una segunda iteración si el negocio lo requiere.

---

## 12. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación | Estado |
|--------|---------|--------------|------------|--------|
| ⚠️ **Validaciones rompen zapaterías existentes** | **CRÍTICO** | Media | Testing de regresión obligatorio + Validaciones condicionales | **MITIGADO** |
| Campos obligatorios afectan productos existentes | Alto | **ELIMINADO** | NO agregar campos obligatorios en DB, solo en app layer | **MITIGADO** |
| Confusión al editar productos sin configuración | Medio | Media | Comportamiento por defecto = sin validaciones extra | **MITIGADO** |
| Reportes específicos afectan rendimiento | Medio | Media | Optimización de queries, índices, lazy loading | PENDIENTE |
| Usuario cambia tipo de negocio por error | Bajo | Baja | Solo ADMIN, advertencia clara, confirmación | **MITIGADO** |
| Organizaciones existentes requieren configuración manual | Bajo | Alta | Documentación clara, página de configuración | ACEPTADO |

### Plan de Rollback de Emergencia

Si algo sale mal después del deploy:

1. **Paso 1**: Identificar el problema
   - ¿Zapaterías afectadas? → Prioridad CRÍTICA
   - ¿Solo licoreras? → Prioridad Media

2. **Paso 2**: Rollback inmediato (sin pérdida de datos)
   ```sql
   -- Deshabilitar validaciones de licoreras
   DELETE FROM system_configs WHERE key = 'business_type';
   ```
   **Efecto**: Todas las organizaciones vuelven al comportamiento por defecto.
   **Pérdida de datos**: NINGUNA (solo configuración, no datos de productos/ventas)

3. **Paso 3**: Revisión y corrección
   - Identificar bug en código
   - Corregir en ambiente de desarrollo
   - Re-testear con casos de regresión
   - Re-deploy con fix

### Criterios de Aceptación OBLIGATORIOS Antes de Deploy

- [ ] ✅ Todos los tests de regresión de zapaterías pasan (Test Suite 1)
- [ ] ✅ Validaciones condicionales funcionan correctamente
- [ ] ✅ Ningún cambio en esquema de base de datos
- [ ] ✅ Documentación actualizada
- [ ] ✅ Plan de rollback probado
- [ ] ✅ Aprobación de stakeholders (usuario de zapatería + usuario de licorera)

---

## 13. Roadmap Sugerido

### Sprint 1 (Semana 1-2): MVP Backend
- Fase 1: Configuración y parametrización
- Fase 4: Validaciones básicas
- Testing de backend

### Sprint 2 (Semana 3-4): Frontend Básico
- Fase 2: Formularios y vistas
- Fase 3: Onboarding
- Testing de integración

### Sprint 3 (Semana 5-6): Features Avanzados
- Fase 5: Reportes
- Fase 6: Mejoras UX
- Testing completo

### Sprint 4 (Semana 7): Pulido y Documentación
- Bugfixes
- Documentación
- Preparación para producción

---

## 14. Conclusiones y Recomendaciones

### 14.1 Conclusiones del Análisis

1. ✅ **El esquema de base de datos actual es ADECUADO** para licoreras sin cambios críticos
2. ✅ **NO se requieren migraciones de base de datos** para implementar el feature
3. ⚠️ **Se requieren cambios en validaciones** y lógica de negocio
4. ⚠️ **Se requieren cambios en UI/UX** para mostrar/ocultar campos según tipo de negocio

### 14.2 Recomendaciones Finales

1. **Comenzar con Fase 1 (Backend)** para establecer la base
2. **Usar SystemConfig** para tipo de negocio (más simple)
3. **Implementar validaciones condicionales** en server actions
4. **Crear componentes UI reutilizables** para campos específicos
5. **Priorizar testing** para evitar regresiones
6. **Documentar bien** para facilitar mantenimiento futuro

### 14.3 Siguiente Paso

Una vez aprobado este plan, se recomienda:
1. Crear tickets/issues en el sistema de gestión de proyectos
2. Asignar prioridades a cada fase
3. ⚠️ **NO usar database-architect agent** (no hay cambios en DB)
4. Comenzar con Fase 1 (Backend) usando el **pos-fullstack-dev agent**
5. Continuar con Fase 2 (Frontend) usando el **ui-ux-designer agent** + **pos-fullstack-dev agent**
6. **IMPORTANTE**: Testing de regresión con usuario de zapatería ANTES de cada deploy

---

## 15. Garantías de Compatibilidad

### Garantía 1: Sin Cambios en Base de Datos ✅
- ✅ NO se agregarán nuevas tablas
- ✅ NO se modificarán tablas existentes (sin ALTER TABLE)
- ✅ NO se agregarán campos obligatorios (NOT NULL)
- ✅ NO se modificarán tipos de datos existentes
- ✅ NO se eliminarán campos existentes
- ✅ Solo se usará tabla `SystemConfig` existente para configuración

### Garantía 2: Compatibilidad con Zapaterías ✅
- ✅ Formularios de productos funcionan exactamente igual si no hay configuración
- ✅ Validaciones originales se mantienen como fallback
- ✅ API de productos no cambia (backward compatible)
- ✅ Reportes existentes generan los mismos resultados
- ✅ Ninguna funcionalidad se elimina o degrada

### Garantía 3: Retrocompatibilidad Total ✅
- ✅ Código existente funciona sin modificaciones
- ✅ Organizaciones sin configuración = comportamiento por defecto
- ✅ Productos existentes no requieren migración
- ✅ Testing de regresión obligatorio antes de deploy

### Garantía 4: Rollback Sin Pérdida de Datos ✅
- ✅ Si hay problemas, se puede hacer rollback instantáneo
- ✅ Solo se eliminan configuraciones en `SystemConfig`
- ✅ CERO pérdida de datos de productos, ventas, inventario
- ✅ Sistema vuelve a comportamiento original

---

---

## 16. Resumen de Implementación Específica del Onboarding

### 16.1 Flujo Completo del Usuario Nuevo

```
1. Usuario se registra exitosamente
   ↓
2. Pasa al onboarding
   ↓
3. [NUEVO] Selecciona tipo de negocio (OBLIGATORIO)
   - Opción A: 🍺 Licorera / Tienda de Bebidas Alcohólicas
   - Opción B: 👟 Zapatería / Tienda de Calzado Deportivo
   ↓
4. Completa datos de la organización (nombre, NIT, dirección, etc.)
   ↓
5. Al crear la organización:
   a. Se crea el registro de Organization
   b. Se guarda `business_type` en SystemConfig
   c. Se crean categorías según tipo:
      - Si licorera: 15 categorías de licores
      - Si zapatería: 3 categorías (Hombres, Damas, Niños)
   d. Se crean marcas según tipo:
      - Si licorera: 17 marcas (7 nacionales + 10 internacionales)
      - Si zapatería: 3 marcas (NIKE, ADIDAS, PUMA)
   e. Se crean métodos de pago (comunes para ambos)
   ↓
6. Redirige al dashboard
```

### 16.2 Archivos Nuevos a Crear

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| `system-config.action.ts` | `src/actions/system-config/` | Server actions para SystemConfig con protección contra cambios de business_type |
| `index.ts` | `src/actions/system-config/` | Export barrel |
| `useSystemConfig.ts` | `src/hooks/` | Custom hooks para configuración (solo lectura para business_type) |
| `business-type/page.tsx` | `src/app/dashboard/settings/` | Página de visualización (OPCIONAL, solo lectura) |

### 16.3 Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/actions/organization/organization.action.ts` | - Agregar constantes LIQUOR_CATEGORIES<br>- Agregar LIQUOR_BRANDS_NATIONAL<br>- Agregar LIQUOR_BRANDS_INTERNATIONAL<br>- Modificar `createInitialConfigurations` (agregar parámetro businessType)<br>- Modificar `createOrganization` (agregar parámetro businessType) |
| `src/app/onboarding/page.tsx` | - Agregar campo Select para tipo de negocio<br>- Capturar y pasar businessType al crear organización |

### 16.4 Datos de Seed para Licoreras

#### Categorías (15 categorías)
```typescript
'Whisky', 'Ron', 'Vodka', 'Tequila', 'Ginebra', 'Aguardiente',
'Cerveza Nacional', 'Cerveza Importada', 'Vino Tinto', 'Vino Blanco',
'Vino Rosado', 'Champagne/Espumosos', 'Licores', 'Brandy/Cognac', 'Aperitivos'
```

#### Marcas Nacionales (7 marcas colombianas)
```typescript
'Aguardiente Antioqueño', 'Ron Viejo de Caldas', 'Club Colombia',
'Poker', 'Aguila', 'Pilsen', 'Tres Cordilleras'
```

#### Marcas Internacionales (10 marcas)
```typescript
'Johnnie Walker', 'Jack Daniels', 'Bacardi', 'Absolut', 'Smirnoff',
'Jose Cuervo', 'Heineken', 'Corona', 'Budweiser', 'Stella Artois'
```

### 16.5 Ejemplo de Registro en SystemConfig

```typescript
// Después de crear la organización, se guarda:
{
  organizationId: "org_abc123",
  key: "business_type",
  value: "liquor_store",  // o "shoe_store"
  type: "STRING",
  description: "Tipo de negocio de la organización",
  isDeleted: false,
  createdAt: "2025-10-22T...",
  updatedAt: "2025-10-22T..."
}
```

### 16.6 Validación en Formularios (Fase 2)

```typescript
// En componentes de productos (implementación posterior)
const { data: businessType } = useBusinessType();

// Renderizado condicional
{businessType === 'liquor_store' && (
  <>
    <FormField name="alcoholGrade" label="Grado Alcohólico (%)" required />
    <FormField name="volume" label="Volumen (ml)" required />
  </>
)}

{businessType === 'shoe_store' && (
  <>
    <FormField name="size" label="Talla" />
    <FormField name="color" label="Color" />
    <FormField name="model" label="Modelo" />
  </>
)}
```

### 16.7 Garantía de Retrocompatibilidad

**Para organizaciones existentes (zapaterías)**:
- NO tienen registro en SystemConfig con key `business_type`
- `getBusinessType(orgId)` retorna `null`
- Comportamiento = igual que antes (sin validaciones extra)
- Formularios muestran solo campos comunes
- Pueden seguir operando sin cambios

**Para organizaciones nuevas**:
- DEBEN seleccionar tipo de negocio en onboarding
- Se guarda en SystemConfig (PERMANENTE, no puede cambiarse)
- Categorías y marcas se crean automáticamente según tipo
- Validaciones y UI se adaptan según configuración

### 16.8 Protección contra Cambio de Tipo de Negocio

**Medidas implementadas para prevenir cambios**:

1. **En Server Action `updateSystemConfig`**:
   ```typescript
   if (key === 'business_type') {
     return { status: 403, message: 'No se puede cambiar el tipo de negocio...' };
   }
   ```

2. **En Hook `useUpdateSystemConfig`**:
   ```typescript
   if (key === 'business_type') {
     throw new Error('No se puede cambiar el tipo de negocio...');
   }
   ```

3. **En Hook `useSetBusinessType`**:
   ```typescript
   const existing = await getBusinessType(organizationId);
   if (existing) {
     throw new Error('El tipo de negocio ya fue configurado...');
   }
   ```

4. **En UI**: No existe página ni botón para cambiar tipo de negocio

**Si se requiere cambio en el futuro**:
- Debe hacerse mediante script SQL directo en base de datos
- Requiere aprobación de administrador del sistema
- Debe considerarse impacto en categorías, marcas y productos existentes
- NO es una operación de usuario final

---

**Documento creado**: 2025-10-22
**Versión**: 3.1 (business_type permanente e inmutable)
**Estado**: Listo para implementación
**Próxima revisión**: Después de Sprint 1

**Cambios en v3.1**:
- ✅ Tipo de negocio ahora es PERMANENTE (no puede cambiarse después del onboarding)
- ✅ Agregadas 3 capas de protección contra cambios de business_type
- ✅ Modificada página de configuración a solo lectura (opcional)
- ✅ Actualizado hook useSetBusinessType con validación de existencia
- ✅ Actualizado hook useUpdateSystemConfig con prevención de cambio
- ✅ Actualizado server action updateSystemConfig con validación

**Cambios en v3.0**:
- ✅ Agregada Fase 3 completa con implementación detallada de onboarding
- ✅ Definidas 15 categorías específicas para licoreras
- ✅ Definidas 17 marcas para licoreras (7 nacionales + 10 internacionales)
- ✅ Especificados archivos a crear y modificar
- ✅ Creado código completo para SystemConfig actions y hooks
- ✅ Definido flujo completo del usuario desde registro hasta dashboard
- ✅ Agregada sección de resumen de implementación específica

**Cambios anteriores en v2.0**:
- ✅ Agregada sección "RESTRICCIÓN CRÍTICA: CERO IMPACTO EN NEGOCIOS EXISTENTES"
- ✅ Descartada Opción A (campo `productType`) por requerir migración
- ✅ Enfatizado uso de validaciones condicionales (no por defecto)
- ✅ Actualizado plan de testing con casos de regresión para zapaterías
- ✅ Agregado plan de rollback de emergencia
- ✅ Agregadas garantías de compatibilidad explícitas
