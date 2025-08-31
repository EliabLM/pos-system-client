'use server';

import { Category, Prisma } from "@/generated/prisma";
import { ActionResponse } from "@/interfaces";
import { prisma } from "../utils";

const categoryInclude: Prisma.CategoryInclude = {
    organization: true,
    products: true,
};

export const getCategoryById = async (categoryId: string): Promise<ActionResponse<Category>> => {
    try {
        if (!categoryId) return { status: 400, message: 'ID de la categoría es requerido', data: null };

        const category = await prisma.category.findFirst({
            where: { id: categoryId, isDeleted: false },
            include: categoryInclude,
        });

        if (!category) return { status: 404, message: 'Categoría no encontrada', data: null };

        return { status: 200, message: 'Categoría obtenida exitosamente', data: category };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
}