'use server';

import { Brand, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import { prisma, checkAdminRole, unauthorizedResponse, checkOrgId, emptyOrgIdResponse } from '../utils';

const brandInclude: Prisma.BrandInclude = {
    organization: true,
    products: true,
};

// CREATE
export const createBrand = async (
    orgId: string,
    userId: string,
    brandData: Omit<Brand, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'logo'>
): Promise<ActionResponse<Brand | null>> => {
    try {
        const isAdmin = await checkAdminRole(userId);
        if (!isAdmin) return unauthorizedResponse();

        if (checkOrgId(orgId)) return emptyOrgIdResponse();

        const newBrand = await prisma.brand.create({
            data: { ...brandData, organizationId: orgId },
            include: brandInclude,
        });

        return { status: 201, message: 'Marca creada exitosamente', data: newBrand };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};

// GET MANY
export const getBrandsByOrgId = async (orgId: string, isActive?: boolean): Promise<ActionResponse<Brand[] | null>> => {
    try {
        if (checkOrgId(orgId)) return emptyOrgIdResponse();

        const whereClause: Prisma.BrandWhereInput = {
            organizationId: orgId,
            isDeleted: false
        };
        if (isActive !== undefined) {
            whereClause.isActive = isActive;
        }

        const brands = await prisma.brand.findMany({
            where: whereClause,
            include: brandInclude,
            orderBy: { createdAt: 'desc' },
        });

        return { status: 200, message: 'Marcas obtenidas exitosamente', data: brands };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};

// GET ONE
export const getBrandById = async (brandId: string): Promise<ActionResponse<Brand | null>> => {
    try {
        if (!brandId) return { status: 400, message: 'ID de la marca es requerido', data: null };

        const brand = await prisma.brand.findFirst({
            where: { id: brandId, isDeleted: false },
            include: brandInclude,
        });

        if (!brand) return { status: 404, message: 'Marca no encontrada', data: null };
        return { status: 200, message: 'Marca obtenida exitosamente', data: brand };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
}

// UPDATE
export const updateBrand = async (
    brandId: string,
    userId: string,
    updateData: Partial<Omit<Brand, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>>
): Promise<ActionResponse<Brand | null>> => {
    try {
        const isAdmin = await checkAdminRole(userId);
        if (!isAdmin) return unauthorizedResponse();

        if (!brandId) return { status: 400, message: 'ID de la marca es requerido', data: null };

        const updatedBrand = await prisma.brand.update({
            where: { id: brandId },
            data: updateData,
            include: brandInclude,
        });

        return { status: 200, message: 'Marca actualizada exitosamente', data: updatedBrand };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};

// SOFT DELETE
export const softDeleteBrand = async (brandId: string, userId: string): Promise<ActionResponse> => {
    try {
        const isAdmin = await checkAdminRole(userId);
        if (!isAdmin) return unauthorizedResponse();

        if (!brandId) return { status: 400, message: 'ID de la marca es requerido', data: null };

        await prisma.brand.update({
            where: { id: brandId },
            data: { isDeleted: true, deletedAt: new Date(), isActive: false },
        });

        return { status: 200, message: 'Marca eliminada (soft) exitosamente', data: null };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};

// HARD DELETE
export const deleteBrand = async (brandId: string, userId: string): Promise<ActionResponse> => {
    try {
        const isAdmin = await checkAdminRole(userId);
        if (!isAdmin) return unauthorizedResponse();

        if (!brandId) return { status: 400, message: 'ID de la marca es requerido', data: null };

        await prisma.brand.delete({ where: { id: brandId } });

        return { status: 200, message: 'Marca eliminada permanentemente', data: null };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};