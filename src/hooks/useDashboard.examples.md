# useDashboard Hook - Usage Examples

## Overview

The `useDashboard` hooks provide a complete set of TanStack Query-powered hooks for fetching and managing dashboard data in the POS system. All hooks implement automatic refresh every 5 minutes and proper error handling.

## Table of Contents

1. [Core Hooks](#core-hooks)
2. [Convenience Wrappers](#convenience-wrappers)
3. [Combined Dashboard Hook](#combined-dashboard-hook)
4. [Complete Examples](#complete-examples)

---

## Core Hooks

### 1. useKPIs

Fetches dashboard KPIs (Key Performance Indicators) comparing today with yesterday.

```typescript
import { useKPIs } from '@/hooks/useDashboard';
import { useStore } from '@/store';

function KPICards() {
  const user = useStore((state) => state.user);
  const { data, isLoading, error } = useKPIs(user?.organizationId, user?.storeId);

  if (isLoading) return <div>Loading KPIs...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">${data?.totalSales.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">
            {data?.salesChange}% from yesterday
          </p>
        </CardContent>
      </Card>
      {/* More cards... */}
    </div>
  );
}
```

**Return Type:** `DashboardKPIs`
```typescript
{
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  totalRevenue: number;
  salesChange?: number;
  transactionsChange?: number;
  averageTicketChange?: number;
}
```

---

### 2. useSalesByPeriod

Fetches sales data grouped by period for chart visualization.

```typescript
import { useSalesByPeriod } from '@/hooks/useDashboard';
import { LineChart } from '@/components/charts';

function SalesChart() {
  const user = useStore((state) => state.user);
  const { data, isLoading } = useSalesByPeriod(
    user?.organizationId,
    'week', // 'day' | 'week' | 'month' | 'year'
    user?.storeId
  );

  if (isLoading) return <ChartSkeleton />;

  return (
    <LineChart
      data={data || []}
      xKey="date"
      yKey="sales"
      title="Sales by Period"
    />
  );
}
```

**Return Type:** `SalesByPeriod[]`
```typescript
[
  {
    date: "2025-10-03",
    sales: 15000,
    transactions: 45,
    averageTicket: 333.33
  },
  // ...
]
```

---

### 3. useTopProducts

Fetches top selling products for a given period.

```typescript
import { useTopProducts } from '@/hooks/useDashboard';

function TopProductsList() {
  const user = useStore((state) => state.user);
  const { data, isLoading } = useTopProducts(
    user?.organizationId,
    'week', // 'today' | 'week' | 'month' | 'year'
    user?.storeId,
    5 // limit: number of products
  );

  if (isLoading) return <Skeleton count={5} />;

  return (
    <div className="space-y-2">
      {data?.map((product) => (
        <div key={product.productId} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {product.productImage && (
              <img src={product.productImage} alt={product.productName} className="w-10 h-10" />
            )}
            <div>
              <p className="font-medium">{product.productName}</p>
              <p className="text-sm text-muted-foreground">
                {product.quantitySold} units sold
              </p>
            </div>
          </div>
          <p className="font-bold">${product.totalRevenue.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

**Return Type:** `TopProduct[]`
```typescript
[
  {
    productId: "uuid",
    productName: "Product Name",
    productImage: "https://...",
    quantitySold: 150,
    totalRevenue: 45000,
    numberOfSales: 75,
    percentageOfTotal: 25.5,
    categoryName: "Category",
    brandName: "Brand"
  },
  // ...
]
```

---

### 4. useStockAlerts

Fetches products with low stock warnings.

```typescript
import { useStockAlerts } from '@/hooks/useDashboard';
import { IconAlertTriangle } from '@tabler/icons-react';

function StockAlertsList() {
  const user = useStore((state) => state.user);
  const { data, isLoading } = useStockAlerts(user?.organizationId, user?.storeId);

  if (isLoading) return <div>Loading alerts...</div>;

  const criticalAlerts = data?.filter((alert) => alert.severity === 'critical');

  return (
    <div className="space-y-2">
      {criticalAlerts?.map((alert) => (
        <div key={alert.productId} className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
          <IconAlertTriangle className="text-red-500" size={20} />
          <div className="flex-1">
            <p className="font-medium">{alert.productName}</p>
            <p className="text-sm text-muted-foreground">
              Stock: {alert.currentStock} / Min: {alert.minStock}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Return Type:** `StockAlert[]`
```typescript
[
  {
    productId: "uuid",
    productName: "Product Name",
    currentStock: 5,
    minStock: 20,
    stockDifference: -15,
    percentageRemaining: 25,
    severity: "critical" | "warning" | "info",
    categoryName: "Category",
    sku: "SKU-001"
  },
  // ...
]
```

---

### 5. useCashStatus

Fetches cash register status by payment method.

```typescript
import { useCashStatus } from '@/hooks/useDashboard';
import { PieChart } from '@/components/charts';

function CashStatusChart() {
  const user = useStore((state) => state.user);
  const { data, isLoading } = useCashStatus(
    user?.organizationId,
    user?.storeId,
    new Date().toISOString() // optional date
  );

  if (isLoading) return <ChartSkeleton />;

  return (
    <div>
      <h3>Payment Methods Distribution</h3>
      <PieChart
        data={data?.map((item) => ({
          name: item.paymentMethodName,
          value: item.totalAmount,
        })) || []}
      />
      <div className="mt-4">
        {data?.map((method) => (
          <div key={method.paymentMethodId} className="flex justify-between">
            <span>{method.paymentMethodName}</span>
            <span className="font-bold">${method.totalAmount.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">
              {method.percentageOfTotal.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Return Type:** `CashStatus[]`
```typescript
[
  {
    paymentMethodId: "uuid",
    paymentMethodName: "Cash",
    paymentType: "CASH",
    totalAmount: 25000,
    transactionCount: 45,
    percentageOfTotal: 60,
    averageTransactionAmount: 555.56
  },
  // ...
]
```

---

## Convenience Wrappers

### Period-Specific Sales Hooks

```typescript
// Weekly sales (wrapper for useSalesByPeriod)
const { data: weeklySales } = useWeeklySales(organizationId, storeId);

// Monthly sales
const { data: monthlySales } = useMonthlySales(organizationId, storeId);

// Yearly sales
const { data: yearlySales } = useYearlySales(organizationId, storeId);
```

### Period-Specific Top Products Hooks

```typescript
// Today's top products
const { data: todayTop } = useTodayTopProducts(organizationId, storeId, 10);

// Weekly top products
const { data: weeklyTop } = useWeeklyTopProducts(organizationId, storeId, 10);

// Monthly top products
const { data: monthlyTop } = useMonthlyTopProducts(organizationId, storeId, 10);
```

### Today-Specific Hooks

```typescript
// Today's KPIs
const { data: todayKPIs } = useTodayKPIs(organizationId, storeId);

// Today's cash status
const { data: todayCash } = useTodayCashStatus(organizationId, storeId);
```

---

## Combined Dashboard Hook

### useDashboardData

Fetches all dashboard data in parallel with a single hook.

```typescript
import { useDashboardData } from '@/hooks/useDashboard';
import { useStore } from '@/store';

function CompleteDashboard() {
  const user = useStore((state) => state.user);

  const {
    kpis,
    salesByPeriod,
    topProducts,
    stockAlerts,
    cashStatus,
    isLoading,
    error,
  } = useDashboardData(
    user?.organizationId,
    user?.storeId,
    'week' // period: 'day' | 'week' | 'month' | 'year'
  );

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div className="grid gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard title="Total Sales" value={kpis.data?.totalSales} />
        <KPICard title="Transactions" value={kpis.data?.totalTransactions} />
        <KPICard title="Avg Ticket" value={kpis.data?.averageTicket} />
      </div>

      {/* Sales Chart */}
      <SalesChart data={salesByPeriod.data} />

      {/* Top Products & Stock Alerts */}
      <div className="grid grid-cols-2 gap-4">
        <TopProductsList data={topProducts.data} />
        <StockAlertsList data={stockAlerts.data} />
      </div>

      {/* Cash Status */}
      <CashStatusChart data={cashStatus.data} />
    </div>
  );
}
```

### Period-Specific Combined Hooks

```typescript
// Today's complete dashboard
const todayDashboard = useTodayDashboard(organizationId, storeId);

// Weekly complete dashboard
const weeklyDashboard = useWeeklyDashboard(organizationId, storeId);

// Monthly complete dashboard
const monthlyDashboard = useMonthlyDashboard(organizationId, storeId);

// Yearly complete dashboard
const yearlyDashboard = useYearlyDashboard(organizationId, storeId);
```

---

## Complete Examples

### Example 1: Dashboard Page with Period Selector

```typescript
'use client';

import { useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboard';
import { useStore } from '@/store';
import { Select } from '@/components/ui/select';

type Period = 'day' | 'week' | 'month' | 'year';

export default function DashboardPage() {
  const user = useStore((state) => state.user);
  const [period, setPeriod] = useState<Period>('week');

  const {
    kpis,
    salesByPeriod,
    topProducts,
    stockAlerts,
    cashStatus,
    isLoading,
    error,
  } = useDashboardData(user?.organizationId, user?.storeId, period);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </Select>
      </div>

      {isLoading && <DashboardSkeleton />}
      {error && <ErrorAlert message={error.message} />}

      {!isLoading && !error && (
        <DashboardContent
          kpis={kpis.data}
          sales={salesByPeriod.data}
          topProducts={topProducts.data}
          stockAlerts={stockAlerts.data}
          cashStatus={cashStatus.data}
        />
      )}
    </div>
  );
}
```

### Example 2: Real-time Dashboard with Auto-refresh Indicator

```typescript
'use client';

import { useWeeklyDashboard, useInvalidateDashboard } from '@/hooks/useDashboard';
import { useStore } from '@/store';
import { IconRefresh } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

export default function RealtimeDashboard() {
  const user = useStore((state) => state.user);
  const invalidate = useInvalidateDashboard();

  const {
    kpis,
    salesByPeriod,
    topProducts,
    stockAlerts,
    cashStatus,
    isLoading,
  } = useWeeklyDashboard(user?.organizationId, user?.storeId);

  const handleManualRefresh = () => {
    invalidate();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Dashboard</h1>
        <Button onClick={handleManualRefresh} variant="outline" size="sm">
          <IconRefresh size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Dashboard content */}
      <DashboardGrid
        kpis={kpis.data}
        sales={salesByPeriod.data}
        topProducts={topProducts.data}
        stockAlerts={stockAlerts.data}
        cashStatus={cashStatus.data}
      />

      <p className="text-xs text-muted-foreground mt-4">
        Auto-refreshes every 5 minutes
      </p>
    </div>
  );
}
```

### Example 3: Multi-Store Dashboard Selector

```typescript
'use client';

import { useState } from 'react';
import { useWeeklyDashboard } from '@/hooks/useDashboard';
import { useStores } from '@/hooks/useStores';
import { useStore } from '@/store';
import { Select } from '@/components/ui/select';

export default function MultiStoreDashboard() {
  const user = useStore((state) => state.user);
  const { data: stores } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const dashboard = useWeeklyDashboard(user?.organizationId, selectedStoreId);

  return (
    <div className="p-6">
      <div className="mb-6">
        <Select
          value={selectedStoreId || 'all'}
          onValueChange={(v) => setSelectedStoreId(v === 'all' ? null : v)}
        >
          <option value="all">All Stores</option>
          {stores?.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </Select>
      </div>

      {dashboard.isLoading && <Skeleton />}

      {!dashboard.isLoading && (
        <DashboardContent
          kpis={dashboard.kpis.data}
          sales={dashboard.salesByPeriod.data}
          topProducts={dashboard.topProducts.data}
          stockAlerts={dashboard.stockAlerts.data}
          cashStatus={dashboard.cashStatus.data}
        />
      )}
    </div>
  );
}
```

---

## Hook Configuration

All hooks use the following TanStack Query configuration:

```typescript
{
  staleTime: 5 * 60 * 1000,      // Data is fresh for 5 minutes
  refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  enabled: !!organizationId,      // Only runs when orgId exists
}
```

### Manual Invalidation

```typescript
import { useInvalidateDashboard } from '@/hooks/useDashboard';

function MyComponent() {
  const invalidate = useInvalidateDashboard();

  const handleUpdate = async () => {
    // Update some data...
    await updateSomething();

    // Invalidate all dashboard queries
    invalidate();
  };
}
```

---

## TypeScript Types

All return types are fully typed using interfaces from `@/interfaces/dashboard`:

- `DashboardKPIs` - KPI metrics
- `SalesByPeriod[]` - Sales data array
- `TopProduct[]` - Top products array
- `StockAlert[]` - Stock alerts array
- `CashStatus[]` - Cash status array
- `DashboardDataResult` - Combined dashboard result

---

## Error Handling

All hooks throw errors that can be caught by error boundaries or handled inline:

```typescript
const { data, error, isError } = useKPIs(organizationId, storeId);

if (isError) {
  return <ErrorMessage error={error} />;
}
```

Common errors:
- `"Organization ID is required"` - When organizationId is missing
- Server action errors - From the dashboard actions themselves

---

## Performance Notes

1. **Parallel Fetching**: `useDashboardData` fetches all queries in parallel for optimal performance
2. **Auto-refresh**: All queries auto-refresh every 5 minutes to keep data fresh
3. **Smart Caching**: TanStack Query caches data for 5 minutes (staleTime)
4. **Conditional Queries**: Queries only run when `organizationId` is provided
5. **Query Invalidation**: Use `useInvalidateDashboard()` to manually refresh all dashboard data

---

## Migration from Old Code

If you have existing dashboard fetching logic:

**Before:**
```typescript
const [kpis, setKpis] = useState(null);

useEffect(() => {
  getDashboardKPIs(orgId, storeId).then(res => {
    if (res.status === 200) setKpis(res.data);
  });
}, [orgId, storeId]);
```

**After:**
```typescript
const { data: kpis, isLoading } = useKPIs(orgId, storeId);
```

Benefits:
- Automatic caching and refetching
- Loading and error states built-in
- Auto-refresh every 5 minutes
- TypeScript type safety
- Query key management handled automatically
