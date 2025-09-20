import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addSalePayment,
  updateSalePayment,
  deleteSalePayment,
  getSalePaymentsBySaleId,
} from '@/actions/sale-payment';
import { useStore } from '@/store';
import { SalePayment } from '@/generated/prisma';

// Tipos para los parámetros de sale payments
interface AddSalePaymentParams {
  saleId: string;
  paymentData: Omit<
    SalePayment,
    'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >;
}

interface UpdateSalePaymentParams {
  paymentId: string;
  updateData: Partial<{
    amount: number;
    reference: string;
    notes: string;
    paymentDate: Date;
  }>;
}

// Hook para obtener pagos de una venta específica
export const useSalePaymentsBySaleId = (saleId: string) => {
  return useQuery({
    queryKey: ['salePayments', saleId],
    queryFn: async () => {
      if (!saleId) {
        throw new Error('ID de venta requerido');
      }

      const response = await getSalePaymentsBySaleId(saleId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!saleId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para agregar pago a una venta
export const useAddSalePayment = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ saleId, paymentData }: AddSalePaymentParams) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await addSalePayment(saleId, user.id, paymentData);

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar pagos de la venta específica
      queryClient.invalidateQueries({
        queryKey: ['salePayments', variables.saleId],
      });

      // Invalidar la venta para actualizar su estado
      queryClient.invalidateQueries({
        queryKey: ['sale', variables.saleId],
      });

      // Invalidar lista de ventas para reflejar cambios de estado
      queryClient.invalidateQueries({
        queryKey: ['sales', user?.organizationId],
      });

      // Invalidar métricas de ventas y pagos
      queryClient.invalidateQueries({
        queryKey: ['salesMetrics'],
      });

      queryClient.invalidateQueries({
        queryKey: ['paymentsMetrics'],
      });
    },
    onError: (error) => {
      console.error('Error agregando pago a la venta:', error);
    },
  });
};

// Hook para actualizar un pago de venta
export const useUpdateSalePayment = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ paymentId, updateData }: UpdateSalePaymentParams) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await updateSalePayment(paymentId, user.id, updateData);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar pagos de la venta específica
      if (data?.saleId) {
        queryClient.invalidateQueries({
          queryKey: ['salePayments', data.saleId],
        });

        // Invalidar la venta para actualizar su estado
        queryClient.invalidateQueries({
          queryKey: ['sale', data.saleId],
        });
      }

      // Invalidar lista de ventas
      queryClient.invalidateQueries({
        queryKey: ['sales', user?.organizationId],
      });

      // Invalidar métricas
      queryClient.invalidateQueries({
        queryKey: ['salesMetrics'],
      });

      queryClient.invalidateQueries({
        queryKey: ['paymentsMetrics'],
      });
    },
    onError: (error) => {
      console.error('Error actualizando pago de venta:', error);
    },
  });
};

// Hook para eliminar un pago de venta
export const useDeleteSalePayment = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ paymentId }: { paymentId: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await deleteSalePayment(paymentId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      // Necesitamos obtener el saleId del pago eliminado para invalidar las queries correctas
      // Como no lo tenemos directamente, invalidamos todas las queries de pagos
      queryClient.invalidateQueries({
        queryKey: ['salePayments'],
      });

      // Invalidar todas las ventas para actualizar sus estados
      queryClient.invalidateQueries({
        queryKey: ['sales', user?.organizationId],
      });

      // Invalidar ventas individuales
      queryClient.invalidateQueries({
        queryKey: ['sale'],
      });

      // Invalidar métricas
      queryClient.invalidateQueries({
        queryKey: ['salesMetrics'],
      });

      queryClient.invalidateQueries({
        queryKey: ['paymentsMetrics'],
      });
    },
    onError: (error) => {
      console.error('Error eliminando pago de venta:', error);
    },
  });
};

// Hooks de conveniencia para casos específicos

// Hook para obtener el total pagado de una venta
export const useSalePaidAmount = (saleId: string) => {
  const { data: payments, ...rest } = useSalePaymentsBySaleId(saleId);

  const paidAmount = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

  return {
    ...rest,
    data: paidAmount,
    payments,
  };
};

// Hook para verificar si una venta está completamente pagada
export const useIsSaleFullyPaid = (saleId: string, saleTotal: number) => {
  const { data: paidAmount, ...rest } = useSalePaidAmount(saleId);

  const isFullyPaid = Math.abs(paidAmount - saleTotal) < 0.01;
  const remainingAmount = saleTotal - paidAmount;

  return {
    ...rest,
    data: {
      isFullyPaid,
      paidAmount,
      remainingAmount,
      saleTotal,
    },
  };
};

// Hook para obtener el historial de pagos de una venta ordenado por fecha
export const useSalePaymentsHistory = (saleId: string) => {
  const { data: payments, ...rest } = useSalePaymentsBySaleId(saleId);

  const sortedPayments = payments?.sort((a, b) =>
    new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  ) || [];

  return {
    ...rest,
    data: sortedPayments,
  };
};

// Hook compuesto para agregar pago parcial
export const useAddPartialPayment = () => {
  const addPaymentMutation = useAddSalePayment();

  return useMutation({
    mutationFn: async ({
      saleId,
      amount,
      paymentMethodId,
      reference,
      notes
    }: {
      saleId: string;
      amount: number;
      paymentMethodId: string;
      reference?: string;
      notes?: string;
    }) => {
      return addPaymentMutation.mutateAsync({
        saleId,
        paymentData: {
          amount,
          paymentMethodId,
          reference: reference || '',
          notes: notes || '',
          paymentDate: new Date(),
        },
      });
    },
  });
};

// Hook compuesto para pago completo
export const useCompletePayment = () => {
  const addPaymentMutation = useAddSalePayment();

  return useMutation({
    mutationFn: async ({
      saleId,
      remainingAmount,
      paymentMethodId,
      reference,
      notes
    }: {
      saleId: string;
      remainingAmount: number;
      paymentMethodId: string;
      reference?: string;
      notes?: string;
    }) => {
      return addPaymentMutation.mutateAsync({
        saleId,
        paymentData: {
          amount: remainingAmount,
          paymentMethodId,
          reference: reference || '',
          notes: notes || 'Pago completo',
          paymentDate: new Date(),
        },
      });
    },
  });
};

// Hook para obtener estadísticas de pagos de una venta
export const useSalePaymentStats = (saleId: string, saleTotal: number) => {
  const { data: payments, ...rest } = useSalePaymentsBySaleId(saleId);

  if (!payments || payments.length === 0) {
    return {
      ...rest,
      data: {
        totalPayments: 0,
        paidAmount: 0,
        remainingAmount: saleTotal,
        paymentsCount: 0,
        lastPaymentDate: null,
        isFullyPaid: false,
        paymentProgress: 0,
      },
    };
  }

  const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = saleTotal - paidAmount;
  const isFullyPaid = Math.abs(remainingAmount) < 0.01;
  const paymentProgress = (paidAmount / saleTotal) * 100;
  const lastPaymentDate = payments.sort((a, b) =>
    new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  )[0]?.paymentDate;

  return {
    ...rest,
    data: {
      totalPayments: paidAmount,
      paidAmount,
      remainingAmount,
      paymentsCount: payments.length,
      lastPaymentDate,
      isFullyPaid,
      paymentProgress: Math.min(paymentProgress, 100),
    },
  };
};
