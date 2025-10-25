'use server';

import {
  endOfDay,
  parseISO,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ActionResponse } from '@/interfaces';
import {
  CustomerReportFilters,
  CustomerSummary,
  TopCustomerData,
  CustomerRetentionData,
  CohortData,
  CustomerActivitySegment,
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

/**
 * Get customer retention analysis
 *
 * @param filters - Customer report filters
 * @returns ActionResponse with customer retention data
 */
export async function getCustomerRetention(
  filters: CustomerReportFilters
): Promise<ActionResponse<CustomerRetentionData>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const whereClause = buildCustomerWhereClause(filters);

    // Get all customers
    const allCustomers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        sales: {
          where: {
            isDeleted: false,
            saleDate: {
              gte: parseDate(filters.dateRange.startDate.toISOString()),
              lte: endOfDay(parseDate(filters.dateRange.endDate.toISOString())),
            },
          },
          orderBy: { saleDate: 'asc' },
        },
      },
    });

    // Calculate retention metrics
    let activeCustomers = 0;
    let inactiveCustomers = 0;
    let newCustomers = 0;
    let returningCustomers = 0;
    let totalDaysBetweenPurchases = 0;
    let purchaseGapsCount = 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const customer of allCustomers) {
      const sales = customer.sales;

      if (sales.length === 0) {
        inactiveCustomers++;
        continue;
      }

      // Check if customer is new (first purchase in period)
      const firstSale = sales[0];
      if (
        firstSale.saleDate >= parseDate(filters.dateRange.startDate.toISOString()) &&
        sales.length === 1
      ) {
        newCustomers++;
      } else if (sales.length > 1) {
        returningCustomers++;
      }

      // Check if active (purchased in last 30 days)
      const lastSale = sales[sales.length - 1];
      if (lastSale.saleDate >= thirtyDaysAgo) {
        activeCustomers++;
      } else {
        inactiveCustomers++;
      }

      // Calculate average days between purchases
      if (sales.length > 1) {
        for (let i = 1; i < sales.length; i++) {
          const daysBetween =
            (sales[i].saleDate.getTime() - sales[i - 1].saleDate.getTime()) /
            (1000 * 60 * 60 * 24);
          totalDaysBetweenPurchases += daysBetween;
          purchaseGapsCount++;
        }
      }
    }

    const totalCustomersWithSales = activeCustomers + inactiveCustomers;
    const retentionRate = totalCustomersWithSales > 0
      ? (activeCustomers / totalCustomersWithSales) * 100
      : 0;
    const churnRate = 100 - retentionRate;
    const averageDaysBetweenPurchases = purchaseGapsCount > 0
      ? totalDaysBetweenPurchases / purchaseGapsCount
      : 0;

    const retentionData: CustomerRetentionData = {
      retentionRate: Number(retentionRate.toFixed(2)),
      churnRate: Number(churnRate.toFixed(2)),
      activeCustomers,
      inactiveCustomers,
      newCustomers,
      returningCustomers,
      averageDaysBetweenPurchases: Number(averageDaysBetweenPurchases.toFixed(1)),
    };

    return {
      status: 200,
      message: 'Análisis de retención obtenido exitosamente',
      data: retentionData,
    };
  } catch (error) {
    console.error('Error getting customer retention:', error);
    return {
      status: 500,
      message: 'Error al obtener el análisis de retención',
      data: null,
    };
  }
}

/**
 * Get cohort analysis
 *
 * @param filters - Customer report filters
 * @returns ActionResponse with cohort analysis data
 */
export async function getCohortAnalysis(
  filters: CustomerReportFilters
): Promise<ActionResponse<CohortData[]>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    // Get all customers with their first purchase date
    const customers = await prisma.customer.findMany({
      where: {
        organizationId: filters.organizationId,
        isDeleted: false,
      },
      include: {
        sales: {
          where: {
            isDeleted: false,
          },
          orderBy: { saleDate: 'asc' },
          select: { saleDate: true },
        },
      },
    });

    // Group customers by cohort (month of first purchase)
    const cohortMap = new Map<string, {
      customers: Array<{ customerId: string; firstPurchase: Date; allPurchases: Date[] }>;
    }>();

    for (const customer of customers) {
      if (customer.sales.length === 0) continue;

      const firstPurchase = customer.sales[0].saleDate;
      const cohortKey = format(firstPurchase, 'yyyy-MM');

      const allPurchases = customer.sales.map(s => s.saleDate);

      const existing = cohortMap.get(cohortKey) || { customers: [] };
      existing.customers.push({
        customerId: customer.id,
        firstPurchase,
        allPurchases,
      });
      cohortMap.set(cohortKey, existing);
    }

    // Calculate retention for each cohort
    const cohortData: CohortData[] = [];

    for (const [cohortMonth, cohortInfo] of cohortMap.entries()) {
      const cohortSize = cohortInfo.customers.length;
      const cohortStartDate = parseISO(`${cohortMonth}-01`);

      // Calculate retention for up to 12 months
      const retentionByMonth: CohortData['retentionByMonth'] = [];

      for (let monthOffset = 0; monthOffset <= 12; monthOffset++) {
        const monthStart = new Date(
          cohortStartDate.getFullYear(),
          cohortStartDate.getMonth() + monthOffset,
          1
        );
        const monthEnd = new Date(
          cohortStartDate.getFullYear(),
          cohortStartDate.getMonth() + monthOffset + 1,
          0
        );

        // Count customers who made a purchase in this month
        let retainedCount = 0;
        for (const customer of cohortInfo.customers) {
          const hadPurchaseInMonth = customer.allPurchases.some(
            purchaseDate =>
              purchaseDate >= monthStart && purchaseDate <= monthEnd
          );
          if (hadPurchaseInMonth) {
            retainedCount++;
          }
        }

        const retentionRate = cohortSize > 0 ? (retainedCount / cohortSize) * 100 : 0;

        retentionByMonth.push({
          month: monthOffset,
          monthLabel: format(monthStart, 'MMM yyyy', { locale: es }),
          retainedCustomers: retainedCount,
          retentionRate: Number(retentionRate.toFixed(2)),
        });
      }

      cohortData.push({
        cohortMonth,
        cohortSize,
        retentionByMonth,
      });
    }

    // Sort by cohort month descending (most recent first)
    cohortData.sort((a, b) => b.cohortMonth.localeCompare(a.cohortMonth));

    // Limit to last 12 cohorts
    const limitedCohortData = cohortData.slice(0, 12);

    return {
      status: 200,
      message: 'Análisis de cohortes obtenido exitosamente',
      data: limitedCohortData,
    };
  } catch (error) {
    console.error('Error getting cohort analysis:', error);
    return {
      status: 500,
      message: 'Error al obtener el análisis de cohortes',
      data: null,
    };
  }
}

/**
 * Get customer activity segments
 *
 * @param filters - Customer report filters
 * @returns ActionResponse with customer activity segments
 */
export async function getCustomerActivitySegments(
  filters: CustomerReportFilters
): Promise<ActionResponse<CustomerActivitySegment[]>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    // Get all customers with their sales
    const customers = await prisma.customer.findMany({
      where: {
        organizationId: filters.organizationId,
        isDeleted: false,
      },
      include: {
        sales: {
          where: {
            isDeleted: false,
            saleDate: {
              gte: parseDate(filters.dateRange.startDate.toISOString()),
              lte: endOfDay(parseDate(filters.dateRange.endDate.toISOString())),
            },
          },
          orderBy: { saleDate: 'desc' },
        },
      },
    });

    const now = new Date();

    // Segment customers by recency
    const segments = {
      active: [] as Array<{ totalSpent: number }>,      // Last 30 days
      occasional: [] as Array<{ totalSpent: number }>,  // 30-90 days
      dormant: [] as Array<{ totalSpent: number }>,     // 90-180 days
      inactive: [] as Array<{ totalSpent: number }>,    // 180+ days
      new: [] as Array<{ totalSpent: number }>,         // No purchases
    };

    for (const customer of customers) {
      if (customer.sales.length === 0) {
        segments.new.push({ totalSpent: 0 });
        continue;
      }

      const lastPurchase = customer.sales[0].saleDate;
      const daysSinceLastPurchase =
        (now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);

      const totalSpent = customer.sales.reduce((sum, sale) => sum + Number(sale.total), 0);

      if (daysSinceLastPurchase <= 30) {
        segments.active.push({ totalSpent });
      } else if (daysSinceLastPurchase <= 90) {
        segments.occasional.push({ totalSpent });
      } else if (daysSinceLastPurchase <= 180) {
        segments.dormant.push({ totalSpent });
      } else {
        segments.inactive.push({ totalSpent });
      }
    }

    const totalCustomers = customers.length;

    const segmentData: CustomerActivitySegment[] = [
      {
        segment: 'Activos (0-30 días)',
        customerCount: segments.active.length,
        percentage: totalCustomers > 0 ? Number(((segments.active.length / totalCustomers) * 100).toFixed(2)) : 0,
        averageSpent: segments.active.length > 0
          ? Number((segments.active.reduce((sum, c) => sum + c.totalSpent, 0) / segments.active.length).toFixed(2))
          : 0,
        daysSinceLastPurchase: 15,
      },
      {
        segment: 'Ocasionales (30-90 días)',
        customerCount: segments.occasional.length,
        percentage: totalCustomers > 0 ? Number(((segments.occasional.length / totalCustomers) * 100).toFixed(2)) : 0,
        averageSpent: segments.occasional.length > 0
          ? Number((segments.occasional.reduce((sum, c) => sum + c.totalSpent, 0) / segments.occasional.length).toFixed(2))
          : 0,
        daysSinceLastPurchase: 60,
      },
      {
        segment: 'Dormidos (90-180 días)',
        customerCount: segments.dormant.length,
        percentage: totalCustomers > 0 ? Number(((segments.dormant.length / totalCustomers) * 100).toFixed(2)) : 0,
        averageSpent: segments.dormant.length > 0
          ? Number((segments.dormant.reduce((sum, c) => sum + c.totalSpent, 0) / segments.dormant.length).toFixed(2))
          : 0,
        daysSinceLastPurchase: 135,
      },
      {
        segment: 'Inactivos (180+ días)',
        customerCount: segments.inactive.length,
        percentage: totalCustomers > 0 ? Number(((segments.inactive.length / totalCustomers) * 100).toFixed(2)) : 0,
        averageSpent: segments.inactive.length > 0
          ? Number((segments.inactive.reduce((sum, c) => sum + c.totalSpent, 0) / segments.inactive.length).toFixed(2))
          : 0,
        daysSinceLastPurchase: 270,
      },
      {
        segment: 'Nuevos (sin compras)',
        customerCount: segments.new.length,
        percentage: totalCustomers > 0 ? Number(((segments.new.length / totalCustomers) * 100).toFixed(2)) : 0,
        averageSpent: 0,
      },
    ];

    return {
      status: 200,
      message: 'Segmentos de actividad obtenidos exitosamente',
      data: segmentData,
    };
  } catch (error) {
    console.error('Error getting customer activity segments:', error);
    return {
      status: 500,
      message: 'Error al obtener los segmentos de actividad',
      data: null,
    };
  }
}
