'use server'

import { Category, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import { prisma, checkOrgId, emptyOrgIdResponse } from '../utils';

const categoryInclude: Prisma.CategoryInclude = {
    organization: true,
    products: true,
};

export const getCategoriesByOrgId = async (orgId: string, isActive?: boolean): Promise<ActionResponse<Category[] | null>> => {
    try {
        // Validación de orgId
        if (checkOrgId(orgId)) return emptyOrgIdResponse();

        const whereClause: Prisma.CategoryWhereInput = {
            organizationId: orgId,
            isDeleted: false
        };

        if (isActive !== undefined) {
            whereClause.isActive = isActive;
        }

        const categories = await prisma.category.findMany({
            where: whereClause,
            include: categoryInclude,
            orderBy: { createdAt: 'desc' },
        });

        return {
            status: 200,
            message: 'Categorías obtenidas exitosamente',
            data: categories
        }
    } catch (error) {
        console.error("🚀 ~ getCategoriesByOrgId ~ error:", error)
        return {
            status: 500,
            message: 'Error interno del servidor al obtener las categorías',
            data: null
        }
    } finally {
        await prisma.$disconnect()
    }
}
