'use server';

import {
  endOfDay,
  parseISO,
} from 'date-fns';
import { ActionResponse } from '@/interfaces';
import {
  CustomerReportFilters,
  CustomerSummary,
  TopCustomerData,
} from '@/interfaces/reports';
import { prisma, checkOrgId, emptyOrgIdResponse } from '../utils';
import { Prisma } from '@/generated/prisma';

/**
 * Customer Reports Server Actions
 *
 * Comprehensive server actions for customer analytics and reporting.
 * All actions follow strict TypeScript typing (ZERO `any` types).
 */

// ===========================
// HELPER FUNCTIONS
// ===========================

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
 * Build base where clause for customer queries
 */
function buildCustomerWhereClause(filters: CustomerReportFilters): Prisma.CustomerWhereInput {
  const whereClause: Prisma.CustomerWhereInput = {
    organizationId: filters.organizationId,
    isDeleted: false,
  };

  if (filters.customerId) {
    whereClause.id = filters.customerId;
  }

  if (filters.city) {
    whereClause.city = {
      contains: filters.city,
      mode: 'insensitive',
    };
  }

  if (filters.department) {
    whereClause.department = {
      contains: filters.department,
      mode: 'insensitive',
    };
  }

  return whereClause;
}

// ===========================
// SERVER ACTIONS
// ===========================

/**
 * Get customer summary report
 *
 * @param filters - Customer report filters
 * @returns ActionResponse with customer summary data
 */
export async function getCustomerSummary(
  filters: CustomerReportFilters
): Promise<ActionResponse<CustomerSummary>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const whereClause = buildCustomerWhereClause(filters);

    // Get total customers count
    const totalCustomers = await prisma.customer.count({
      where: whereClause,
    });

    // Get active customers (customers with at least one sale)
    const customersWithSales = await prisma.customer.findMany({
      where: {
        ...whereClause,
        sales: {
          some: {
            isDeleted: false,
            saleDate: {
              gte: parseDate(filters.dateRange.startDate.toISOString()),
              lte: endOfDay(parseDate(filters.dateRange.endDate.toISOString())),
            },
          },
        },
      },
      select: { id: true },
    });

    const activeCustomers = customersWithSales.length;

    // Get new customers in the period
    const newCustomers = await prisma.customer.count({
      where: {
        ...whereClause,
        createdAt: {
          gte: parseDate(filters.dateRange.startDate.toISOString()),
          lte: endOfDay(parseDate(filters.dateRange.endDate.toISOString())),
        },
      },
    });

    // Get all sales in the period
    const sales = await prisma.sale.findMany({
      where: {
        organizationId: filters.organizationId,
        isDeleted: false,
        saleDate: {
          gte: parseDate(filters.dateRange.startDate.toISOString()),
          lte: endOfDay(parseDate(filters.dateRange.endDate.toISOString())),
        },
        ...(filters.storeId && { storeId: filters.storeId }),
        ...(filters.customerId && { customerId: filters.customerId }),
      },
    });

    const totalPurchases = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const averagePurchaseValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;
    const customerLifetimeValue = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

    const summary: CustomerSummary = {
      totalCustomers,
      activeCustomers,
      newCustomers,
      totalPurchases,
      averagePurchaseValue: Number(averagePurchaseValue.toFixed(2)),
      customerLifetimeValue: Number(customerLifetimeValue.toFixed(2)),
    };

    return {
      status: 200,
      message: 'Resumen de clientes generado exitosamente',
      data: summary,
    };
  } catch (error) {
    console.error('Error generating customer summary:', error);
    return {
      status: 500,
      message: 'Error al generar el resumen de clientes',
      data: null,
    };
  }
}

/**
 * Get top customers report
 *
 * @param filters - Customer report filters
 * @returns ActionResponse with top customers data
 */
export async function getTopCustomers(
  filters: CustomerReportFilters
): Promise<ActionResponse<TopCustomerData[]>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    // Get all sales in the period with customer info
    const sales = await prisma.sale.findMany({
      where: {
        organizationId: filters.organizationId,
        isDeleted: false,
        saleDate: {
          gte: parseDate(filters.dateRange.startDate.toISOString()),
          lte: endOfDay(parseDate(filters.dateRange.endDate.toISOString())),
        },
        ...(filters.storeId && { storeId: filters.storeId }),
        ...(filters.customerId && { customerId: filters.customerId }),
        customerId: { not: null },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    });

    // Aggregate by customer
    const customerMap = new Map<string, {
      customerName: string;
      email: string | null;
      totalPurchases: number;
      totalSpent: number;
      lastPurchaseDate: Date;
      purchaseDates: Date[];
    }>();

    for (const sale of sales) {
      if (!sale.customer) continue;

      const customerId = sale.customer.id;
      const totalSpent = Number(sale.total);

      const existing = customerMap.get(customerId) || {
        customerName: `${sale.customer.firstName} ${sale.customer.lastName}`,
        email: sale.customer.email,
        totalPurchases: 0,
        totalSpent: 0,
        lastPurchaseDate: sale.saleDate,
        purchaseDates: [],
      };

      customerMap.set(customerId, {
        customerName: existing.customerName,
        email: existing.email,
        totalPurchases: existing.totalPurchases + 1,
        totalSpent: existing.totalSpent + totalSpent,
        lastPurchaseDate: sale.saleDate > existing.lastPurchaseDate ? sale.saleDate : existing.lastPurchaseDate,
        purchaseDates: [...existing.purchaseDates, sale.saleDate],
      });
    }

    // Convert to array and calculate metrics
    const data: TopCustomerData[] = Array.from(customerMap.entries()).map(([customerId, values]) => {
      const averageTicket = values.totalPurchases > 0 ? values.totalSpent / values.totalPurchases : 0;

      // Calculate purchase frequency (purchases per month)
      const periodDays = (filters.dateRange.endDate.getTime() - filters.dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24);
      const periodMonths = periodDays / 30;
      const frequency = periodMonths > 0 ? values.totalPurchases / periodMonths : values.totalPurchases;

      return {
        customerId,
        customerName: values.customerName,
        email: values.email || undefined,
        totalPurchases: values.totalPurchases,
        totalSpent: Number(values.totalSpent.toFixed(2)),
        averageTicket: Number(averageTicket.toFixed(2)),
        lastPurchaseDate: values.lastPurchaseDate,
        frequency: Number(frequency.toFixed(2)),
      };
    });

    // Filter by minimum purchases if specified
    const filteredData = filters.minPurchases
      ? data.filter(customer => customer.totalPurchases >= filters.minPurchases!)
      : data;

    // Sort by total spent descending
    filteredData.sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      status: 200,
      message: 'Top clientes obtenidos exitosamente',
      data: filteredData,
    };
  } catch (error) {
    console.error('Error getting top customers:', error);
    return {
      status: 500,
      message: 'Error al obtener los top clientes',
      data: null,
    };
  }
}

/**
 * Get customer purchase history
 *
 * @param customerId - Customer ID
 * @param filters - Customer report filters
 * @returns ActionResponse with customer purchase history
 */
export async function getCustomerPurchaseHistory(
  customerId: string,
  filters: CustomerReportFilters
): Promise<ActionResponse<{
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    department: string | null;
  };
  purchases: Array<{
    saleId: string;
    saleNumber: string;
    saleDate: Date;
    total: number;
    itemsCount: number;
    paymentMethods: string[];
    status: string;
  }>;
  summary: {
    totalPurchases: number;
    totalSpent: number;
    averageTicket: number;
    firstPurchase: Date | null;
    lastPurchase: Date | null;
  };
}>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    // Get customer info
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId: filters.organizationId,
        isDeleted: false,
      },
    });

    if (!customer) {
      return {
        status: 404,
        message: 'Cliente no encontrado',
        data: null,
      };
    }

    // Get customer sales
    const sales = await prisma.sale.findMany({
      where: {
        customerId,
        organizationId: filters.organizationId,
        isDeleted: false,
        saleDate: {
          gte: parseDate(filters.dateRange.startDate.toISOString()),
          lte: endOfDay(parseDate(filters.dateRange.endDate.toISOString())),
        },
        ...(filters.storeId && { storeId: filters.storeId }),
      },
      include: {
        saleItems: {
          where: { isDeleted: false },
          select: { quantity: true },
        },
        salePayments: {
          where: { isDeleted: false },
          include: {
            paymentMethod: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    });

    // Build purchases array
    const purchases = sales.map(sale => ({
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      saleDate: sale.saleDate,
      total: Number(sale.total),
      itemsCount: sale.saleItems.reduce((sum, item) => sum + item.quantity, 0),
      paymentMethods: Array.from(
        new Set(sale.salePayments.map(p => p.paymentMethod.name))
      ),
      status: sale.status,
    }));

    // Calculate summary
    const totalSpent = purchases.reduce((sum, p) => sum + p.total, 0);
    const totalPurchases = purchases.length;
    const averageTicket = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

    const purchaseDates = purchases.map(p => p.saleDate);
    const firstPurchase = purchaseDates.length > 0
      ? new Date(Math.min(...purchaseDates.map(d => d.getTime())))
      : null;
    const lastPurchase = purchaseDates.length > 0
      ? new Date(Math.max(...purchaseDates.map(d => d.getTime())))
      : null;

    return {
      status: 200,
      message: 'Historial de compras obtenido exitosamente',
      data: {
        customer: {
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone,
          city: customer.city,
          department: customer.department,
        },
        purchases,
        summary: {
          totalPurchases,
          totalSpent: Number(totalSpent.toFixed(2)),
          averageTicket: Number(averageTicket.toFixed(2)),
          firstPurchase,
          lastPurchase,
        },
      },
    };
  } catch (error) {
    console.error('Error getting customer purchase history:', error);
    return {
      status: 500,
      message: 'Error al obtener el historial de compras',
      data: null,
    };
  }
}

/**
 * Get customer segments by spending
 *
 * @param filters - Customer report filters
 * @returns ActionResponse with customer segments data
 */
export async function getCustomerSegments(
  filters: CustomerReportFilters
): Promise<ActionResponse<Array<{
  segment: string;
  customerCount: number;
  totalRevenue: number;
  averageSpent: number;
  percentage: number;
}>>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    // Get all customers with their total spending
    const topCustomersResponse = await getTopCustomers(filters);

    if (!topCustomersResponse.data) {
      return {
        status: 500,
        message: 'Error al obtener los datos de clientes',
        data: null,
      };
    }

    const customers = topCustomersResponse.data;

    if (customers.length === 0) {
      return {
        status: 200,
        message: 'No hay clientes en el período seleccionado',
        data: [],
      };
    }

    // Calculate total revenue
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

    // Define segments based on spending
    const sortedBySpent = [...customers].sort((a, b) => b.totalSpent - a.totalSpent);
    const totalCount = sortedBySpent.length;

    // VIP: Top 10% customers
    const vipCount = Math.max(1, Math.floor(totalCount * 0.1));
    const vipCustomers = sortedBySpent.slice(0, vipCount);
    const vipRevenue = vipCustomers.reduce((sum, c) => sum + c.totalSpent, 0);

    // Premium: Next 20% customers
    const premiumCount = Math.max(1, Math.floor(totalCount * 0.2));
    const premiumCustomers = sortedBySpent.slice(vipCount, vipCount + premiumCount);
    const premiumRevenue = premiumCustomers.reduce((sum, c) => sum + c.totalSpent, 0);

    // Regular: Next 40% customers
    const regularCount = Math.max(1, Math.floor(totalCount * 0.4));
    const regularCustomers = sortedBySpent.slice(vipCount + premiumCount, vipCount + premiumCount + regularCount);
    const regularRevenue = regularCustomers.reduce((sum, c) => sum + c.totalSpent, 0);

    // Occasional: Remaining customers
    const occasionalCustomers = sortedBySpent.slice(vipCount + premiumCount + regularCount);
    const occasionalRevenue = occasionalCustomers.reduce((sum, c) => sum + c.totalSpent, 0);

    const segments = [
      {
        segment: 'VIP',
        customerCount: vipCustomers.length,
        totalRevenue: Number(vipRevenue.toFixed(2)),
        averageSpent: vipCustomers.length > 0 ? Number((vipRevenue / vipCustomers.length).toFixed(2)) : 0,
        percentage: totalRevenue > 0 ? Number(((vipRevenue / totalRevenue) * 100).toFixed(2)) : 0,
      },
      {
        segment: 'Premium',
        customerCount: premiumCustomers.length,
        totalRevenue: Number(premiumRevenue.toFixed(2)),
        averageSpent: premiumCustomers.length > 0 ? Number((premiumRevenue / premiumCustomers.length).toFixed(2)) : 0,
        percentage: totalRevenue > 0 ? Number(((premiumRevenue / totalRevenue) * 100).toFixed(2)) : 0,
      },
      {
        segment: 'Regular',
        customerCount: regularCustomers.length,
        totalRevenue: Number(regularRevenue.toFixed(2)),
        averageSpent: regularCustomers.length > 0 ? Number((regularRevenue / regularCustomers.length).toFixed(2)) : 0,
        percentage: totalRevenue > 0 ? Number(((regularRevenue / totalRevenue) * 100).toFixed(2)) : 0,
      },
      {
        segment: 'Ocasional',
        customerCount: occasionalCustomers.length,
        totalRevenue: Number(occasionalRevenue.toFixed(2)),
        averageSpent: occasionalCustomers.length > 0 ? Number((occasionalRevenue / occasionalCustomers.length).toFixed(2)) : 0,
        percentage: totalRevenue > 0 ? Number(((occasionalRevenue / totalRevenue) * 100).toFixed(2)) : 0,
      },
    ];

    return {
      status: 200,
      message: 'Segmentos de clientes obtenidos exitosamente',
      data: segments,
    };
  } catch (error) {
    console.error('Error getting customer segments:', error);
    return {
      status: 500,
      message: 'Error al obtener los segmentos de clientes',
      data: null,
    };
  }
}
