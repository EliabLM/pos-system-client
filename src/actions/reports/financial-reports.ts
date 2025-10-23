'use server';

import {
  startOfDay,
  endOfDay,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ActionResponse } from '@/interfaces';
import { prisma, checkOrgId, emptyOrgIdResponse } from '../utils';
import { Prisma } from '@/generated/prisma';

/**
 * Financial Reports Server Actions
 *
 * Comprehensive server actions for financial analytics and reporting.
 * All actions follow strict TypeScript typing (ZERO `any` types).
 */

// ===========================
// TYPE DEFINITIONS
// ===========================

/**
 * Financial report filters
 */
export interface FinancialReportFilters {
  organizationId: string;
  storeId?: string;
  startDate: string;
  endDate: string;
  compareWithPrevious?: boolean;
}

/**
 * Profit & Loss summary data
 */
interface ProfitLossSummary {
  totalRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMargin: number; // percentage
  operatingExpenses: number;
  netProfit: number;
  netMargin: number; // percentage
}

/**
 * Profit & Loss period data
 */
interface ProfitLossPeriodData {
  period: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
}

/**
 * Comparison data for P&L
 */
interface ProfitLossComparison {
  revenueChange: number; // percentage
  profitChange: number; // percentage
}

/**
 * Complete Profit & Loss data
 */
export interface ProfitLossData {
  summary: ProfitLossSummary;
  data: ProfitLossPeriodData[];
  comparison?: ProfitLossComparison;
}

/**
 * Product profitability data
 */
interface ProductProfitability {
  productId: string;
  productName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number; // percentage
  units: number;
}

/**
 * Category profitability data
 */
interface CategoryProfitability {
  categoryId: string;
  categoryName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number; // percentage
}

/**
 * Profitability summary
 */
interface ProfitabilitySummary {
  averageMargin: number;
  topMarginProduct: string;
  topRevenueProduct: string;
}

/**
 * Complete profitability analysis data
 */
export interface ProfitabilityData {
  byProduct: ProductProfitability[];
  byCategory: CategoryProfitability[];
  summary: ProfitabilitySummary;
}

/**
 * Cash flow by payment method
 */
interface CashByMethod {
  method: string;
  amount: number;
}

/**
 * Cash flow summary
 */
interface CashFlowSummary {
  cashInflows: number;
  cashOutflows: number;
  netCashFlow: number;
  cashByMethod: CashByMethod[];
}

/**
 * Cash flow period data
 */
interface CashFlowPeriodData {
  period: string;
  inflows: number;
  outflows: number;
  net: number;
}

/**
 * Complete cash flow data
 */
export interface CashFlowData {
  summary: CashFlowSummary;
  data: CashFlowPeriodData[];
}

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Generate period key based on date and period type
 */
function getPeriodKey(date: Date, period: 'day' | 'week' | 'month' | 'year'): string {
  switch (period) {
    case 'day':
      return format(startOfDay(date), 'yyyy-MM-dd');
    case 'week':
      return format(startOfWeek(date, { locale: es }), 'yyyy-MM-dd');
    case 'month':
      return format(startOfMonth(date), 'yyyy-MM-01');
    case 'year':
      return format(startOfYear(date), 'yyyy-01-01');
    default:
      return format(date, 'yyyy-MM-dd');
  }
}

/**
 * Parse date string to Date object
 */
function parseDate(dateString: string): Date {
  try {
    return parseISO(dateString);
  } catch {
    return new Date(dateString);
  }
}

/**
 * Determine period type based on date range
 */
function determinePeriod(startDate: Date, endDate: Date): 'day' | 'week' | 'month' | 'year' {
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 7) return 'day';
  if (daysDiff <= 60) return 'week';
  if (daysDiff <= 365) return 'month';
  return 'year';
}

/**
 * Build base where clause for sales queries
 */
function buildSalesWhereClause(filters: FinancialReportFilters): Prisma.SaleWhereInput {
  const whereClause: Prisma.SaleWhereInput = {
    organizationId: filters.organizationId,
    isDeleted: false,
    saleDate: {
      gte: parseDate(filters.startDate),
      lte: endOfDay(parseDate(filters.endDate)),
    },
  };

  if (filters.storeId) {
    whereClause.storeId = filters.storeId;
  }

  return whereClause;
}

// ===========================
// SERVER ACTIONS
// ===========================

/**
 * Get Profit & Loss report with revenue, costs, and margins
 *
 * @param filters - Financial report filters
 * @returns ActionResponse with P&L data
 */
export async function getProfitLossReport(
  filters: FinancialReportFilters
): Promise<ActionResponse<ProfitLossData>> {
  try {
    // Validate organization ID
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    const period = determinePeriod(startDate, endDate);

    const whereClause = buildSalesWhereClause(filters);

    // Fetch sales with items
    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        saleItems: {
          where: { isDeleted: false },
          include: {
            product: {
              select: {
                costPrice: true,
              },
            },
          },
        },
      },
      orderBy: { saleDate: 'asc' },
    });

    // Calculate summary metrics
    let totalRevenue = 0;
    let totalCOGS = 0;

    const periodMap = new Map<string, {
      revenue: number;
      cogs: number;
    }>();

    for (const sale of sales) {
      const revenue = Number(sale.total);
      let saleCOGS = 0;

      for (const item of sale.saleItems) {
        const itemCost = Number(item.product.costPrice) * item.quantity;
        saleCOGS += itemCost;
      }

      totalRevenue += revenue;
      totalCOGS += saleCOGS;

      // Group by period
      const periodKey = getPeriodKey(sale.saleDate, period);
      const existing = periodMap.get(periodKey) || {
        revenue: 0,
        cogs: 0,
      };

      periodMap.set(periodKey, {
        revenue: existing.revenue + revenue,
        cogs: existing.cogs + saleCOGS,
      });
    }

    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Note: Operating expenses not tracked in current schema, so netProfit = grossProfit
    const operatingExpenses = 0;
    const netProfit = grossProfit - operatingExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const summary: ProfitLossSummary = {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      costOfGoodsSold: Number(totalCOGS.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossMargin: Number(grossMargin.toFixed(2)),
      operatingExpenses: Number(operatingExpenses.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      netMargin: Number(netMargin.toFixed(2)),
    };

    // Convert period map to array
    const data: ProfitLossPeriodData[] = Array.from(periodMap.entries()).map(([period, values]) => {
      const gross = values.revenue - values.cogs;
      const net = gross - 0; // No operating expenses

      return {
        period,
        revenue: Number(values.revenue.toFixed(2)),
        cogs: Number(values.cogs.toFixed(2)),
        grossProfit: Number(gross.toFixed(2)),
        netProfit: Number(net.toFixed(2)),
      };
    });

    // Sort by period
    data.sort((a, b) => a.period.localeCompare(b.period));

    // TODO: Implement comparison with previous period if requested
    const comparison = undefined;

    return {
      status: 200,
      message: 'Reporte de Ganancia y Pérdida generado exitosamente',
      data: { summary, data, comparison },
    };
  } catch (error) {
    console.error('Error generating P&L report:', error);
    return {
      status: 500,
      message: 'Error al generar el reporte de Ganancia y Pérdida',
      data: null,
    };
  }
}

/**
 * Get profitability analysis by product and category
 *
 * @param filters - Financial report filters
 * @returns ActionResponse with profitability data
 */
export async function getProfitabilityReport(
  filters: FinancialReportFilters
): Promise<ActionResponse<ProfitabilityData>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const whereClause = buildSalesWhereClause(filters);

    // Fetch sale items with product info
    const saleItems = await prisma.saleItem.findMany({
      where: {
        isDeleted: false,
        sale: whereClause,
      },
      include: {
        product: {
          include: {
            category: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Aggregate by product
    const productMap = new Map<string, {
      productName: string;
      revenue: number;
      cost: number;
      units: number;
    }>();

    // Aggregate by category
    const categoryMap = new Map<string, {
      categoryName: string;
      revenue: number;
      cost: number;
    }>();

    for (const item of saleItems) {
      const productId = item.productId;
      const revenue = Number(item.subtotal);
      const cost = Number(item.product.costPrice) * item.quantity;
      const units = item.quantity;

      // Product aggregation
      const existingProduct = productMap.get(productId) || {
        productName: item.product.name,
        revenue: 0,
        cost: 0,
        units: 0,
      };

      productMap.set(productId, {
        productName: existingProduct.productName,
        revenue: existingProduct.revenue + revenue,
        cost: existingProduct.cost + cost,
        units: existingProduct.units + units,
      });

      // Category aggregation
      const categoryId = item.product.categoryId || 'sin-categoria';
      const categoryName = item.product.category?.name || 'Sin Categoría';

      const existingCategory = categoryMap.get(categoryId) || {
        categoryName,
        revenue: 0,
        cost: 0,
      };

      categoryMap.set(categoryId, {
        categoryName: existingCategory.categoryName,
        revenue: existingCategory.revenue + revenue,
        cost: existingCategory.cost + cost,
      });
    }

    // Convert to arrays with metrics
    const byProduct: ProductProfitability[] = Array.from(productMap.entries()).map(([productId, values]) => {
      const profit = values.revenue - values.cost;
      const margin = values.revenue > 0 ? (profit / values.revenue) * 100 : 0;

      return {
        productId,
        productName: values.productName,
        revenue: Number(values.revenue.toFixed(2)),
        cost: Number(values.cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        margin: Number(margin.toFixed(2)),
        units: values.units,
      };
    });

    const byCategory: CategoryProfitability[] = Array.from(categoryMap.entries()).map(([categoryId, values]) => {
      const profit = values.revenue - values.cost;
      const margin = values.revenue > 0 ? (profit / values.revenue) * 100 : 0;

      return {
        categoryId,
        categoryName: values.categoryName,
        revenue: Number(values.revenue.toFixed(2)),
        cost: Number(values.cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        margin: Number(margin.toFixed(2)),
      };
    });

    // Sort products by margin descending
    byProduct.sort((a, b) => b.margin - a.margin);

    // Sort categories by revenue descending
    byCategory.sort((a, b) => b.revenue - a.revenue);

    // Calculate summary
    const averageMargin = byProduct.length > 0
      ? byProduct.reduce((sum, p) => sum + p.margin, 0) / byProduct.length
      : 0;

    const topMarginProduct = byProduct.length > 0 ? byProduct[0].productName : 'N/A';

    // Find top revenue product
    const productsByRevenue = [...byProduct].sort((a, b) => b.revenue - a.revenue);
    const topRevenueProduct = productsByRevenue.length > 0 ? productsByRevenue[0].productName : 'N/A';

    const summary: ProfitabilitySummary = {
      averageMargin: Number(averageMargin.toFixed(2)),
      topMarginProduct,
      topRevenueProduct,
    };

    return {
      status: 200,
      message: 'Análisis de rentabilidad generado exitosamente',
      data: { byProduct, byCategory, summary },
    };
  } catch (error) {
    console.error('Error generating profitability report:', error);
    return {
      status: 500,
      message: 'Error al generar el análisis de rentabilidad',
      data: null,
    };
  }
}

/**
 * Get cash flow report showing inflows and outflows
 *
 * @param filters - Financial report filters
 * @returns ActionResponse with cash flow data
 */
export async function getCashFlowReport(
  filters: FinancialReportFilters
): Promise<ActionResponse<CashFlowData>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    const period = determinePeriod(startDate, endDate);

    const whereClause = buildSalesWhereClause(filters);

    // Fetch sale payments (cash inflows)
    const salePayments = await prisma.salePayment.findMany({
      where: {
        isDeleted: false,
        sale: whereClause,
      },
      include: {
        paymentMethod: {
          select: {
            name: true,
            type: true,
          },
        },
        sale: {
          select: {
            saleDate: true,
          },
        },
      },
    });

    // Aggregate cash inflows
    let totalInflows = 0;
    const methodMap = new Map<string, number>();
    const periodMap = new Map<string, {
      inflows: number;
      outflows: number;
    }>();

    for (const payment of salePayments) {
      const amount = Number(payment.amount);
      totalInflows += amount;

      // Group by payment method
      const methodName = payment.paymentMethod.name;
      const existingMethod = methodMap.get(methodName) || 0;
      methodMap.set(methodName, existingMethod + amount);

      // Group by period
      const periodKey = getPeriodKey(payment.sale.saleDate, period);
      const existing = periodMap.get(periodKey) || {
        inflows: 0,
        outflows: 0,
      };

      periodMap.set(periodKey, {
        inflows: existing.inflows + amount,
        outflows: existing.outflows,
      });
    }

    // Note: Cash outflows (purchases) not implemented in current schema
    // In the future, this would include Purchase payments
    const totalOutflows = 0;

    // Calculate net cash flow
    const netCashFlow = totalInflows - totalOutflows;

    // Convert method map to array
    const cashByMethod: CashByMethod[] = Array.from(methodMap.entries()).map(([method, amount]) => ({
      method,
      amount: Number(amount.toFixed(2)),
    }));

    // Sort by amount descending
    cashByMethod.sort((a, b) => b.amount - a.amount);

    const summary: CashFlowSummary = {
      cashInflows: Number(totalInflows.toFixed(2)),
      cashOutflows: Number(totalOutflows.toFixed(2)),
      netCashFlow: Number(netCashFlow.toFixed(2)),
      cashByMethod,
    };

    // Convert period map to array
    const data: CashFlowPeriodData[] = Array.from(periodMap.entries()).map(([period, values]) => {
      const net = values.inflows - values.outflows;

      return {
        period,
        inflows: Number(values.inflows.toFixed(2)),
        outflows: Number(values.outflows.toFixed(2)),
        net: Number(net.toFixed(2)),
      };
    });

    // Sort by period
    data.sort((a, b) => a.period.localeCompare(b.period));

    return {
      status: 200,
      message: 'Reporte de flujo de caja generado exitosamente',
      data: { summary, data },
    };
  } catch (error) {
    console.error('Error generating cash flow report:', error);
    return {
      status: 500,
      message: 'Error al generar el reporte de flujo de caja',
      data: null,
    };
  }
}
