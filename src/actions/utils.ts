import { PrismaClient, UserRole } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';

// Instancia única de Prisma Client para ser usada en todas las actions
export const prisma = new PrismaClient();

/**
 * Verifica si un usuario tiene el rol de ADMIN.
 * @param userId - El ID del usuario que realiza la acción.
 * @returns {Promise<boolean>} - True si el usuario es ADMIN, de lo contrario false.
 */
export const checkAdminRole = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === UserRole.ADMIN;
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
};

/**
 * Crea una respuesta de error estandarizada para accesos no autorizados.
 * @returns {ActionResponse} - Un objeto de respuesta con estado 403.
 */
export const unauthorizedResponse = (): ActionResponse => {
  return {
    status: 403,
    message: 'Acción no autorizada. Se requiere rol de Administrador.',
    data: null,
  };
};

export const checkOrgId = (orgId: string): boolean => {
  return (!orgId || orgId.trim() === '')
}

export const emptyOrgIdResponse = (): ActionResponse => {
  return {
    status: 400,
    message: 'El ID de la organización es requerido',
    data: null
  }
}

