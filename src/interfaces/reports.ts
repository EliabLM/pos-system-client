/**
 * Reports Module - TypeScript Interfaces
 *
 * This file contains all TypeScript interfaces and types for the Reports module.
 * Following strict typing rules - ZERO `any` types allowed.
 */

// ===========================
// CORE REPORT TYPES
// ===========================

/**
 * Report period types for data aggregation
 */
export type ReportPeriod = 'day' | 'week' | 'month' | 'year';

/**
 * Report export format types
 */
export type ExportFormat = 'pdf' | 'excel';

/**
 * Date orientation for PDF exports
 */
export type PDFOrientation = 'portrait' | 'landscape';

/**
 * Date range filter interface
 */
export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

/**
 * Base report filters interface
 */
export interface ReportFilters {
  organizationId: string;
  storeId?: string;
  dateRange: DateRangeFilter;
  period?: ReportPeriod;
}

/**
 * Generic report data interface
 */
export interface ReportData<T> {
  filters: ReportFilters;
  generatedAt: Date;
  data: T;
  summary?: ReportSummary;
}

/**
 * Report summary interface
 */
export interface ReportSummary {
  totalRecords: number;
  periodLabel: string;
  metadata?: Record<string, string | number | boolean>;
}

// ===========================
// EXPORT INTERFACES
// ===========================

/**
 * PDF Generator options
 */
export interface PDFGeneratorOptions {
  elementId: string;
  filename: string;
  orientation?: PDFOrientation;
  title?: string;
  includeDate?: boolean;
  scale?: number;
}

/**
 * Excel Generator options
 */
export interface ExcelGeneratorOptions {
  filename: string;
  sheetName?: string;
  includeHeaders?: boolean;
  autoWidth?: boolean;
  includeDate?: boolean;
}

/**
 * Excel sheet configuration
 */
export interface ExcelSheetConfig {
  name: string;
  data: Array<Record<string, string | number | boolean | null>>;
  headers?: string[];
}

/**
 * Export progress state
 */
export interface ExportProgress {
  isExporting: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
}

// ===========================
// CHART INTERFACES
// ===========================

/**
 * Chart data point interface
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  period?: string;
  category?: string;
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  title: string;
  description?: string;
  dataKey: string;
  xAxisKey: string;
  yAxisKey: string;
  colors?: string[];
}

/**
 * Chart wrapper props
 */
export interface ChartWrapperProps {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  chartId?: string;
  className?: string;
}

// ===========================
// CALCULATION INTERFACES
// ===========================

/**
 * Profit margin calculation result
 */
export interface ProfitMargin {
  revenue: number;
  cost: number;
  profit: number;
  marginPercentage: number;
}

/**
 * Growth rate calculation result
 */
export interface GrowthRate {
  current: number;
  previous: number;
  difference: number;
  growthPercentage: number;
  isPositive: boolean;
}

/**
 * Period comparison result
 */
export interface ComparisonResult<T> {
  current: T[];
  previous: T[];
  changes: ChangeData[];
  summary: ComparisonSummary;
}

/**
 * Change data for comparisons
 */
export interface ChangeData {
  metric: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  isPositive: boolean;
}

/**
 * Comparison summary
 */
export interface ComparisonSummary {
  totalChanges: number;
  positiveChanges: number;
  negativeChanges: number;
  overallTrend: 'up' | 'down' | 'stable';
}

// ===========================
// DATE RANGE PICKER INTERFACES
// ===========================

/**
 * Date range preset
 */
export interface DateRangePreset {
  label: string;
  getValue: () => DateRangeFilter;
}

/**
 * Date range picker props
 */
export interface DateRangePickerProps {
  value: DateRangeFilter;
  onChange: (range: DateRangeFilter) => void;
  presets?: DateRangePreset[];
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
}

// ===========================
// REPORT HEADER INTERFACES
// ===========================

/**
 * Report header props
 */
export interface ReportHeaderProps {
  title: string;
  description?: string;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  isExporting?: boolean;
  showExport?: boolean;
  children?: React.ReactNode;
  className?: string;
}

// ===========================
// FILTER INTERFACES
// ===========================

/**
 * Report filters props
 */
export interface ReportFiltersProps {
  dateRange: DateRangeFilter;
  onDateRangeChange: (range: DateRangeFilter) => void;
  storeId?: string;
  onStoreChange?: (storeId: string) => void;
  showStoreFilter?: boolean;
  additionalFilters?: React.ReactNode;
  className?: string;
}

/**
 * Export menu props
 */
export interface ExportMenuProps {
  onExportPDF: () => void;
  onExportExcel: () => void;
  isExporting: boolean;
  disabled?: boolean;
  className?: string;
}

// ===========================
// AGGREGATION INTERFACES
// ===========================

/**
 * Aggregation result
 */
export interface AggregationResult<T> {
  period: string;
  data: T[];
  count: number;
  sum?: Record<string, number>;
  average?: Record<string, number>;
  min?: Record<string, number>;
  max?: Record<string, number>;
}

/**
 * Group by result
 */
export interface GroupByResult<T> {
  key: string;
  items: T[];
  count: number;
}

/**
 * Summary fields configuration
 */
export interface SummaryConfig {
  field: string;
  aggregationType: 'sum' | 'average' | 'min' | 'max' | 'count';
}

// ===========================
// SALES REPORT INTERFACES
// ===========================

/**
 * Sales report filters
 */
export interface SalesReportFilters extends ReportFilters {
  productId?: string;
  categoryId?: string;
  brandId?: string;
  paymentMethodId?: string;
  sellerId?: string;
  customerId?: string;
}

/**
 * Sales summary data
 */
export interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  averageTicket: number;
  totalItems: number;
}

/**
 * Sales period data
 */
export interface SalesPeriodData {
  period: string;
  date: Date;
  salesCount: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  itemsSold: number;
}

/**
 * Top product data
 */
export interface TopProductData {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  category?: string;
  brand?: string;
}

// ===========================
// INVENTORY REPORT INTERFACES
// ===========================

/**
 * Inventory report filters
 */
export interface InventoryReportFilters extends ReportFilters {
  productId?: string;
  categoryId?: string;
  brandId?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
}

/**
 * Stock summary data
 */
export interface StockSummary {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  averageStockLevel: number;
}

/**
 * Stock movement data
 */
export interface StockMovementData {
  movementId: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  date: Date;
  userName: string;
}

// ===========================
// FINANCIAL REPORT INTERFACES
// ===========================

/**
 * Financial report filters
 */
export interface FinancialReportFilters extends ReportFilters {
  includeExpenses?: boolean;
  categoryId?: string;
}

/**
 * Financial summary data
 */
export interface FinancialSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossProfitMargin: number;
  netProfit: number;
  netProfitMargin: number;
  expenses: number;
}

/**
 * Profit & Loss data
 */
export interface ProfitLossData {
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
}

// ===========================
// CUSTOMER REPORT INTERFACES
// ===========================

/**
 * Customer report filters
 */
export interface CustomerReportFilters extends ReportFilters {
  customerId?: string;
  city?: string;
  department?: string;
  minPurchases?: number;
}

/**
 * Customer summary data
 */
export interface CustomerSummary {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  totalPurchases: number;
  averagePurchaseValue: number;
  customerLifetimeValue: number;
}

/**
 * Top customer data
 */
export interface TopCustomerData {
  customerId: string;
  customerName: string;
  email?: string;
  totalPurchases: number;
  totalSpent: number;
  averageTicket: number;
  lastPurchaseDate: Date;
  frequency: number;
}

// ===========================
// SUPPLIER REPORT INTERFACES
// ===========================

/**
 * Supplier report filters
 */
export interface SupplierReportFilters extends ReportFilters {
  supplierId?: string;
}

/**
 * Supplier summary data
 */
export interface SupplierSummary {
  totalSuppliers: number;
  totalPurchases: number;
  totalSpent: number;
  averagePurchaseValue: number;
}

/**
 * Supplier purchase data
 */
export interface SupplierPurchaseData {
  supplierId: string;
  supplierName: string;
  totalPurchases: number;
  totalSpent: number;
  averageOrderValue: number;
  lastPurchaseDate: Date;
}

// ===========================
// REPORT CARD INTERFACES
// ===========================

/**
 * Report card configuration
 */
export interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  category: 'sales' | 'inventory' | 'financial' | 'customer' | 'supplier';
  enabled: boolean;
}

/**
 * Report category configuration
 */
export interface ReportCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  reports: ReportCard[];
}
