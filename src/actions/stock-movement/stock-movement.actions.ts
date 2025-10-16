'use server';

import { StockMovement, Prisma, StockMovementType } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import {
  prisma,
  checkAdminRole,
  unauthorizedResponse,
  checkOrgId,
  emptyOrgIdResponse,
} from '../utils';

const stockMovementInclude = {
  organization: true,
  product: {
    include: {
      brand: true,
      category: true,
      unitMeasure: true,
    },
  },
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.StockMovementInclude;

// Type for StockMovement with includes
export type StockMovementWithRelations = Prisma.StockMovementGetPayload<{
  include: typeof stockMovementInclude;
}>;

// CREATE
export const createStockMovement = async (
  orgId: string,
  userId: string,
  stockMovementData: Omit<
    StockMovement,
    'id' | 'organizationId' | 'createdAt' | 'previousStock' | 'newStock'
  >
): Promise<ActionResponse<StockMovement | null>> => {
  try {

    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    // Verificar que el producto existe y pertenece a la organización
    const product = await prisma.product.findFirst({
      where: {
        id: stockMovementData.productId,
        organizationId: orgId,
        isDeleted: false,
      },
    });

    if (!product) {
      return {
        status: 400,
        message: 'El producto especificado no existe o no pertenece a la organización',
        data: null,
      };
    }

    // Validar cantidad
    if (stockMovementData.quantity <= 0) {
      return {
        status: 400,
        message: 'La cantidad debe ser mayor a 0',
        data: null,
      };
    }

    // Calcular nuevo stock basado en el tipo de movimiento
    let newStock: number;
    const currentStock = product.currentStock;

    switch (stockMovementData.type) {
      case 'IN':
        newStock = currentStock + stockMovementData.quantity;
        break;
      case 'OUT':
        newStock = currentStock - stockMovementData.quantity;
        if (newStock < 0) {
          return {
            status: 400,
            message: 'No hay suficiente stock disponible para este movimiento',
            data: null,
          };
        }
        break;
      case 'ADJUSTMENT':
        newStock = stockMovementData.quantity;
        break;
      default:
        return {
          status: 400,
          message: 'Tipo de movimiento de stock inválido',
          data: null,
        };
    }

    // Crear el movimiento de stock y actualizar el producto en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear el movimiento de stock
      const newStockMovement = await tx.stockMovement.create({
        data: {
          ...stockMovementData,
          organizationId: orgId,
          previousStock: currentStock,
          newStock: newStock,
        },
        include: stockMovementInclude,
      });

      // Actualizar el stock del producto
      await tx.product.update({
        where: { id: stockMovementData.productId },
        data: {
          currentStock: newStock,
          updatedAt: new Date(),
        },
      });

      return newStockMovement;
    });

    return {
      status: 201,
      message: 'Movimiento de stock creado exitosamente',
      data: result,
    };
  } catch (error) {
    console.error('Error creating stock movement:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return {
          status: 400,
          message: 'Una de las referencias especificadas no existe',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET MANY
export const getStockMovementsByOrgId = async (
  orgId: string,
  filters?: {
    productId?: string;
    type?: StockMovementType;
    userId?: string;
    storeId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
  },
  pagination?: {
    page?: number;
    limit?: number;
  }
): Promise<ActionResponse<{ movements: StockMovement[]; total: number } | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.StockMovementWhereInput = {
      organizationId: orgId,
    };

    if (filters?.productId) {
      whereClause.productId = filters.productId;
    }

    if (filters?.type) {
      whereClause.type = filters.type;
    }

    if (filters?.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters?.storeId) {
      whereClause.storeId = filters.storeId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      whereClause.createdAt = {};
      if (filters.dateFrom) {
        whereClause.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        whereClause.createdAt.lte = filters.dateTo;
      }
    }

    if (filters?.search) {
      whereClause.OR = [
        { reason: { contains: filters.search, mode: 'insensitive' } },
        { reference: { contains: filters.search, mode: 'insensitive' } },
        {
          product: {
            name: { contains: filters.search, mode: 'insensitive' },
          },
        },
      ];
    }

    // Configuración de paginación
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const skip = (page - 1) * limit;

    // Obtener total de registros
    const total = await prisma.stockMovement.count({
      where: whereClause,
    });

    // Obtener movimientos
    const movements = await prisma.stockMovement.findMany({
      where: whereClause,
      include: stockMovementInclude,
      orderBy: { createdAt: 'desc' },
      skip: skip,
      take: limit,
    });

    return {
      status: 200,
      message: 'Movimientos de stock obtenidos exitosamente',
      data: { movements, total },
    };
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET ONE
export const getStockMovementById = async (
  movementId: string
): Promise<ActionResponse<StockMovementWithRelations | null>> => {
  try {
    if (!movementId)
      return {
        status: 400,
        message: 'ID del movimiento de stock es requerido',
        data: null,
      };

    const movement = await prisma.stockMovement.findUnique({
      where: { id: movementId },
      include: stockMovementInclude,
    });

    if (!movement)
      return { status: 404, message: 'Movimiento de stock no encontrado', data: null };

    return {
      status: 200,
      message: 'Movimiento de stock obtenido exitosamente',
      data: movement,
    };
  } catch (error) {
    console.error('Error fetching stock movement:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET BY PRODUCT
export const getStockMovementsByProductId = async (
  orgId: string,
  productId: string,
  pagination?: {
    page?: number;
    limit?: number;
  }
): Promise<ActionResponse<{ movements: StockMovement[]; total: number } | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    if (!productId)
      return {
        status: 400,
        message: 'ID del producto es requerido',
        data: null,
      };

    // Verificar que el producto existe y pertenece a la organización
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        organizationId: orgId,
        isDeleted: false,
      },
    });

    if (!product) {
      return {
        status: 404,
        message: 'Producto no encontrado',
        data: null,
      };
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const skip = (page - 1) * limit;

    const total = await prisma.stockMovement.count({
      where: {
        organizationId: orgId,
        productId: productId,
      },
    });

    const movements = await prisma.stockMovement.findMany({
      where: {
        organizationId: orgId,
        productId: productId,
      },
      include: stockMovementInclude,
      orderBy: { createdAt: 'desc' },
      skip: skip,
      take: limit,
    });

    return {
      status: 200,
      message: 'Movimientos de stock del producto obtenidos exitosamente',
      data: { movements, total },
    };
  } catch (error) {
    console.error('Error fetching stock movements by product:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE
export const updateStockMovement = async (
  movementId: string,
  userId: string,
  updateData: Partial<{
    reason: string;
    reference: string;
    storeId: string;
  }>
): Promise<ActionResponse<StockMovement | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!movementId)
      return {
        status: 400,
        message: 'ID del movimiento de stock es requerido',
        data: null,
      };

    // Verificar que el movimiento existe
    const existingMovement = await prisma.stockMovement.findUnique({
      where: { id: movementId },
    });

    if (!existingMovement) {
      return { status: 404, message: 'Movimiento de stock no encontrado', data: null };
    }

    // Solo permitir actualizar campos específicos (no cantidad, tipo, etc.)
    const allowedUpdates = {
      reason: updateData.reason,
      reference: updateData.reference,
      storeId: updateData.storeId,
    };

    // Remover campos undefined
    const cleanUpdates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(cleanUpdates).length === 0) {
      return {
        status: 400,
        message: 'No hay campos válidos para actualizar',
        data: null,
      };
    }

    const updatedMovement = await prisma.stockMovement.update({
      where: { id: movementId },
      data: cleanUpdates,
      include: stockMovementInclude,
    });

    return {
      status: 200,
      message: 'Movimiento de stock actualizado exitosamente',
      data: updatedMovement,
    };
  } catch (error) {
    console.error('Error updating stock movement:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Movimiento de stock no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET STOCK SUMMARY BY PRODUCT
export const getStockSummaryByProduct = async (
  orgId: string,
  productId: string
): Promise<ActionResponse<{
  currentStock: number;
  totalIn: number;
  totalOut: number;
  recentMovements: StockMovement[];
} | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    if (!productId)
      return {
        status: 400,
        message: 'ID del producto es requerido',
        data: null,
      };

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        organizationId: orgId,
        isDeleted: false,
      },
    });

    if (!product) {
      return {
        status: 404,
        message: 'Producto no encontrado',
        data: null,
      };
    }

    // Calcular totales de entrada y salida
    const [totalInResult, totalOutResult, recentMovements] = await Promise.all([
      prisma.stockMovement.aggregate({
        where: {
          organizationId: orgId,
          productId: productId,
          type: {
            in: ['IN'],
          },
        },
        _sum: {
          quantity: true,
        },
      }),
      prisma.stockMovement.aggregate({
        where: {
          organizationId: orgId,
          productId: productId,
          type: {
            in: ['OUT'],
          },
        },
        _sum: {
          quantity: true,
        },
      }),
      prisma.stockMovement.findMany({
        where: {
          organizationId: orgId,
          productId: productId,
        },
        include: stockMovementInclude,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      status: 200,
      message: 'Resumen de stock obtenido exitosamente',
      data: {
        currentStock: product.currentStock,
        totalIn: totalInResult._sum.quantity || 0,
        totalOut: totalOutResult._sum.quantity || 0,
        recentMovements,
      },
    };
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// DELETE (Solo permitido si no afecta integridad de datos)
export const deleteStockMovement = async (
  movementId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!movementId)
      return {
        status: 400,
        message: 'ID del movimiento de stock es requerido',
        data: null,
      };

    const movement = await prisma.stockMovement.findUnique({
      where: { id: movementId },
      include: {
        product: true,
      },
    });

    if (!movement) {
      return { status: 404, message: 'Movimiento de stock no encontrado', data: null };
    }

    // Verificar si es el último movimiento del producto
    const lastMovement = await prisma.stockMovement.findFirst({
      where: {
        productId: movement.productId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastMovement?.id !== movementId) {
      return {
        status: 409,
        message: 'Solo se puede eliminar el último movimiento de stock registrado',
        data: null,
      };
    }

    // Revertir el stock del producto y eliminar el movimiento en una transacción
    await prisma.$transaction(async (tx) => {
      // Revertir el stock del producto
      await tx.product.update({
        where: { id: movement.productId },
        data: {
          currentStock: movement.previousStock,
          updatedAt: new Date(),
        },
      });

      // Eliminar el movimiento
      await tx.stockMovement.delete({
        where: { id: movementId },
      });
    });

    return {
      status: 200,
      message: 'Movimiento de stock eliminado exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error deleting stock movement:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Movimiento de stock no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET MOVEMENTS BY DATE RANGE
export const getStockMovementsByDateRange = async (
  orgId: string,
  dateFrom: Date,
  dateTo: Date,
  filters?: {
    productId?: string;
    type?: StockMovementType;
  }
): Promise<ActionResponse<StockMovement[] | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.StockMovementWhereInput = {
      organizationId: orgId,
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    if (filters?.productId) {
      whereClause.productId = filters.productId;
    }

    if (filters?.type) {
      whereClause.type = filters.type;
    }

    const movements = await prisma.stockMovement.findMany({
      where: whereClause,
      include: stockMovementInclude,
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 200,
      message: 'Movimientos de stock por rango de fecha obtenidos exitosamente',
      data: movements,
    };
  } catch (error) {
    console.error('Error fetching stock movements by date range:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET STOCK ANALYTICS
export const getStockAnalytics = async (
  orgId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<ActionResponse<{
  movementsByType: { type: StockMovementType; count: number; totalQuantity: number }[];
  movementsByDate: { date: string; totalIn: number; totalOut: number }[];
  topMovedProducts: { productId: string; productName: string; totalMovements: number }[];
} | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.StockMovementWhereInput = {
      organizationId: orgId,
    };

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = dateFrom;
      if (dateTo) whereClause.createdAt.lte = dateTo;
    }

    // Agregaciones por tipo
    const movementsByType = await prisma.stockMovement.groupBy({
      by: ['type'],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        quantity: true,
      },
    });

    // Productos con más movimientos
    const topMovedProducts = await prisma.stockMovement.groupBy({
      by: ['productId'],
      where: whereClause,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Obtener información de productos
    const productIds = topMovedProducts.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const productMap = new Map(products.map(p => [p.id, p.name]));

    return {
      status: 200,
      message: 'Analíticas de stock obtenidas exitosamente',
      data: {
        movementsByType: movementsByType.map(item => ({
          type: item.type,
          count: item._count.id,
          totalQuantity: item._sum.quantity || 0,
        })),
        movementsByDate: [], // Se podría implementar una agregación por fecha si es necesario
        topMovedProducts: topMovedProducts.map(item => ({
          productId: item.productId,
          productName: productMap.get(item.productId) || 'Producto desconocido',
          totalMovements: item._count.id,
        })),
      },
    };
  } catch (error) {
    console.error('Error fetching stock analytics:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
