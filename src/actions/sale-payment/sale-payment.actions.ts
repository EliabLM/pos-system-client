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

const salePaymentInclude: Prisma.SalePaymentInclude = {
  sale: {
    select: {
      id: true,
      saleNumber: true,
      total: true,
      status: true,
      saleDate: true,
    },
  },
  paymentMethod: true,
};

// ===========================
// SALE PAYMENT ACTIONS
// ===========================

// ADD SALE PAYMENT
export const addSalePayment = async (
  saleId: string,
  userId: string,
  paymentData: Omit<
    SalePayment,
    'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >
): Promise<ActionResponse<SalePayment | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (paymentData.amount <= 0) {
      return {
        status: 400,
        message: 'El monto del pago debe ser mayor a 0',
        data: null,
      };
    }

    // Verificar que la venta existe
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, isDeleted: false },
      include: {
        salePayments: {
          where: { isDeleted: false },
        },
      },
    });

    if (!sale) {
      return { status: 404, message: 'Venta no encontrada', data: null };
    }

    if (sale.status === 'CANCELLED') {
      return {
        status: 400,
        message: 'No se pueden agregar pagos a una venta cancelada',
        data: null,
      };
    }

    // Calcular monto pagado actual
    const currentPaidAmount = sale.salePayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const remainingAmount = sale.total - currentPaidAmount;

    if (paymentData.amount > remainingAmount) {
      return {
        status: 400,
        message: `El monto excede el saldo pendiente de ${remainingAmount}`,
        data: null,
      };
    }

    // Verificar método de pago
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentData.paymentMethodId,
        organizationId: sale.organizationId,
        isDeleted: false,
        isActive: true,
      },
    });

    if (!paymentMethod) {
      return {
        status: 400,
        message: 'Método de pago no válido',
        data: null,
      };
    }

    // Crear pago y actualizar estado de venta en transacción
    const newPayment = await prisma.$transaction(async (tx) => {
      // Crear el pago
      const payment = await tx.salePayment.create({
        data: {
          ...paymentData,
          saleId,
        },
        include: salePaymentInclude,
      });

      // Calcular nuevo monto pagado
      const newPaidAmount = currentPaidAmount + paymentData.amount;
      const isFullyPaid = Math.abs(newPaidAmount - sale.total) < 0.01;

      // Actualizar estado de la venta
      let newStatus = sale.status;
      let paidDate = sale.paidDate;

      if (isFullyPaid && sale.status === 'PENDING') {
        newStatus = 'PAID';
        paidDate = new Date();
      }

      await tx.sale.update({
        where: { id: saleId },
        data: {
          status: newStatus,
          paidDate,
          updatedAt: new Date(),
        },
      });

      return payment;
    });

    return {
      status: 201,
      message: 'Pago agregado exitosamente',
      data: newPayment,
    };
  } catch (error) {
    console.error('Error adding sale payment:', error);

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

// UPDATE SALE PAYMENT
export const updateSalePayment = async (
  paymentId: string,
  userId: string,
  updateData: Partial<{
    amount: number;
    reference: string;
    notes: string;
    paymentDate: Date;
  }>
): Promise<ActionResponse<SalePayment | null>> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!paymentId) {
      return {
        status: 400,
        message: 'ID del pago es requerido',
        data: null,
      };
    }

    const existingPayment = await prisma.salePayment.findFirst({
      where: { id: paymentId, isDeleted: false },
      include: {
        sale: {
          include: {
            salePayments: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    if (!existingPayment) {
      return { status: 404, message: 'Pago no encontrado', data: null };
    }

    if (existingPayment.sale.status === 'CANCELLED') {
      return {
        status: 400,
        message: 'No se pueden modificar pagos de una venta cancelada',
        data: null,
      };
    }

    // Validar nuevo monto si se está actualizando
    if (updateData.amount !== undefined) {
      if (updateData.amount <= 0) {
        return {
          status: 400,
          message: 'El monto debe ser mayor a 0',
          data: null,
        };
      }

      const otherPayments = existingPayment.sale.salePayments.filter(
        (p) => p.id !== paymentId
      );
      const otherPaymentsTotal = otherPayments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );
      const newTotal = otherPaymentsTotal + updateData.amount;

      if (newTotal > existingPayment.sale.total) {
        return {
          status: 400,
          message: 'El nuevo monto excede el total de la venta',
          data: null,
        };
      }
    }

    const updatedPayment = await prisma.salePayment.update({
      where: { id: paymentId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: salePaymentInclude,
    });

    return {
      status: 200,
      message: 'Pago actualizado exitosamente',
      data: updatedPayment,
    };
  } catch (error) {
    console.error('Error updating sale payment:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { status: 404, message: 'Pago no encontrado', data: null };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// DELETE SALE PAYMENT
export const deleteSalePayment = async (
  paymentId: string,
  userId: string
): Promise<ActionResponse> => {
  try {
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) return unauthorizedResponse();

    if (!paymentId) {
      return {
        status: 400,
        message: 'ID del pago es requerido',
        data: null,
      };
    }

    const existingPayment = await prisma.salePayment.findFirst({
      where: { id: paymentId, isDeleted: false },
      include: {
        sale: {
          include: {
            salePayments: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    if (!existingPayment) {
      return { status: 404, message: 'Pago no encontrado', data: null };
    }

    if (existingPayment.sale.status === 'CANCELLED') {
      return {
        status: 400,
        message: 'No se pueden eliminar pagos de una venta cancelada',
        data: null,
      };
    }

    // Eliminar pago y actualizar estado de venta en transacción
    await prisma.$transaction(async (tx) => {
      // Soft delete del pago
      await tx.salePayment.update({
        where: { id: paymentId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Recalcular estado de la venta
      const remainingPayments = existingPayment.sale.salePayments.filter(
        (p) => p.id !== paymentId
      );
      const newPaidAmount = remainingPayments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );
      const isFullyPaid =
        Math.abs(newPaidAmount - existingPayment.sale.total) < 0.01;

      let newStatus = existingPayment.sale.status;
      let paidDate = existingPayment.sale.paidDate;

      if (!isFullyPaid && existingPayment.sale.status === 'PAID') {
        newStatus = 'PENDING';
        paidDate = null;
      }

      await tx.sale.update({
        where: { id: existingPayment.saleId },
        data: {
          status: newStatus,
          paidDate,
          updatedAt: new Date(),
        },
      });
    });

    return {
      status: 200,
      message: 'Pago eliminado exitosamente',
      data: null,
    };
  } catch (error) {
    console.error('Error deleting sale payment:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};

// GET SALE PAYMENTS BY SALE ID
export const getSalePaymentsBySaleId = async (
  saleId: string
): Promise<ActionResponse<SalePayment[] | null>> => {
  try {
    if (!saleId) {
      return {
        status: 400,
        message: 'ID de venta es requerido',
        data: null,
      };
    }

    const payments = await prisma.salePayment.findMany({
      where: { saleId, isDeleted: false },
      include: salePaymentInclude,
      orderBy: { paymentDate: 'desc' },
    });

    return {
      status: 200,
      message: 'Pagos de venta obtenidos exitosamente',
      data: payments,
    };
  } catch (error) {
    console.error('Error fetching sale payments:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
