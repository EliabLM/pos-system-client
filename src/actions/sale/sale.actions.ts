'use server';

import {
  Sale,
  SaleItem,
  SalePayment,
  Prisma,
  SaleStatus,
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

// SALE INCLUDES
const saleInclude: Prisma.SaleInclude = {
  store: true,
  customer: true, // Include complete customer data for detail view
  user: true, // Include complete user data for detail view
  saleItems: {
    where: {
      isDeleted: false,
    },
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          unitMeasure: true,
        },
      },
      unitMeasure: true,
    },
  },
  salePayments: {
    where: {
      isDeleted: false,
    },
    include: {
      paymentMethod: true,
    },
  },
  _count: {
    select: {
      saleItems: true,
      salePayments: true,
    },
  },
};

// UTILITY FUNCTIONS
const generateSaleNumber = async (storeId: string): Promise<string> => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  let nextNumber: number = 1;

  if (store?.lastSaleNumber) {
    nextNumber = store.lastSaleNumber + 1;
  }

  return `${store?.saleNumberPrefix}-${String(nextNumber).padStart(6, '0')}`;
};

const validateSaleItems = (
  items: Omit<
    SaleItem,
    'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >[]
) => {
  if (!items || items.length === 0) {
    throw new Error('La venta debe tener al menos un item');
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

export const calculateSaleTotals = async (
  items: { quantity: number; unitPrice: number }[]
) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  return { subtotal, total: subtotal }; // Se puede agregar lógica de descuentos/impuestos aquí
};

// ===========================
// SALE ACTIONS
// ===========================

// CREATE SALE
export const createSale = async (
  orgId: string,
  userId: string,
  saleData: Omit<
    Sale,
    | 'id'
    | 'organizationId'
    | 'saleNumber'
    | 'createdAt'
    | 'updatedAt'
    | 'isDeleted'
    | 'deletedAt'
  >,
  saleItems: Omit<
    SaleItem,
    'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >[],
  salePayments?: Omit<
    SalePayment,
    'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >[]
): Promise<ActionResponse<Sale | null>> => {
  try {


    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    validateSaleItems(saleItems);

    // Verificar que la tienda existe y pertenece a la organización
    const store = await prisma.store.findFirst({
      where: {
        id: saleData.storeId,
        organizationId: orgId,
        isDeleted: false,
      },
    });

    if (!store) {
      return {
        status: 400,
        message: 'La tienda especificada no existe',
        data: null,
      };
    }

    // Verificar cliente si se especifica
    // if (saleData.customerId) {
    //   const customer = await prisma.customer.findFirst({
    //     where: {
    //       id: saleData.customerId,
    //       organizationId: orgId,
    //       isDeleted: false,
    //     },
    //   });

    //   if (!customer) {
    //     return {
    //       status: 400,
    //       message: 'El cliente especificado no existe',
    //       data: null,
    //     };
    //   }
    // }

    // Verificar productos y stock disponible
    const productIds = saleItems.map((item) => item.productId);
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

    // Verificar stock disponible
    for (const item of saleItems) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return {
          status: 400,
          message: `Producto con ID ${item.productId} no encontrado`,
          data: null,
        };
      }

      if (product.currentStock < item.quantity) {
        return {
          status: 400,
          message: `Stock insuficiente para ${product.name}. Disponible: ${product.currentStock}, Requerido: ${item.quantity}`,
          data: null,
        };
      }
    }

    // Calcular totales
    const { subtotal, total } = await calculateSaleTotals(saleItems);

    // Validar pagos si se proporcionan
    if (salePayments && salePayments.length > 0) {
      const totalPayments = salePayments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );
      if (Math.abs(totalPayments - total) > 0.01) {
        return {
          status: 400,
          message: 'El total de pagos no coincide con el total de la venta',
          data: null,
        };
      }

      // Verificar métodos de pago
      const paymentMethodIds = salePayments.map((p) => p.paymentMethodId);
      const paymentMethods = await prisma.paymentMethod.findMany({
        where: {
          id: { in: paymentMethodIds },
          organizationId: orgId,
          isDeleted: false,
          isActive: true,
        },
      });

      if (paymentMethods.length !== paymentMethodIds.length) {
        return {
          status: 400,
          message: 'Uno o más métodos de pago no son válidos',
          data: null,
        };
      }
    }

    // Generar número de venta
    const saleNumber = await generateSaleNumber(saleData.storeId);

    // Crear venta en transacción con timeout aumentado
    const newSale = await prisma.$transaction(
      async (tx) => {
        // Crear la venta
        const sale = await tx.sale.create({
          data: {
            ...saleData,
            organizationId: orgId,
            saleNumber,
            subtotal,
            total,
          },
        });

        // Crear items de venta y actualizar stock
        for (const itemData of saleItems) {
          await tx.saleItem.create({
            data: {
              ...itemData,
              saleId: sale.id,
              subtotal: itemData.quantity * itemData.unitPrice,
            },
          });

          // Crear movimiento y actualizar producto
          await createStockMovement(orgId, userId, {
            productId: itemData.productId,
            userId: userId,
            storeId: saleData.storeId,
            type: 'OUT',
            quantity: itemData.quantity,
            reason: `Venta ${sale.saleNumber}`,
            reference: sale.id,
          });
        }

        // Crear pagos si se proporcionan
        if (salePayments && salePayments.length > 0) {
          for (const paymentData of salePayments) {
            await tx.salePayment.create({
              data: {
                ...paymentData,
                saleId: sale.id,
              },
            });
          }
        }

        // Actualizar saleNumber in store
        const store = await prisma.store.findUnique({
          where: { id: saleData.storeId },
        });

        let nextNumber: number = 1;

        if (store?.lastSaleNumber) {
          nextNumber = store.lastSaleNumber + 1;
        }
        await tx.store.update({
          where: { id: saleData.storeId },
          data: {
            lastSaleNumber: nextNumber
          }
        })

        return tx.sale.findUnique({
          where: { id: sale.id },
          include: saleInclude,
        });
      },
      {
        maxWait: 10000, // Tiempo máximo de espera para adquirir la transacción: 10s
        timeout: 30000, // Tiempo máximo de ejecución de la transacción: 30s
      }
    );

    return {
      status: 201,
      message: 'Venta creada exitosamente',
      data: newSale,
    };
  } catch (error) {
    console.error('Error creating sale:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          status: 409,
          message: 'Ya existe una venta con ese número',
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

// GET SALES BY ORG
export const getSalesByOrgId = async (
  orgId: string,
  filters?: {
    storeId?: string;
    customerId?: string;
    userId?: string;
    status?: SaleStatus;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    minAmount?: number;
    maxAmount?: number;
  },
  includeDeleted: boolean = false,
  pagination?: {
    page?: number;
    limit?: number;
  }
): Promise<ActionResponse<{ sales: Sale[]; total: number } | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.SaleWhereInput = {
      organizationId: orgId,
      isDeleted: includeDeleted ? undefined : false,
    };

    if (filters?.storeId) {
      whereClause.storeId = filters.storeId;
    }

    if (filters?.customerId) {
      whereClause.customerId = filters.customerId;
    }

    if (filters?.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      whereClause.saleDate = {};
      if (filters.dateFrom) {
        whereClause.saleDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        whereClause.saleDate.lte = filters.dateTo;
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

    // Búsqueda por texto en número de venta, notas y nombre del cliente
    if (filters?.search) {
      whereClause.OR = [
        { saleNumber: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const skip = (page - 1) * limit;

    const [total, sales] = await Promise.all([
      prisma.sale.count({ where: whereClause }),
      prisma.sale.findMany({
        where: whereClause,
        include: saleInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      status: 200,
      message: 'Ventas obtenidas exitosamente',
      data: { sales, total },
    };
  } catch (error) {
    console.error('Error fetching sales:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// Definir el tipo de include sin where clauses para una correcta inferencia de tipos
const saleIncludeForType = {
  store: true,
  customer: true,
  user: true,
  saleItems: {
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          unitMeasure: true,
        },
      },
      unitMeasure: true,
    },
  },
  salePayments: {
    include: {
      paymentMethod: true,
    },
  },
  _count: {
    select: {
      saleItems: true,
      salePayments: true,
    },
  },
} as const satisfies Prisma.SaleInclude;

// Tipo para venta con todas las relaciones incluidas
export type SaleWithRelations = Prisma.SaleGetPayload<{
  include: typeof saleIncludeForType;
}>;

// GET SALE BY ID
export const getSaleById = async (
  saleId: string
): Promise<ActionResponse<SaleWithRelations | null>> => {
  try {
    if (!saleId) {
      return {
        status: 400,
        message: 'ID de venta es requerido',
        data: null,
      };
    }

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, isDeleted: false },
      include: saleInclude,
    });

    if (!sale) {
      return { status: 404, message: 'Venta no encontrada', data: null };
    }

    return {
      status: 200,
      message: 'Venta obtenida exitosamente',
      data: sale as unknown as SaleWithRelations,
    };
  } catch (error) {
    console.error('Error fetching sale:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET SALE BY NUMBER
export const getSaleBySaleNumber = async (
  orgId: string,
  storeId: string,
  saleNumber: string
): Promise<ActionResponse<SaleWithRelations | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    if (!saleNumber) {
      return {
        status: 400,
        message: 'Número de venta es requerido',
        data: null,
      };
    }

    const sale = await prisma.sale.findFirst({
      where: {
        organizationId: orgId,
        storeId,
        saleNumber,
        isDeleted: false,
      },
      include: saleInclude,
    });

    if (!sale) {
      return { status: 404, message: 'Venta no encontrada', data: null };
    }

    return {
      status: 200,
      message: 'Venta obtenida exitosamente',
      data: sale as unknown as SaleWithRelations,
    };
  } catch (error) {
    console.error('Error fetching sale by number:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE SALE
export const updateSale = async (
  saleId: string,
  userId: string,
  updateData: Partial<{
    customerId: string;
    status: SaleStatus;
    dueDate: Date;
    paidDate: Date;
    notes: string;
  }>
): Promise<ActionResponse<Sale | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!saleId) {
      return {
        status: 400,
        message: 'ID de venta es requerido',
        data: null,
      };
    }

    const existingSale = await prisma.sale.findFirst({
      where: { id: saleId, isDeleted: false },
    });

    if (!existingSale) {
      return { status: 404, message: 'Venta no encontrada', data: null };
    }

    // Verificar cliente si se está actualizando
    // if (
    //   updateData.customerId &&
    //   updateData.customerId !== existingSale.customerId
    // ) {
    //   const customer = await prisma.customer.findFirst({
    //     where: {
    //       id: updateData.customerId,
    //       organizationId: existingSale.organizationId,
    //       isDeleted: false,
    //     },
    //   });

    //   if (!customer) {
    //     return {
    //       status: 400,
    //       message: 'El cliente especificado no existe',
    //       data: null,
    //     };
    //   }
    // }

    const updatedSale = await prisma.sale.update({
      where: { id: saleId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: saleInclude,
    });

    return {
      status: 200,
      message: 'Venta actualizada exitosamente',
      data: updatedSale,
    };
  } catch (error) {
    console.error('Error updating sale:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Venta no encontrada', data: null };
      }
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

// CANCEL SALE
export const cancelSale = async (
  saleId: string,
  userId: string,
  reason?: string
): Promise<ActionResponse<Sale | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!saleId) {
      return {
        status: 400,
        message: 'ID de venta es requerido',
        data: null,
      };
    }

    const existingSale = await prisma.sale.findFirst({
      where: { id: saleId, isDeleted: false },
      include: { saleItems: true },
    });

    if (!existingSale) {
      return { status: 404, message: 'Venta no encontrada', data: null };
    }

    if (existingSale.status === 'CANCELLED') {
      return {
        status: 400,
        message: 'La venta ya está cancelada',
        data: null,
      };
    }

    // Cancelar venta y restaurar stock en transacción con timeout aumentado
    const cancelledSale = await prisma.$transaction(
      async (tx) => {
        // Actualizar status de la venta
        const sale = await tx.sale.update({
          where: { id: saleId },
          data: {
            status: 'CANCELLED',
            notes: reason
              ? `${existingSale.notes || ''}\nCANCELADO: ${reason}`
              : existingSale.notes,
            updatedAt: new Date(),
          },
        });

        // Restaurar stock de productos
        for (const item of existingSale.saleItems) {
          await createStockMovement(existingSale.organizationId, userId, {
            productId: item.productId,
            userId: userId,
            storeId: existingSale.storeId,
            type: 'IN',
            quantity: item.quantity,
            reason: `Cancelación de venta ${existingSale.saleNumber}`,
            reference: saleId,
          });
        }

        return tx.sale.findUnique({
          where: { id: saleId },
          include: saleInclude,
        });
      },
      {
        maxWait: 10000, // Tiempo máximo de espera para adquirir la transacción: 10s
        timeout: 30000, // Tiempo máximo de ejecución de la transacción: 30s
      }
    );

    return {
      status: 200,
      message: 'Venta cancelada exitosamente',
      data: cancelledSale,
    };
  } catch (error) {
    console.error('Error cancelling sale:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// SOFT DELETE SALE
export const softDeleteSale = async (
  saleId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!saleId) {
      return {
        status: 400,
        message: 'ID de venta es requerido',
        data: null,
      };
    }

    const existingSale = await prisma.sale.findFirst({
      where: { id: saleId, isDeleted: false },
    });

    if (!existingSale) {
      return { status: 404, message: 'Venta no encontrada', data: null };
    }

    if (existingSale.status === 'PAID') {
      return {
        status: 400,
        message:
          'No se puede eliminar una venta pagada. Cancele la venta primero.',
        data: null,
      };
    }

    await prisma.sale.update({
      where: { id: saleId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Venta eliminada (soft) exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error soft deleting sale:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// ===========================
// ANALYTICS AND REPORTS
// ===========================

// GET SALES ANALYTICS
export const getSalesAnalytics = async (
  orgId: string,
  dateFrom?: Date,
  dateTo?: Date,
  storeId?: string
): Promise<
  ActionResponse<{
    totalSales: number;
    totalRevenue: number;
    averageSaleAmount: number;
    salesByStatus: { status: SaleStatus; count: number; total: number }[];
    salesByStore: {
      storeId: string;
      storeName: string;
      count: number;
      total: number;
    }[];
    topProducts: {
      productId: string;
      productName: string;
      quantity: number;
      revenue: number;
    }[];
    dailySales: { date: string; count: number; total: number }[];
  } | null>
> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.SaleWhereInput = {
      organizationId: orgId,
      isDeleted: false,
    };

    if (dateFrom || dateTo) {
      whereClause.saleDate = {};
      if (dateFrom) whereClause.saleDate.gte = dateFrom;
      if (dateTo) whereClause.saleDate.lte = dateTo;
    }

    if (storeId) {
      whereClause.storeId = storeId;
    }

    // Agregaciones básicas
    const [totalStats, salesByStatus, salesByStore, topProducts] =
      await Promise.all([
        prisma.sale.aggregate({
          where: whereClause,
          _count: { id: true },
          _sum: { total: true },
          _avg: { total: true },
        }),
        prisma.sale.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { id: true },
          _sum: { total: true },
        }),
        prisma.sale.groupBy({
          by: ['storeId'],
          where: whereClause,
          _count: { id: true },
          _sum: { total: true },
        }),
        prisma.saleItem.groupBy({
          by: ['productId'],
          where: {
            sale: whereClause,
            isDeleted: false,
          },
          _sum: {
            quantity: true,
            subtotal: true,
          },
          orderBy: {
            _sum: {
              subtotal: 'desc',
            },
          },
          take: 10,
        }),
      ]);

    // Obtener información de tiendas y productos
    const storeIds = salesByStore.map((item) => item.storeId);
    const stores = await prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true },
    });

    const productIds = topProducts.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const storeMap = new Map(stores.map((s) => [s.id, s.name]));
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return {
      status: 200,
      message: 'Analíticas de ventas obtenidas exitosamente',
      data: {
        totalSales: totalStats._count.id,
        totalRevenue: totalStats._sum.total || 0,
        averageSaleAmount: totalStats._avg.total || 0,
        salesByStatus: salesByStatus.map((item) => ({
          status: item.status,
          count: item._count.id,
          total: item._sum.total || 0,
        })),
        salesByStore: salesByStore.map((item) => ({
          storeId: item.storeId,
          storeName: storeMap.get(item.storeId) || 'Tienda desconocida',
          count: item._count.id,
          total: item._sum.total || 0,
        })),
        topProducts: topProducts.map((item) => ({
          productId: item.productId,
          productName: productMap.get(item.productId) || 'Producto desconocido',
          quantity: item._sum.quantity || 0,
          revenue: item._sum.subtotal || 0,
        })),
        dailySales: [], // Se puede implementar agregación por fecha si es necesario
      },
    };
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET PENDING SALES
export const getPendingSales = async (
  orgId: string,
  storeId?: string
): Promise<ActionResponse<Sale[] | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.SaleWhereInput = {
      organizationId: orgId,
      isDeleted: false,
      status: 'PENDING',
    };

    if (storeId) {
      whereClause.storeId = storeId;
    }

    const pendingSales = await prisma.sale.findMany({
      where: whereClause,
      include: saleInclude,
      orderBy: { dueDate: 'asc' },
    });

    return {
      status: 200,
      message: 'Ventas pendientes obtenidas exitosamente',
      data: pendingSales,
    };
  } catch (error) {
    console.error('Error fetching pending sales:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET OVERDUE SALES
export const getOverdueSales = async (
  orgId: string,
  storeId?: string
): Promise<ActionResponse<Sale[] | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.SaleWhereInput = {
      organizationId: orgId,
      isDeleted: false,
      status: 'PENDING',
      dueDate: {
        lt: new Date(),
      },
    };

    if (storeId) {
      whereClause.storeId = storeId;
    }

    const overdueSales = await prisma.sale.findMany({
      where: whereClause,
      include: saleInclude,
      orderBy: { dueDate: 'asc' },
    });

    return {
      status: 200,
      message: 'Ventas vencidas obtenidas exitosamente',
      data: overdueSales,
    };
  } catch (error) {
    console.error('Error fetching overdue sales:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
