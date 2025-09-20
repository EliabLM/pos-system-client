import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addSaleItem,
  updateSaleItem,
  deleteSaleItem,
  getSaleItemsBySaleId,
} from '@/actions/sale-item';
import { useStore } from '@/store';
import { SaleItem } from '@/generated/prisma';

// Tipos para los parámetros de SaleItem
interface AddSaleItemParams {
  saleId: string;
  itemData: Omit<
    SaleItem,
    'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >;
}

interface UpdateSaleItemParams {
  itemId: string;
  updateData: Partial<{
    quantity: number;
    unitPrice: number;
  }>;
}

// Hook para obtener items de venta por ID de venta
export const useSaleItemsBySaleId = (saleId: string) => {
  return useQuery({
    queryKey: ['saleItems', saleId],
    queryFn: async () => {
      if (!saleId) {
        throw new Error('ID de venta requerido');
      }

      const response = await getSaleItemsBySaleId(saleId);

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

// Hook para agregar item a una venta
export const useAddSaleItem = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ saleId, itemData }: AddSaleItemParams) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await addSaleItem(saleId, user.id, itemData);

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas con los items de la venta
      queryClient.invalidateQueries({
        queryKey: ['saleItems', variables.saleId],
      });

      // Invalidar queries de la venta para actualizar totales
      queryClient.invalidateQueries({
        queryKey: ['sale', variables.saleId],
      });

      // Invalidar lista de ventas para reflejar cambios en totales
      queryClient.invalidateQueries({
        queryKey: ['sales', user?.organizationId],
      });

      // Invalidar productos para actualizar stock
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['product', variables.itemData.productId],
      });

      // Invalidar productos con stock bajo
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });
    },
    onError: (error) => {
      console.error('Error agregando item a la venta:', error);
    },
  });
};

// Hook para actualizar item de venta
export const useUpdateSaleItem = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ itemId, updateData }: UpdateSaleItemParams) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await updateSaleItem(itemId, user.id, updateData);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas con los items de la venta
      if (data?.saleId) {
        queryClient.invalidateQueries({
          queryKey: ['saleItems', data.saleId],
        });

        // Invalidar queries de la venta para actualizar totales
        queryClient.invalidateQueries({
          queryKey: ['sale', data.saleId],
        });
      }

      // Invalidar lista de ventas
      queryClient.invalidateQueries({
        queryKey: ['sales', user?.organizationId],
      });

      // Invalidar productos para actualizar stock
      if (data?.productId) {
        queryClient.invalidateQueries({
          queryKey: ['products', user?.organizationId],
        });
        queryClient.invalidateQueries({
          queryKey: ['product', data.productId],
        });

        // Invalidar productos con stock bajo
        queryClient.invalidateQueries({
          queryKey: ['products', 'lowStock'],
        });
      }
    },
    onError: (error) => {
      console.error('Error actualizando item de venta:', error);
    },
  });
};

// Hook para eliminar item de venta
export const useDeleteSaleItem = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ itemId, saleId }: { itemId: string; saleId: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await deleteSaleItem(itemId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return { ...response, saleId }; // Agregamos saleId para usar en onSuccess
    },
    onSuccess: (response, variables) => {
      // Invalidar queries relacionadas con los items de la venta
      queryClient.invalidateQueries({
        queryKey: ['saleItems', variables.saleId],
      });

      // Invalidar queries de la venta para actualizar totales
      queryClient.invalidateQueries({
        queryKey: ['sale', variables.saleId],
      });

      // Invalidar lista de ventas
      queryClient.invalidateQueries({
        queryKey: ['sales', user?.organizationId],
      });

      // Invalidar productos para actualizar stock restaurado
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });

      // Invalidar productos con stock bajo (por si el stock restaurado quita la alerta)
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });
    },
    onError: (error) => {
      console.error('Error eliminando item de venta:', error);
    },
  });
};

// Hooks de conveniencia para casos específicos

// Hook para obtener items de venta activos (no eliminados)
export const useActiveSaleItems = (saleId: string) => {
  const saleItemsQuery = useSaleItemsBySaleId(saleId);

  return {
    ...saleItemsQuery,
    data: saleItemsQuery.data?.filter(item => !item.isDeleted) || [],
  };
};

// Hook para obtener el conteo de items en una venta
export const useSaleItemsCount = (saleId: string) => {
  const saleItemsQuery = useSaleItemsBySaleId(saleId);

  return {
    ...saleItemsQuery,
    data: saleItemsQuery.data?.filter(item => !item.isDeleted).length || 0,
  };
};

// Hook para obtener el total de items de una venta
export const useSaleItemsTotal = (saleId: string) => {
  const saleItemsQuery = useSaleItemsBySaleId(saleId);

  const total = saleItemsQuery.data
    ?.filter(item => !item.isDeleted)
    .reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;

  return {
    ...saleItemsQuery,
    data: total,
  };
};

// Hook compuesto para agregar múltiples items de una vez
export const useAddMultipleSaleItems = () => {
  const addSaleItemMutation = useAddSaleItem();
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      saleId,
      items,
    }: {
      saleId: string;
      items: Array<Omit<SaleItem, 'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>>;
    }) => {
      const results = [];

      // Agregar items secuencialmente para evitar problemas de concurrencia
      for (const itemData of items) {
        const result = await addSaleItemMutation.mutateAsync({
          saleId,
          itemData,
        });
        results.push(result);
      }

      return results;
    },
    onSuccess: (_, variables) => {
      // Las invalidaciones ya las maneja cada mutación individual
      // Solo agregamos invalidaciones adicionales si es necesario
      queryClient.invalidateQueries({
        queryKey: ['saleItems', variables.saleId],
      });
    },
    onError: (error) => {
      console.error('Error agregando múltiples items:', error);
    },
  });
};

// Hook para actualizar cantidad de un item específico
export const useUpdateSaleItemQuantity = () => {
  const updateSaleItemMutation = useUpdateSaleItem();

  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      return updateSaleItemMutation.mutateAsync({
        itemId,
        updateData: { quantity },
      });
    },
  });
};

// Hook para actualizar precio unitario de un item específico
export const useUpdateSaleItemPrice = () => {
  const updateSaleItemMutation = useUpdateSaleItem();

  return useMutation({
    mutationFn: async ({ itemId, unitPrice }: { itemId: string; unitPrice: number }) => {
      return updateSaleItemMutation.mutateAsync({
        itemId,
        updateData: { unitPrice },
      });
    },
  });
};

// Hook para verificar si se puede eliminar un item (no es el último)
export const useCanDeleteSaleItem = (saleId: string) => {
  const saleItemsQuery = useSaleItemsBySaleId(saleId);

  const canDelete = (saleItemsQuery.data?.filter(item => !item.isDeleted).length || 0) > 1;

  return {
    ...saleItemsQuery,
    canDelete,
  };
};

// Hook para obtener estadísticas de items de venta
export const useSaleItemsStats = (saleId: string) => {
  const saleItemsQuery = useSaleItemsBySaleId(saleId);

  const stats = {
    totalItems: 0,
    totalQuantity: 0,
    totalSubtotal: 0,
    averageUnitPrice: 0,
  };

  if (saleItemsQuery.data) {
    const activeItems = saleItemsQuery.data.filter(item => !item.isDeleted);

    stats.totalItems = activeItems.length;
    stats.totalQuantity = activeItems.reduce((sum, item) => sum + item.quantity, 0);
    stats.totalSubtotal = activeItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    stats.averageUnitPrice = stats.totalItems > 0
      ? activeItems.reduce((sum, item) => sum + item.unitPrice, 0) / stats.totalItems
      : 0;
  }

  return {
    ...saleItemsQuery,
    data: stats,
  };
};

// Hook para buscar items por producto en una venta
export const useSaleItemByProductId = (saleId: string, productId: string) => {
  const saleItemsQuery = useSaleItemsBySaleId(saleId);

  const item = saleItemsQuery.data?.find(
    item => item.productId === productId && !item.isDeleted
  );

  return {
    ...saleItemsQuery,
    data: item || null,
  };
};

// Hook para verificar si un producto ya está en la venta
export const useProductInSale = (saleId: string, productId: string) => {
  const saleItemQuery = useSaleItemByProductId(saleId, productId);

  return {
    ...saleItemQuery,
    isInSale: !!saleItemQuery.data,
  };
};
