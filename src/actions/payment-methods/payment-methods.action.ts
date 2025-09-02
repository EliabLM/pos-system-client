'use server';

import { PaymentMethod, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import { prisma, checkAdminRole, unauthorizedResponse, checkOrgId, emptyOrgIdResponse } from '../utils';

// CREATE
export const createPaymentMethod = async (
    orgId: string,
    userId: string,
    paymentMethodData: Omit<PaymentMethod, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>
): Promise<ActionResponse<PaymentMethod | null>> => {
    try {
        const isAdmin = await checkAdminRole(userId);
        if (!isAdmin) return unauthorizedResponse();

        if (checkOrgId(orgId)) return emptyOrgIdResponse();

        const newPaymentMethod = await prisma.paymentMethod.create({
            data: { ...paymentMethodData, organizationId: orgId },
        });

        return { status: 201, message: 'Método de pago creado exitosamente', data: newPaymentMethod };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};

// GET MANY
export const getPaymentMethodsByOrgId = async (orgId: string, isActive?: boolean): Promise<ActionResponse<PaymentMethod[] | null>> => {
    try {
        if (checkOrgId(orgId)) return emptyOrgIdResponse();

        const whereClause: Prisma.PaymentMethodWhereInput = {
            organizationId: orgId,
            isDeleted: false
        };
        if (isActive !== undefined) {
            whereClause.isActive = isActive;
        }

        const paymentMethods = await prisma.paymentMethod.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });

        return { status: 200, message: 'Métodos de pago obtenidos exitosamente', data: paymentMethods };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};

// GET ONE
export const getPaymentMethodById = async (paymenMethodId: string): Promise<ActionResponse<PaymentMethod | null>> => {
    try {
        if (!paymenMethodId) return { status: 400, message: 'ID del método de pago es requerido', data: null };

        const paymentMethod = await prisma.paymentMethod.findFirst({
            where: { id: paymenMethodId, isDeleted: false },
        });

        if (!paymentMethod) return { status: 404, message: 'Método de pago no encontrado', data: null };
        return { status: 200, message: 'Método de pago obtenido exitosamente', data: paymentMethod };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
}

// UPDATE
export const updatePaymentMethod = async (
    paymentMethodId: string,
    userId: string,
    updateData: Partial<Omit<PaymentMethod, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>>
): Promise<ActionResponse<PaymentMethod | null>> => {
    try {
        const isAdmin = await checkAdminRole(userId);
        if (!isAdmin) return unauthorizedResponse();

        if (!paymentMethodId) return { status: 400, message: 'ID del método de pago es requerido', data: null };

        const updatedBrand = await prisma.paymentMethod.update({
            where: { id: paymentMethodId },
            data: updateData,
        });

        return { status: 200, message: 'Método de pago actualizado exitosamente', data: updatedBrand };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};

// SOFT DELETE
export const softDeletePaymentMethod = async (paymentMethodId: string, userId: string): Promise<ActionResponse> => {
    try {
        const isAdmin = await checkAdminRole(userId);
        if (!isAdmin) return unauthorizedResponse();

        if (!paymentMethodId) return { status: 400, message: 'ID del método de pago es requerido', data: null };

        await prisma.paymentMethod.update({
            where: { id: paymentMethodId },
            data: { isDeleted: true, deletedAt: new Date(), isActive: false },
        });

        return { status: 200, message: 'Método de pago eliminado (soft) exitosamente', data: null };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};

// HARD DELETE
export const deletePaymentMethod = async (paymentMethodId: string, userId: string): Promise<ActionResponse> => {
    try {
        const isAdmin = await checkAdminRole(userId);
        if (!isAdmin) return unauthorizedResponse();

        if (!paymentMethodId) return { status: 400, message: 'ID del método de pago es requerido', data: null };

        await prisma.paymentMethod.delete({ where: { id: paymentMethodId } });

        return { status: 200, message: 'Método de pago eliminado permanentemente', data: null };
    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error interno del servidor', data: null };
    }
};