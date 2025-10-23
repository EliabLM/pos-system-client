'use server';

import { UnitMeasure, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import { prisma, checkOrgId, emptyOrgIdResponse } from '../utils';

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

export const getUnitMeasuresByOrgId = async (
  orgId: string,
  isActive?: boolean
): Promise<ActionResponse<UnitMeasure[] | null>> => {
  try {
    // Validación de orgId
    if (checkOrgId(orgId)) return emptyOrgIdResponse();

    const whereClause: Prisma.UnitMeasureWhereInput = {
      organizationId: orgId,
      isDeleted: false,
    };

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    const unitMeasures = await prisma.unitMeasure.findMany({
      where: whereClause,
      include: unitMeasureInclude,
      orderBy: { name: 'asc' },
    });

    return {
      status: 200,
      message: 'Unidades de medida obtenidas exitosamente',
      data: unitMeasures,
    };
  } catch (error) {
    console.error('🚀 ~ getUnitMeasuresByOrgId ~ error:', error);
    return {
      status: 500,
      message: 'Error interno del servidor al obtener las unidades de medida',
      data: null,
    };
  } finally {
    await prisma.$disconnect();
  }
};
