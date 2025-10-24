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
import {
  SalesReportFilters,
  SalesSummary,
  SalesPeriodData,
  TopProductData,
} from '@/interfaces/reports';
import { prisma, checkOrgId, emptyOrgIdResponse } from '../utils';
import { Prisma } from '@/generated/prisma';

/**
 * Sales Reports Server Actions
 *
 * Comprehensive server actions for sales analytics and reporting.
 * All actions follow strict TypeScript typing (ZERO `any` types).
 */

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
 * Build base where clause for sales queries
 */
function buildSalesWhereClause(filters: SalesReportFilters): Prisma.SaleWhereInput {
  const whereClause: Prisma.SaleWhereInput = {
    organizationId: filters.organizationId,
    isDeleted: false,
    saleDate: {
      gte: parseDate(filters.dateRange.startDate.toISOString()),
      lte: endOfDay(parseDate(filters.dateRange.endDate.toISOString())),
    },
  };

  if (filters.storeId) {
    whereClause.storeId = filters.storeId;
  }

  if (filters.customerId) {
    whereClause.customerId = filters.customerId;
  }

  if (filters.sellerId) {
    whereClause.userId = filters.sellerId;
  }

  return whereClause;
}

// ===========================
// SERVER ACTIONS
// ===========================

/**
 * Get detailed sales report with summary and period breakdown
 *
 * @param filters - Sales report filters
 * @returns ActionResponse with sales data and summary
 */
export async function getSalesReport(
  filters: SalesReportFilters
): Promise<ActionResponse<{ summary: SalesSummary; data: SalesPeriodData[] }>> {
  try {
    // Validate organization ID
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const whereClause = buildSalesWhereClause(filters);

    // Fetch sales with items and payments
    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        saleItems: {
          where: { isDeleted: false },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                costPrice: true,
                salePrice: true,
              },
            },
          },
        },
        salePayments: {
          where: { isDeleted: false },
        },
      },
      orderBy: { saleDate: 'desc' },
    });

    // Calculate summary metrics
    let totalRevenue = 0;
    let totalCost = 0;
    let totalItems = 0;

    const periodMap = new Map<string, {
      salesCount: number;
      revenue: number;
      cost: number;
      itemsSold: number;
    }>();

    for (const sale of sales) {
      const revenue = Number(sale.total);
      let saleCost = 0;
      let saleItems = 0;

      for (const item of sale.saleItems) {
        const itemCost = Number(item.product.costPrice) * item.quantity;
        saleCost += itemCost;
        saleItems += item.quantity;
      }

      totalRevenue += revenue;
      totalCost += saleCost;
      totalItems += saleItems;

      // Group by period
      const periodKey = getPeriodKey(sale.saleDate, filters.period || 'day');
      const existing = periodMap.get(periodKey) || {
        salesCount: 0,
        revenue: 0,
        cost: 0,
        itemsSold: 0,
      };

      periodMap.set(periodKey, {
        salesCount: existing.salesCount + 1,
        revenue: existing.revenue + revenue,
        cost: existing.cost + saleCost,
        itemsSold: existing.itemsSold + saleItems,
      });
    }

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

    const summary: SalesSummary = {
      totalSales: sales.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(2)),
      averageTicket: Number(averageTicket.toFixed(2)),
      totalItems,
    };

    // Convert period map to array
    const data: SalesPeriodData[] = Array.from(periodMap.entries()).map(([period, values]) => {
      const profit = values.revenue - values.cost;
      const margin = values.revenue > 0 ? (profit / values.revenue) * 100 : 0;

      return {
        period,
        date: parseDate(period),
        salesCount: values.salesCount,
        revenue: Number(values.revenue.toFixed(2)),
        cost: Number(values.cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        profitMargin: Number(margin.toFixed(2)),
        itemsSold: values.itemsSold,
      };
    });

    // Sort by date
    data.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      status: 200,
      message: 'Reporte de ventas generado exitosamente',
      data: { summary, data },
    };
  } catch (error) {
    console.error('Error generating sales report:', error);
    return {
      status: 500,
      message: 'Error al generar el reporte de ventas',
      data: null,
    };
  }
}

/**
 * Get sales aggregated by product
 *
 * @param filters - Sales report filters
 * @returns ActionResponse with product sales data
 */
export async function getSalesByProduct(
  filters: SalesReportFilters
): Promise<ActionResponse<TopProductData[]>> {
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
              select: { name: true },
            },
            brand: {
              select: { name: true },
            },
            unitMeasure: {
              select: { id: true, name: true, abbreviation: true },
            },
          },
        },
      },
    });

    // Aggregate by product
    const productMap = new Map<string, {
      productName: string;
      quantity: number;
      revenue: number;
      cost: number;
      category?: string;
      brand?: string;
      unitMeasure?: string;
      volume?: number | null;
      alcoholGrade?: number | null;
      size?: string | null;
      color?: string | null;
    }>();

    for (const item of saleItems) {
      const productId = item.productId;
      const revenue = Number(item.subtotal);
      const cost = Number(item.product.costPrice) * item.quantity;

      const existing = productMap.get(productId) || {
        productName: item.product.name,
        quantity: 0,
        revenue: 0,
        cost: 0,
        category: item.product.category?.name,
        brand: item.product.brand?.name,
        unitMeasure: item.product.unitMeasure?.abbreviation,
        volume: item.product.volume,
        alcoholGrade: item.product.alcoholGrade,
        size: item.product.size,
        color: item.product.color,
      };

      productMap.set(productId, {
        productName: existing.productName,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + revenue,
        cost: existing.cost + cost,
        category: existing.category,
        brand: existing.brand,
        unitMeasure: existing.unitMeasure,
        volume: existing.volume,
        alcoholGrade: existing.alcoholGrade,
        size: existing.size,
        color: existing.color,
      });
    }

    // Convert to array and calculate metrics
    const data: TopProductData[] = Array.from(productMap.entries()).map(([productId, values]) => {
      const profit = values.revenue - values.cost;
      const margin = values.revenue > 0 ? (profit / values.revenue) * 100 : 0;

      return {
        productId,
        productName: values.productName,
        quantity: values.quantity,
        revenue: Number(values.revenue.toFixed(2)),
        cost: Number(values.cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        profitMargin: Number(margin.toFixed(2)),
        category: values.category,
        brand: values.brand,
        unitMeasure: values.unitMeasure,
        volume: values.volume,
        alcoholGrade: values.alcoholGrade,
        size: values.size,
        color: values.color,
      };
    });

    // Sort by revenue descending
    data.sort((a, b) => b.revenue - a.revenue);

    return {
      status: 200,
      message: 'Ventas por producto obtenidas exitosamente',
      data,
    };
  } catch (error) {
    console.error('Error getting sales by product:', error);
    return {
      status: 500,
      message: 'Error al obtener ventas por producto',
      data: null,
    };
  }
}

/**
 * Get sales aggregated by category
 *
 * @param filters - Sales report filters
 * @returns ActionResponse with category sales data
 */
export async function getSalesByCategory(
  filters: SalesReportFilters
): Promise<ActionResponse<Array<{
  categoryId: string;
  categoryName: string;
  salesCount: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  percentage: number;
}>>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const whereClause = buildSalesWhereClause(filters);

    // Additional category filter if provided
    const categoryFilter = filters.categoryId ? { categoryId: filters.categoryId } : {};

    const saleItems = await prisma.saleItem.findMany({
      where: {
        isDeleted: false,
        sale: whereClause,
        product: {
          ...categoryFilter,
          isDeleted: false,
        },
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

    // Aggregate by category
    const categoryMap = new Map<string, {
      categoryName: string;
      salesCount: number;
      revenue: number;
      cost: number;
    }>();

    let totalRevenue = 0;

    for (const item of saleItems) {
      const categoryId = item.product.categoryId || 'sin-categoria';
      const categoryName = item.product.category?.name || 'Sin Categoría';
      const revenue = Number(item.subtotal);
      const cost = Number(item.product.costPrice) * item.quantity;

      totalRevenue += revenue;

      const existing = categoryMap.get(categoryId) || {
        categoryName,
        salesCount: 0,
        revenue: 0,
        cost: 0,
      };

      categoryMap.set(categoryId, {
        categoryName: existing.categoryName,
        salesCount: existing.salesCount + 1,
        revenue: existing.revenue + revenue,
        cost: existing.cost + cost,
      });
    }

    // Convert to array with metrics
    const data = Array.from(categoryMap.entries()).map(([categoryId, values]) => {
      const profit = values.revenue - values.cost;
      const margin = values.revenue > 0 ? (profit / values.revenue) * 100 : 0;
      const percentage = totalRevenue > 0 ? (values.revenue / totalRevenue) * 100 : 0;

      return {
        categoryId,
        categoryName: values.categoryName,
        salesCount: values.salesCount,
        revenue: Number(values.revenue.toFixed(2)),
        cost: Number(values.cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        profitMargin: Number(margin.toFixed(2)),
        percentage: Number(percentage.toFixed(2)),
      };
    });

    // Sort by revenue descending
    data.sort((a, b) => b.revenue - a.revenue);

    return {
      status: 200,
      message: 'Ventas por categoría obtenidas exitosamente',
      data,
    };
  } catch (error) {
    console.error('Error getting sales by category:', error);
    return {
      status: 500,
      message: 'Error al obtener ventas por categoría',
      data: null,
    };
  }
}

/**
 * Get sales aggregated by payment method
 *
 * @param filters - Sales report filters
 * @returns ActionResponse with payment method sales data
 */
export async function getSalesByPayment(
  filters: SalesReportFilters
): Promise<ActionResponse<Array<{
  paymentMethodId: string;
  paymentMethodName: string;
  paymentType: string;
  transactionCount: number;
  totalAmount: number;
  averageTicket: number;
  percentage: number;
}>>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const whereClause = buildSalesWhereClause(filters);

    // Additional payment method filter if provided
    const paymentFilter = filters.paymentMethodId
      ? { paymentMethodId: filters.paymentMethodId }
      : {};

    const salePayments = await prisma.salePayment.findMany({
      where: {
        isDeleted: false,
        ...paymentFilter,
        sale: whereClause,
      },
      include: {
        paymentMethod: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Aggregate by payment method
    const paymentMap = new Map<string, {
      paymentMethodName: string;
      paymentType: string;
      transactionCount: number;
      totalAmount: number;
    }>();

    let grandTotal = 0;

    for (const payment of salePayments) {
      const paymentMethodId = payment.paymentMethodId;
      const amount = Number(payment.amount);

      grandTotal += amount;

      const existing = paymentMap.get(paymentMethodId) || {
        paymentMethodName: payment.paymentMethod.name,
        paymentType: payment.paymentMethod.type,
        transactionCount: 0,
        totalAmount: 0,
      };

      paymentMap.set(paymentMethodId, {
        paymentMethodName: existing.paymentMethodName,
        paymentType: existing.paymentType,
        transactionCount: existing.transactionCount + 1,
        totalAmount: existing.totalAmount + amount,
      });
    }

    // Convert to array with metrics
    const data = Array.from(paymentMap.entries()).map(([paymentMethodId, values]) => {
      const averageTicket = values.transactionCount > 0
        ? values.totalAmount / values.transactionCount
        : 0;
      const percentage = grandTotal > 0 ? (values.totalAmount / grandTotal) * 100 : 0;

      return {
        paymentMethodId,
        paymentMethodName: values.paymentMethodName,
        paymentType: values.paymentType,
        transactionCount: values.transactionCount,
        totalAmount: Number(values.totalAmount.toFixed(2)),
        averageTicket: Number(averageTicket.toFixed(2)),
        percentage: Number(percentage.toFixed(2)),
      };
    });

    // Sort by total amount descending
    data.sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      status: 200,
      message: 'Ventas por método de pago obtenidas exitosamente',
      data,
    };
  } catch (error) {
    console.error('Error getting sales by payment:', error);
    return {
      status: 500,
      message: 'Error al obtener ventas por método de pago',
      data: null,
    };
  }
}

/**
 * Get sales aggregated by seller/user
 *
 * @param filters - Sales report filters
 * @returns ActionResponse with seller performance data
 */
export async function getSalesBySeller(
  filters: SalesReportFilters
): Promise<ActionResponse<Array<{
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  salesCount: number;
  totalRevenue: number;
  averageTicket: number;
  totalItems: number;
}>>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const whereClause = buildSalesWhereClause(filters);

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        saleItems: {
          where: { isDeleted: false },
          select: { quantity: true },
        },
      },
    });

    // Aggregate by seller
    const sellerMap = new Map<string, {
      sellerName: string;
      sellerEmail: string;
      salesCount: number;
      totalRevenue: number;
      totalItems: number;
    }>();

    for (const sale of sales) {
      const sellerId = sale.userId;
      const revenue = Number(sale.total);
      const items = sale.saleItems.reduce((sum, item) => sum + item.quantity, 0);

      const existing = sellerMap.get(sellerId) || {
        sellerName: `${sale.user.firstName} ${sale.user.lastName}`,
        sellerEmail: sale.user.email,
        salesCount: 0,
        totalRevenue: 0,
        totalItems: 0,
      };

      sellerMap.set(sellerId, {
        sellerName: existing.sellerName,
        sellerEmail: existing.sellerEmail,
        salesCount: existing.salesCount + 1,
        totalRevenue: existing.totalRevenue + revenue,
        totalItems: existing.totalItems + items,
      });
    }

    // Convert to array with metrics
    const data = Array.from(sellerMap.entries()).map(([sellerId, values]) => {
      const averageTicket = values.salesCount > 0
        ? values.totalRevenue / values.salesCount
        : 0;

      return {
        sellerId,
        sellerName: values.sellerName,
        sellerEmail: values.sellerEmail,
        salesCount: values.salesCount,
        totalRevenue: Number(values.totalRevenue.toFixed(2)),
        averageTicket: Number(averageTicket.toFixed(2)),
        totalItems: values.totalItems,
      };
    });

    // Sort by total revenue descending
    data.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      status: 200,
      message: 'Ventas por vendedor obtenidas exitosamente',
      data,
    };
  } catch (error) {
    console.error('Error getting sales by seller:', error);
    return {
      status: 500,
      message: 'Error al obtener ventas por vendedor',
      data: null,
    };
  }
}
