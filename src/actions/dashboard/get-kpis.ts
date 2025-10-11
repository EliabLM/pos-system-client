'use server';

import { startOfDay, endOfDay, subDays } from 'date-fns';
import { DashboardKPIs, ActionResponse } from '@/interfaces';
import { prisma, checkOrgId, emptyOrgIdResponse } from '../utils';
import { Prisma } from '@/generated/prisma';

/**
 * Calculates dashboard KPIs comparing today's sales with yesterday's.
 *
 * @param organizationId - Organization ID to filter sales
 * @param storeId - Optional store ID to filter sales by specific store
 * @returns ActionResponse with DashboardKPIs data
 */
export const getDashboardKPIs = async (
  organizationId: string,
  storeId?: string | null
): Promise<ActionResponse<DashboardKPIs>> => {
  try {
    // Validate organization ID
    if (checkOrgId(organizationId)) return emptyOrgIdResponse();

    // Define date ranges for today and yesterday
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const yesterdayStart = startOfDay(subDays(new Date(), 1));
    const yesterdayEnd = endOfDay(subDays(new Date(), 1));

    // Base where clause for queries
    const baseWhereClause: Prisma.SaleWhereInput = {
      organizationId,
      isDeleted: false,
      status: 'PAID', // Only count paid sales
    };

    // Add store filter if provided
    if (storeId) {
      baseWhereClause.storeId = storeId;
    }

    // Create where clauses for today and yesterday
    const todayWhereClause: Prisma.SaleWhereInput = {
      ...baseWhereClause,
      saleDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    };

    const yesterdayWhereClause: Prisma.SaleWhereInput = {
      ...baseWhereClause,
      saleDate: {
        gte: yesterdayStart,
        lte: yesterdayEnd,
      },
    };

    // Execute queries in parallel for performance
    const [todayStats, yesterdayStats] = await Promise.all([
      prisma.sale.aggregate({
        where: todayWhereClause,
        _count: { id: true },
        _sum: { total: true },
        _avg: { total: true },
      }),
      prisma.sale.aggregate({
        where: yesterdayWhereClause,
        _count: { id: true },
        _sum: { total: true },
        _avg: { total: true },
      }),
    ]);

    // Extract today's metrics
    const totalSales = todayStats._sum.total || 0;
    const totalTransactions = todayStats._count.id;
    const averageTicket = todayStats._avg.total || 0;

    // Extract yesterday's metrics
    const yesterdayTotalSales = yesterdayStats._sum.total || 0;
    const yesterdayTotalTransactions = yesterdayStats._count.id;
    const yesterdayAverageTicket = yesterdayStats._avg.total || 0;

    // Calculate percentage changes (handle division by zero)
    const salesChange = yesterdayTotalSales === 0
      ? (totalSales > 0 ? 100 : 0)
      : Number((((totalSales - yesterdayTotalSales) / yesterdayTotalSales) * 100).toFixed(2));

    const transactionsChange = yesterdayTotalTransactions === 0
      ? (totalTransactions > 0 ? 100 : 0)
      : Number((((totalTransactions - yesterdayTotalTransactions) / yesterdayTotalTransactions) * 100).toFixed(2));

    const averageTicketChange = yesterdayAverageTicket === 0
      ? (averageTicket > 0 ? 100 : 0)
      : Number((((averageTicket - yesterdayAverageTicket) / yesterdayAverageTicket) * 100).toFixed(2));

    // Build response data
    const kpiData: DashboardKPIs = {
      totalSales,
      totalRevenue: totalSales, // Alias for clarity
      totalTransactions,
      averageTicket,
      salesChange,
      transactionsChange,
      averageTicketChange,
    };

    return {
      status: 200,
      message: 'KPIs del dashboard obtenidos exitosamente',
      data: kpiData,
    };
  } catch (error) {
    console.error('Error fetching dashboard KPIs:', error);
    return {
      status: 500,
      message: 'Error interno del servidor',
      data: null,
    };
  }
};
