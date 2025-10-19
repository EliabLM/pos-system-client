'use server';

import {
  startOfDay,
  endOfDay,
  format,
  parseISO,
  differenceInDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ActionResponse } from '@/interfaces';
import {
  InventoryReportFilters,
  StockSummary,
  StockMovementData,
} from '@/interfaces/reports';
import { prisma, checkOrgId, emptyOrgIdResponse } from '../utils';
import { Prisma } from '@/generated/prisma';

/**
 * Inventory Reports Server Actions
 *
 * Comprehensive server actions for inventory analytics and reporting.
 * All actions follow strict TypeScript typing (ZERO `any` types).
 */

// ===========================
// TYPE DEFINITIONS
// ===========================

/**
 * Stock status product data
 */
interface StockStatusProduct {
  productId: string;
  productName: string;
  sku: string | null;
  currentStock: number;
  minStock: number;
  costPrice: number;
  stockValue: number;
  category?: string;
  brand?: string;
  status: 'OK' | 'LOW' | 'OUT';
}

/**
 * Inventory valuation data
 */
interface InventoryValuationData {
  productId: string;
  productName: string;
  sku: string | null;
  currentStock: number;
  costPrice: number;
  totalValue: number;
  category?: string;
  brand?: string;
}

/**
 * Inventory rotation data
 */
interface InventoryRotationData {
  productId: string;
  productName: string;
  sku: string | null;
  currentStock: number;
  totalSold: number;
  daysInInventory: number;
  rotationRate: number;
  classification: 'A' | 'B' | 'C';
  category?: string;
  brand?: string;
}

/**
 * Movement summary data
 */
interface MovementSummary {
  totalMovements: number;
  totalIn: number;
  totalOut: number;
  totalAdjustments: number;
}

/**
 * Valuation summary data
 */
interface ValuationSummary {
  totalInventoryValue: number;
  totalProducts: number;
  valueByCategory: Record<string, number>;
  valueByBrand: Record<string, number>;
}

/**
 * Rotation summary data
 */
interface RotationSummary {
  averageRotationRate: number;
  fastMovingCount: number;
  slowMovingCount: number;
  noMovementCount: number;
}

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
 * Build base where clause for product queries
 */
function buildProductWhereClause(filters: InventoryReportFilters): Prisma.ProductWhereInput {
  const whereClause: Prisma.ProductWhereInput = {
    organizationId: filters.organizationId,
    isDeleted: false,
    isActive: true,
  };

  // Note: Product model doesn't have storeId field in this POS system
  // Products are organization-scoped, not store-scoped

  if (filters.categoryId) {
    whereClause.categoryId = filters.categoryId;
  }

  if (filters.brandId) {
    whereClause.brandId = filters.brandId;
  }

  if (filters.productId) {
    whereClause.id = filters.productId;
  }

  return whereClause;
}

/**
 * Determine stock status based on current and minimum stock levels
 */
function getStockStatus(currentStock: number, minStock: number): 'OK' | 'LOW' | 'OUT' {
  if (currentStock === 0) return 'OUT';
  if (currentStock <= minStock) return 'LOW';
  return 'OK';
}

/**
 * Calculate ABC classification based on rotation rate
 * A: Fast moving (rotation > 10)
 * B: Medium moving (rotation 5-10)
 * C: Slow moving (rotation < 5)
 */
function getABCClassification(rotationRate: number): 'A' | 'B' | 'C' {
  if (rotationRate >= 10) return 'A';
  if (rotationRate >= 5) return 'B';
  return 'C';
}

// ===========================
// SERVER ACTIONS
// ===========================

/**
 * Get stock status report with current inventory levels
 *
 * @param filters - Inventory report filters
 * @returns ActionResponse with stock status data
 */
export async function getStockStatusReport(
  filters: InventoryReportFilters
): Promise<ActionResponse<{
  summary: StockSummary;
  data: StockStatusProduct[];
  alerts: StockStatusProduct[];
}>> {
  try {
    // Validate organization ID
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const whereClause = buildProductWhereClause(filters);

    // Apply additional filters - filter in memory since we can't compare to minStock field directly
    // We'll fetch all products and filter programmatically

    // Fetch products with stock data
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: { id: true, name: true },
        },
        brand: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate summary metrics
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockLevel = 0;

    const data: StockStatusProduct[] = [];
    const alerts: StockStatusProduct[] = [];

    for (const product of products) {
      const currentStock = product.currentStock;
      const minStock = product.minStock;
      const costPrice = Number(product.costPrice);
      const stockValue = currentStock * costPrice;
      const status = getStockStatus(currentStock, minStock);

      // Apply filters programmatically
      if (filters.lowStock && status !== 'LOW' && status !== 'OUT') continue;
      if (filters.outOfStock && status !== 'OUT') continue;

      totalStockValue += stockValue;
      totalStockLevel += currentStock;

      if (status === 'OUT') {
        outOfStockCount++;
      } else if (status === 'LOW') {
        lowStockCount++;
      }

      const productData: StockStatusProduct = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock,
        minStock,
        costPrice,
        stockValue: Number(stockValue.toFixed(2)),
        category: product.category?.name,
        brand: product.brand?.name,
        status,
      };

      data.push(productData);

      // Add to alerts if low or out of stock
      if (status === 'LOW' || status === 'OUT') {
        alerts.push(productData);
      }
    }

    const averageStockLevel = products.length > 0 ? totalStockLevel / products.length : 0;

    const summary: StockSummary = {
      totalProducts: products.length,
      totalStockValue: Number(totalStockValue.toFixed(2)),
      lowStockCount,
      outOfStockCount,
      averageStockLevel: Number(averageStockLevel.toFixed(2)),
    };

    // Sort alerts by severity (OUT first, then LOW)
    alerts.sort((a, b) => {
      if (a.status === 'OUT' && b.status !== 'OUT') return -1;
      if (a.status !== 'OUT' && b.status === 'OUT') return 1;
      return 0;
    });

    return {
      status: 200,
      message: 'Reporte de estado de inventario generado exitosamente',
      data: { summary, data, alerts },
    };
  } catch (error) {
    console.error('Error generating stock status report:', error);
    return {
      status: 500,
      message: 'Error al generar el reporte de estado de inventario',
      data: null,
    };
  }
}

/**
 * Get stock movements report with detailed transaction history
 *
 * @param filters - Inventory report filters
 * @returns ActionResponse with stock movement data
 */
export async function getStockMovementsReport(
  filters: InventoryReportFilters
): Promise<ActionResponse<{
  summary: MovementSummary;
  data: StockMovementData[];
}>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    // Build where clause for stock movements
    const whereClause: Prisma.StockMovementWhereInput = {
      organizationId: filters.organizationId,
      createdAt: {
        gte: parseDate(filters.dateRange.startDate.toISOString()),
        lte: endOfDay(parseDate(filters.dateRange.endDate.toISOString())),
      },
    };

    if (filters.storeId) {
      whereClause.storeId = filters.storeId;
    }

    if (filters.productId) {
      whereClause.productId = filters.productId;
    }

    // Fetch stock movements
    const movements = await prisma.stockMovement.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    let totalIn = 0;
    let totalOut = 0;
    let totalAdjustments = 0;

    const data: StockMovementData[] = movements.map((movement) => {
      const quantity = movement.quantity;

      // Count by type
      if (movement.type === 'IN') {
        totalIn += quantity;
      } else if (movement.type === 'OUT') {
        totalOut += quantity;
      } else if (movement.type === 'ADJUSTMENT') {
        totalAdjustments += Math.abs(quantity);
      }

      return {
        movementId: movement.id,
        productId: movement.productId,
        productName: movement.product.name,
        type: movement.type as 'IN' | 'OUT' | 'ADJUSTMENT',
        quantity,
        previousStock: movement.previousStock,
        newStock: movement.newStock,
        reason: movement.reason || '',
        date: movement.createdAt,
        userName: movement.user
          ? `${movement.user.firstName} ${movement.user.lastName}`
          : 'Sistema',
      };
    });

    const summary: MovementSummary = {
      totalMovements: movements.length,
      totalIn,
      totalOut,
      totalAdjustments,
    };

    return {
      status: 200,
      message: 'Reporte de movimientos de inventario generado exitosamente',
      data: { summary, data },
    };
  } catch (error) {
    console.error('Error generating stock movements report:', error);
    return {
      status: 500,
      message: 'Error al generar el reporte de movimientos de inventario',
      data: null,
    };
  }
}

/**
 * Get inventory valuation report with total value by category and brand
 *
 * @param filters - Inventory report filters
 * @returns ActionResponse with inventory valuation data
 */
export async function getInventoryValuationReport(
  filters: InventoryReportFilters
): Promise<ActionResponse<{
  summary: ValuationSummary;
  data: InventoryValuationData[];
}>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const whereClause = buildProductWhereClause(filters);

    // Fetch products with stock and cost data
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: { id: true, name: true },
        },
        brand: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate valuation metrics
    let totalInventoryValue = 0;
    const valueByCategory: Record<string, number> = {};
    const valueByBrand: Record<string, number> = {};

    const data: InventoryValuationData[] = products.map((product) => {
      const currentStock = product.currentStock;
      const costPrice = Number(product.costPrice);
      const totalValue = currentStock * costPrice;

      totalInventoryValue += totalValue;

      // Aggregate by category
      const categoryName = product.category?.name || 'Sin Categoría';
      valueByCategory[categoryName] = (valueByCategory[categoryName] || 0) + totalValue;

      // Aggregate by brand
      const brandName = product.brand?.name || 'Sin Marca';
      valueByBrand[brandName] = (valueByBrand[brandName] || 0) + totalValue;

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock,
        costPrice,
        totalValue: Number(totalValue.toFixed(2)),
        category: product.category?.name,
        brand: product.brand?.name,
      };
    });

    // Sort by total value descending
    data.sort((a, b) => b.totalValue - a.totalValue);

    const summary: ValuationSummary = {
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      totalProducts: products.length,
      valueByCategory,
      valueByBrand,
    };

    return {
      status: 200,
      message: 'Reporte de valoración de inventario generado exitosamente',
      data: { summary, data },
    };
  } catch (error) {
    console.error('Error generating inventory valuation report:', error);
    return {
      status: 500,
      message: 'Error al generar el reporte de valoración de inventario',
      data: null,
    };
  }
}

/**
 * Get inventory rotation report with ABC analysis
 *
 * @param filters - Inventory report filters
 * @returns ActionResponse with inventory rotation data
 */
export async function getInventoryRotationReport(
  filters: InventoryReportFilters
): Promise<ActionResponse<{
  summary: RotationSummary;
  data: InventoryRotationData[];
}>> {
  try {
    if (checkOrgId(filters.organizationId)) return emptyOrgIdResponse();

    const whereClause = buildProductWhereClause(filters);

    // Fetch products with stock data
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: { name: true },
        },
        brand: {
          select: { name: true },
        },
        saleItems: {
          where: {
            isDeleted: false,
            sale: {
              isDeleted: false,
              saleDate: {
                gte: parseDate(filters.dateRange.startDate.toISOString()),
                lte: endOfDay(parseDate(filters.dateRange.endDate.toISOString())),
              },
            },
          },
          select: {
            quantity: true,
          },
        },
      },
    });

    // Calculate rotation metrics
    const daysDifference = differenceInDays(
      parseDate(filters.dateRange.endDate.toISOString()),
      parseDate(filters.dateRange.startDate.toISOString())
    ) || 1;

    let totalRotationRate = 0;
    let fastMovingCount = 0;
    let slowMovingCount = 0;
    let noMovementCount = 0;

    const data: InventoryRotationData[] = products.map((product) => {
      const currentStock = product.currentStock;
      const totalSold = product.saleItems.reduce((sum, item) => sum + item.quantity, 0);

      // Calculate rotation rate (times inventory turned over in the period)
      const averageInventory = (currentStock + totalSold) / 2;
      const rotationRate = averageInventory > 0 ? (totalSold / averageInventory) * (365 / daysDifference) : 0;

      // Calculate days in inventory
      const daysInInventory = rotationRate > 0 ? 365 / rotationRate : 0;

      // ABC Classification
      const classification = getABCClassification(rotationRate);

      totalRotationRate += rotationRate;

      if (rotationRate >= 10) {
        fastMovingCount++;
      } else if (rotationRate > 0) {
        slowMovingCount++;
      } else {
        noMovementCount++;
      }

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        currentStock,
        totalSold,
        daysInInventory: Number(daysInInventory.toFixed(0)),
        rotationRate: Number(rotationRate.toFixed(2)),
        classification,
        category: product.category?.name,
        brand: product.brand?.name,
      };
    });

    // Sort by rotation rate descending
    data.sort((a, b) => b.rotationRate - a.rotationRate);

    const averageRotationRate = products.length > 0 ? totalRotationRate / products.length : 0;

    const summary: RotationSummary = {
      averageRotationRate: Number(averageRotationRate.toFixed(2)),
      fastMovingCount,
      slowMovingCount,
      noMovementCount,
    };

    return {
      status: 200,
      message: 'Reporte de rotación de inventario generado exitosamente',
      data: { summary, data },
    };
  } catch (error) {
    console.error('Error generating inventory rotation report:', error);
    return {
      status: 500,
      message: 'Error al generar el reporte de rotación de inventario',
      data: null,
    };
  }
}
