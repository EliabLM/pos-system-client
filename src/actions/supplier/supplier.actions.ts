'use server';

import { Supplier, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import {
  prisma,
  checkAdminRole,
  unauthorizedResponse,
  checkOrgId,
  emptyOrgIdResponse,
} from '../utils';

// SUPPLIER INCLUDES
const supplierInclude: Prisma.SupplierInclude = {
  purchases: {
    select: {
      id: true,
      purchaseNumber: true,
      total: true,
      status: true,
      purchaseDate: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  },
  _count: {
    select: {
      purchases: true,
    },
  },
};

// ===========================
// SUPPLIER ACTIONS
// ===========================

// CREATE SUPPLIER
export const createSupplier = async (
  orgId: string,
  userId: string,
  supplierData: Omit<
    Supplier,
    | 'id'
    | 'organizationId'
    | 'createdAt'
    | 'updatedAt'
    | 'isDeleted'
    | 'deletedAt'
  >
): Promise<ActionResponse<Supplier | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    // Verificar si ya existe un proveedor con el mismo email (si se proporciona)
    if (supplierData.email) {
      const existingByEmail = await prisma.supplier.findFirst({
        where: {
          organizationId: orgId,
          email: supplierData.email,
          isDeleted: false,
        },
      });

      if (existingByEmail) {
        return {
          status: 409,
          message: 'Ya existe un proveedor con ese email',
          data: null,
        };
      }
    }

    // Verificar si ya existe un proveedor con el mismo taxId (si se proporciona)
    if (supplierData.taxId) {
      const existingByTaxId = await prisma.supplier.findFirst({
        where: {
          organizationId: orgId,
          taxId: supplierData.taxId,
          isDeleted: false,
        },
      });

      if (existingByTaxId) {
        return {
          status: 409,
          message: 'Ya existe un proveedor con ese NIT/RUC',
          data: null,
        };
      }
    }

    const newSupplier = await prisma.supplier.create({
      data: {
        ...supplierData,
        organizationId: orgId,
      },
      include: supplierInclude,
    });

    return {
      status: 201,
      message: 'Proveedor creado exitosamente',
      data: newSupplier,
    };
  } catch (error) {
    console.error('Error creating supplier:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          status: 409,
          message: 'Ya existe un proveedor con esos datos únicos',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET SUPPLIERS BY ORG
export const getSuppliersByOrgId = async (
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
): Promise<ActionResponse<{ suppliers: Supplier[]; total: number } | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.SupplierWhereInput = {
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
        { name: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { taxId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const skip = (page - 1) * limit;

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where: whereClause }),
      prisma.supplier.findMany({
        where: whereClause,
        include: supplierInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      status: 200,
      message: 'Proveedores obtenidos exitosamente',
      data: { suppliers, total },
    };
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET SUPPLIER BY ID
export const getSupplierById = async (
  supplierId: string
): Promise<ActionResponse<Supplier | null>> => {
  try {
    if (!supplierId) {
      return {
        status: 400,
        message: 'ID de proveedor es requerido',
        data: null,
      };
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, isDeleted: false },
      include: supplierInclude,
    });

    if (!supplier) {
      return { status: 404, message: 'Proveedor no encontrado', data: null };
    }

    return {
      status: 200,
      message: 'Proveedor obtenido exitosamente',
      data: supplier,
    };
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET SUPPLIER BY TAX ID
export const getSupplierByTaxId = async (
  orgId: string,
  taxId: string
): Promise<ActionResponse<Supplier | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    if (!taxId) {
      return {
        status: 400,
        message: 'NIT/RUC es requerido',
        data: null,
      };
    }

    const supplier = await prisma.supplier.findFirst({
      where: {
        organizationId: orgId,
        taxId,
        isDeleted: false,
      },
      include: supplierInclude,
    });

    if (!supplier) {
      return { status: 404, message: 'Proveedor no encontrado', data: null };
    }

    return {
      status: 200,
      message: 'Proveedor obtenido exitosamente',
      data: supplier,
    };
  } catch (error) {
    console.error('Error fetching supplier by taxId:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET SUPPLIER BY EMAIL
export const getSupplierByEmail = async (
  orgId: string,
  email: string
): Promise<ActionResponse<Supplier | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    if (!email) {
      return {
        status: 400,
        message: 'Email es requerido',
        data: null,
      };
    }

    const supplier = await prisma.supplier.findFirst({
      where: {
        organizationId: orgId,
        email,
        isDeleted: false,
      },
      include: supplierInclude,
    });

    if (!supplier) {
      return { status: 404, message: 'Proveedor no encontrado', data: null };
    }

    return {
      status: 200,
      message: 'Proveedor obtenido exitosamente',
      data: supplier,
    };
  } catch (error) {
    console.error('Error fetching supplier by email:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE SUPPLIER
export const updateSupplier = async (
  supplierId: string,
  userId: string,
  updateData: Partial<
    Omit<
      Supplier,
      | 'id'
      | 'organizationId'
      | 'createdAt'
      | 'updatedAt'
      | 'isDeleted'
      | 'deletedAt'
    >
  >
): Promise<ActionResponse<Supplier | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!supplierId) {
      return {
        status: 400,
        message: 'ID de proveedor es requerido',
        data: null,
      };
    }

    const existingSupplier = await prisma.supplier.findFirst({
      where: { id: supplierId, isDeleted: false },
    });

    if (!existingSupplier) {
      return { status: 404, message: 'Proveedor no encontrado', data: null };
    }

    // Verificar email único si se está actualizando
    if (updateData.email && updateData.email !== existingSupplier.email) {
      const emailExists = await prisma.supplier.findFirst({
        where: {
          organizationId: existingSupplier.organizationId,
          email: updateData.email,
          isDeleted: false,
          id: { not: supplierId },
        },
      });

      if (emailExists) {
        return {
          status: 409,
          message: 'Ya existe otro proveedor con ese email',
          data: null,
        };
      }
    }

    // Verificar taxId único si se está actualizando
    if (updateData.taxId && updateData.taxId !== existingSupplier.taxId) {
      const taxIdExists = await prisma.supplier.findFirst({
        where: {
          organizationId: existingSupplier.organizationId,
          taxId: updateData.taxId,
          isDeleted: false,
          id: { not: supplierId },
        },
      });

      if (taxIdExists) {
        return {
          status: 409,
          message: 'Ya existe otro proveedor con ese NIT/RUC',
          data: null,
        };
      }
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: supplierInclude,
    });

    return {
      status: 200,
      message: 'Proveedor actualizado exitosamente',
      data: updatedSupplier,
    };
  } catch (error) {
    console.error('Error updating supplier:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Proveedor no encontrado', data: null };
      }
      if (error.code === 'P2002') {
        return {
          status: 409,
          message: 'Ya existe un proveedor con esos datos únicos',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// SOFT DELETE SUPPLIER
export const softDeleteSupplier = async (
  supplierId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!supplierId) {
      return {
        status: 400,
        message: 'ID de proveedor es requerido',
        data: null,
      };
    }

    const existingSupplier = await prisma.supplier.findFirst({
      where: { id: supplierId, isDeleted: false },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });

    if (!existingSupplier) {
      return { status: 404, message: 'Proveedor no encontrado', data: null };
    }

    // Verificar si tiene compras asociadas
    if (existingSupplier._count.purchases > 0) {
      return {
        status: 400,
        message: `No se puede eliminar el proveedor porque tiene ${existingSupplier._count.purchases} compra(s) asociada(s). Desactívelo en su lugar.`,
        data: null,
      };
    }

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Proveedor eliminado exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// TOGGLE SUPPLIER ACTIVE STATUS
export const toggleSupplierActiveStatus = async (
  supplierId: string,
  userId: string
): Promise<ActionResponse<Supplier | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!supplierId) {
      return {
        status: 400,
        message: 'ID de proveedor es requerido',
        data: null,
      };
    }

    const existingSupplier = await prisma.supplier.findFirst({
      where: { id: supplierId, isDeleted: false },
    });

    if (!existingSupplier) {
      return { status: 404, message: 'Proveedor no encontrado', data: null };
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        isActive: !existingSupplier.isActive,
        updatedAt: new Date(),
      },
      include: supplierInclude,
    });

    return {
      status: 200,
      message: `Proveedor ${updatedSupplier.isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: updatedSupplier,
    };
  } catch (error) {
    console.error('Error toggling supplier status:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// ===========================
// ANALYTICS AND REPORTS
// ===========================

// GET SUPPLIER PURCHASE HISTORY
export const getSupplierPurchaseHistory = async (
  supplierId: string,
  pagination?: {
    page?: number;
    limit?: number;
  }
): Promise<ActionResponse<{ purchases: unknown[]; total: number } | null>> => {
  try {
    if (!supplierId) {
      return {
        status: 400,
        message: 'ID de proveedor es requerido',
        data: null,
      };
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, isDeleted: false },
    });

    if (!supplier) {
      return { status: 404, message: 'Proveedor no encontrado', data: null };
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [total, purchases] = await Promise.all([
      prisma.purchase.count({
        where: {
          supplierId,
          isDeleted: false,
        },
      }),
      prisma.purchase.findMany({
        where: {
          supplierId,
          isDeleted: false,
        },
        include: {
          purchaseItems: {
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
        },
        orderBy: {
          purchaseDate: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    return {
      status: 200,
      message: 'Historial de compras obtenido exitosamente',
      data: { purchases, total },
    };
  } catch (error) {
    console.error('Error fetching supplier purchase history:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET SUPPLIER STATISTICS
export const getSupplierStatistics = async (
  supplierId: string
): Promise<
  ActionResponse<{
    totalPurchases: number;
    totalSpent: number;
    averagePurchase: number;
    lastPurchaseDate: Date | null;
  } | null>
> => {
  try {
    if (!supplierId) {
      return {
        status: 400,
        message: 'ID de proveedor es requerido',
        data: null,
      };
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, isDeleted: false },
    });

    if (!supplier) {
      return { status: 404, message: 'Proveedor no encontrado', data: null };
    }

    // Obtener estadísticas de compras
    const purchaseStats = await prisma.purchase.aggregate({
      where: {
        supplierId,
        isDeleted: false,
        status: { not: 'CANCELLED' },
      },
      _count: { id: true },
      _sum: { total: true },
      _avg: { total: true },
    });

    // Obtener última fecha de compra
    const lastPurchase = await prisma.purchase.findFirst({
      where: {
        supplierId,
        isDeleted: false,
        status: { not: 'CANCELLED' },
      },
      orderBy: { purchaseDate: 'desc' },
      select: { purchaseDate: true },
    });

    return {
      status: 200,
      message: 'Estadísticas del proveedor obtenidas exitosamente',
      data: {
        totalPurchases: purchaseStats._count.id,
        totalSpent: purchaseStats._sum.total || 0,
        averagePurchase: purchaseStats._avg.total || 0,
        lastPurchaseDate: lastPurchase?.purchaseDate || null,
      },
    };
  } catch (error) {
    console.error('Error fetching supplier statistics:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET TOP SUPPLIERS BY PURCHASES
export const getTopSuppliersByPurchases = async (
  orgId: string,
  limit: number = 10
): Promise<
  ActionResponse<
    | {
        supplierId: string;
        supplierName: string;
        totalPurchases: number;
        totalSpent: number;
      }[]
    | null
  >
> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const topSuppliers = await prisma.purchase.groupBy({
      by: ['supplierId'],
      where: {
        organizationId: orgId,
        isDeleted: false,
        status: { not: 'CANCELLED' },
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

    // Obtener información de proveedores
    const supplierIds = topSuppliers.map((item) => item.supplierId);

    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true },
    });

    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

    const result = topSuppliers.map((item) => ({
      supplierId: item.supplierId,
      supplierName: supplierMap.get(item.supplierId) || 'Proveedor desconocido',
      totalPurchases: item._count.id,
      totalSpent: item._sum.total || 0,
    }));

    return {
      status: 200,
      message: 'Top proveedores obtenidos exitosamente',
      data: result,
    };
  } catch (error) {
    console.error('Error fetching top suppliers:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
