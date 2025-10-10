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

---

### `getSalesByPeriod`

Retrieves sales data grouped by different time periods for chart visualization.

**Function Signature:**
```typescript
getSalesByPeriod(
  organizationId: string,
  period: 'day' | 'week' | 'month' | 'year',
  storeId?: string | null,
  referenceDate?: string
): Promise<ActionResponse<SalesByPeriod[]>>
```

**Parameters:**
- `organizationId` (required): The organization ID to filter sales
- `period` (required): Time period for grouping data:
  - `'day'`: Last 24 hours grouped by hour (0-23)
  - `'week'`: Last 7 days grouped by day
  - `'month'`: Last 30 days grouped by day
  - `'year'`: Last 12 months grouped by month
- `storeId` (optional): Optional store ID to filter sales by specific store
- `referenceDate` (optional): ISO date string (YYYY-MM-DD) as reference point. Defaults to today.

**Returns:**
`ActionResponse<SalesByPeriod[]>` with array of sales data:

```typescript
{
  date: string;           // ISO date string (e.g., "2025-10-09" or "2025-10-09 14:00")
  sales: number;          // Total sales amount for this period
  transactions: number;   // Count of transactions
  averageTicket: number;  // Average sale amount (sales / transactions)
}
```

**Period Logic:**

1. **'day'** - Last 24 hours grouped by hour:
   - Date range: Last 24 hours from reference date
   - Keys: "2025-10-09 00:00", "2025-10-09 01:00", ..., "2025-10-09 23:00"
   - All 24 hours included (even with zero sales)

2. **'week'** - Last 7 days grouped by day:
   - Date range: Last 7 days from reference date
   - Keys: "2025-10-03", "2025-10-04", ..., "2025-10-09"
   - All 7 days included (even with zero sales)

3. **'month'** - Last 30 days grouped by day:
   - Date range: Last 30 days from reference date
   - Keys: "2025-09-09", "2025-09-10", ..., "2025-10-09"
   - All 30 days included (even with zero sales)

4. **'year'** - Last 12 months grouped by month:
   - Date range: Last 12 months from reference date
   - Keys: "2024-10-01", "2024-11-01", ..., "2025-10-01"
   - All 12 months included (even with zero sales)

**Business Rules:**
- Only counts sales with status = `PAID`
- Filters out soft-deleted sales (`isDeleted = false`)
- Uses `saleDate` field for date filtering
- Initializes all periods with zero values (gaps show as zero)
- Converts Prisma Decimal fields to numbers
- Handles division by zero for averageTicket calculation
- Results are sorted chronologically (ascending)

**Usage Examples:**

```typescript
import { getSalesByPeriod } from '@/actions/dashboard';

// Get sales for last 7 days (entire organization)
const weekResponse = await getSalesByPeriod('org-123', 'week');

if (weekResponse.status === 200) {
  weekResponse.data.forEach(period => {
    console.log(`${period.date}: $${period.sales} (${period.transactions} transactions)`);
  });
}

// Get sales for last 24 hours for specific store
const dayResponse = await getSalesByPeriod('org-123', 'day', 'store-456');

// Get sales for last 30 days from a specific date
const monthResponse = await getSalesByPeriod(
  'org-123',
  'month',
  null,
  '2025-09-15'
);

// Get yearly sales (last 12 months)
const yearResponse = await getSalesByPeriod('org-123', 'year');
```

**Data Grouping Implementation:**
Since Prisma doesn't have native date grouping functions like SQL's DATE_TRUNC, the implementation:
1. Queries all sales within the calculated date range
2. Uses date-fns functions to group sales in JavaScript/TypeScript
3. Creates intervals for all periods (ensuring zero values for gaps)
4. Accumulates sales data into a Map by period key
5. Converts to array and sorts chronologically

**Error Handling:**
- Returns 400 if organization ID is empty
- Returns 400 if period is invalid
- Returns 400 if referenceDate has invalid ISO format
- Returns 500 on internal server errors
- Logs all errors to console

**Performance Considerations:**
- Single database query fetches all sales in range
- In-memory grouping using Map for O(n) performance
- Pre-initializes all periods to ensure complete data set
- Minimal data selected (saleDate, total, id only)
- Efficient date-fns operations for grouping

---

### `getTopProducts`

Retrieves the best-selling products with detailed metrics for a given period.

**Function Signature:**
```typescript
getTopProducts(
  organizationId: string,
  period: 'today' | 'week' | 'month' | 'year',
  storeId?: string | null,
  limit: number = 10
): Promise<ActionResponse<TopProduct[]>>
```

**Parameters:**
- `organizationId` (required): The organization ID to filter sales
- `period` (required): Time period for analysis:
  - `'today'`: From start of today to end of today
  - `'week'`: Last 7 days from today
  - `'month'`: Last 30 days from today
  - `'year'`: Last 365 days from today
- `storeId` (optional): Optional store ID to filter sales by specific store
- `limit` (optional): Maximum number of top products to return. Defaults to 10. Must be positive integer.

**Returns:**
`ActionResponse<TopProduct[]>` with array of best-selling products:

```typescript
{
  productId: string;
  productName: string;
  productImage: string | null;
  quantitySold: number;          // Total units sold
  totalRevenue: number;          // Total income from this product
  numberOfSales: number;         // Count of unique transactions
  percentageOfTotal: number;     // Percentage of total revenue (0-100)

  // Optional product details
  categoryName?: string;
  brandName?: string;
  currentStock?: number;
}
```

**Period Calculation:**
- `'today'`: Uses `startOfDay(today)` to `endOfDay(today)`
- `'week'`: Uses `startOfDay(subDays(today, 7))` to `endOfDay(today)`
- `'month'`: Uses `startOfDay(subDays(today, 30))` to `endOfDay(today)`
- `'year'`: Uses `startOfDay(subDays(today, 365))` to `endOfDay(today)`

**Business Rules:**
- Only counts sales with status = `PAID`
- Filters out soft-deleted sales (`sale.isDeleted = false`)
- Filters out soft-deleted sale items (`saleItem.isDeleted = false`)
- Filters out soft-deleted products (`product.isDeleted = false`)
- Uses `sale.saleDate` field for date filtering
- Groups sale items by `productId` for aggregation
- Calculates metrics from `SaleItem` records with related `Sale` and `Product` data

**Metrics Calculation:**

1. **quantitySold**: Sum of `saleItem.quantity` for each product
2. **totalRevenue**: Sum of `saleItem.subtotal` for each product
3. **numberOfSales**: Count of unique `saleId` values (using Set for deduplication)
4. **profitMargin** (internal): Sum of `(product.salePrice - product.costPrice) * saleItem.quantity`
5. **percentageOfTotal**: `(productRevenue / totalRevenue) * 100`, rounded to 2 decimals

**Data Retrieval:**
- Queries `SaleItem` with Prisma `include`:
  - `sale` (filtered by date range, organization, store, status, isDeleted)
  - `product` (includes category and brand)
  - `product.category` (for categoryName)
  - `product.brand` (for brandName)

**Sorting and Limiting:**
- Products sorted by `totalRevenue` in descending order (highest revenue first)
- Returns top N products based on `limit` parameter
- If fewer products exist than limit, returns all available products

**Usage Examples:**

```typescript
import { getTopProducts } from '@/actions/dashboard';

// Get top 10 products for today (entire organization)
const todayResponse = await getTopProducts('org-123', 'today');

if (todayResponse.status === 200) {
  todayResponse.data.forEach((product, index) => {
    console.log(`#${index + 1}: ${product.productName}`);
    console.log(`  Revenue: $${product.totalRevenue}`);
    console.log(`  Units Sold: ${product.quantitySold}`);
    console.log(`  % of Total: ${product.percentageOfTotal.toFixed(2)}%`);
  });
}

// Get top 5 products for last week in specific store
const weekResponse = await getTopProducts('org-123', 'week', 'store-456', 5);

// Get top 20 products for last month (all stores)
const monthResponse = await getTopProducts('org-123', 'month', null, 20);

// Get top products for last year
const yearResponse = await getTopProducts('org-123', 'year');
```

**Implementation Details:**

1. **Validation**: Validates organizationId and sanitizes limit to positive integer
2. **Date Range**: Calculates startDate and endDate based on period parameter
3. **Query**: Fetches all matching SaleItems with related Sale and Product data
4. **Grouping**: Uses Map to group by productId and accumulate metrics in-memory
5. **Aggregation**: For each product:
   - Sums quantities and subtotals
   - Uses Set to count unique sales (prevents double-counting split payments)
   - Calculates profit margins from price differences
6. **Percentage Calculation**: Computes total revenue first, then calculates each product's percentage
7. **Sorting**: Sorts by totalRevenue descending
8. **Limiting**: Slices array to requested limit

**Edge Cases:**
- **No sales in period**: Returns empty array with 200 status and appropriate message
- **Division by zero**: When totalRevenue = 0, percentageOfTotal is set to 0
- **Missing product details**: Handles null/undefined for category/brand gracefully
- **Deleted products**: Excluded by `product.isDeleted = false` filter
- **Invalid limit**: Sanitized to minimum of 1

**Error Handling:**
- Returns 400 if organization ID is empty
- Returns 500 on internal server errors
- Logs all errors to console
- Handles Prisma Decimal type conversion to Number

**Performance Considerations:**
- Single database query fetches all required data with joins
- In-memory grouping using Map for O(n) performance
- Uses Set for efficient unique sale counting
- Prisma include strategy minimizes N+1 queries
- Percentage calculation done after grouping (single pass)
- Sorting performed on aggregated data (smaller dataset)

**Type Safety:**
- Handles Prisma Decimal types by converting to Number
- Properly types the productMap with explicit generic
- Returns strongly-typed TopProduct[] array
- All fields match TopProduct interface from @/interfaces/dashboard

**Multi-tenancy:**
- Scoped to organizationId (required filter)
- Optional storeId filter for single-store analysis
- Ensures data isolation between organizations

---

### `getCashStatus`

Calculates cash register status by payment method for a specific date. Groups all sale payments by payment method and provides detailed financial metrics for cash register reconciliation.

**Function Signature:**
```typescript
getCashStatus(
  organizationId: string,
  storeId?: string | null,
  date?: string
): Promise<ActionResponse<CashStatus[]>>
```

**Parameters:**
- `organizationId` (required): The organization ID to filter sales
- `storeId` (optional): Optional store ID to filter sales by specific store
- `date` (optional): ISO date string (YYYY-MM-DD) to analyze. Defaults to today if not provided.

**Returns:**
`ActionResponse<CashStatus[]>` with array of payment method metrics:

```typescript
{
  paymentMethodId: string;
  paymentMethodName: string;
  paymentType: 'CASH' | 'CARD' | 'TRANSFER' | 'CREDIT' | 'CHECK' | 'OTHER';
  totalAmount: number;                 // Total collected via this method
  transactionCount: number;            // Number of payment transactions
  percentageOfTotal: number;           // Percentage of total cash (0-100)
  averageTransactionAmount: number;    // Average amount per transaction
}
```

**Date Handling:**
- Accepts ISO date string (YYYY-MM-DD format)
- Uses `parseISO` from date-fns for parsing
- Calculates full day range with `startOfDay` and `endOfDay`
- Defaults to today if date parameter is not provided
- Returns 400 status for invalid date format

**Business Rules:**
- Only counts sales with status = `PAID` (ensures money was actually collected)
- Filters out soft-deleted sales (`sale.isDeleted = false`)
- Filters out soft-deleted sale payments (`salePayment.isDeleted = false`)
- Filters out soft-deleted payment methods (`paymentMethod.isDeleted = false`)
- Uses `sale.saleDate` field for date filtering (within specified day)
- Groups by `paymentMethodId` for aggregation
- Handles split payments correctly (a single sale can have multiple payments)

**Metrics Calculation:**

1. **totalAmount**: Sum of `salePayment.amount` for each payment method
   - Converts Prisma Decimal to Number
   - Represents total cash collected via this method

2. **transactionCount**: Count of `SalePayment` records for each method
   - **Important**: Counts payment records, NOT unique sales
   - A sale of $100,000 could have 2 payments: $50,000 CASH + $50,000 CARD
   - Both payments are counted separately in their respective methods

3. **percentageOfTotal**: `(methodTotal / grandTotal) * 100`
   - Rounded to 2 decimal places
   - Handles division by zero (returns 0 when grandTotal = 0)
   - Sum of all percentages should equal 100%

4. **averageTransactionAmount**: `totalAmount / transactionCount`
   - Rounded to 2 decimal places
   - Handles division by zero (returns 0 when transactionCount = 0)
   - Indicates average payment size for this method

**Sorting:**
- Results sorted by `totalAmount` in descending order
- Highest revenue payment methods appear first
- Helps identify primary cash collection methods

**Usage Examples:**

```typescript
import { getCashStatus } from '@/actions/dashboard';

// Get cash status for today (entire organization)
const todayResponse = await getCashStatus('org-123');

if (todayResponse.status === 200) {
  todayResponse.data.forEach((method) => {
    console.log(`${method.paymentMethodName}:`);
    console.log(`  Total: $${method.totalAmount.toFixed(2)}`);
    console.log(`  Transactions: ${method.transactionCount}`);
    console.log(`  Average: $${method.averageTransactionAmount.toFixed(2)}`);
    console.log(`  % of Total: ${method.percentageOfTotal.toFixed(2)}%`);
  });
}

// Get cash status for specific store today
const storeResponse = await getCashStatus('org-123', 'store-456');

// Get cash status for specific date (all stores)
const dateResponse = await getCashStatus('org-123', null, '2025-10-08');

// Get cash status for specific store and date
const fullResponse = await getCashStatus('org-123', 'store-456', '2025-10-08');
```

**Split Payment Example:**

Consider a sale of $150,000 with split payment:
- Payment 1: $100,000 via CASH
- Payment 2: $50,000 via CARD

Result for this sale:
```typescript
[
  {
    paymentMethodId: 'cash-method-id',
    paymentMethodName: 'Efectivo',
    paymentType: 'CASH',
    totalAmount: 100000,
    transactionCount: 1,      // This is 1 payment record
    percentageOfTotal: 66.67,
    averageTransactionAmount: 100000
  },
  {
    paymentMethodId: 'card-method-id',
    paymentMethodName: 'Tarjeta',
    paymentType: 'CARD',
    totalAmount: 50000,
    transactionCount: 1,       // This is 1 payment record
    percentageOfTotal: 33.33,
    averageTransactionAmount: 50000
  }
]
```

**Data Retrieval:**
- Queries `SalePayment` with Prisma `include`:
  - `paymentMethod` (select id, name, paymentType)
  - `sale` (filtered by date range, organization, store, status, isDeleted)
- Single query fetches all required data with joins
- Efficient in-memory grouping using Map

**Implementation Details:**

1. **Validation**: Validates organizationId with `checkOrgId()` utility
2. **Date Parsing**: Safely parses date string with try-catch for invalid formats
3. **Date Range**: Calculates full day range (00:00:00 to 23:59:59) for specified date
4. **Query**: Fetches all matching SalePayments with payment method and sale details
5. **Grouping**: Uses Map to group by paymentMethodId and accumulate metrics
6. **Aggregation**: For each payment method:
   - Accumulates amounts (converts Decimal to Number)
   - Counts payment transactions
   - Stores payment method details
7. **Grand Total**: Calculates sum of all amounts for percentage calculation
8. **Conversion**: Converts Map entries to CashStatus array
9. **Percentage & Average**: Computes percentages and averages with 2 decimal precision
10. **Sorting**: Sorts by totalAmount descending for revenue prioritization

**Edge Cases:**

- **No payments found**: Returns empty array with 200 status and appropriate message
- **Division by zero**:
  - `percentageOfTotal` returns 0 when `grandTotal = 0`
  - `averageTransactionAmount` returns 0 when `transactionCount = 0`
- **Invalid date format**: Returns 400 status with error message
- **Missing payment method**: Should not occur (foreign key constraint), but includes null checks
- **Decimal conversion**: All Prisma Decimal values properly converted to Number

**Error Handling:**
- Returns 400 if organization ID is empty (uses `checkOrgId()` utility)
- Returns 400 if date string has invalid ISO format
- Returns 500 on internal server errors (database errors, etc.)
- Logs all errors to console for debugging
- Graceful error messages in Spanish for user feedback

**Performance Considerations:**
- Single database query fetches all data with necessary joins
- In-memory grouping using Map for O(n) performance
- Minimal data selected (only required fields)
- No N+1 query problems due to Prisma includes
- Efficient aggregation without multiple database round-trips

**Type Safety:**
- Handles Prisma Decimal type by converting to Number
- Explicitly types paymentMethodMap with full generic signature
- Returns strongly-typed CashStatus[] array
- All fields match CashStatus interface from @/interfaces/dashboard
- TypeScript strict mode compliance

**Multi-tenancy:**
- Scoped to organizationId (required filter)
- Optional storeId filter for single-store analysis
- Ensures data isolation between organizations
- All queries filtered by organization to prevent data leaks

**Cash Register Reconciliation:**

This action is designed for end-of-day cash register reconciliation:

1. **Daily Summary**: Shows how much money was collected via each payment method
2. **Physical Cash Count**: Compare `totalAmount` for CASH payment type with physical cash in register
3. **Card Reconciliation**: Verify `totalAmount` for CARD matches card terminal reports
4. **Transaction Audit**: Use `transactionCount` to verify number of transactions matches receipts
5. **Discrepancy Detection**: Differences between expected and actual amounts indicate errors or theft

**Security Considerations:**
- Only PAID sales are included (prevents counting pending/cancelled sales)
- Soft-deleted payments excluded (maintains data integrity)
- Requires valid organizationId (enforces multi-tenancy)
- Date filtering prevents unauthorized historical data access beyond scope

---

### `getStockAlerts`

Retrieves products with low stock and calculates urgency metrics including predicted stockout dates.

**Function Signature:**
```typescript
getStockAlerts(
  organizationId: string,
  storeId?: string | null
): Promise<ActionResponse<StockAlert[]>>
```

**Parameters:**
- `organizationId` (required): The organization ID to filter products
- `storeId` (optional): Optional store ID to filter sales data for prediction calculations. Note: Products are organization-wide, but sales predictions can be scoped to a specific store.

**Returns:**
`ActionResponse<StockAlert[]>` with array of low stock products:

```typescript
{
  productId: string;
  productName: string;
  productImage: string | null;
  currentStock: number;
  minStock: number;
  stockDifference: number;        // currentStock - minStock (negative when below minimum)
  percentageRemaining: number;    // (currentStock / minStock) * 100
  severity: 'critical' | 'warning' | 'info';
  daysUntilStockout?: number;     // Estimated days based on sales trend (optional)

  // Optional product details
  categoryName?: string;
  brandName?: string;
  sku?: string | null;
  barcode?: string | null;
}
```

**Low Stock Detection:**
- Products where `currentStock <= minStock`
- Filters by `organizationId` (required)
- Only active products (`isActive = true`)
- Excludes soft-deleted products (`isDeleted = false`)
- Limited to 50 products (ordered by lowest stock first)

**Sales Analysis Period:**
- Last 30 days of sales data used for predictions
- Only PAID sales counted
- Filters out soft-deleted sales and sale items
- Optional storeId filter for store-specific predictions

**Metrics Calculation:**

1. **currentStock**: Current stock level from product record
2. **minStock**: Minimum stock threshold from product configuration
3. **stockDifference**: `currentStock - minStock` (negative value indicates deficit)
4. **percentageRemaining**: `(currentStock / minStock) * 100` rounded to 2 decimals
5. **daysUntilStockout**: Estimated days until stockout based on sales trend
   - Calculation: `currentStock / dailyAverageSales`
   - `undefined` (omitted) if no sales in last 30 days (cannot predict)
   - Rounded to nearest integer
6. **dailyAverageSales** (internal): Total units sold in last 30 days ÷ 30

**Severity Levels:**

The severity is calculated based on stock percentage relative to minimum:

- **'critical'**: Stock is 0 OR stock < 20% of minStock
  - Urgent reorder required
  - Risk of immediate stockout

- **'warning'**: Stock < 50% of minStock (but >= 20%)
  - Reorder should be planned soon
  - Medium-term risk

- **'info'**: Stock < minStock (but >= 50%)
  - Low priority reorder
  - Long-term monitoring

**Sorting:**
- Primary: By severity (critical → warning → info)
- Secondary: By currentStock ascending (lowest stock first within same severity)

**Usage Examples:**

```typescript
import { getStockAlerts } from '@/actions/dashboard';

// Get stock alerts for entire organization
const response = await getStockAlerts('org-123');

if (response.status === 200) {
  response.data.forEach((alert) => {
    console.log(`${alert.productName}:`);
    console.log(`  Current: ${alert.currentStock} | Min: ${alert.minStock}`);
    console.log(`  Severity: ${alert.severity}`);
    console.log(`  Remaining: ${alert.percentageRemaining}%`);
    if (alert.daysUntilStockout !== undefined) {
      console.log(`  Days until stockout: ${alert.daysUntilStockout}`);
    }
  });
}

// Get stock alerts with store-specific sales predictions
const storeResponse = await getStockAlerts('org-123', 'store-456');
```

**Implementation Details:**

1. **Product Query**:
   - Fetches products where `currentStock <= minStock`
   - Includes category and brand relations
   - Orders by `currentStock ASC`
   - Limits to 50 products

2. **Sales Query**:
   - Uses Prisma `groupBy` for efficient aggregation
   - Groups by `productId`
   - Sums quantity sold in last 30 days
   - Filters by organizationId and optional storeId
   - Only counts PAID sales

3. **Prediction Calculation**:
   - Creates Map of productId → totalQuantitySold for quick lookup
   - Calculates daily average: `totalSold / 30`
   - Predicts stockout: `currentStock / dailyAverage`
   - Omits `daysUntilStockout` field if no sales history (undefined)

4. **Severity Calculation**:
   - Handles edge case: `minStock = 0` (returns 'critical' if stock is 0, otherwise 'info')
   - Calculates percentage: `(currentStock / minStock) * 100`
   - Assigns severity based on percentage thresholds

**Edge Cases:**

- **No low stock products**: Returns empty array with 200 status
- **minStock = 0**: Severity is 'critical' if stock is 0, otherwise 'info'
- **No sales in last 30 days**: `daysUntilStockout` is omitted (undefined, no prediction possible)
- **currentStock = 0**: Severity is always 'critical'
- **Very slow-moving products**: May show high `daysUntilStockout` even below minStock

**Business Rules:**

- **Product scope**: Products are organization-wide (no storeId field on Product model)
- **Sales scope**: Sales can be filtered by store for predictions
- **Date range**: Fixed 30-day window for sales analysis
- **Prediction accuracy**: More accurate for products with consistent sales patterns
- **Reorder suggestions**: Can be calculated as `(minStock * 2) - currentStock` (future enhancement)

**Error Handling:**
- Returns 400 if organization ID is empty
- Returns 500 on internal server errors
- Logs all errors to console
- Returns empty array if no products meet criteria (not an error)

**Performance Considerations:**
- Two database queries: one for products, one for sales aggregation
- Sales query uses `groupBy` for efficient server-side aggregation
- Map-based lookup for O(1) sales data retrieval
- Limited to 50 products to prevent performance issues
- In-memory sorting after data retrieval

**Type Safety:**
- All fields match StockAlert interface from @/interfaces/dashboard
- Handles edge cases with proper null/undefined checks
- Converts numeric calculations safely
- TypeScript strict mode compliance

**Multi-tenancy:**
- Products scoped to organizationId
- Sales optionally scoped to storeId
- Ensures data isolation between organizations
- No cross-organization data leakage

**Inventory Management:**

This action supports proactive inventory management:

1. **Stockout Prevention**: Identifies products at risk of running out
2. **Prioritization**: Severity levels help prioritize reorder decisions
3. **Demand Forecasting**: Uses historical sales data to predict stockout dates
4. **Reorder Planning**: `daysUntilStockout` helps schedule purchase orders
5. **Multi-store Analysis**: Optional store filter for location-specific inventory decisions

**Limitations:**

- Sales predictions assume consistent demand (doesn't account for seasonality)
- 30-day window may not capture long-term trends
- Stockout predictions based on linear extrapolation
- Products with irregular sales patterns may have inaccurate predictions
- Limit of 50 products means only most critical alerts are shown
