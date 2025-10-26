'use server';

import {
  Purchase,
  PurchaseItem,
  Prisma,
  PurchaseStatus,
} from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import {
  prisma,
  checkAdminRole,
  unauthorizedResponse,
  checkOrgId,
  emptyOrgIdResponse,
} from '../utils';
import { createStockMovement } from '../stock-movement';

// PURCHASE INCLUDES
const purchaseInclude: Prisma.PurchaseInclude = {
  supplier: true,
  purchaseItems: {
    where: { isDeleted: false },
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          unitMeasure: true,
        },
      },
    },
  },
  _count: {
    select: { purchaseItems: true },
  },
};

// ===========================
// UTILITY FUNCTIONS
// ===========================

// GENERATE PURCHASE NUMBER
const generatePurchaseNumber = async (): Promise<string> => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  // Get the count of purchases created today
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));

  const count = await prisma.purchase.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequenceNumber = String(count + 1).padStart(4, '0');

  return `COMP-${dateStr}-${sequenceNumber}`;
};

// VALIDATE PURCHASE ITEMS
const validatePurchaseItems = (
  items: Omit<
    PurchaseItem,
    'id' | 'purchaseId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >[]
) => {
  if (!items || items.length === 0) {
    throw new Error('La compra debe tener al menos un item');
  }

  for (const item of items) {
    if (item.quantity <= 0) {
      throw new Error('La cantidad de cada item debe ser mayor a 0');
    }
    if (item.unitPrice < 0) {
      throw new Error('El precio unitario no puede ser negativo');
    }
  }
};

// CALCULATE PURCHASE TOTALS
export const calculatePurchaseTotals = async (
  items: { quantity: number; unitPrice: number }[]
) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  return { subtotal, total: subtotal }; // Se puede agregar lógica de descuentos/impuestos aquí
};

// ===========================
// PURCHASE ACTIONS
// ===========================

// CREATE PURCHASE
export const createPurchase = async (
  orgId: string,
  userId: string,
  purchaseData: Omit<
    Purchase,
    | 'id'
    | 'organizationId'
    | 'purchaseNumber'
    | 'createdAt'
    | 'updatedAt'
    | 'isDeleted'
    | 'deletedAt'
  >,
  purchaseItems: Omit<
    PurchaseItem,
    'id' | 'purchaseId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >[]
): Promise<ActionResponse<Purchase | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    validatePurchaseItems(purchaseItems);

    // Verificar que el proveedor existe y pertenece a la organización
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: purchaseData.supplierId,
        organizationId: orgId,
        isDeleted: false,
      },
    });

    if (!supplier) {
      return {
        status: 400,
        message: 'El proveedor especificado no existe',
        data: null,
      };
    }

    // Verificar productos
    const productIds = purchaseItems.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        organizationId: orgId,
        isDeleted: false,
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      return {
        status: 400,
        message: 'Uno o más productos no existen o están inactivos',
        data: null,
      };
    }

    // Calcular totales
    const { total } = await calculatePurchaseTotals(purchaseItems);

    // Generar número de compra
    const purchaseNumber = await generatePurchaseNumber();

    // Crear compra en transacción con timeout aumentado
    const newPurchase = await prisma.$transaction(
      async (tx) => {
        // Crear la compra
        const purchase = await tx.purchase.create({
          data: {
            ...purchaseData,
            organizationId: orgId,
            purchaseNumber,
            total,
          },
        });

        // Crear items de compra
        for (const itemData of purchaseItems) {
          await tx.purchaseItem.create({
            data: {
              ...itemData,
              purchaseId: purchase.id,
              subtotal: itemData.quantity * itemData.unitPrice,
            },
          });
        }

        return tx.purchase.findUnique({
          where: { id: purchase.id },
          include: purchaseInclude,
        });
      },
      {
        maxWait: 10000, // 10s
        timeout: 30000, // 30s
      }
    );

    return {
      status: 201,
      message: 'Compra creada exitosamente',
      data: newPurchase,
    };
  } catch (error) {
    console.error('Error creating purchase:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          status: 409,
          message: 'Ya existe una compra con ese número',
          data: null,
        };
      }
      if (error.code === 'P2003') {
        return {
          status: 400,
          message: 'Una de las referencias especificadas no existe',
          data: null,
        };
      }
    }

    if (error instanceof Error) {
      return {
        status: 400,
        message: error.message,
        data: null,
      };
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET PURCHASES BY ORG
export const getPurchasesByOrgId = async (
  orgId: string,
  filters?: {
    supplierId?: string;
    status?: PurchaseStatus;
    dateFrom?: Date | string;
    dateTo?: Date | string;
    search?: string;
    minAmount?: number;
    maxAmount?: number;
  },
  includeDeleted: boolean = false,
  pagination?: {
    page?: number;
    limit?: number;
  }
): Promise<ActionResponse<{ purchases: Purchase[]; total: number } | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.PurchaseWhereInput = {
      organizationId: orgId,
      isDeleted: includeDeleted ? undefined : false,
    };

    if (filters?.supplierId) {
      whereClause.supplierId = filters.supplierId;
    }

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      whereClause.purchaseDate = {};
      if (filters.dateFrom) {
        whereClause.purchaseDate.gte =
          typeof filters.dateFrom === 'string'
            ? new Date(filters.dateFrom)
            : filters.dateFrom;
      }
      if (filters.dateTo) {
        whereClause.purchaseDate.lte =
          typeof filters.dateTo === 'string'
            ? new Date(filters.dateTo)
            : filters.dateTo;
      }
    }

    // Filtro por rango de montos
    if (filters?.minAmount !== undefined || filters?.maxAmount !== undefined) {
      whereClause.total = {};
      if (filters.minAmount !== undefined) {
        whereClause.total.gte = filters.minAmount;
      }
      if (filters.maxAmount !== undefined) {
        whereClause.total.lte = filters.maxAmount;
      }
    }

    // Búsqueda por texto en número de compra, notas y nombre del proveedor
    if (filters?.search) {
      whereClause.OR = [
        { purchaseNumber: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
        {
          supplier: {
            name: { contains: filters.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const skip = (page - 1) * limit;

    const [total, purchases] = await Promise.all([
      prisma.purchase.count({ where: whereClause }),
      prisma.purchase.findMany({
        where: whereClause,
        include: purchaseInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      status: 200,
      message: 'Compras obtenidas exitosamente',
      data: { purchases, total },
    };
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// Definir el tipo de include sin where clauses para correcta inferencia de tipos
const purchaseIncludeForType = {
  supplier: true,
  purchaseItems: {
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          unitMeasure: true,
        },
      },
    },
  },
  _count: {
    select: { purchaseItems: true },
  },
} as const satisfies Prisma.PurchaseInclude;

// Tipo para compra con todas las relaciones incluidas
export type PurchaseWithRelations = Prisma.PurchaseGetPayload<{
  include: typeof purchaseIncludeForType;
}>;

// GET PURCHASE BY ID
export const getPurchaseById = async (
  purchaseId: string
): Promise<ActionResponse<PurchaseWithRelations | null>> => {
  try {
    if (!purchaseId) {
      return {
        status: 400,
        message: 'ID de compra es requerido',
        data: null,
      };
    }

    const purchase = await prisma.purchase.findFirst({
      where: { id: purchaseId, isDeleted: false },
      include: purchaseInclude,
    });

    if (!purchase) {
      return { status: 404, message: 'Compra no encontrada', data: null };
    }

    return {
      status: 200,
      message: 'Compra obtenida exitosamente',
      data: purchase as unknown as PurchaseWithRelations,
    };
  } catch (error) {
    console.error('Error fetching purchase:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET PURCHASE BY NUMBER
export const getPurchaseByNumber = async (
  orgId: string,
  purchaseNumber: string
): Promise<ActionResponse<PurchaseWithRelations | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    if (!purchaseNumber) {
      return {
        status: 400,
        message: 'Número de compra es requerido',
        data: null,
      };
    }

    const purchase = await prisma.purchase.findFirst({
      where: {
        organizationId: orgId,
        purchaseNumber,
        isDeleted: false,
      },
      include: purchaseInclude,
    });

    if (!purchase) {
      return { status: 404, message: 'Compra no encontrada', data: null };
    }

    return {
      status: 200,
      message: 'Compra obtenida exitosamente',
      data: purchase as unknown as PurchaseWithRelations,
    };
  } catch (error) {
    console.error('Error fetching purchase by number:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE PURCHASE
export const updatePurchase = async (
  purchaseId: string,
  userId: string,
  updateData: Partial<{
    notes: string;
  }>
): Promise<ActionResponse<Purchase | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!purchaseId) {
      return {
        status: 400,
        message: 'ID de compra es requerido',
        data: null,
      };
    }

    const existingPurchase = await prisma.purchase.findFirst({
      where: { id: purchaseId, isDeleted: false },
    });

    if (!existingPurchase) {
      return { status: 404, message: 'Compra no encontrada', data: null };
    }

    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: purchaseInclude,
    });

    return {
      status: 200,
      message: 'Compra actualizada exitosamente',
      data: updatedPurchase,
    };
  } catch (error) {
    console.error('Error updating purchase:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Compra no encontrada', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// RECEIVE PURCHASE - CRÍTICO: Actualiza stock y crea movimientos
export const receivePurchase = async (
  purchaseId: string,
  userId: string
): Promise<ActionResponse<Purchase | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!purchaseId) {
      return {
        status: 400,
        message: 'ID de compra es requerido',
        data: null,
      };
    }

    const existingPurchase = await prisma.purchase.findFirst({
      where: { id: purchaseId, isDeleted: false },
      include: { purchaseItems: { where: { isDeleted: false } } },
    });

    if (!existingPurchase) {
      return { status: 404, message: 'Compra no encontrada', data: null };
    }

    if (existingPurchase.status !== 'PENDING') {
      return {
        status: 400,
        message: `No se puede recibir una compra en estado ${existingPurchase.status}`,
        data: null,
      };
    }

    // Recibir compra y actualizar stock en transacción con timeout aumentado
    const receivedPurchase = await prisma.$transaction(
      async (tx) => {
        // Actualizar status de la compra
        await tx.purchase.update({
          where: { id: purchaseId },
          data: {
            status: 'RECEIVED',
            receivedDate: new Date(),
            updatedAt: new Date(),
          },
        });

        // Para cada purchaseItem, crear movimiento de stock y actualizar producto
        for (const item of existingPurchase.purchaseItems) {
          // Obtener stock actual del producto
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { currentStock: true },
          });

          if (!product) {
            throw new Error(`Producto ${item.productId} no encontrado`);
          }

          const previousStock = product.currentStock;
          const newStock = previousStock + item.quantity;

          // Crear movimiento de stock tipo IN
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              userId: userId,
              storeId: null, // Las compras son a nivel de organización, no de tienda específica
              type: 'IN',
              quantity: item.quantity,
              previousStock: previousStock,
              newStock: newStock,
              reason: `Recepción de compra ${existingPurchase.purchaseNumber}`,
              reference: purchaseId,
              organizationId: existingPurchase.organizationId,
            },
          });

          // Actualizar stock del producto
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: newStock,
              updatedAt: new Date(),
            },
          });
        }

        return tx.purchase.findUnique({
          where: { id: purchaseId },
          include: purchaseInclude,
        });
      },
      {
        maxWait: 10000, // 10s
        timeout: 30000, // 30s
      }
    );

    return {
      status: 200,
      message: 'Compra recibida exitosamente. El inventario ha sido actualizado.',
      data: receivedPurchase,
    };
  } catch (error) {
    console.error('Error receiving purchase:', error);

    if (error instanceof Error) {
      return {
        status: 400,
        message: error.message,
        data: null,
      };
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// CANCEL PURCHASE
export const cancelPurchase = async (
  purchaseId: string,
  userId: string,
  reason?: string
): Promise<ActionResponse<Purchase | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!purchaseId) {
      return {
        status: 400,
        message: 'ID de compra es requerido',
        data: null,
      };
    }

    const existingPurchase = await prisma.purchase.findFirst({
      where: { id: purchaseId, isDeleted: false },
    });

    if (!existingPurchase) {
      return { status: 404, message: 'Compra no encontrada', data: null };
    }

    if (existingPurchase.status === 'CANCELLED') {
      return {
        status: 400,
        message: 'La compra ya está cancelada',
        data: null,
      };
    }

    // Cancelar compra (NO revertir stock - decisión de negocio)
    const cancelledPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status: 'CANCELLED',
        notes: reason
          ? `${existingPurchase.notes || ''}\nCANCELADO: ${reason}`
          : existingPurchase.notes,
        updatedAt: new Date(),
      },
      include: purchaseInclude,
    });

    return {
      status: 200,
      message: 'Compra cancelada exitosamente',
      data: cancelledPurchase,
    };
  } catch (error) {
    console.error('Error cancelling purchase:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// SOFT DELETE PURCHASE
export const softDeletePurchase = async (
  purchaseId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!purchaseId) {
      return {
        status: 400,
        message: 'ID de compra es requerido',
        data: null,
      };
    }

    const existingPurchase = await prisma.purchase.findFirst({
      where: { id: purchaseId, isDeleted: false },
    });

    if (!existingPurchase) {
      return { status: 404, message: 'Compra no encontrada', data: null };
    }

    // Solo permitir eliminar compras PENDING
    if (existingPurchase.status !== 'PENDING') {
      return {
        status: 400,
        message: 'Solo se pueden eliminar compras en estado PENDING',
        data: null,
      };
    }

    await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Compra eliminada (soft) exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error soft deleting purchase:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// ===========================
// ANALYTICS AND REPORTS
// ===========================

// GET PURCHASES ANALYTICS
export const getPurchasesAnalytics = async (
  orgId: string,
  dateFrom?: Date | string,
  dateTo?: Date | string
): Promise<
  ActionResponse<{
    totalPurchases: number;
    totalSpent: number;
    averagePurchaseAmount: number;
    purchasesByStatus: {
      status: PurchaseStatus;
      count: number;
      total: number;
    }[];
  } | null>
> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.PurchaseWhereInput = {
      organizationId: orgId,
      isDeleted: false,
    };

    if (dateFrom || dateTo) {
      whereClause.purchaseDate = {};
      if (dateFrom) {
        whereClause.purchaseDate.gte =
          typeof dateFrom === 'string' ? new Date(dateFrom) : dateFrom;
      }
      if (dateTo) {
        whereClause.purchaseDate.lte =
          typeof dateTo === 'string' ? new Date(dateTo) : dateTo;
      }
    }

    // Agregaciones básicas
    const [totalStats, purchasesByStatus] = await Promise.all([
      prisma.purchase.aggregate({
        where: whereClause,
        _count: { id: true },
        _sum: { total: true },
        _avg: { total: true },
      }),
      prisma.purchase.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { id: true },
        _sum: { total: true },
      }),
    ]);

    return {
      status: 200,
      message: 'Analíticas de compras obtenidas exitosamente',
      data: {
        totalPurchases: totalStats._count.id,
        totalSpent: totalStats._sum.total || 0,
        averagePurchaseAmount: totalStats._avg.total || 0,
        purchasesByStatus: purchasesByStatus.map((item) => ({
          status: item.status,
          count: item._count.id,
          total: item._sum.total || 0,
        })),
      },
    };
  } catch (error) {
    console.error('Error fetching purchases analytics:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET PENDING PURCHASES
export const getPendingPurchases = async (
  orgId: string
): Promise<ActionResponse<Purchase[] | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const pendingPurchases = await prisma.purchase.findMany({
      where: {
        organizationId: orgId,
        isDeleted: false,
        status: 'PENDING',
      },
      include: purchaseInclude,
      orderBy: { purchaseDate: 'asc' },
    });

    return {
      status: 200,
      message: 'Compras pendientes obtenidas exitosamente',
      data: pendingPurchases,
    };
  } catch (error) {
    console.error('Error fetching pending purchases:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET RECEIVED PURCHASES
export const getReceivedPurchases = async (
  orgId: string
): Promise<ActionResponse<Purchase[] | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const receivedPurchases = await prisma.purchase.findMany({
      where: {
        organizationId: orgId,
        isDeleted: false,
        status: 'RECEIVED',
      },
      include: purchaseInclude,
      orderBy: { receivedDate: 'desc' },
    });

    return {
      status: 200,
      message: 'Compras recibidas obtenidas exitosamente',
      data: receivedPurchases,
    };
  } catch (error) {
    console.error('Error fetching received purchases:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
