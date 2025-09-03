'use server';

import { Store, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import {
  prisma,
  checkAdminRole,
  unauthorizedResponse,
  checkOrgId,
  emptyOrgIdResponse,
} from '../utils';

const storeInclude: Prisma.StoreInclude = {
  organization: true,
  users: true,
  sales: {
    take: 5, // Solo las últimas 5 ventas para evitar sobrecarga
    orderBy: { createdAt: 'desc' },
  },
  _count: {
    select: {
      sales: true,
      users: true,
    },
  },
};

// CREATE
export const createStore = async (
  orgId: string,
  userId: string,
  storeData: Omit<
    Store,
    | 'id'
    | 'organizationId'
    | 'createdAt'
    | 'updatedAt'
    | 'isDeleted'
    | 'deletedAt'
    | 'lastSaleNumber'
  >
): Promise<ActionResponse<Store | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    // Verificar que el nombre de la tienda sea único en la organización
    const existingStore = await prisma.store.findFirst({
      where: {
        organizationId: orgId,
        name: storeData.name,
        isDeleted: false,
      },
    });

    if (existingStore) {
      return {
        status: 409,
        message: 'Ya existe una tienda con ese nombre en la organización',
        data: null,
      };
    }

    const newStore = await prisma.store.create({
      data: {
        ...storeData,
        organizationId: orgId,
        lastSaleNumber: 0, // Inicializar contador de ventas
      },
      include: storeInclude,
    });

    return {
      status: 201,
      message: 'Tienda creada exitosamente',
      data: newStore,
    };
  } catch (error) {
    console.error('Error creating store:', error);

    // Manejo específico de errores de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          status: 409,
          message: 'Ya existe una tienda con ese nombre en la organización',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET MANY
export const getStoresByOrgId = async (
  orgId: string,
  isActive?: boolean,
  includeDeleted: boolean = false
): Promise<ActionResponse<Store[] | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.StoreWhereInput = {
      organizationId: orgId,
      isDeleted: includeDeleted ? undefined : false,
    };

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    const stores = await prisma.store.findMany({
      where: whereClause,
      include: storeInclude,
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 200,
      message: 'Tiendas obtenidas exitosamente',
      data: stores,
    };
  } catch (error) {
    console.error('Error fetching stores:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET ONE
export const getStoreById = async (
  storeId: string
): Promise<ActionResponse<Store | null>> => {
  try {
    if (!storeId)
      return {
        status: 400,
        message: 'ID de la tienda es requerido',
        data: null,
      };

    const store = await prisma.store.findFirst({
      where: { id: storeId, isDeleted: false },
      include: storeInclude,
    });

    if (!store)
      return { status: 404, message: 'Tienda no encontrada', data: null };

    return {
      status: 200,
      message: 'Tienda obtenida exitosamente',
      data: store,
    };
  } catch (error) {
    console.error('Error fetching store:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET STORE WITH DETAILED SALES INFO
export const getStoreWithSalesInfo = async (
  storeId: string
): Promise<ActionResponse<Store | null>> => {
  try {
    if (!storeId)
      return {
        status: 400,
        message: 'ID de la tienda es requerido',
        data: null,
      };

    const store = await prisma.store.findFirst({
      where: { id: storeId, isDeleted: false },
      include: {
        organization: true,
        users: true,
        sales: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: true,
            user: true,
            _count: {
              select: { saleItems: true },
            },
          },
        },
        _count: {
          select: {
            sales: true,
            users: true,
          },
        },
      },
    });

    if (!store)
      return { status: 404, message: 'Tienda no encontrada', data: null };

    return {
      status: 200,
      message: 'Tienda con información de ventas obtenida exitosamente',
      data: store,
    };
  } catch (error) {
    console.error('Error fetching store with sales info:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE
export const updateStore = async (
  storeId: string,
  userId: string,
  updateData: Partial<
    Omit<
      Store,
      | 'id'
      | 'organizationId'
      | 'createdAt'
      | 'updatedAt'
      | 'isDeleted'
      | 'deletedAt'
      | 'lastSaleNumber'
    >
  >
): Promise<ActionResponse<Store | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!storeId)
      return {
        status: 400,
        message: 'ID de la tienda es requerido',
        data: null,
      };

    // Verificar que la tienda exista y no esté eliminada
    const existingStore = await prisma.store.findFirst({
      where: { id: storeId, isDeleted: false },
    });

    if (!existingStore) {
      return { status: 404, message: 'Tienda no encontrada', data: null };
    }

    // Si se está actualizando el nombre, verificar unicidad
    if (updateData.name && updateData.name !== existingStore.name) {
      const duplicateStore = await prisma.store.findFirst({
        where: {
          organizationId: existingStore.organizationId,
          name: updateData.name,
          isDeleted: false,
          id: { not: storeId },
        },
      });

      if (duplicateStore) {
        return {
          status: 409,
          message: 'Ya existe una tienda con ese nombre en la organización',
          data: null,
        };
      }
    }

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: storeInclude,
    });

    return {
      status: 200,
      message: 'Tienda actualizada exitosamente',
      data: updatedStore,
    };
  } catch (error) {
    console.error('Error updating store:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          status: 409,
          message: 'Ya existe una tienda con ese nombre en la organización',
          data: null,
        };
      }
      if (error.code === 'P2025') {
        return { status: 404, message: 'Tienda no encontrada', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// INCREMENT SALE NUMBER (Función específica para el manejo de numeración de ventas)
export const incrementSaleNumber = async (
  storeId: string
): Promise<
  ActionResponse<{ nextSaleNumber: number; saleNumberPrefix: string } | null>
> => {
  try {
    if (!storeId)
      return {
        status: 400,
        message: 'ID de la tienda es requerido',
        data: null,
      };

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        lastSaleNumber: { increment: 1 },
        updatedAt: new Date(),
      },
      select: {
        lastSaleNumber: true,
        saleNumberPrefix: true,
      },
    });

    return {
      status: 200,
      message: 'Número de venta incrementado exitosamente',
      data: {
        nextSaleNumber: updatedStore.lastSaleNumber,
        saleNumberPrefix: updatedStore.saleNumberPrefix,
      },
    };
  } catch (error) {
    console.error('Error incrementing sale number:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Tienda no encontrada', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET NEXT SALE NUMBER (Sin incrementar)
export const getNextSaleNumber = async (
  storeId: string
): Promise<
  ActionResponse<{
    nextSaleNumber: number;
    saleNumberPrefix: string;
    fullSaleNumber: string;
  } | null>
> => {
  try {
    if (!storeId)
      return {
        status: 400,
        message: 'ID de la tienda es requerido',
        data: null,
      };

    const store = await prisma.store.findFirst({
      where: { id: storeId, isDeleted: false },
      select: {
        lastSaleNumber: true,
        saleNumberPrefix: true,
      },
    });

    if (!store)
      return { status: 404, message: 'Tienda no encontrada', data: null };

    const nextNumber = store.lastSaleNumber + 1;
    const fullSaleNumber = `${store.saleNumberPrefix}${nextNumber
      .toString()
      .padStart(4, '0')}`;

    return {
      status: 200,
      message: 'Siguiente número de venta obtenido exitosamente',
      data: {
        nextSaleNumber: nextNumber,
        saleNumberPrefix: store.saleNumberPrefix,
        fullSaleNumber,
      },
    };
  } catch (error) {
    console.error('Error getting next sale number:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// SOFT DELETE
export const softDeleteStore = async (
  storeId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!storeId)
      return {
        status: 400,
        message: 'ID de la tienda es requerido',
        data: null,
      };

    // Verificar si hay ventas activas asociadas
    const activeSalesCount = await prisma.sale.count({
      where: {
        storeId,
        // Agregar aquí condiciones para considerar ventas "activas" según tu lógica de negocio
      },
    });

    if (activeSalesCount > 0) {
      return {
        status: 409,
        message: `No se puede eliminar la tienda. Tiene ${activeSalesCount} venta(s) asociada(s)`,
        data: null,
      };
    }

    await prisma.store.update({
      where: { id: storeId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Tienda eliminada (soft) exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error soft deleting store:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Tienda no encontrada', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// RESTORE (Recuperar tienda eliminada)
export const restoreStore = async (
  storeId: string,
  userId: string
): Promise<ActionResponse<Store | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!storeId)
      return {
        status: 400,
        message: 'ID de la tienda es requerido',
        data: null,
      };

    const restoredStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      },
      include: storeInclude,
    });

    return {
      status: 200,
      message: 'Tienda restaurada exitosamente',
      data: restoredStore,
    };
  } catch (error) {
    console.error('Error restoring store:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Tienda no encontrada', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// HARD DELETE
export const deleteStore = async (
  storeId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!storeId)
      return {
        status: 400,
        message: 'ID de la tienda es requerido',
        data: null,
      };

    // Verificar si hay ventas asociadas
    const salesCount = await prisma.sale.count({
      where: { storeId },
    });

    if (salesCount > 0) {
      return {
        status: 409,
        message: `No se puede eliminar permanentemente la tienda. Tiene ${salesCount} venta(s) asociada(s). Use eliminación suave en su lugar.`,
        data: null,
      };
    }

    // Verificar si hay usuarios asociados
    const usersCount = await prisma.user.count({
      where: {
        storeId,
      },
    });

    if (usersCount > 0) {
      return {
        status: 409,
        message: `No se puede eliminar permanentemente la tienda. Tiene ${usersCount} usuario(s) asociado(s).`,
        data: null,
      };
    }

    await prisma.store.delete({ where: { id: storeId } });

    return {
      status: 200,
      message: 'Tienda eliminada permanentemente',
      data: null,
    };
  } catch (error) {
    console.error('Error hard deleting store:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Tienda no encontrada', data: null };
      }
      if (error.code === 'P2003') {
        return {
          status: 409,
          message:
            'No se puede eliminar la tienda debido a relaciones existentes',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET STORES BY USER (Para obtener tiendas asignadas a un usuario específico)
export const getStoresByUserId = async (
  userId: string
): Promise<ActionResponse<Store[] | null>> => {
  try {
    if (!userId)
      return {
        status: 400,
        message: 'ID del usuario es requerido',
        data: null,
      };

    const stores = await prisma.store.findMany({
      where: {
        users: {
          some: { id: userId },
        },
        isDeleted: false,
        isActive: true,
      },
      include: storeInclude,
      orderBy: { name: 'asc' },
    });

    return {
      status: 200,
      message: 'Tiendas del usuario obtenidas exitosamente',
      data: stores,
    };
  } catch (error) {
    console.error('Error fetching user stores:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
