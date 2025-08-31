'use server'

import { ActionResponse } from "@/interfaces";
import { checkAdminRole, prisma, unauthorizedResponse } from "../utils";

export const softDeleteCategory = async (categoryId: string, userId: string): Promise<ActionResponse> => {
    try {
        const isAdmin = await checkAdminRole(userId);
        if (!isAdmin) return unauthorizedResponse();

        if (!categoryId) return { status: 400, message: 'ID de la categoría es requerido', data: null };

        await prisma.category.update({
            where: { id: categoryId },
            data: { isDeleted: true, deletedAt: new Date(), isActive: false },
        });

        return { status: 200, message: 'Categoría eliminada (soft) exitosamente', data: null };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};