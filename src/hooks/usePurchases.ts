import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createPurchase,
  getPurchasesByOrgId,
  getPurchaseById,
  getPurchaseByNumber,
  updatePurchase,
  receivePurchase,
  cancelPurchase,
  softDeletePurchase,
  getPurchasesAnalytics,
  getPendingPurchases,
  getReceivedPurchases,
} from '@/actions/purchase';
import { useStore } from '@/store';
import { Purchase, PurchaseItem, PurchaseStatus } from '@/generated/prisma';

// Tipos para los filtros de purchases
interface PurchaseFilters {
  supplierId?: string;
  status?: PurchaseStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface PurchasePagination {
  page?: number;
  limit?: number;
}

interface CreatePurchaseParams {
  purchaseData: Omit<
    Purchase,
    | 'id'
    | 'organizationId'
    | 'purchaseNumber'
    | 'createdAt'
    | 'updatedAt'
    | 'isDeleted'
    | 'deletedAt'
  >;
  purchaseItems: Omit<
    PurchaseItem,
    | 'id'
    | 'purchaseId'
    | 'createdAt'
    | 'updatedAt'
    | 'isDeleted'
    | 'deletedAt'
  >[];
}

interface UpdatePurchaseParams {
  purchaseId: string;
  updateData: Partial<{
    status: PurchaseStatus;
    notes: string;
    receivedDate: Date;
  }>;
}

// ===========================
// HOOKS PRINCIPALES
// ===========================

// Hook principal para obtener purchases por organizaci�n
export const usePurchases = (
  filters?: PurchaseFilters,
  includeDeleted: boolean = false,
  pagination?: PurchasePagination
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: [
      'purchases',
      user?.organizationId,
      filters,
      includeDeleted,
      pagination,
    ],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organizaci�n asignada');
      }

      const response = await getPurchasesByOrgId(
        user.organizationId,
        filters,
        includeDeleted,
        pagination
      );

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener una purchase espec�fica por ID
export const usePurchaseById = (purchaseId: string | null) => {
  return useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: async () => {
      if (!purchaseId) {
        return null;
      }

      const response = await getPurchaseById(purchaseId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!purchaseId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener purchase por n�mero de compra
export const usePurchaseByNumber = (purchaseNumber: string) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['purchase', 'number', user?.organizationId, purchaseNumber],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organizaci�n asignada');
      }

      if (!purchaseNumber) {
        throw new Error('N�mero de compra requerido');
      }

      const response = await getPurchaseByNumber(
        user.organizationId,
        purchaseNumber
      );

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!purchaseNumber && !!user?.organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// ===========================
// HOOKS DE ESTADO
// ===========================

// Hook para obtener purchases pendientes
export const usePendingPurchases = () => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['purchases', 'pending', user?.organizationId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organizaci�n asignada');
      }

      const response = await getPendingPurchases(user.organizationId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId,
    staleTime: 1 * 60 * 1000, // 1 minuto (m�s frecuente para purchases pendientes)
    gcTime: 3 * 60 * 1000,
  });
};

// Hook para obtener purchases recibidas
export const useReceivedPurchases = () => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['purchases', 'received', user?.organizationId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organizaci�n asignada');
      }

      const response = await getReceivedPurchases(user.organizationId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// ===========================
// HOOKS ANAL�TICOS
// ===========================

// Hook para obtener anal�ticas de purchases
export const usePurchasesAnalytics = (
  dateFrom?: Date,
  dateTo?: Date
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['purchases', 'analytics', user?.organizationId, dateFrom, dateTo],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organizaci�n asignada');
      }

      const response = await getPurchasesAnalytics(
        user.organizationId,
        dateFrom,
        dateTo
      );

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos (anal�ticas pueden ser menos frecuentes)
    gcTime: 10 * 60 * 1000,
  });
};

// ===========================
// HOOKS DE MUTACI�N
// ===========================

// Hook para crear purchase
export const useCreatePurchase = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ purchaseData, purchaseItems }: CreatePurchaseParams) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organizaci�n asignada');
      }

      const response = await createPurchase(
        user.organizationId,
        user.id,
        purchaseData,
        purchaseItems
      );

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidar m�ltiples queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['purchases', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'pending'],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'analytics'],
      });

      // Si se cre� con n�mero de compra, invalidar b�squeda por n�mero
      if (data?.purchaseNumber) {
        queryClient.invalidateQueries({
          queryKey: ['purchase', 'number', user?.organizationId, data.purchaseNumber],
        });
      }

      toast.success('Compra creada exitosamente');
    },
    onError: (error) => {
      console.error('Error creando la compra:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al crear la compra'
      );
    },
  });
};

// Hook para actualizar purchase
export const useUpdatePurchase = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ purchaseId, updateData }: UpdatePurchaseParams) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organizaci�n asignada');
      }

      const response = await updatePurchase(purchaseId, user.id, updateData);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['purchases', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchase', variables.purchaseId],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'pending'],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'received'],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'analytics'],
      });

      // Si se actualiz� el n�mero de compra, invalidar b�squeda por n�mero
      if (data?.purchaseNumber) {
        queryClient.invalidateQueries({
          queryKey: ['purchase', 'number', user?.organizationId, data.purchaseNumber],
        });
      }

      toast.success('Compra actualizada exitosamente');
    },
    onError: (error) => {
      console.error('Error actualizando la compra:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al actualizar la compra'
      );
    },
  });
};

// Hook para recibir purchase (CR�TICO - actualiza stock)
export const useReceivePurchase = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ purchaseId }: { purchaseId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organizaci�n asignada');
      }

      const response = await receivePurchase(purchaseId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar purchases
      queryClient.invalidateQueries({
        queryKey: ['purchases', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchase', variables.purchaseId],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'pending'],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'analytics'],
      });

      // �CR�TICO! Invalidar productos para reflejar nuevo stock
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });

      // Invalidar stock movements
      queryClient.invalidateQueries({
        queryKey: ['stockMovements'],
      });

      // Si tiene n�mero de compra, invalidar b�squeda por n�mero
      if (data?.purchaseNumber) {
        queryClient.invalidateQueries({
          queryKey: ['purchase', 'number', user?.organizationId, data.purchaseNumber],
        });
      }

      toast.success('Compra recibida exitosamente. Stock actualizado.');
    },
    onError: (error) => {
      console.error('Error recibiendo la compra:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al recibir la compra'
      );
    },
  });
};

// Hook para cancelar purchase
export const useCancelPurchase = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ purchaseId, reason }: { purchaseId: string; reason?: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organizaci�n asignada');
      }

      const response = await cancelPurchase(purchaseId, user.id, reason);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['purchases', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchase', variables.purchaseId],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'pending'],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'analytics'],
      });

      // Si tiene n�mero de compra, invalidar b�squeda por n�mero
      if (data?.purchaseNumber) {
        queryClient.invalidateQueries({
          queryKey: ['purchase', 'number', user?.organizationId, data.purchaseNumber],
        });
      }

      toast.success('Compra cancelada exitosamente');
    },
    onError: (error) => {
      console.error('Error cancelando la compra:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al cancelar la compra'
      );
    },
  });
};

// Hook para eliminar purchase (soft delete)
export const useSoftDeletePurchase = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ purchaseId }: { purchaseId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organizaci�n asignada');
      }

      const response = await softDeletePurchase(purchaseId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['purchases', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchase', variables.purchaseId],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'pending'],
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'analytics'],
      });
      toast.success('Compra eliminada exitosamente');
    },
    onError: (error) => {
      console.error('Error eliminando la compra:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al eliminar la compra'
      );
    },
  });
};

// ===========================
// HOOKS DE CONVENIENCIA
// ===========================

// Hook para obtener purchases por proveedor espec�fico
export const usePurchasesBySupplier = (
  supplierId: string,
  filters?: Omit<PurchaseFilters, 'supplierId'>,
  pagination?: PurchasePagination
) => {
  return usePurchases({ ...filters, supplierId }, false, pagination);
};

// Hook para obtener purchases por estado espec�fico
export const usePurchasesByStatus = (
  status: PurchaseStatus,
  filters?: Omit<PurchaseFilters, 'status'>,
  pagination?: PurchasePagination
) => {
  return usePurchases({ ...filters, status }, false, pagination);
};

// Hook para obtener purchases en un rango de fechas
export const usePurchasesByDateRange = (
  dateFrom: Date,
  dateTo: Date,
  filters?: Omit<PurchaseFilters, 'dateFrom' | 'dateTo'>,
  pagination?: PurchasePagination
) => {
  return usePurchases({ ...filters, dateFrom, dateTo }, false, pagination);
};

// Hook para b�squeda de purchases
export const useSearchPurchases = (
  searchTerm: string,
  filters?: Omit<PurchaseFilters, 'search'>,
  pagination?: PurchasePagination
) => {
  return usePurchases({ ...filters, search: searchTerm }, false, pagination);
};

// Hook para obtener purchases eliminadas
export const useDeletedPurchases = (
  filters?: PurchaseFilters,
  pagination?: PurchasePagination
) => {
  return usePurchases(filters, true, pagination);
};

// Hook para obtener purchases canceladas
export const useCancelledPurchases = (
  filters?: Omit<PurchaseFilters, 'status'>,
  pagination?: PurchasePagination
) => {
  return usePurchasesByStatus('CANCELLED', filters, pagination);
};

// ===========================
// HOOKS ANAL�TICOS ESPEC�FICOS
// ===========================

// Hook para anal�ticas de purchases del d�a actual
export const useTodayPurchasesAnalytics = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return usePurchasesAnalytics(today, tomorrow);
};

// Hook para anal�ticas de purchases del mes actual
export const useCurrentMonthPurchasesAnalytics = () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return usePurchasesAnalytics(startOfMonth, endOfMonth);
};

// Hook para anal�ticas de purchases del a�o actual
export const useCurrentYearPurchasesAnalytics = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);

  return usePurchasesAnalytics(startOfYear, endOfYear);
};

// Hook para anal�ticas de purchases de los �ltimos 7 d�as
export const useLast7DaysPurchasesAnalytics = () => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return usePurchasesAnalytics(sevenDaysAgo, today);
};

// Hook para anal�ticas de purchases de los �ltimos 30 d�as
export const useLast30DaysPurchasesAnalytics = () => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return usePurchasesAnalytics(thirtyDaysAgo, today);
};

// ===========================
// HOOK COMPUESTO
// ===========================

// Hook compuesto para obtener resumen de purchases cr�ticas
export const useCriticalPurchasesOverview = () => {
  const pendingPurchases = usePendingPurchases();
  const todayAnalytics = useTodayPurchasesAnalytics();
  const last7DaysAnalytics = useLast7DaysPurchasesAnalytics();

  return {
    pending: pendingPurchases,
    todayAnalytics: todayAnalytics,
    last7DaysAnalytics: last7DaysAnalytics,
    isLoading: pendingPurchases.isLoading || todayAnalytics.isLoading || last7DaysAnalytics.isLoading,
    error: pendingPurchases.error || todayAnalytics.error || last7DaysAnalytics.error,
  };
};
