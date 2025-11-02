'use server';

import { PurchaseItem, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import {
  prisma,
  checkAdminRole,
  unauthorizedResponse,
} from '../utils';

// PURCHASE ITEM INCLUDES
const purchaseItemInclude: Prisma.PurchaseItemInclude = {
  purchase: {
    select: {
      id: true,
      purchaseNumber: true,
      status: true,
      purchaseDate: true,
    },
  },
  product: {
    include: {
      brand: true,
      category: true,
      unitMeasure: true,
    },
  },
};

// ===========================
// PURCHASE ITEM ACTIONS
// ===========================

// CREATE PURCHASE ITEM
export const createPurchaseItem = async (
  purchaseId: string,
  userId: string,
  itemData: Omit<
    PurchaseItem,
    'id' | 'purchaseId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >
): Promise<ActionResponse<PurchaseItem | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!purchaseId) {
      return {
        status: 400,
        message: 'ID de compra es requerido',
        data: null,
      };
    }

    // Verificar que la compra existe y está en estado PENDING
    const purchase = await prisma.purchase.findFirst({
      where: { id: purchaseId, isDeleted: false },
    });

    if (!purchase) {
      return {
        status: 404,
        message: 'Compra no encontrada',
        data: null,
      };
    }

    if (purchase.status !== 'PENDING') {
      return {
        status: 400,
        message: 'Solo se pueden agregar items a compras en estado PENDING',
        data: null,
      };
    }

    // Validar cantidad y precio
    if (itemData.quantity <= 0) {
      return {
        status: 400,
        message: 'La cantidad debe ser mayor a 0',
        data: null,
      };
    }

    if (itemData.unitPrice < 0) {
      return {
        status: 400,
        message: 'El precio unitario no puede ser negativo',
        data: null,
      };
    }

    // Crear el item
    const newItem = await prisma.purchaseItem.create({
      data: {
        ...itemData,
        purchaseId,
        subtotal: itemData.quantity * itemData.unitPrice,
      },
      include: purchaseItemInclude,
    });

    // Recalcular totales de la compra
    const items = await prisma.purchaseItem.findMany({
      where: { purchaseId, isDeleted: false },
    });

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        total,
        updatedAt: new Date(),
      },
    });

    return {
      status: 201,
      message: 'Item de compra creado exitosamente',
      data: newItem,
    };
  } catch (error) {
    console.error('Error creating purchase item:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return {
          status: 400,
          message: 'Una de las referencias especificadas no existe',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET PURCHASE ITEMS BY PURCHASE ID
export const getPurchaseItemsByPurchaseId = async (
  purchaseId: string
): Promise<ActionResponse<PurchaseItem[] | null>> => {
  try {
    if (!purchaseId) {
      return {
        status: 400,
        message: 'ID de compra es requerido',
        data: null,
      };
    }

    const items = await prisma.purchaseItem.findMany({
      where: {
        purchaseId,
        isDeleted: false,
      },
      include: purchaseItemInclude,
      orderBy: { createdAt: 'asc' },
    });

    return {
      status: 200,
      message: 'Items de compra obtenidos exitosamente',
      data: items,
    };
  } catch (error) {
    console.error('Error fetching purchase items:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE PURCHASE ITEM
export const updatePurchaseItem = async (
  itemId: string,
  userId: string,
  updateData: Partial<{
    quantity: number;
    unitPrice: number;
  }>
): Promise<ActionResponse<PurchaseItem | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!itemId) {
      return {
        status: 400,
        message: 'ID de item es requerido',
        data: null,
      };
    }

    const existingItem = await prisma.purchaseItem.findFirst({
      where: { id: itemId, isDeleted: false },
      include: { purchase: true },
    });

    if (!existingItem) {
      return { status: 404, message: 'Item de compra no encontrado', data: null };
    }

    // Solo permitir actualizar items de compras PENDING
    if (existingItem.purchase.status !== 'PENDING') {
      return {
        status: 400,
        message: 'Solo se pueden actualizar items de compras en estado PENDING',
        data: null,
      };
    }

    // Validaciones
    if (updateData.quantity !== undefined && updateData.quantity <= 0) {
      return {
        status: 400,
        message: 'La cantidad debe ser mayor a 0',
        data: null,
      };
    }

    if (updateData.unitPrice !== undefined && updateData.unitPrice < 0) {
      return {
        status: 400,
        message: 'El precio unitario no puede ser negativo',
        data: null,
      };
    }

    const newQuantity = updateData.quantity ?? existingItem.quantity;
    const newUnitPrice = updateData.unitPrice ?? existingItem.unitPrice;
    const newSubtotal = newQuantity * newUnitPrice;

    const updatedItem = await prisma.purchaseItem.update({
      where: { id: itemId },
      data: {
        quantity: newQuantity,
        unitPrice: newUnitPrice,
        subtotal: newSubtotal,
        updatedAt: new Date(),
      },
      include: purchaseItemInclude,
    });

    // Recalcular totales de la compra
    const items = await prisma.purchaseItem.findMany({
      where: { purchaseId: existingItem.purchaseId, isDeleted: false },
    });

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    await prisma.purchase.update({
      where: { id: existingItem.purchaseId },
      data: {
        total,
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Item de compra actualizado exitosamente',
      data: updatedItem,
    };
  } catch (error) {
    console.error('Error updating purchase item:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Item de compra no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// SOFT DELETE PURCHASE ITEM
export const softDeletePurchaseItem = async (
  itemId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!itemId) {
      return {
        status: 400,
        message: 'ID de item es requerido',
        data: null,
      };
    }

    const existingItem = await prisma.purchaseItem.findFirst({
      where: { id: itemId, isDeleted: false },
      include: { purchase: true },
    });

    if (!existingItem) {
      return { status: 404, message: 'Item de compra no encontrado', data: null };
    }

    // Solo permitir eliminar items de compras PENDING
    if (existingItem.purchase.status !== 'PENDING') {
      return {
        status: 400,
        message: 'Solo se pueden eliminar items de compras en estado PENDING',
        data: null,
      };
    }

    // Verificar que no sea el último item de la compra
    const itemCount = await prisma.purchaseItem.count({
      where: {
        purchaseId: existingItem.purchaseId,
        isDeleted: false,
      },
    });

    if (itemCount === 1) {
      return {
        status: 400,
        message: 'No se puede eliminar el último item de la compra',
        data: null,
      };
    }

    await prisma.purchaseItem.update({
      where: { id: itemId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Recalcular totales de la compra
    const items = await prisma.purchaseItem.findMany({
      where: { purchaseId: existingItem.purchaseId, isDeleted: false },
    });

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    await prisma.purchase.update({
      where: { id: existingItem.purchaseId },
      data: {
        total,
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Item de compra eliminado exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error deleting purchase item:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
