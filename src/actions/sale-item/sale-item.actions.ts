import {
  Sale,
  SaleItem,
  SalePayment,
  Prisma,
  SaleStatus,
} from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import {
  prisma,
  checkAdminRole,
  unauthorizedResponse,
  checkOrgId,
  emptyOrgIdResponse,
} from '../utils';
import { calculateSaleTotals } from '../sale/sale.actions';

const saleItemInclude: Prisma.SaleItemInclude = {
  sale: {
    select: {
      id: true,
      saleNumber: true,
      total: true,
      status: true,
      saleDate: true,
    },
  },
  product: {
    include: {
      brand: true,
      category: true,
      unitMeasure: true,
    },
  },
  unitMeasure: true,
};

// ===========================
// SALE ITEM ACTIONS
// ===========================

// ADD SALE ITEM
export const addSaleItem = async (
  saleId: string,
  userId: string,
  itemData: Omit<
    SaleItem,
    'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >
): Promise<ActionResponse<SaleItem | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (itemData.quantity <= 0 || itemData.unitPrice < 0) {
      return {
        status: 400,
        message: 'Cantidad debe ser mayor a 0 y precio no puede ser negativo',
        data: null,
      };
    }

    // Verificar que la venta existe y no está cancelada o eliminada
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, isDeleted: false },
    });

    if (!sale) {
      return { status: 404, message: 'Venta no encontrada', data: null };
    }

    if (sale.status === 'CANCELLED') {
      return {
        status: 400,
        message: 'No se pueden agregar items a una venta cancelada',
        data: null,
      };
    }

    // Verificar producto y stock
    const product = await prisma.product.findFirst({
      where: {
        id: itemData.productId,
        organizationId: sale.organizationId,
        isDeleted: false,
        isActive: true,
      },
    });

    if (!product) {
      return {
        status: 400,
        message: 'Producto no encontrado o inactivo',
        data: null,
      };
    }

    if (product.currentStock < itemData.quantity) {
      return {
        status: 400,
        message: `Stock insuficiente. Disponible: ${product.currentStock}`,
        data: null,
      };
    }

    // Agregar item en transacción
    const newItem = await prisma.$transaction(async (tx) => {
      // Crear el item
      const item = await tx.saleItem.create({
        data: {
          ...itemData,
          saleId,
          subtotal: itemData.quantity * itemData.unitPrice,
        },
        include: saleItemInclude,
      });

      // Actualizar totales de la venta
      const saleItems = await tx.saleItem.findMany({
        where: { saleId, isDeleted: false },
      });

      const { subtotal, total } = calculateSaleTotals(saleItems);

      await tx.sale.update({
        where: { id: saleId },
        data: {
          subtotal,
          total,
          updatedAt: new Date(),
        },
      });

      // Actualizar stock
      await tx.product.update({
        where: { id: itemData.productId },
        data: {
          currentStock: {
            decrement: itemData.quantity,
          },
          updatedAt: new Date(),
        },
      });

      // Crear movimiento de stock
      await tx.stockMovement.create({
        data: {
          organizationId: sale.organizationId,
          productId: itemData.productId,
          userId,
          storeId: sale.storeId,
          type: 'OUT',
          quantity: itemData.quantity,
          previousStock: 0,
          newStock: 0,
          reason: `Agregado a venta ${sale.saleNumber}`,
          reference: saleId,
        },
      });

      return item;
    });

    return {
      status: 201,
      message: 'Item agregado a la venta exitosamente',
      data: newItem,
    };
  } catch (error) {
    console.error('Error adding sale item:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// UPDATE SALE ITEM
export const updateSaleItem = async (
  itemId: string,
  userId: string,
  updateData: Partial<{
    quantity: number;
    unitPrice: number;
  }>
): Promise<ActionResponse<SaleItem | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!itemId) {
      return {
        status: 400,
        message: 'ID del item es requerido',
        data: null,
      };
    }

    const existingItem = await prisma.saleItem.findFirst({
      where: { id: itemId, isDeleted: false },
      include: { sale: true },
    });

    if (!existingItem) {
      return { status: 404, message: 'Item no encontrado', data: null };
    }

    if (existingItem.sale.status === 'CANCELLED') {
      return {
        status: 400,
        message: 'No se pueden modificar items de una venta cancelada',
        data: null,
      };
    }

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
        message: 'El precio no puede ser negativo',
        data: null,
      };
    }

    // Actualizar item en transacción
    const updatedItem = await prisma.$transaction(async (tx) => {
      const newQuantity = updateData.quantity ?? existingItem.quantity;
      const newUnitPrice = updateData.unitPrice ?? existingItem.unitPrice;
      const quantityDiff = newQuantity - existingItem.quantity;

      // Verificar stock si se aumenta la cantidad
      if (quantityDiff > 0) {
        const product = await tx.product.findUnique({
          where: { id: existingItem.productId },
        });

        if (!product || product.currentStock < quantityDiff) {
          throw new Error('Stock insuficiente para el incremento solicitado');
        }
      }

      // Actualizar el item
      const item = await tx.saleItem.update({
        where: { id: itemId },
        data: {
          ...updateData,
          subtotal: newQuantity * newUnitPrice,
          updatedAt: new Date(),
        },
        include: saleItemInclude,
      });

      // Actualizar stock si cambió la cantidad
      if (quantityDiff !== 0) {
        await tx.product.update({
          where: { id: existingItem.productId },
          data: {
            currentStock: {
              decrement: quantityDiff,
            },
            updatedAt: new Date(),
          },
        });

        // Crear movimiento de stock
        await tx.stockMovement.create({
          data: {
            organizationId: existingItem.sale.organizationId,
            productId: existingItem.productId,
            userId,
            storeId: existingItem.sale.storeId,
            type: quantityDiff > 0 ? 'OUT' : 'IN',
            quantity: Math.abs(quantityDiff),
            previousStock: 0,
            newStock: 0,
            reason: `Ajuste en venta ${existingItem.sale.saleNumber}`,
            reference: existingItem.saleId,
          },
        });
      }

      // Recalcular totales de la venta
      const saleItems = await tx.saleItem.findMany({
        where: { saleId: existingItem.saleId, isDeleted: false },
      });

      const { subtotal, total } = calculateSaleTotals(saleItems);

      await tx.sale.update({
        where: { id: existingItem.saleId },
        data: {
          subtotal,
          total,
          updatedAt: new Date(),
        },
      });

      return item;
    });

    return {
      status: 200,
      message: 'Item actualizado exitosamente',
      data: updatedItem,
    };
  } catch (error) {
    console.error('Error updating sale item:', error);

    if (error instanceof Error) {
      return {
        status: 400,
        message: error.message,
        data: null,
      };
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// DELETE SALE ITEM
export const deleteSaleItem = async (
  itemId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!itemId) {
      return {
        status: 400,
        message: 'ID del item es requerido',
        data: null,
      };
    }

    const existingItem = await prisma.saleItem.findFirst({
      where: { id: itemId, isDeleted: false },
      include: { sale: true },
    });

    if (!existingItem) {
      return { status: 404, message: 'Item no encontrado', data: null };
    }

    if (existingItem.sale.status === 'CANCELLED') {
      return {
        status: 400,
        message: 'No se pueden eliminar items de una venta cancelada',
        data: null,
      };
    }

    // Verificar que no sea el último item de la venta
    const itemCount = await prisma.saleItem.count({
      where: { saleId: existingItem.saleId, isDeleted: false },
    });

    if (itemCount <= 1) {
      return {
        status: 400,
        message: 'No se puede eliminar el último item de la venta',
        data: null,
      };
    }

    // Eliminar item y restaurar stock en transacción
    await prisma.$transaction(async (tx) => {
      // Soft delete del item
      await tx.saleItem.update({
        where: { id: itemId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Restaurar stock
      await tx.product.update({
        where: { id: existingItem.productId },
        data: {
          currentStock: {
            increment: existingItem.quantity,
          },
          updatedAt: new Date(),
        },
      });

      // Crear movimiento de stock
      await tx.stockMovement.create({
        data: {
          organizationId: existingItem.sale.organizationId,
          productId: existingItem.productId,
          userId,
          storeId: existingItem.sale.storeId,
          type: 'IN',
          quantity: existingItem.quantity,
          previousStock: 0,
          newStock: 0,
          reason: `Eliminación de item de venta ${existingItem.sale.saleNumber}`,
          reference: existingItem.saleId,
        },
      });

      // Recalcular totales de la venta
      const remainingSaleItems = await tx.saleItem.findMany({
        where: { saleId: existingItem.saleId, isDeleted: false },
      });

      const { subtotal, total } = calculateSaleTotals(remainingSaleItems);

      await tx.sale.update({
        where: { id: existingItem.saleId },
        data: {
          subtotal,
          total,
          updatedAt: new Date(),
        },
      });
    });

    return {
      status: 200,
      message: 'Item eliminado exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error deleting sale item:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET SALE ITEMS BY SALE ID
export const getSaleItemsBySaleId = async (
  saleId: string
): Promise<ActionResponse<SaleItem[] | null>> => {
  try {
    if (!saleId) {
      return {
        status: 400,
        message: 'ID de venta es requerido',
        data: null,
      };
    }

    const items = await prisma.saleItem.findMany({
      where: { saleId, isDeleted: false },
      include: saleItemInclude,
      orderBy: { createdAt: 'asc' },
    });

    return {
      status: 200,
      message: 'Items de venta obtenidos exitosamente',
      data: items,
    };
  } catch (error) {
    console.error('Error fetching sale items:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
