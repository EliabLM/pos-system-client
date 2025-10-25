'use server';

import { ActionResponse } from '@/interfaces';
import { prisma, checkAdminRole, unauthorizedResponse } from '../utils';
import { UnitMeasure } from '@/generated/prisma';

/**
 * Update Unit Measure Server Action
 *
 * Updates an existing unit measure with validation.
 * Requires ADMIN role.
 */
export const updateUnitMeasure = async (
  unitMeasureId: string,
  userId: string,
  unitMeasureData: Partial<Omit<UnitMeasure, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>>
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

    // Check for duplicate name or abbreviation if being updated
    if (unitMeasureData.name || unitMeasureData.abbreviation) {
      const duplicateCheck = await prisma.unitMeasure.findFirst({
        where: {
          id: { not: unitMeasureId },
          organizationId: existingUnitMeasure.organizationId,
          isDeleted: false,
          OR: [
            unitMeasureData.name ? { name: unitMeasureData.name } : {},
            unitMeasureData.abbreviation ? { abbreviation: unitMeasureData.abbreviation } : {},
          ].filter(obj => Object.keys(obj).length > 0),
        },
      });

      if (duplicateCheck) {
        const field = duplicateCheck.name === unitMeasureData.name ? 'nombre' : 'abreviación';
        return {
          status: 400,
          message: `Ya existe una unidad de medida con este ${field}`,
          data: null,
        };
      }
    }

    // Update unit measure
    const updatedUnitMeasure = await prisma.unitMeasure.update({
      where: { id: unitMeasureId },
      data: unitMeasureData,
    });

    return {
      status: 200,
      message: 'Unidad de medida actualizada exitosamente',
      data: updatedUnitMeasure,
    };
  } catch (error) {
    console.error('Error updating unit measure:', error);
    return {
      status: 500,
      message: 'Error al actualizar la unidad de medida',
      data: null,
    };
  }
};
