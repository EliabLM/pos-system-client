import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSale,
  getSalesByOrgId,
  getSaleById,
  getSaleBySaleNumber,
  updateSale,
  cancelSale,
  softDeleteSale,
  getSalesAnalytics,
  getPendingSales,
  getOverdueSales
} from '@/actions/sale';
import { useStore } from '@/store';
import { Sale, SaleItem, SalePayment, SaleStatus } from '@/generated/prisma';

// Tipos para los filtros de ventas
interface SaleFilters {
  storeId?: string;
  customerId?: string;
  userId?: string;
  status?: SaleStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

interface SalePagination {
  page?: number;
  limit?: number;
}

interface CreateSaleParams {
  saleData: Omit<
    Sale,
    | 'id'
    | 'organizationId'
    | 'saleNumber'
    | 'createdAt'
    | 'updatedAt'
    | 'isDeleted'
    | 'deletedAt'
  >;
  saleItems: Omit<
    SaleItem,
    'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >[];
  salePayments?: Omit<
    SalePayment,
    'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >[];
}

interface UpdateSaleParams {
  saleId: string;
  updateData: Partial<{
    customerId: string;
    status: SaleStatus;
    dueDate: Date;
    paidDate: Date;
    notes: string;
  }>;
}

// Hook principal para obtener ventas por organización
export const useSales = (
  filters?: SaleFilters,
  includeDeleted: boolean = false,
  pagination?: SalePagination
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['sales', user?.organizationId, filters, includeDeleted, pagination],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getSalesByOrgId(
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

// Hook para obtener una venta específica por ID
export const useSaleById = (saleId: string) => {
  return useQuery({
    queryKey: ['sale', saleId],
    queryFn: async () => {
      if (!saleId) {
        throw new Error('ID de venta requerido');
      }

      const response = await getSaleById(saleId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!saleId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener venta por número de venta
export const useSaleBySaleNumber = (storeId: string, saleNumber: string) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['sale', 'number', user?.organizationId, storeId, saleNumber],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      if (!storeId || !saleNumber) {
        throw new Error('ID de tienda y número de venta requeridos');
      }

      const response = await getSaleBySaleNumber(
        user.organizationId,
        storeId,
        saleNumber
      );

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!storeId && !!saleNumber && !!user?.organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para obtener ventas pendientes
export const usePendingSales = (storeId?: string) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['sales', 'pending', user?.organizationId, storeId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getPendingSales(user.organizationId, storeId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId,
    staleTime: 1 * 60 * 1000, // 1 minuto (más frecuente para ventas pendientes)
    gcTime: 3 * 60 * 1000,
  });
};

// Hook para obtener ventas vencidas
export const useOverdueSales = (storeId?: string) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['sales', 'overdue', user?.organizationId, storeId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getOverdueSales(user.organizationId, storeId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId,
    staleTime: 1 * 60 * 1000, // 1 minuto (frecuente para alertas de vencimiento)
    gcTime: 3 * 60 * 1000,
  });
};

// Hook para obtener analíticas de ventas
export const useSalesAnalytics = (
  dateFrom?: Date,
  dateTo?: Date,
  storeId?: string
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['sales', 'analytics', user?.organizationId, dateFrom, dateTo, storeId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getSalesAnalytics(
        user.organizationId,
        dateFrom,
        dateTo,
        storeId
      );

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos (analíticas pueden ser menos frecuentes)
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para crear venta
export const useCreateSale = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ saleData, saleItems, salePayments }: CreateSaleParams) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await createSale(
        user.organizationId,
        user.id,
        saleData,
        saleItems,
        salePayments
      );

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidar múltiples queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['sales', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales', 'pending'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales', 'analytics'],
      });
      // Invalidar productos para actualizar stock
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });

      // Si se creó con número de venta, invalidar búsqueda por número
      if (data?.saleNumber && data?.storeId) {
        queryClient.invalidateQueries({
          queryKey: ['sale', 'number', user?.organizationId, data.storeId, data.saleNumber],
        });
      }
    },
    onError: (error) => {
      console.error('Error creando la venta:', error);
    },
  });
};

// Hook para actualizar venta
export const useUpdateSale = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ saleId, updateData }: UpdateSaleParams) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await updateSale(saleId, user.id, updateData);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['sales', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sale', variables.saleId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales', 'pending'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales', 'overdue'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales', 'analytics'],
      });

      // Si se actualizó el número de venta, invalidar búsqueda por número
      if (data?.saleNumber && data?.storeId) {
        queryClient.invalidateQueries({
          queryKey: ['sale', 'number', user?.organizationId, data.storeId, data.saleNumber],
        });
      }
    },
    onError: (error) => {
      console.error('Error actualizando la venta:', error);
    },
  });
};

// Hook para cancelar venta
export const useCancelSale = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ saleId, reason }: { saleId: string; reason?: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await cancelSale(saleId, user.id, reason);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['sales', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sale', variables.saleId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales', 'pending'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales', 'overdue'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales', 'analytics'],
      });
      // Invalidar productos para actualizar stock restaurado
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });

      // Invalidar búsqueda por número si existe
      if (data?.saleNumber && data?.storeId) {
        queryClient.invalidateQueries({
          queryKey: ['sale', 'number', user?.organizationId, data.storeId, data.saleNumber],
        });
      }
    },
    onError: (error) => {
      console.error('Error cancelando la venta:', error);
    },
  });
};

// Hook para eliminar venta (soft delete)
export const useSoftDeleteSale = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ saleId }: { saleId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await softDeleteSale(saleId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['sales', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sale', variables.saleId],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales', 'pending'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales', 'overdue'],
      });
      queryClient.invalidateQueries({
        queryKey: ['sales', 'analytics'],
      });
    },
    onError: (error) => {
      console.error('Error eliminando la venta:', error);
    },
  });
};

// Hooks de conveniencia para casos comunes

// Hook para obtener ventas por tienda específica
export const useSalesByStore = (
  storeId: string,
  filters?: Omit<SaleFilters, 'storeId'>,
  pagination?: SalePagination
) => {
  return useSales({ ...filters, storeId }, false, pagination);
};

// Hook para obtener ventas por cliente específico
export const useSalesByCustomer = (
  customerId: string,
  filters?: Omit<SaleFilters, 'customerId'>,
  pagination?: SalePagination
) => {
  return useSales({ ...filters, customerId }, false, pagination);
};

// Hook para obtener ventas por usuario específico
export const useSalesByUser = (
  userId: string,
  filters?: Omit<SaleFilters, 'userId'>,
  pagination?: SalePagination
) => {
  return useSales({ ...filters, userId }, false, pagination);
};

// Hook para obtener ventas por estado específico
export const useSalesByStatus = (
  status: SaleStatus,
  filters?: Omit<SaleFilters, 'status'>,
  pagination?: SalePagination
) => {
  return useSales({ ...filters, status }, false, pagination);
};

// Hook para obtener ventas en un rango de fechas
export const useSalesByDateRange = (
  dateFrom: Date,
  dateTo: Date,
  filters?: Omit<SaleFilters, 'dateFrom' | 'dateTo'>,
  pagination?: SalePagination
) => {
  return useSales({ ...filters, dateFrom, dateTo }, false, pagination);
};

// Hook para búsqueda de ventas
export const useSearchSales = (
  searchTerm: string,
  filters?: Omit<SaleFilters, 'search'>,
  pagination?: SalePagination
) => {
  return useSales({ ...filters, search: searchTerm }, false, pagination);
};

// Hook para obtener ventas eliminadas
export const useDeletedSales = (
  filters?: SaleFilters,
  pagination?: SalePagination
) => {
  return useSales(filters, true, pagination);
};

// Hooks específicos por estado de venta

// Hook para obtener ventas completadas/pagadas
export const usePaidSales = (
  filters?: Omit<SaleFilters, 'status'>,
  pagination?: SalePagination
) => {
  return useSalesByStatus('PAID', filters, pagination);
};

// Hook para obtener ventas canceladas
export const useCancelledSales = (
  filters?: Omit<SaleFilters, 'status'>,
  pagination?: SalePagination
) => {
  return useSalesByStatus('CANCELLED', filters, pagination);
};

// Hooks de analíticas específicas

// Hook para analíticas de ventas del día actual
export const useTodaySalesAnalytics = (storeId?: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return useSalesAnalytics(today, tomorrow, storeId);
};

// Hook para analíticas de ventas del mes actual
export const useCurrentMonthSalesAnalytics = (storeId?: string) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return useSalesAnalytics(startOfMonth, endOfMonth, storeId);
};

// Hook para analíticas de ventas del año actual
export const useCurrentYearSalesAnalytics = (storeId?: string) => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);

  return useSalesAnalytics(startOfYear, endOfYear, storeId);
};

// Hook para analíticas de ventas de los últimos 7 días
export const useLast7DaysSalesAnalytics = (storeId?: string) => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return useSalesAnalytics(sevenDaysAgo, today, storeId);
};

// Hook para analíticas de ventas de los últimos 30 días
export const useLast30DaysSalesAnalytics = (storeId?: string) => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return useSalesAnalytics(thirtyDaysAgo, today, storeId);
};

// Hooks de utilidad para operaciones específicas

// Hook para marcar venta como pagada
export const useMarkSaleAsPaid = () => {
  const updateSaleMutation = useUpdateSale();

  return useMutation({
    mutationFn: async ({ saleId, paidDate }: { saleId: string; paidDate?: Date }) => {
      return updateSaleMutation.mutateAsync({
        saleId,
        updateData: {
          status: 'PAID',
          paidDate: paidDate || new Date(),
        },
      });
    },
  });
};

// Hook para actualizar fecha de vencimiento
export const useUpdateSaleDueDate = () => {
  const updateSaleMutation = useUpdateSale();

  return useMutation({
    mutationFn: async ({ saleId, dueDate }: { saleId: string; dueDate: Date }) => {
      return updateSaleMutation.mutateAsync({
        saleId,
        updateData: {
          dueDate,
        },
      });
    },
  });
};

// Hook para agregar notas a una venta
export const useUpdateSaleNotes = () => {
  const updateSaleMutation = useUpdateSale();

  return useMutation({
    mutationFn: async ({ saleId, notes }: { saleId: string; notes: string }) => {
      return updateSaleMutation.mutateAsync({
        saleId,
        updateData: {
          notes,
        },
      });
    },
  });
};

// Hook compuesto para obtener resumen de ventas críticas
export const useCriticalSalesOverview = (storeId?: string) => {
  const pendingSales = usePendingSales(storeId);
  const overdueSales = useOverdueSales(storeId);
  const todayAnalytics = useTodaySalesAnalytics(storeId);

  return {
    pending: pendingSales,
    overdue: overdueSales,
    todayAnalytics: todayAnalytics,
    isLoading: pendingSales.isLoading || overdueSales.isLoading || todayAnalytics.isLoading,
    error: pendingSales.error || overdueSales.error || todayAnalytics.error,
  };
};
