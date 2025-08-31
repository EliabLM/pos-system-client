'use server';

import { Category, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import { prisma, checkAdminRole, unauthorizedResponse, checkOrgId, emptyOrgIdResponse } from '../utils';

const categoryInclude: Prisma.CategoryInclude = {
    organization: true,
    products: true,
};

export const createCategory = async (
    orgId: string,
    userId: string,
    categoryData: Omit<Category, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>
): Promise<ActionResponse<Category | null>> => {
    try {
        // Validación de orgId
        if (checkOrgId(orgId)) return emptyOrgIdResponse();

        const isAdmin = await checkAdminRole(userId);
        if (!isAdmin) return unauthorizedResponse();

        const newCategory = await prisma.category.create({
            data: {
                ...categoryData,
                organizationId: orgId,
            },
            include: categoryInclude
        })

        return {
            status: 201,
            message: 'Categoría creada exitosamente',
            data: newCategory
        }
    } catch (error) {
        console.error("🚀 ~ createCategory ~ error:", error)
        return {
            status: 500,
            message: 'Error interno del servidor al crear la categoría',
            data: null
        }
    } finally {
        await prisma.$disconnect()
    }
}