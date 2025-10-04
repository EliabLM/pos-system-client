'use server';

import { User, Prisma, UserRole } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import {
  prisma,
  checkAdminRole,
  unauthorizedResponse,
  checkOrgId,
  emptyOrgIdResponse,
} from '../utils';

const userInclude: Prisma.UserInclude = {
  organization: true,
  store: true,
  sales: {
    take: 5,
    orderBy: { createdAt: 'desc' },
  },
  stockMovements: {
    take: 5,
    orderBy: { createdAt: 'desc' },
  },
  _count: {
    select: {
      sales: true,
      stockMovements: true,
    },
  },
};

// CREATE
export const createUser = async (
  orgId: string,
  adminUserId: string,
  userData: Omit<
    User,
    'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >
): Promise<ActionResponse<User | null>> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    // Verificar unicidad de email
    const existingUserByEmail = await prisma.user.findFirst({
      where: {
        organizationId: orgId,
        email: userData.email,
        isDeleted: false,
      },
    });

    if (existingUserByEmail) {
      return {
        status: 409,
        message: 'Ya existe un usuario con ese email',
        data: null,
      };
    }

    // Verificar unicidad de username
    const existingUserByUsername = await prisma.user.findFirst({
      where: {
        organizationId: orgId,
        username: userData.username,
        isDeleted: false,
      },
    });

    if (existingUserByUsername) {
      return {
        status: 409,
        message: 'Ya existe un usuario con ese nombre de usuario',
        data: null,
      };
    }

    // Verificar que organizationId existe si se proporciona
    if (userData.organizationId) {
      const organization = await prisma.organization.findFirst({
        where: {
          id: userData.organizationId,
          isDeleted: false,
        },
      });

      if (!organization) {
        return {
          status: 400,
          message: 'La organización especificada no existe',
          data: null,
        };
      }
    }

    // Verificar que storeId existe si se proporciona
    if (userData.storeId) {
      const store = await prisma.store.findFirst({
        where: {
          id: userData.storeId,
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

      // Verificar que la tienda no tenga ya un vendedor asignado (solo para rol SELLER)
      if (userData.role === 'SELLER') {
        const existingSellerInStore = await prisma.user.findFirst({
          where: {
            storeId: userData.storeId,
            role: 'SELLER',
            isDeleted: false,
            isActive: true,
          },
        });

        if (existingSellerInStore) {
          return {
            status: 409,
            message: 'La tienda ya tiene un vendedor asignado',
            data: null,
          };
        }
      }
    }

    const newUser = await prisma.user.create({
      data: userData,
      include: userInclude,
    });

    return {
      status: 201,
      message: 'Usuario creado exitosamente',
      data: newUser,
    };
  } catch (error) {
    console.error('Error creating user:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        if (target?.includes('email')) {
          return {
            status: 409,
            message: 'Ya existe un usuario con ese email',
            data: null,
          };
        }
        if (target?.includes('username')) {
          return {
            status: 409,
            message: 'Ya existe un usuario con ese nombre de usuario',
            data: null,
          };
        }
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

// GET MANY
export const getUsersByOrgId = async (
  orgId: string,
  filters?: {
    isActive?: boolean;
    role?: UserRole;
    storeId?: string;
    search?: string;
  },
  includeDeleted: boolean = false
): Promise<ActionResponse<User[] | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.UserWhereInput = {
      organizationId: orgId,
      isDeleted: includeDeleted ? undefined : false,
    };

    if (filters?.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    if (filters?.role) {
      whereClause.role = filters.role;
    }

    if (filters?.storeId) {
      whereClause.storeId = filters.storeId;
    }

    if (filters?.search) {
      whereClause.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 200,
      message: 'Usuarios obtenidos exitosamente',
      data: users,
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET ALL USERS (for super admin)
export const getAllUsers = async (
  adminUserId: string,
  filters?: {
    isActive?: boolean;
    role?: UserRole;
    organizationId?: string;
    search?: string;
  },
  includeDeleted: boolean = false
): Promise<ActionResponse<User[] | null>> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    const whereClause: Prisma.UserWhereInput = {
      isDeleted: includeDeleted ? undefined : false,
    };

    if (filters?.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    if (filters?.role) {
      whereClause.role = filters.role;
    }

    if (filters?.organizationId) {
      whereClause.organizationId = filters.organizationId;
    }

    if (filters?.search) {
      whereClause.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 200,
      message: 'Usuarios obtenidos exitosamente',
      data: users,
    };
  } catch (error) {
    console.error('Error fetching all users:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET ONE
export const getUserById = async (
  userId: string
): Promise<ActionResponse<User | null>> => {
  try {
    if (!userId)
      return {
        status: 400,
        message: 'ID del usuario es requerido',
        data: null,
      };

    const user = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      include: userInclude,
    });

    if (!user)
      return { status: 404, message: 'Usuario no encontrado', data: null };

    return {
      status: 200,
      message: 'Usuario obtenido exitosamente',
      data: user,
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET BY EMAIL
export const getUserByEmail = async (
  email: string
): Promise<ActionResponse<User | null>> => {
  try {
    if (!email)
      return {
        status: 400,
        message: 'Email es requerido',
        data: null,
      };

    const user = await prisma.user.findFirst({
      where: {
        email,
        isDeleted: false,
        isActive: true,
      },
      include: userInclude,
    });

    if (!user)
      return { status: 404, message: 'Usuario no encontrado', data: null };

    return {
      status: 200,
      message: 'Usuario obtenido exitosamente',
      data: user,
    };
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE
export const updateUser = async (
  userId: string,
  adminUserId: string,
  updateData: Partial<
    Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>
  >
): Promise<ActionResponse<User | null>> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    if (!userId)
      return {
        status: 400,
        message: 'ID del usuario es requerido',
        data: null,
      };

    // Verificar que el usuario exista y no esté eliminado
    const existingUser = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });

    if (!existingUser) {
      return { status: 404, message: 'Usuario no encontrado', data: null };
    }

    // Verificar unicidad de email si se está actualizando
    if (updateData.email && updateData.email !== existingUser.email) {
      const duplicateUserByEmail = await prisma.user.findFirst({
        where: {
          email: updateData.email,
          isDeleted: false,
          id: { not: userId },
        },
      });

      if (duplicateUserByEmail) {
        return {
          status: 409,
          message: 'Ya existe un usuario con ese email',
          data: null,
        };
      }
    }

    // Verificar unicidad de username si se está actualizando
    if (updateData.username && updateData.username !== existingUser.username) {
      const duplicateUserByUsername = await prisma.user.findFirst({
        where: {
          username: updateData.username,
          isDeleted: false,
          id: { not: userId },
        },
      });

      if (duplicateUserByUsername) {
        return {
          status: 409,
          message: 'Ya existe un usuario con ese nombre de usuario',
          data: null,
        };
      }
    }

    // Verificar referencias si se están actualizando
    if (
      updateData.organizationId &&
      updateData.organizationId !== existingUser.organizationId
    ) {
      const organization = await prisma.organization.findFirst({
        where: {
          id: updateData.organizationId,
          isDeleted: false,
        },
      });

      if (!organization) {
        return {
          status: 400,
          message: 'La organización especificada no existe',
          data: null,
        };
      }
    }

    if (updateData.storeId && updateData.storeId !== existingUser.storeId) {
      const store = await prisma.store.findFirst({
        where: {
          id: updateData.storeId,
          organizationId: existingUser.organizationId || undefined,
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

      // Verificar que la tienda no tenga vendedor asignado si el usuario es SELLER
      if (existingUser.role === 'SELLER') {
        const existingSellerInStore = await prisma.user.findFirst({
          where: {
            storeId: updateData.storeId,
            role: 'SELLER',
            isDeleted: false,
            isActive: true,
            id: { not: userId },
          },
        });

        if (existingSellerInStore) {
          return {
            status: 409,
            message: 'La tienda ya tiene un vendedor asignado',
            data: null,
          };
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: userInclude,
    });

    return {
      status: 200,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser,
    };
  } catch (error) {
    console.error('Error updating user:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        if (target?.includes('email')) {
          return {
            status: 409,
            message: 'Ya existe un usuario con ese email',
            data: null,
          };
        }
        if (target?.includes('username')) {
          return {
            status: 409,
            message: 'Ya existe un usuario con ese nombre de usuario',
            data: null,
          };
        }
      }
      if (error.code === 'P2025') {
        return { status: 404, message: 'Usuario no encontrado', data: null };
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

// UPDATE USER ROLE
export const updateUserOrg = async (
  userId: string,
  orgId: string
): Promise<ActionResponse<User | null>> => {
  try {
    if (!userId)
      return {
        status: 400,
        message: 'ID del usuario es requerido',
        data: null,
      };

    const existingUser = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });

    if (!existingUser) {
      return { status: 404, message: 'Usuario no encontrado', data: null };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: orgId,
        updatedAt: new Date(),
      },
      include: userInclude,
    });

    return {
      status: 200,
      message: 'Organización del usuario actualizada exitosamente',
      data: updatedUser,
    };
  } catch (error) {
    console.error('Error updating user organization:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Usuario no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE USER ROLE
export const updateUserRole = async (
  userId: string,
  adminUserId: string,
  newRole: UserRole
): Promise<ActionResponse<User | null>> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    if (!userId)
      return {
        status: 400,
        message: 'ID del usuario es requerido',
        data: null,
      };

    const existingUser = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });

    if (!existingUser) {
      return { status: 404, message: 'Usuario no encontrado', data: null };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: newRole,
        updatedAt: new Date(),
      },
      include: userInclude,
    });

    return {
      status: 200,
      message: 'Rol de usuario actualizado exitosamente',
      data: updatedUser,
    };
  } catch (error) {
    console.error('Error updating user role:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Usuario no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// ACTIVATE/DEACTIVATE USER
export const toggleUserStatus = async (
  userId: string,
  adminUserId: string,
  isActive: boolean
): Promise<ActionResponse<User | null>> => {
  try {
    const isAdminRole = await checkAdminRole(adminUserId);
    if (!isAdminRole) return unauthorizedResponse();

    if (!userId)
      return {
        status: 400,
        message: 'ID del usuario es requerido',
        data: null,
      };

    const existingUser = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });

    if (!existingUser) {
      return { status: 404, message: 'Usuario no encontrado', data: null };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
        updatedAt: new Date(),
      },
      include: userInclude,
    });

    return {
      status: 200,
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: updatedUser,
    };
  } catch (error) {
    console.error('Error toggling user status:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Usuario no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET USERS BY ROLE
export const getUsersByRole = async (
  orgId: string,
  role: UserRole
): Promise<ActionResponse<User[] | null>> => {
  try {
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const users = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        role,
        isDeleted: false,
        isActive: true,
      },
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 200,
      message: `Usuarios con rol ${role} obtenidos exitosamente`,
      data: users,
    };
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// SOFT DELETE
export const softDeleteUser = async (
  userId: string,
  adminUserId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    if (!userId)
      return {
        status: 400,
        message: 'ID del usuario es requerido',
        data: null,
      };

    // Verificar si hay ventas asociadas
    const salesCount = await prisma.sale.count({
      where: { userId },
    });

    // Verificar si hay movimientos de stock asociados
    const stockMovementsCount = await prisma.stockMovement.count({
      where: { userId },
    });

    if (salesCount > 0 || stockMovementsCount > 0) {
      return {
        status: 409,
        message: `No se puede eliminar el usuario. Tiene ${salesCount + stockMovementsCount
          } transacción(es) asociada(s)`,
        data: null,
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Usuario eliminado (soft) exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error soft deleting user:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Usuario no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// RESTORE
export const restoreUser = async (
  userId: string,
  adminUserId: string
): Promise<ActionResponse<User | null>> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    if (!userId)
      return {
        status: 400,
        message: 'ID del usuario es requerido',
        data: null,
      };

    const restoredUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      },
      include: userInclude,
    });

    return {
      status: 200,
      message: 'Usuario restaurado exitosamente',
      data: restoredUser,
    };
  } catch (error) {
    console.error('Error restoring user:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Usuario no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// HARD DELETE
export const deleteUser = async (
  userId: string,
  adminUserId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    if (!userId)
      return {
        status: 400,
        message: 'ID del usuario es requerido',
        data: null,
      };

    // Verificar si hay transacciones asociadas
    const salesCount = await prisma.sale.count({
      where: { userId },
    });

    const stockMovementsCount = await prisma.stockMovement.count({
      where: { userId },
    });

    if (salesCount > 0 || stockMovementsCount > 0) {
      return {
        status: 409,
        message: `No se puede eliminar permanentemente el usuario. Tiene transacciones o movimientos asociados. Use eliminación suave en su lugar.`,
        data: null,
      };
    }

    await prisma.user.delete({ where: { id: userId } });

    return {
      status: 200,
      message: 'Usuario eliminado permanentemente',
      data: null,
    };
  } catch (error) {
    console.error('Error hard deleting user:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Usuario no encontrado', data: null };
      }
      if (error.code === 'P2003') {
        return {
          status: 409,
          message:
            'No se puede eliminar el usuario debido a relaciones existentes',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
