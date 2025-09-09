'use server';

import { Organization, PaymentMethod, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import { prisma, checkAdminRole, unauthorizedResponse } from '../utils';
import { createCategory } from '../category';
import { createPaymentMethod } from '../payment-methods';
import { createBrand } from '../brand';

const organizationInclude: Prisma.OrganizationInclude = {
  users: {
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: { isDeleted: false },
  },
  stores: {
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: { isDeleted: false },
  },
  products: {
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: { isDeleted: false },
  },
  customers: {
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: { isDeleted: false },
  },
  _count: {
    select: {
      users: true,
      stores: true,
      products: true,
      customers: true,
      suppliers: true,
      brands: true,
      categories: true,
      stockMovements: true,
    },
  },
};

// Definir constantes para configuraciones por defecto
const DEFAULT_CATEGORIES = [
  { name: 'Hombres', description: 'Hombres' },
  { name: 'Damas', description: 'Damas' },
  { name: 'Niños', description: 'Niños' },
] as const;

const DEFAULT_PAYMENT_METHODS: Omit<
  PaymentMethod,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'isActive'
  | 'organizationId'
  | 'isDeleted'
  | 'deletedAt'
>[] = [
  { name: 'Efectivo', type: 'CASH' },
  { name: 'Tarjeta', type: 'CARD' },
  { name: 'Cheque', type: 'CHECK' },
  { name: 'Crédito', type: 'CREDIT' },
  { name: 'Transferencia', type: 'TRANSFER' },
  { name: 'Otro', type: 'OTHER' },
] as const;

const DEFAULT_BRANDS = [
  { name: 'NIKE', description: 'NIKE' },
  { name: 'ADIDAS', description: 'ADIDAS' },
  { name: 'PUMA', description: 'PUMA' },
] as const;

const createInitialConfigurations = async (
  organizationId: string,
  adminUserId: string
): Promise<void> => {
  // Usar transacciones para asegurar consistencia
  await prisma.$transaction(async (tx) => {
    // Crear categorías en paralelo usando Promise.all
    const categoryPromises = DEFAULT_CATEGORIES.map((category) =>
      createCategory(organizationId, adminUserId, {
        name: category.name,
        description: category.description,
        isActive: true,
      })
    );

    // Crear métodos de pago en paralelo
    const paymentMethodPromises = DEFAULT_PAYMENT_METHODS.map((method) =>
      createPaymentMethod(organizationId, adminUserId, {
        name: method.name,
        type: method.type,
        isActive: true,
      })
    );

    // Crear marcas en paralelo
    const brandsPromises = DEFAULT_BRANDS.map((brand) =>
      createBrand(organizationId, adminUserId, {
        name: brand.name,
        description: brand.description,
        isActive: true,
      })
    );

    // Ejecutar todas las creaciones en paralelo
    await Promise.all([
      ...categoryPromises,
      ...paymentMethodPromises,
      ...brandsPromises,
    ]);
  });
};

// CREATE
export const createOrganization = async (
  adminUserId: string,
  organizationData: Omit<
    Organization,
    'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >
): Promise<ActionResponse<Organization | null>> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    // Verificar unicidad de NIT si se proporciona
    if (organizationData.nit) {
      const existingOrgByNit = await prisma.organization.findFirst({
        where: {
          nit: organizationData.nit,
          isDeleted: false,
        },
      });

      if (existingOrgByNit) {
        return {
          status: 409,
          message: 'Ya existe una organización con ese NIT',
          data: null,
        };
      }
    }

    const newOrganization = await prisma.organization.create({
      data: organizationData,
      include: organizationInclude,
    });

    // Crear configuraciones iniciales de forma asíncrona
    createInitialConfigurations(newOrganization.id, adminUserId).catch(
      (error) => {
        console.error(
          'Error creating initial configurations for organization:',
          newOrganization.id,
          error
        );
      }
    );

    return {
      status: 201,
      message: 'Organización creada exitosamente',
      data: newOrganization,
    };
  } catch (error) {
    console.error('Error creating organization:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];

        if (target?.includes('nit')) {
          return {
            status: 409,
            message: 'Ya existe una organización con ese NIT',
            data: null,
          };
        }
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET ALL ORGANIZATIONS (for super admin)
export const getAllOrganizations = async (
  adminUserId: string,
  filters?: {
    isActive?: boolean;
    city?: string;
    department?: string;
    search?: string;
  },
  includeDeleted: boolean = false
): Promise<ActionResponse<Organization[] | null>> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    const whereClause: Prisma.OrganizationWhereInput = {
      isDeleted: includeDeleted ? undefined : false,
    };

    if (filters?.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    if (filters?.city) {
      whereClause.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters?.department) {
      whereClause.department = {
        contains: filters.department,
        mode: 'insensitive',
      };
    }

    if (filters?.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { nit: { contains: filters.search, mode: 'insensitive' } },
        { taxId: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
        { department: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const organizations = await prisma.organization.findMany({
      where: whereClause,
      include: organizationInclude,
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 200,
      message: 'Organizaciones obtenidas exitosamente',
      data: organizations,
    };
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET ONE
export const getOrganizationById = async (
  organizationId: string
): Promise<ActionResponse<Organization | null>> => {
  try {
    if (!organizationId) {
      return {
        status: 400,
        message: 'ID de la organización es requerido',
        data: null,
      };
    }

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, isDeleted: false },
      include: organizationInclude,
    });

    if (!organization) {
      return { status: 404, message: 'Organización no encontrada', data: null };
    }

    return {
      status: 200,
      message: 'Organización obtenida exitosamente',
      data: organization,
    };
  } catch (error) {
    console.error('Error fetching organization:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET BY EMAIL
export const getOrganizationByEmail = async (
  email: string
): Promise<ActionResponse<Organization | null>> => {
  try {
    if (!email) {
      return {
        status: 400,
        message: 'Email es requerido',
        data: null,
      };
    }

    const organization = await prisma.organization.findFirst({
      where: {
        email,
        isDeleted: false,
        isActive: true,
      },
      include: organizationInclude,
    });

    if (!organization) {
      return { status: 404, message: 'Organización no encontrada', data: null };
    }

    return {
      status: 200,
      message: 'Organización obtenida exitosamente',
      data: organization,
    };
  } catch (error) {
    console.error('Error fetching organization by email:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET BY NIT
export const getOrganizationByNit = async (
  nit: string
): Promise<ActionResponse<Organization | null>> => {
  try {
    if (!nit) {
      return {
        status: 400,
        message: 'NIT es requerido',
        data: null,
      };
    }

    const organization = await prisma.organization.findFirst({
      where: {
        nit,
        isDeleted: false,
        isActive: true,
      },
      include: organizationInclude,
    });

    if (!organization) {
      return { status: 404, message: 'Organización no encontrada', data: null };
    }

    return {
      status: 200,
      message: 'Organización obtenida exitosamente',
      data: organization,
    };
  } catch (error) {
    console.error('Error fetching organization by NIT:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET ACTIVE ORGANIZATIONS
export const getActiveOrganizations = async (): Promise<
  ActionResponse<Organization[] | null>
> => {
  try {
    const organizations = await prisma.organization.findMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
      include: organizationInclude,
      orderBy: { name: 'asc' },
    });

    return {
      status: 200,
      message: 'Organizaciones activas obtenidas exitosamente',
      data: organizations,
    };
  } catch (error) {
    console.error('Error fetching active organizations:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE
export const updateOrganization = async (
  organizationId: string,
  adminUserId: string,
  updateData: Partial<
    Omit<
      Organization,
      'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
    >
  >
): Promise<ActionResponse<Organization | null>> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    if (!organizationId) {
      return {
        status: 400,
        message: 'ID de la organización es requerido',
        data: null,
      };
    }

    // Verificar que la organización exista y no esté eliminada
    const existingOrganization = await prisma.organization.findFirst({
      where: { id: organizationId, isDeleted: false },
    });

    if (!existingOrganization) {
      return { status: 404, message: 'Organización no encontrada', data: null };
    }

    // Verificar unicidad de NIT si se está actualizando
    if (updateData.nit && updateData.nit !== existingOrganization.nit) {
      const duplicateOrgByNit = await prisma.organization.findFirst({
        where: {
          nit: updateData.nit,
          isDeleted: false,
          id: { not: organizationId },
        },
      });

      if (duplicateOrgByNit) {
        return {
          status: 409,
          message: 'Ya existe una organización con ese NIT',
          data: null,
        };
      }
    }

    // Verificar unicidad de taxId si se está actualizando
    if (updateData.taxId && updateData.taxId !== existingOrganization.taxId) {
      const duplicateOrgByTaxId = await prisma.organization.findFirst({
        where: {
          taxId: updateData.taxId,
          isDeleted: false,
          id: { not: organizationId },
        },
      });

      if (duplicateOrgByTaxId) {
        return {
          status: 409,
          message: 'Ya existe una organización con ese Tax ID',
          data: null,
        };
      }
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: organizationInclude,
    });

    return {
      status: 200,
      message: 'Organización actualizada exitosamente',
      data: updatedOrganization,
    };
  } catch (error) {
    console.error('Error updating organization:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];

        if (target?.includes('nit')) {
          return {
            status: 409,
            message: 'Ya existe una organización con ese NIT',
            data: null,
          };
        }
        if (target?.includes('taxId')) {
          return {
            status: 409,
            message: 'Ya existe una organización con ese Tax ID',
            data: null,
          };
        }
      }
      if (error.code === 'P2025') {
        return {
          status: 404,
          message: 'Organización no encontrada',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// ACTIVATE/DEACTIVATE ORGANIZATION
export const toggleOrganizationStatus = async (
  organizationId: string,
  adminUserId: string,
  isActive: boolean
): Promise<ActionResponse<Organization | null>> => {
  try {
    const isAdminRole = await checkAdminRole(adminUserId);
    if (!isAdminRole) return unauthorizedResponse();

    if (!organizationId) {
      return {
        status: 400,
        message: 'ID de la organización es requerido',
        data: null,
      };
    }

    const existingOrganization = await prisma.organization.findFirst({
      where: { id: organizationId, isDeleted: false },
    });

    if (!existingOrganization) {
      return { status: 404, message: 'Organización no encontrada', data: null };
    }

    // Si se está desactivando, verificar que no tenga usuarios activos
    if (!isActive) {
      const activeUsersCount = await prisma.user.count({
        where: {
          organizationId,
          isActive: true,
          isDeleted: false,
        },
      });

      if (activeUsersCount > 0) {
        return {
          status: 409,
          message: `No se puede desactivar la organización. Tiene ${activeUsersCount} usuario(s) activo(s)`,
          data: null,
        };
      }
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        isActive,
        updatedAt: new Date(),
      },
      include: organizationInclude,
    });

    return {
      status: 200,
      message: `Organización ${
        isActive ? 'activada' : 'desactivada'
      } exitosamente`,
      data: updatedOrganization,
    };
  } catch (error) {
    console.error('Error toggling organization status:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return {
          status: 404,
          message: 'Organización no encontrada',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET ORGANIZATIONS BY DEPARTMENT
export const getOrganizationsByDepartment = async (
  department: string
): Promise<ActionResponse<Organization[] | null>> => {
  try {
    if (!department) {
      return {
        status: 400,
        message: 'Departamento es requerido',
        data: null,
      };
    }

    const organizations = await prisma.organization.findMany({
      where: {
        department: { contains: department, mode: 'insensitive' },
        isDeleted: false,
        isActive: true,
      },
      include: organizationInclude,
      orderBy: { name: 'asc' },
    });

    return {
      status: 200,
      message: `Organizaciones en ${department} obtenidas exitosamente`,
      data: organizations,
    };
  } catch (error) {
    console.error('Error fetching organizations by department:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET ORGANIZATIONS BY CITY
export const getOrganizationsByCity = async (
  city: string
): Promise<ActionResponse<Organization[] | null>> => {
  try {
    if (!city) {
      return {
        status: 400,
        message: 'Ciudad es requerida',
        data: null,
      };
    }

    const organizations = await prisma.organization.findMany({
      where: {
        city: { contains: city, mode: 'insensitive' },
        isDeleted: false,
        isActive: true,
      },
      include: organizationInclude,
      orderBy: { name: 'asc' },
    });

    return {
      status: 200,
      message: `Organizaciones en ${city} obtenidas exitosamente`,
      data: organizations,
    };
  } catch (error) {
    console.error('Error fetching organizations by city:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET ORGANIZATION STATISTICS
export const getOrganizationStatistics = async (
  organizationId: string
): Promise<ActionResponse<any | null>> => {
  try {
    if (!organizationId) {
      return {
        status: 400,
        message: 'ID de la organización es requerido',
        data: null,
      };
    }

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, isDeleted: false },
    });

    if (!organization) {
      return { status: 404, message: 'Organización no encontrada', data: null };
    }

    const [
      totalUsers,
      activeUsers,
      totalStores,
      activeStores,
      totalProducts,
      activeProducts,
      totalCustomers,
      totalSuppliers,
      totalBrands,
      totalCategories,
      recentStockMovements,
    ] = await Promise.all([
      prisma.user.count({
        where: { organizationId, isDeleted: false },
      }),
      prisma.user.count({
        where: { organizationId, isDeleted: false, isActive: true },
      }),
      prisma.store.count({
        where: { organizationId, isDeleted: false },
      }),
      prisma.store.count({
        where: { organizationId, isDeleted: false, isActive: true },
      }),
      prisma.product.count({
        where: { organizationId, isDeleted: false },
      }),
      prisma.product.count({
        where: { organizationId, isDeleted: false, isActive: true },
      }),
      prisma.customer.count({
        where: { organizationId, isDeleted: false },
      }),
      prisma.supplier.count({
        where: { organizationId, isDeleted: false },
      }),
      prisma.brand.count({
        where: { organizationId, isDeleted: false },
      }),
      prisma.category.count({
        where: { organizationId, isDeleted: false },
      }),
      prisma.stockMovement.count({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
          },
        },
      }),
    ]);

    const statistics = {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      stores: {
        total: totalStores,
        active: activeStores,
        inactive: totalStores - activeStores,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
      },
      customers: totalCustomers,
      suppliers: totalSuppliers,
      brands: totalBrands,
      categories: totalCategories,
      stockMovements: {
        last30Days: recentStockMovements,
      },
    };

    return {
      status: 200,
      message: 'Estadísticas de la organización obtenidas exitosamente',
      data: statistics,
    };
  } catch (error) {
    console.error('Error fetching organization statistics:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// SOFT DELETE
export const softDeleteOrganization = async (
  organizationId: string,
  adminUserId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    if (!organizationId) {
      return {
        status: 400,
        message: 'ID de la organización es requerido',
        data: null,
      };
    }

    // Verificar si hay usuarios asociados
    const usersCount = await prisma.user.count({
      where: { organizationId, isDeleted: false },
    });

    // Verificar si hay tiendas asociadas
    const storesCount = await prisma.store.count({
      where: { organizationId, isDeleted: false },
    });

    // Verificar si hay productos asociados
    const productsCount = await prisma.product.count({
      where: { organizationId, isDeleted: false },
    });

    if (usersCount > 0 || storesCount > 0 || productsCount > 0) {
      return {
        status: 409,
        message: `No se puede eliminar la organización. Tiene ${
          usersCount + storesCount + productsCount
        } registro(s) asociado(s)`,
        data: null,
      };
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Organización eliminada (soft) exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error soft deleting organization:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return {
          status: 404,
          message: 'Organización no encontrada',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// RESTORE
export const restoreOrganization = async (
  organizationId: string,
  adminUserId: string
): Promise<ActionResponse<Organization | null>> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    if (!organizationId) {
      return {
        status: 400,
        message: 'ID de la organización es requerido',
        data: null,
      };
    }

    const restoredOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      },
      include: organizationInclude,
    });

    return {
      status: 200,
      message: 'Organización restaurada exitosamente',
      data: restoredOrganization,
    };
  } catch (error) {
    console.error('Error restoring organization:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return {
          status: 404,
          message: 'Organización no encontrada',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// HARD DELETE
export const deleteOrganization = async (
  organizationId: string,
  adminUserId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    if (!organizationId) {
      return {
        status: 400,
        message: 'ID de la organización es requerido',
        data: null,
      };
    }

    // Verificar si hay registros asociados
    const [
      usersCount,
      storesCount,
      productsCount,
      customersCount,
      suppliersCount,
      stockMovementsCount,
    ] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      prisma.store.count({ where: { organizationId } }),
      prisma.product.count({ where: { organizationId } }),
      prisma.customer.count({ where: { organizationId } }),
      prisma.supplier.count({ where: { organizationId } }),
      prisma.stockMovement.count({ where: { organizationId } }),
    ]);

    const totalAssociatedRecords =
      usersCount +
      storesCount +
      productsCount +
      customersCount +
      suppliersCount +
      stockMovementsCount;

    if (totalAssociatedRecords > 0) {
      return {
        status: 409,
        message: `No se puede eliminar permanentemente la organización. Tiene registros asociados. Use eliminación suave en su lugar.`,
        data: null,
      };
    }

    await prisma.organization.delete({ where: { id: organizationId } });

    return {
      status: 200,
      message: 'Organización eliminada permanentemente',
      data: null,
    };
  } catch (error) {
    console.error('Error hard deleting organization:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return {
          status: 404,
          message: 'Organización no encontrada',
          data: null,
        };
      }
      if (error.code === 'P2003') {
        return {
          status: 409,
          message:
            'No se puede eliminar la organización debido a relaciones existentes',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
