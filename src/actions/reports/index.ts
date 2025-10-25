/**
 * Reports Actions
 *
 * Server actions for reports module including sales, inventory, financial, customer, and supplier reports.
 */

// Sales Reports
export {
  getSalesReport,
  getSalesByProduct,
  getSalesByCategory,
  getSalesByPayment,
  getSalesBySeller,
} from './sales-reports';

// Inventory Reports
export {
  getStockStatusReport,
  getStockMovementsReport,
  getInventoryValuationReport,
  getInventoryRotationReport,
} from './inventory-reports';

// Financial Reports
export {
  getProfitLossReport,
  getProfitabilityReport,
  getCashFlowReport,
} from './financial-reports';
export type {
  FinancialReportFilters,
  ProfitLossData,
  ProfitabilityData,
  CashFlowData,
} from './financial-reports';

// Customer Reports
export {
  getCustomerSummary,
  getTopCustomers,
  getCustomerPurchaseHistory,
  getCustomerSegments,
} from './customer-reports';
