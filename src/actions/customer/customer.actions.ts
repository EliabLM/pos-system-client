'use server';

import { Customer, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import {
  prisma,
  checkAdminRole,
  unauthorizedResponse,
  checkOrgId,
  emptyOrgIdResponse,
} from '../utils';

// CUSTOMER INCLUDES
const customerInclude: Prisma.CustomerInclude = {
  sales: {
    select: {
      id: true,
      saleNumber: true,
      total: true,
      status: true,
      saleDate: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  },
  _count: {
    select: {
      sales: true,
    },
  },
};

// ===========================
// CUSTOMER ACTIONS
// ===========================

// CREATE CUSTOMER
export const createCustomer = async (
  orgId: string,
  userId: string,
  customerData: Omit<
    Customer,
    | 'id'
    | 'organizationId'
    | 'createdAt'
    | 'updatedAt'
    | 'isDeleted'
    | 'deletedAt'
  >
): Promise<ActionResponse<Customer | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    // Verificar si ya existe un cliente con el mismo email (si se proporciona)
    if (customerData.email) {
      const existingByEmail = await prisma.customer.findFirst({
        where: {
          organizationId: orgId,
          email: customerData.email,
          isDeleted: false,
        },
      });

      if (existingByEmail) {
        return {
          status: 409,
          message: 'Ya existe un cliente con ese email',
          data: null,
        };
      }
    }

    // Verificar si ya existe un cliente con el mismo documento (si se proporciona)
    if (customerData.document) {
      const existingByDocument = await prisma.customer.findFirst({
        where: {
          organizationId: orgId,
          document: customerData.document,
          isDeleted: false,
        },
      });

      if (existingByDocument) {
        return {
          status: 409,
          message: 'Ya existe un cliente con ese documento',
          data: null,
        };
      }
    }

    const newCustomer = await prisma.customer.create({
      data: {
        ...customerData,
        organizationId: orgId,
      },
      include: customerInclude,
    });

    return {
      status: 201,
      message: 'Cliente creado exitosamente',
      data: newCustomer,
    };
  } catch (error) {
    console.error('Error creating customer:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          status: 409,
          message: 'Ya existe un cliente con esos datos únicos',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET CUSTOMERS BY ORG
export const getCustomersByOrgId = async (
  orgId: string,
  filters?: {
    search?: string;
    isActive?: boolean;
    city?: string;
    department?: string;
  },
  includeDeleted: boolean = false,
  pagination?: {
    page?: number;
    limit?: number;
  }
): Promise<ActionResponse<{ customers: Customer[]; total: number } | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.CustomerWhereInput = {
      organizationId: orgId,
      isDeleted: includeDeleted ? undefined : false,
    };

    if (filters?.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    if (filters?.city) {
      whereClause.city = filters.city;
    }

    if (filters?.department) {
      whereClause.department = filters.department;
    }

    if (filters?.search) {
      whereClause.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { document: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const skip = (page - 1) * limit;

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where: whereClause }),
      prisma.customer.findMany({
        where: whereClause,
        include: customerInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      status: 200,
      message: 'Clientes obtenidos exitosamente',
      data: { customers, total },
    };
  } catch (error) {
    console.error('Error fetching customers:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET CUSTOMER BY ID
export const getCustomerById = async (
  customerId: string
): Promise<ActionResponse<Customer | null>> => {
  try {
    if (!customerId) {
      return {
        status: 400,
        message: 'ID de cliente es requerido',
        data: null,
      };
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, isDeleted: false },
      include: customerInclude,
    });

    if (!customer) {
      return { status: 404, message: 'Cliente no encontrado', data: null };
    }

    return {
      status: 200,
      message: 'Cliente obtenido exitosamente',
      data: customer,
    };
  } catch (error) {
    console.error('Error fetching customer:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET CUSTOMER BY EMAIL
export const getCustomerByEmail = async (
  orgId: string,
  email: string
): Promise<ActionResponse<Customer | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    if (!email) {
      return {
        status: 400,
        message: 'Email es requerido',
        data: null,
      };
    }

    const customer = await prisma.customer.findFirst({
      where: {
        organizationId: orgId,
        email,
        isDeleted: false,
      },
      include: customerInclude,
    });

    if (!customer) {
      return { status: 404, message: 'Cliente no encontrado', data: null };
    }

    return {
      status: 200,
      message: 'Cliente obtenido exitosamente',
      data: customer,
    };
  } catch (error) {
    console.error('Error fetching customer by email:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET CUSTOMER BY DOCUMENT
export const getCustomerByDocument = async (
  orgId: string,
  document: string
): Promise<ActionResponse<Customer | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    if (!document) {
      return {
        status: 400,
        message: 'Documento es requerido',
        data: null,
      };
    }

    const customer = await prisma.customer.findFirst({
      where: {
        organizationId: orgId,
        document,
        isDeleted: false,
      },
      include: customerInclude,
    });

    if (!customer) {
      return { status: 404, message: 'Cliente no encontrado', data: null };
    }

    return {
      status: 200,
      message: 'Cliente obtenido exitosamente',
      data: customer,
    };
  } catch (error) {
    console.error('Error fetching customer by document:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE CUSTOMER
export const updateCustomer = async (
  customerId: string,
  userId: string,
  updateData: Partial<
    Omit<
      Customer,
      | 'id'
      | 'organizationId'
      | 'createdAt'
      | 'updatedAt'
      | 'isDeleted'
      | 'deletedAt'
    >
  >
): Promise<ActionResponse<Customer | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!customerId) {
      return {
        status: 400,
        message: 'ID de cliente es requerido',
        data: null,
      };
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { id: customerId, isDeleted: false },
    });

    if (!existingCustomer) {
      return { status: 404, message: 'Cliente no encontrado', data: null };
    }

    // Verificar email único si se está actualizando
    if (updateData.email && updateData.email !== existingCustomer.email) {
      const emailExists = await prisma.customer.findFirst({
        where: {
          organizationId: existingCustomer.organizationId,
          email: updateData.email,
          isDeleted: false,
          id: { not: customerId },
        },
      });

      if (emailExists) {
        return {
          status: 409,
          message: 'Ya existe otro cliente con ese email',
          data: null,
        };
      }
    }

    // Verificar documento único si se está actualizando
    if (updateData.document && updateData.document !== existingCustomer.document) {
      const documentExists = await prisma.customer.findFirst({
        where: {
          organizationId: existingCustomer.organizationId,
          document: updateData.document,
          isDeleted: false,
          id: { not: customerId },
        },
      });

      if (documentExists) {
        return {
          status: 409,
          message: 'Ya existe otro cliente con ese documento',
          data: null,
        };
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: customerInclude,
    });

    return {
      status: 200,
      message: 'Cliente actualizado exitosamente',
      data: updatedCustomer,
    };
  } catch (error) {
    console.error('Error updating customer:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Cliente no encontrado', data: null };
      }
      if (error.code === 'P2002') {
        return {
          status: 409,
          message: 'Ya existe un cliente con esos datos únicos',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// SOFT DELETE CUSTOMER
export const softDeleteCustomer = async (
  customerId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!customerId) {
      return {
        status: 400,
        message: 'ID de cliente es requerido',
        data: null,
      };
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { id: customerId, isDeleted: false },
      include: {
        _count: {
          select: {
            sales: true,
          },
        },
      },
    });

    if (!existingCustomer) {
      return { status: 404, message: 'Cliente no encontrado', data: null };
    }

    // Verificar si tiene ventas asociadas
    if (existingCustomer._count.sales > 0) {
      return {
        status: 400,
        message: `No se puede eliminar el cliente porque tiene ${existingCustomer._count.sales} venta(s) asociada(s). Desactívelo en su lugar.`,
        data: null,
      };
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Cliente eliminado exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// TOGGLE CUSTOMER ACTIVE STATUS
export const toggleCustomerActiveStatus = async (
  customerId: string,
  userId: string
): Promise<ActionResponse<Customer | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!customerId) {
      return {
        status: 400,
        message: 'ID de cliente es requerido',
        data: null,
      };
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { id: customerId, isDeleted: false },
    });

    if (!existingCustomer) {
      return { status: 404, message: 'Cliente no encontrado', data: null };
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        isActive: !existingCustomer.isActive,
        updatedAt: new Date(),
      },
      include: customerInclude,
    });

    return {
      status: 200,
      message: `Cliente ${updatedCustomer.isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: updatedCustomer,
    };
  } catch (error) {
    console.error('Error toggling customer status:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// ===========================
// ANALYTICS AND REPORTS
// ===========================

// GET CUSTOMER PURCHASE HISTORY
export const getCustomerPurchaseHistory = async (
  customerId: string,
  pagination?: {
    page?: number;
    limit?: number;
  }
): Promise<ActionResponse<{ sales: any[]; total: number } | null>> => {
  try {
    if (!customerId) {
      return {
        status: 400,
        message: 'ID de cliente es requerido',
        data: null,
      };
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, isDeleted: false },
    });

    if (!customer) {
      return { status: 404, message: 'Cliente no encontrado', data: null };
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [total, sales] = await Promise.all([
      prisma.sale.count({
        where: {
          customerId,
          isDeleted: false,
        },
      }),
      prisma.sale.findMany({
        where: {
          customerId,
          isDeleted: false,
        },
        include: {
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          saleItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          salePayments: {
            include: {
              paymentMethod: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: {
          saleDate: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    return {
      status: 200,
      message: 'Historial de compras obtenido exitosamente',
      data: { sales, total },
    };
  } catch (error) {
    console.error('Error fetching customer purchase history:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET CUSTOMER STATISTICS
export const getCustomerStatistics = async (
  customerId: string
): Promise<
  ActionResponse<{
    totalPurchases: number;
    totalSpent: number;
    averagePurchase: number;
    lastPurchaseDate: Date | null;
    favoriteProducts: {
      productId: string;
      productName: string;
      totalQuantity: number;
      totalSpent: number;
    }[];
  } | null>
> => {
  try {
    if (!customerId) {
      return {
        status: 400,
        message: 'ID de cliente es requerido',
        data: null,
      };
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, isDeleted: false },
    });

    if (!customer) {
      return { status: 404, message: 'Cliente no encontrado', data: null };
    }

    // Obtener estadísticas de ventas
    const salesStats = await prisma.sale.aggregate({
      where: {
        customerId,
        isDeleted: false,
        status: { not: 'CANCELLED' },
      },
      _count: { id: true },
      _sum: { total: true },
      _avg: { total: true },
    });

    // Obtener última fecha de compra
    const lastSale = await prisma.sale.findFirst({
      where: {
        customerId,
        isDeleted: false,
        status: { not: 'CANCELLED' },
      },
      orderBy: { saleDate: 'desc' },
      select: { saleDate: true },
    });

    // Obtener productos favoritos
    const favoriteProductsRaw = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          customerId,
          isDeleted: false,
          status: { not: 'CANCELLED' },
        },
        isDeleted: false,
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    // Obtener nombres de productos
    const productIds = favoriteProductsRaw.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p.name]));

    const favoriteProducts = favoriteProductsRaw.map((item) => ({
      productId: item.productId,
      productName: productMap.get(item.productId) || 'Producto desconocido',
      totalQuantity: item._sum.quantity || 0,
      totalSpent: item._sum.subtotal || 0,
    }));

    return {
      status: 200,
      message: 'Estadísticas del cliente obtenidas exitosamente',
      data: {
        totalPurchases: salesStats._count.id,
        totalSpent: salesStats._sum.total || 0,
        averagePurchase: salesStats._avg.total || 0,
        lastPurchaseDate: lastSale?.saleDate || null,
        favoriteProducts,
      },
    };
  } catch (error) {
    console.error('Error fetching customer statistics:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET TOP CUSTOMERS BY PURCHASES
export const getTopCustomersByPurchases = async (
  orgId: string,
  limit: number = 10
): Promise<
  ActionResponse<
    | {
        customerId: string;
        customerName: string;
        totalPurchases: number;
        totalSpent: number;
      }[]
    | null
  >
> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const topCustomers = await prisma.sale.groupBy({
      by: ['customerId'],
      where: {
        organizationId: orgId,
        isDeleted: false,
        status: { not: 'CANCELLED' },
        customerId: { not: null },
      },
      _count: { id: true },
      _sum: { total: true },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: limit,
    });

    // Obtener información de clientes
    const customerIds = topCustomers
      .map((item) => item.customerId)
      .filter((id): id is string => id !== null);

    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const customerMap = new Map(
      customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`])
    );

    const result = topCustomers.map((item) => ({
      customerId: item.customerId || '',
      customerName: customerMap.get(item.customerId || '') || 'Cliente desconocido',
      totalPurchases: item._count.id,
      totalSpent: item._sum.total || 0,
    }));

    return {
      status: 200,
      message: 'Top clientes obtenidos exitosamente',
      data: result,
    };
  } catch (error) {
    console.error('Error fetching top customers:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
