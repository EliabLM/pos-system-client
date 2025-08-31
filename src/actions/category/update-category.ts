'use server'

import { Category, Prisma } from "@/generated/prisma";
import { ActionResponse } from "@/interfaces";
import { checkAdminRole, prisma, unauthorizedResponse } from "../utils";

const categoryInclude: Prisma.CategoryInclude = {
    organization: true,
    products: true,
};

export const updateCategory = async (
    categoryId: string,
    userId: string,
    updateData: Partial<Omit<Category, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>>
): Promise<ActionResponse<Category | null>> => {
    try {
        const isAdmin = await checkAdminRole(userId);
        if (!isAdmin) return unauthorizedResponse();

        if (!categoryId) return { status: 400, message: 'ID de la categoría es requerido', data: null };

        const updatedCategory = await prisma.category.update({
            where: { id: categoryId },
            data: updateData,
            include: categoryInclude,
        });

        return { status: 200, message: 'Categoría actualizada exitosamente', data: updatedCategory };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};