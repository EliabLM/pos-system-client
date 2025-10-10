# Dashboard Actions

Server actions for calculating and retrieving dashboard metrics and analytics.

## Available Actions

### `getDashboardKPIs`

Calculates the main KPIs for the dashboard by comparing today's sales with yesterday's.

**Function Signature:**
```typescript
getDashboardKPIs(
  organizationId: string,
  storeId?: string | null
): Promise<ActionResponse<DashboardKPIs>>
```

**Parameters:**
- `organizationId` (required): The organization ID to filter sales
- `storeId` (optional): Optional store ID to filter sales by specific store. If not provided, aggregates all stores.

**Returns:**
`ActionResponse<DashboardKPIs>` with the following data:

```typescript
{
  totalSales: number;           // Today's total sales amount
  totalRevenue: number;         // Alias for totalSales
  totalTransactions: number;    // Today's number of transactions
  averageTicket: number;        // Today's average sale amount
  salesChange: number;          // Percentage change vs yesterday
  transactionsChange: number;   // Percentage change vs yesterday
  averageTicketChange: number;  // Percentage change vs yesterday
}
```

**Business Rules:**
- Only counts sales with status = `PAID`
- Filters out soft-deleted sales (`isDeleted = false`)
- Uses `saleDate` field for date filtering
- Compares today's sales (00:00:00 to 23:59:59) with yesterday's sales
- Handles division by zero gracefully (returns 0 or 100 based on context)
- Percentage changes are rounded to 2 decimal places

**Usage Example:**

```typescript
import { getDashboardKPIs } from '@/actions/dashboard';

// Get KPIs for entire organization
const response = await getDashboardKPIs('org-123');

if (response.status === 200) {
  console.log('Total Sales Today:', response.data.totalSales);
  console.log('Sales Change:', response.data.salesChange + '%');
}

// Get KPIs for specific store
const storeResponse = await getDashboardKPIs('org-123', 'store-456');
```

**Error Handling:**
- Returns 400 if organization ID is empty
- Returns 500 on internal server errors
- Logs all errors to console

**Performance:**
- Uses `Promise.all` to execute today's and yesterday's queries in parallel
- Uses Prisma aggregations for efficient calculations
- No data is fetched unnecessarily, only aggregated metrics
