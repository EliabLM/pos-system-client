'use server';

import { startOfDay, endOfDay, subDays } from 'date-fns';
import { TopProduct, ActionResponse } from '@/interfaces';
import { prisma, checkOrgId, emptyOrgIdResponse } from '../utils';

/**
 * Retrieves the best-selling products with detailed metrics for a given period.
 *
 * @param organizationId - Organization ID to filter sales (required)
 * @param period - Time period for analysis ('today', 'week', 'month', 'year')
 * @param storeId - Optional store ID to filter sales by specific store
 * @param limit - Maximum number of top products to return (default: 10)
 * @returns ActionResponse with TopProduct[] data sorted by revenue
 */
export const getTopProducts = async (
  organizationId: string,
  period: 'today' | 'week' | 'month' | 'year',
  storeId?: string | null,
  limit: number = 10
): Promise<ActionResponse<TopProduct[]>> => {
  try {
    // Validate organization ID
    if (checkOrgId(organizationId)) return emptyOrgIdResponse();

    // Validate limit is a positive number
    const sanitizedLimit = Math.max(1, Math.floor(limit));

    // Calculate date range based on period
    const today = new Date();
    let startDate: Date;
    const endDate: Date = endOfDay(today);

    switch (period) {
      case 'today':
        startDate = startOfDay(today);
        break;
      case 'week':
        startDate = startOfDay(subDays(today, 7));
        break;
      case 'month':
        startDate = startOfDay(subDays(today, 30));
        break;
      case 'year':
        startDate = startOfDay(subDays(today, 365));
        break;
      default:
        startDate = startOfDay(today);
    }

    // Query all sale items with filters and related data
    const saleItems = await prisma.saleItem.findMany({
      where: {
        isDeleted: false,
        sale: {
          organizationId,
          ...(storeId && { storeId }),
          isDeleted: false,
          status: 'PAID',
          saleDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        sale: {
          select: {
            id: true,
            saleDate: true,
          },
        },
        product: {
          include: {
            category: {
              select: { name: true },
            },
            brand: {
              select: { name: true },
            },
          },
        },
      },
    });

    // If no sale items found, return empty array
    if (saleItems.length === 0) {
      return {
        status: 200,
        message: 'No se encontraron productos vendidos en el período seleccionado',
        data: [],
      };
    }

    // Group by product and calculate metrics
    const productMap = new Map<
      string,
      {
        product: typeof saleItems[0]['product'];
        quantitySold: number;
        totalRevenue: number;
        saleIds: Set<string>;
        profitMargin: number;
      }
    >();

    for (const item of saleItems) {
      const productId = item.productId;
      const existing = productMap.get(productId);

      if (existing) {
        // Add to existing product data
        existing.quantitySold += item.quantity;
        existing.totalRevenue += Number(item.subtotal);
        existing.saleIds.add(item.saleId);

        // Calculate profit margin: (salePrice - costPrice) * quantity
        const profit =
          (Number(item.product.salePrice) - Number(item.product.costPrice)) *
          item.quantity;
        existing.profitMargin += profit;
      } else {
        // Create new product entry
        const profit =
          (Number(item.product.salePrice) - Number(item.product.costPrice)) *
          item.quantity;

        productMap.set(productId, {
          product: item.product,
          quantitySold: item.quantity,
          totalRevenue: Number(item.subtotal),
          saleIds: new Set([item.saleId]),
          profitMargin: profit,
        });
      }
    }

    // Calculate total revenue for percentage calculation
    const totalRevenue = Array.from(productMap.values()).reduce(
      (sum, item) => sum + item.totalRevenue,
      0
    );

    // Convert to TopProduct array
    const topProducts: TopProduct[] = Array.from(productMap.entries()).map(
      ([productId, data]) => ({
        productId,
        productName: data.product.name,
        productImage: data.product.image,
        quantitySold: data.quantitySold,
        totalRevenue: data.totalRevenue,
        numberOfSales: data.saleIds.size,
        percentageOfTotal:
          totalRevenue > 0
            ? Number(((data.totalRevenue / totalRevenue) * 100).toFixed(2))
            : 0,
        categoryName: data.product.category?.name,
        brandName: data.product.brand?.name,
        currentStock: data.product.currentStock,
      })
    );

    // Sort by totalRevenue DESC and limit
    topProducts.sort((a, b) => b.totalRevenue - a.totalRevenue);
    const limitedProducts = topProducts.slice(0, sanitizedLimit);

    return {
      status: 200,
      message: 'Top productos obtenidos exitosamente',
      data: limitedProducts,
    };
  } catch (error) {
    console.error('Error fetching top products:', error);
    return {
      status: 500,
      message: 'Error interno del servidor',
      data: null,
    };
  }
};
