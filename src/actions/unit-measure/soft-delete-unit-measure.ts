'use server';

import { ActionResponse } from '@/interfaces';
import { prisma, checkAdminRole, unauthorizedResponse } from '../utils';
import { UnitMeasure } from '@/generated/prisma';

/**
 * Soft Delete Unit Measure Server Action
 *
 * Marks a unit measure as deleted without removing from database.
 * Requires ADMIN role.
 */
export const softDeleteUnitMeasure = async (
  unitMeasureId: string,
  userId: string
): Promise<ActionResponse<UnitMeasure | null>> => {
  try {
    // Check admin role
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    // Verify unit measure exists
    const existingUnitMeasure = await prisma.unitMeasure.findUnique({
      where: { id: unitMeasureId },
    });

    if (!existingUnitMeasure) {
      return {
        status: 404,
        message: 'Unidad de medida no encontrada',
        data: null,
      };
    }

    // Check if unit measure is being used by products
    const productsUsingUnitMeasure = await prisma.product.count({
      where: {
        unitMeasureId: unitMeasureId,
        isDeleted: false,
      },
    });

    if (productsUsingUnitMeasure > 0) {
      return {
        status: 400,
        message: `No se puede eliminar la unidad de medida porque está siendo usada por ${productsUsingUnitMeasure} producto(s)`,
        data: null,
      };
    }

    // Soft delete unit measure
    const deletedUnitMeasure = await prisma.unitMeasure.update({
      where: { id: unitMeasureId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Unidad de medida eliminada exitosamente',
      data: deletedUnitMeasure,
    };
  } catch (error) {
    console.error('Error deleting unit measure:', error);
    return {
      status: 500,
      message: 'Error al eliminar la unidad de medida',
      data: null,
    };
  }
};
