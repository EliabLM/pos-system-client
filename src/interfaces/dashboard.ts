// Dashboard interfaces for POS System
// These types are used across dashboard components and hooks

/**
 * Dashboard KPIs - Main metrics for the dashboard
 */
export interface DashboardKPIs {
  // Current period metrics
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;

  // Comparison with previous period (optional)
  salesChange?: number; // Percentage change (-100 to 100+)
  transactionsChange?: number; // Percentage change
  averageTicketChange?: number; // Percentage change

  // Additional metrics
  totalRevenue: number; // Alias for totalSales for clarity
  cancelledTransactions?: number;
  pendingTransactions?: number;
}

/**
 * Sales data by period for chart visualization
 */
export interface SalesByPeriod {
  date: string; // ISO date string (YYYY-MM-DD)
  sales: number; // Total sales amount
  transactions: number; // Number of transactions
  averageTicket: number; // Average ticket value
}

/**
 * Chart data configuration
 */
export interface SalesChartData {
  data: SalesByPeriod[];
  period: 'day' | 'week' | 'month' | 'custom';
  dateFrom: Date;
  dateTo: Date;
}

/**
 * Top selling product information
 */
export interface TopProduct {
  productId: string;
  productName: string;
  productImage?: string | null;
  quantitySold: number; // Total units sold
  totalRevenue: number; // Total income from this product
  numberOfSales: number; // Number of transactions including this product
  percentageOfTotal: number; // Percentage of total sales (0-100)

  // Optional product details
  categoryName?: string;
  brandName?: string;
  currentStock?: number;
}

/**
 * Low stock alert information
 */
export interface StockAlert {
  productId: string;
  productName: string;
  productImage?: string | null;
  currentStock: number;
  minStock: number;
  stockDifference: number; // currentStock - minStock (negative when below minimum)
  percentageRemaining: number; // (currentStock / minStock) * 100

  // Alert severity level
  severity: 'critical' | 'warning' | 'info';

  // Optional - estimated days until out of stock
  daysUntilStockout?: number;

  // Optional product details
  categoryName?: string;
  brandName?: string;
  sku?: string | null;
  barcode?: string | null;
}

/**
 * Cash register status by payment method
 */
export interface CashStatus {
  paymentMethodId: string;
  paymentMethodName: string;
  paymentType: 'CASH' | 'CARD' | 'TRANSFER' | 'CREDIT' | 'CHECK' | 'OTHER';

  // Metrics
  totalAmount: number; // Total collected via this method
  transactionCount: number; // Number of transactions
  percentageOfTotal: number; // Percentage of total cash (0-100)
  averageTransactionAmount: number; // Average amount per transaction

  // Optional icon/color for UI display
  icon?: string;
  color?: string;
}

/**
 * Complete dashboard data structure
 */
export interface DashboardData {
  kpis: DashboardKPIs;
  salesChart: SalesChartData;
  topProducts: TopProduct[];
  stockAlerts: StockAlert[];
  cashStatus: CashStatus[];

  // Metadata
  lastUpdated: Date;
  storeId?: string | null;
  storeName?: string | null;
}

/**
 * Dashboard filters
 */
export interface DashboardFilters {
  dateFrom: Date;
  dateTo: Date;
  storeId?: string | null;
  period?: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
}

/**
 * Period preset options for date selector
 */
export type PeriodPreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

/**
 * Date range for dashboard queries
 */
export interface DateRange {
  from: Date;
  to: Date;
  preset?: PeriodPreset;
}
