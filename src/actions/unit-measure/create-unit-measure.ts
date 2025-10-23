'use server';

import { UnitMeasure, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import { prisma, checkAdminRole, unauthorizedResponse, checkOrgId, emptyOrgIdResponse } from '../utils';

const unitMeasureInclude: Prisma.UnitMeasureInclude = {
  organization: true,
  products: {
    take: 5,
    where: { isDeleted: false },
  },
  _count: {
    select: {
      products: true,
      saleItems: true,
    },
  },
};

export const createUnitMeasure = async (
  orgId: string,
  userId: string,
  unitMeasureData: Omit<UnitMeasure, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>
): Promise<ActionResponse<UnitMeasure | null>> => {
  try {
    // Validación de orgId
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    // Verificar que no exista una unidad con el mismo nombre (considerando soft delete)
    const existingUnit = await prisma.unitMeasure.findFirst({
      where: {
        organizationId: orgId,
        name: unitMeasureData.name,
        isDeleted: false,
      },
    });

    if (existingUnit) {
      return {
        status: 400,
        message: 'Ya existe una unidad de medida con este nombre',
        data: null,
      };
    }

    // Verificar que no exista una unidad con la misma abreviación (considerando soft delete)
    const existingAbbrev = await prisma.unitMeasure.findFirst({
      where: {
        organizationId: orgId,
        abbreviation: unitMeasureData.abbreviation,
        isDeleted: false,
      },
    });

    if (existingAbbrev) {
      return {
        status: 400,
        message: 'Ya existe una unidad de medida con esta abreviación',
        data: null,
      };
    }

    const newUnitMeasure = await prisma.unitMeasure.create({
      data: {
        ...unitMeasureData,
        organizationId: orgId,
      },
      include: unitMeasureInclude,
    });

    return {
      status: 201,
      message: 'Unidad de medida creada exitosamente',
      data: newUnitMeasure,
    };
  } catch (error) {
    console.error('🚀 ~ createUnitMeasure ~ error:', error);
    return {
      status: 500,
      message: 'Error interno del servidor al crear la unidad de medida',
      data: null,
    };
  } finally {
    await prisma.$disconnect();
  }
};
