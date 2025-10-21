# Guía de Solución de Problemas: Gráficas con Recharts

Esta guía documenta problemas comunes y sus soluciones al trabajar con gráficas Recharts en el sistema POS.

---

## 📊 Problema 1: BarChart Horizontal no Muestra Datos

### Síntoma
Un `BarChart` configurado con barras horizontales (que crecen de izquierda a derecha) no muestra las barras o los datos no son visibles.

### Causa Raíz
**Error común**: Usar `layout="horizontal"` para crear barras horizontales.

En la API de Recharts, los valores de `layout` pueden ser **contraintuitivos**:
- `layout="horizontal"` → Crea barras **verticales** (crecen de abajo hacia arriba)
- `layout="vertical"` → Crea barras **horizontales** (crecen de izquierda a derecha)

### ❌ Código Incorrecto

```typescript
<BarChart data={data} layout="horizontal">
  <XAxis type="number" />
  <YAxis type="category" dataKey="productName" />
  <Bar dataKey="value" fill="#8884d8" />
</BarChart>
```

### ✅ Código Correcto

```typescript
<BarChart data={data} layout="vertical" margin={{ left: 20 }}>
  <XAxis type="number" />
  <YAxis type="category" dataKey="productName" />
  <Bar dataKey="value" fill="#8884d8" />
</BarChart>
```

### Configuración Completa para Barras Horizontales

```typescript
<ResponsiveContainer width="100%" height={400}>
  <BarChart
    data={chartData}
    layout="vertical"      // CRÍTICO: "vertical" para barras horizontales
    margin={{ left: 20 }}  // Espacio para etiquetas del eje Y
  >
    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />

    {/* XAxis muestra los valores numéricos (horizontal) */}
    <XAxis
      type="number"
      className="text-xs"
      tick={{ fill: 'hsl(var(--muted-foreground))' }}
      tickFormatter={(value: number) => `${value.toFixed(0)}%`}
    />

    {/* YAxis muestra las categorías/nombres (vertical) */}
    <YAxis
      type="category"
      dataKey="productName"
      className="text-xs"
      tick={{ fill: 'hsl(var(--muted-foreground))' }}
      width={150}  // Ancho suficiente para nombres largos
    />

    <Tooltip />

    <Bar
      dataKey="margin"
      fill="hsl(var(--primary))"
      radius={[0, 4, 4, 0]}  // Bordes redondeados a la derecha
    />
  </BarChart>
</ResponsiveContainer>
```

### Tabla de Referencia Rápida

| Tipo de Barras Deseado | Layout a Usar | XAxis Type | YAxis Type | Radius |
|------------------------|---------------|------------|------------|--------|
| **Horizontales** (←→)  | `vertical`    | `number`   | `category` | `[0, 4, 4, 0]` |
| **Verticales** (↑↓)    | `horizontal`  | `category` | `number`   | `[4, 4, 0, 0]` |

### Ejemplo en el Proyecto

**Referencia**: `src/app/dashboard/reports/sales/by-product/page.tsx` (línea 245)

```typescript
<BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
  <XAxis type="number" />
  <YAxis type="category" dataKey="name" width={100} />
  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
</BarChart>
```

---

## 🎨 Problema 2: Gráfica sin Colores Dinámicos

### Síntoma
Todas las barras o segmentos de la gráfica tienen el mismo color, sin diferenciación visual entre elementos.

### Causa Raíz
El componente `<Bar>`, `<Pie>`, o `<Area>` usa un solo color fijo definido en el prop `fill`.

### ❌ Código Incorrecto (Color Único)

```typescript
<Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
```

**Resultado**: Todas las barras tienen el mismo color primario.

### ✅ Solución: Usar `<Cell>` para Colores Dinámicos

#### Paso 1: Definir Paleta de Colores

```typescript
// Paleta de colores (definir fuera del componente o en constantes)
const chartColors = [
  'hsl(142 76% 36%)', // verde
  'hsl(217 91% 60%)', // azul
  'hsl(262 83% 58%)', // púrpura
  'hsl(47 96% 53%)',  // amarillo
  'hsl(0 84% 60%)',   // rojo
];
```

#### Paso 2: Aplicar Colores con `<Cell>` en BarChart

```typescript
import { Bar, BarChart, Cell } from 'recharts';

<Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
  {data.map((entry, index) => (
    <Cell
      key={`cell-${index}`}
      fill={chartColors[index % chartColors.length]}
    />
  ))}
</Bar>
```

#### Paso 3: Aplicar Colores con `<Cell>` en PieChart

```typescript
import { Pie, PieChart, Cell } from 'recharts';

<Pie
  data={pieData}
  cx="50%"
  cy="50%"
  outerRadius={120}
  dataKey="value"
>
  {pieData.map((entry, index) => (
    <Cell
      key={`cell-${index}`}
      fill={chartColors[index % chartColors.length]}
    />
  ))}
</Pie>
```

### Ejemplos Completos del Proyecto

#### BarChart con Colores Dinámicos

**Referencia**: `src/app/dashboard/reports/financial/profitability/page.tsx` (líneas 342-349)

```typescript
const chartColors = [
  'hsl(142 76% 36%)', // green
  'hsl(217 91% 60%)', // blue
  'hsl(262 83% 58%)', // purple
  'hsl(47 96% 53%)',  // yellow
  'hsl(0 84% 60%)',   // red
];

<Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
  {topProductsByRevenue.map((_, index) => (
    <Cell
      key={`cell-${index}`}
      fill={chartColors[index % chartColors.length]}
    />
  ))}
</Bar>
```

#### PieChart con Colores Dinámicos

**Referencia**: `src/app/dashboard/reports/sales/by-category/page.tsx` (líneas 235-237)

```typescript
const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

<Pie
  data={pieChartData}
  cx="50%"
  cy="50%"
  outerRadius={120}
  fill="#8884d8"
  dataKey="value"
>
  {pieChartData.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
  ))}
</Pie>
```

### Colores Usando Variables CSS del Theme

Para mantener consistencia con el tema (light/dark mode), usar variables CSS:

```typescript
const themeColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];
```

Estas variables están definidas en `src/app/globals.css` y se ajustan automáticamente según el tema.

### Colores Condicionales Basados en Datos

Para aplicar colores basados en valores (ej: verde para positivo, rojo para negativo):

```typescript
<Bar dataKey="margin" radius={[0, 4, 4, 0]}>
  {data.map((entry, index) => {
    const color = entry.margin > 30
      ? 'hsl(142 76% 36%)'  // verde para margen >30%
      : entry.margin > 15
      ? 'hsl(217 91% 60%)'  // azul para margen >15%
      : 'hsl(0 84% 60%)';   // rojo para margen <15%

    return <Cell key={`cell-${index}`} fill={color} />;
  })}
</Bar>
```

---

## 🛠️ Mejores Prácticas para Recharts

### 1. Estructura de Datos

Asegurar que los datos tengan la estructura correcta:

```typescript
// ✅ Correcto
const data = [
  { name: 'Producto A', value: 100, margin: 25 },
  { name: 'Producto B', value: 200, margin: 30 },
];

// ❌ Incorrecto (valores undefined o null)
const data = [
  { name: 'Producto A', value: undefined },
  { name: null, value: 200 },
];
```

### 2. Responsive Container

Siempre envolver gráficas en `<ResponsiveContainer>`:

```typescript
<ResponsiveContainer width="100%" height={400}>
  <BarChart data={data}>
    {/* ... */}
  </BarChart>
</ResponsiveContainer>
```

### 3. Tipado TypeScript

Tipar correctamente los datos de las gráficas:

```typescript
interface ChartData {
  name: string;
  value: number;
  margin?: number;
}

const chartData: ChartData[] = [
  { name: 'Producto A', value: 100, margin: 25 },
];
```

### 4. Tooltips Personalizados

Crear tooltips informativos:

```typescript
<Tooltip
  content={({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.name}</p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-medium">{data.value}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }}
/>
```

### 5. Formateo de Números

Usar formatters para mejorar la legibilidad:

```typescript
// Para moneda
<XAxis
  tickFormatter={(value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value)
  }
/>

// Para números compactos
<YAxis
  tickFormatter={(value: number) =>
    new Intl.NumberFormat('es-CO', {
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value)
  }
/>

// Para porcentajes
<XAxis
  tickFormatter={(value: number) => `${value.toFixed(0)}%`}
/>
```

---

## 🔍 Checklist de Depuración

Cuando una gráfica no funciona correctamente, verificar:

- [ ] **Datos**: ¿Tienen la estructura correcta? ¿Hay valores undefined/null?
- [ ] **Layout**: ¿Está usando el layout correcto para el tipo de gráfica?
  - Barras horizontales → `layout="vertical"`
  - Barras verticales → `layout="horizontal"`
- [ ] **Axis Types**: ¿Los tipos de XAxis y YAxis coinciden con el layout?
  - Horizontal: XAxis=`number`, YAxis=`category`
  - Vertical: XAxis=`category`, YAxis=`number`
- [ ] **DataKey**: ¿El dataKey existe en los objetos de datos?
- [ ] **Colores**: ¿Está usando `<Cell>` para colores dinámicos?
- [ ] **Height**: ¿El ResponsiveContainer tiene altura definida?
- [ ] **Imports**: ¿Están importados todos los componentes necesarios de Recharts?

---

## 📚 Referencias

### Documentación Oficial
- [Recharts Documentation](https://recharts.org/)
- [BarChart Examples](https://recharts.org/en-US/api/BarChart)
- [PieChart Examples](https://recharts.org/en-US/api/PieChart)

### Ejemplos en el Proyecto
- BarChart horizontal: `src/app/dashboard/reports/sales/by-product/page.tsx`
- BarChart vertical: `src/app/dashboard/reports/sales/detailed/page.tsx`
- PieChart con colores: `src/app/dashboard/reports/sales/by-category/page.tsx`
- Colores dinámicos: `src/app/dashboard/reports/financial/profitability/page.tsx`

### Variables de Color del Theme
Ver `src/app/globals.css` para:
- `--chart-1` a `--chart-5`: Colores para gráficas
- `--primary`: Color primario del sistema
- `--muted-foreground`: Color para textos secundarios

---

## 🐛 Casos de Uso Resueltos

### Caso 1: Gráfica de Rentabilidad (Octubre 2025)

**Archivo**: `src/app/dashboard/reports/financial/profitability/page.tsx`

**Problemas**:
1. BarChart horizontal no mostraba barras (usaba `layout="horizontal"`)
2. Gráfica de ingresos sin colores (faltaba `<Cell>` components)

**Soluciones aplicadas**:
- Línea 208: Cambio de `layout="horizontal"` → `layout="vertical"`
- Línea 208: Agregado `margin={{ left: 20 }}`
- Líneas 342-349: Implementación de `<Cell>` para colores dinámicos

**Resultado**: Ambas gráficas funcionando correctamente con colores distintivos.

---

**Última actualización**: 2025-10-20
**Mantenedor**: Sistema POS - Equipo de Desarrollo
**Versión del documento**: 1.0
