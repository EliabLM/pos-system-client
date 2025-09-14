import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStockMovement,
  getStockMovementsByOrgId,
  getStockMovementById,
  getStockMovementsByProductId,
  updateStockMovement,
  deleteStockMovement,
  getStockSummaryByProduct,
  getStockMovementsByDateRange,
  getStockAnalytics
} from '@/actions/stock-movement';
import { useStore } from '@/store';
import { StockMovementType } from '@/generated/prisma';

// Tipos para los filtros y parámetros
interface StockMovementFilters {
  productId?: string;
  type?: StockMovementType;
  userId?: string;
  storeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

interface StockMovementPagination {
  page?: number;
  limit?: number;
}

interface CreateStockMovementData {
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason?: string;
  reference?: string;
  storeId?: string;
  userId: string;
}

interface UpdateStockMovementData {
  reason?: string;
  reference?: string;
  storeId?: string;
}

// Hook principal para obtener movimientos de stock por organización
export const useStockMovements = (
  filters?: StockMovementFilters,
  pagination?: StockMovementPagination
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['stockMovements', user?.organizationId, filters, pagination],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getStockMovementsByOrgId(
        user.organizationId,
        filters,
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

// Hook para obtener un movimiento de stock específico por ID
export const useStockMovementById = (movementId: string) => {
  return useQuery({
    queryKey: ['stockMovement', movementId],
    queryFn: async () => {
      if (!movementId) {
        throw new Error('ID de movimiento de stock requerido');
      }

      const response = await getStockMovementById(movementId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!movementId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener movimientos de stock por producto
export const useStockMovementsByProduct = (
  productId: string,
  pagination?: StockMovementPagination
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['stockMovements', 'product', productId, user?.organizationId, pagination],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      if (!productId) {
        throw new Error('ID de producto requerido');
      }

      const response = await getStockMovementsByProductId(
        user.organizationId,
        productId,
        pagination
      );

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!productId && !!user?.organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para obtener resumen de stock por producto
export const useStockSummaryByProduct = (productId: string) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['stockSummary', 'product', productId, user?.organizationId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      if (!productId) {
        throw new Error('ID de producto requerido');
      }

      const response = await getStockSummaryByProduct(user.organizationId, productId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!productId && !!user?.organizationId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 3 * 60 * 1000,
  });
};

// Hook para obtener movimientos de stock por rango de fechas
export const useStockMovementsByDateRange = (
  dateFrom: Date,
  dateTo: Date,
  filters?: Pick<StockMovementFilters, 'productId' | 'type'>
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['stockMovements', 'dateRange', user?.organizationId, dateFrom, dateTo, filters],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getStockMovementsByDateRange(
        user.organizationId,
        dateFrom,
        dateTo,
        filters
      );

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId && !!dateFrom && !!dateTo,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para obtener analíticas de stock
export const useStockAnalytics = (dateFrom?: Date, dateTo?: Date) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['stockAnalytics', user?.organizationId, dateFrom, dateTo],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getStockAnalytics(
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
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000,
  });
};

// Hook para crear movimiento de stock
export const useCreateStockMovement = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async (
      stockMovementData: Omit<CreateStockMovementData, 'userId'>
    ) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await createStockMovement(
        user.organizationId,
        user.id,
        {
          ...stockMovementData,
          userId: user.id,
          storeId: stockMovementData.storeId ?? null,
          reference: stockMovementData.reference ?? null,
          reason: stockMovementData.reason ?? null
        }
      );

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas con movimientos de stock
      queryClient.invalidateQueries({
        queryKey: ['stockMovements', user?.organizationId],
      });

      // Invalidar resumen de stock del producto específico
      if (data?.productId) {
        queryClient.invalidateQueries({
          queryKey: ['stockSummary', 'product', data.productId],
        });
        queryClient.invalidateQueries({
          queryKey: ['stockMovements', 'product', data.productId],
        });

        // Invalidar queries de productos para reflejar el nuevo stock
        queryClient.invalidateQueries({
          queryKey: ['products', user?.organizationId],
        });
        queryClient.invalidateQueries({
          queryKey: ['product', data.productId],
        });
        queryClient.invalidateQueries({
          queryKey: ['products', 'lowStock'],
        });
      }

      // Invalidar analíticas
      queryClient.invalidateQueries({
        queryKey: ['stockAnalytics'],
      });
    },
    onError: (error) => {
      console.error('Error creando el movimiento de stock:', error);
    },
  });
};

// Hook para actualizar movimiento de stock
export const useUpdateStockMovement = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      movementId,
      updateData,
    }: {
      movementId: string;
      updateData: UpdateStockMovementData;
    }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await updateStockMovement(movementId, user.id, updateData);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['stockMovements', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['stockMovement', variables.movementId],
      });

      if (data?.productId) {
        queryClient.invalidateQueries({
          queryKey: ['stockMovements', 'product', data.productId],
        });
        queryClient.invalidateQueries({
          queryKey: ['stockSummary', 'product', data.productId],
        });
      }
    },
    onError: (error) => {
      console.error('Error actualizando el movimiento de stock:', error);
    },
  });
};

// Hook para eliminar movimiento de stock
export const useDeleteStockMovement = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ movementId }: { movementId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await deleteStockMovement(movementId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidar todas las queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['stockMovements', user?.organizationId],
      });
      queryClient.removeQueries({
        queryKey: ['stockMovement', variables.movementId],
      });

      // Invalidar queries de productos para reflejar el stock revertido
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });

      // Invalidar resúmenes y analíticas
      queryClient.invalidateQueries({
        queryKey: ['stockSummary'],
      });
      queryClient.invalidateQueries({
        queryKey: ['stockAnalytics'],
      });
    },
    onError: (error) => {
      console.error('Error eliminando el movimiento de stock:', error);
    },
  });
};

// Hooks de conveniencia para casos específicos

// Hook para obtener movimientos de entrada
export const useStockInMovements = (
  filters?: Omit<StockMovementFilters, 'type'>,
  pagination?: StockMovementPagination
) => {
  return useStockMovements({ ...filters, type: 'IN' }, pagination);
};

// Hook para obtener movimientos de salida
export const useStockOutMovements = (
  filters?: Omit<StockMovementFilters, 'type'>,
  pagination?: StockMovementPagination
) => {
  return useStockMovements({ ...filters, type: 'OUT' }, pagination);
};

// Hook para obtener ajustes de stock
export const useStockAdjustmentMovements = (
  filters?: Omit<StockMovementFilters, 'type'>,
  pagination?: StockMovementPagination
) => {
  return useStockMovements({ ...filters, type: 'ADJUSTMENT' }, pagination);
};

// Hook para obtener movimientos por usuario
export const useStockMovementsByUser = (
  userId: string,
  filters?: Omit<StockMovementFilters, 'userId'>,
  pagination?: StockMovementPagination
) => {
  return useStockMovements({ ...filters, userId }, pagination);
};

// Hook para obtener movimientos por tienda
export const useStockMovementsByStore = (
  storeId: string,
  filters?: Omit<StockMovementFilters, 'storeId'>,
  pagination?: StockMovementPagination
) => {
  return useStockMovements({ ...filters, storeId }, pagination);
};

// Hook para búsqueda de movimientos
export const useSearchStockMovements = (
  searchTerm: string,
  filters?: Omit<StockMovementFilters, 'search'>,
  pagination?: StockMovementPagination
) => {
  return useStockMovements({ ...filters, search: searchTerm }, pagination);
};

// Hook para obtener movimientos recientes (últimas 24 horas)
export const useRecentStockMovements = (
  filters?: Omit<StockMovementFilters, 'dateFrom' | 'dateTo'>,
  pagination?: StockMovementPagination
) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return useStockMovements({
    ...filters,
    dateFrom: yesterday,
    dateTo: new Date(),
  }, pagination);
};

// Hook para obtener movimientos de hoy
export const useTodayStockMovements = (
  filters?: Omit<StockMovementFilters, 'dateFrom' | 'dateTo'>,
  pagination?: StockMovementPagination
) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return useStockMovements({
    ...filters,
    dateFrom: today,
    dateTo: endOfDay,
  }, pagination);
};

// Hooks de utilidad para operaciones específicas

// Hook para crear entrada de stock
export const useCreateStockIn = () => {
  const createMovement = useCreateStockMovement();

  return useMutation({
    mutationFn: async ({
      productId,
      quantity,
      reason,
      reference,
      storeId,
    }: {
      productId: string;
      quantity: number;
      reason?: string;
      reference?: string;
      storeId?: string;
    }) => {
      return createMovement.mutateAsync({
        productId,
        type: 'IN',
        quantity,
        reason,
        reference,
        storeId,
      });
    },
  });
};

// Hook para crear salida de stock
export const useCreateStockOut = () => {
  const createMovement = useCreateStockMovement();

  return useMutation({
    mutationFn: async ({
      productId,
      quantity,
      reason,
      reference,
      storeId,
    }: {
      productId: string;
      quantity: number;
      reason?: string;
      reference?: string;
      storeId?: string;
    }) => {
      return createMovement.mutateAsync({
        productId,
        type: 'OUT',
        quantity,
        reason,
        reference,
        storeId,
      });
    },
  });
};

// Hook para crear ajuste de stock
export const useCreateStockAdjustment = () => {
  const createMovement = useCreateStockMovement();

  return useMutation({
    mutationFn: async ({
      productId,
      quantity,
      reason,
      reference,
      storeId,
    }: {
      productId: string;
      quantity: number;
      reason?: string;
      reference?: string;
      storeId?: string;
    }) => {
      return createMovement.mutateAsync({
        productId,
        type: 'ADJUSTMENT',
        quantity,
        reason,
        reference,
        storeId,
      });
    },
  });
};
