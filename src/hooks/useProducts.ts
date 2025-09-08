import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProduct,
  updateProduct,
  getProductsByOrgId,
  getProductById,
  getProductByBarcode,
  getProductBySku,
  updateStock,
  getLowStockProducts,
  softDeleteProduct,
  restoreProduct,
  deleteProduct
} from '@/actions/product';
import { useStore } from '@/store';
import { Product } from '@/generated/prisma';
import { deleteProductImage } from '@/actions/product';

// Tipos para los filtros de productos
interface ProductFilters {
  isActive?: boolean;
  categoryId?: string;
  brandId?: string;
  lowStock?: boolean;
  search?: string;
}

interface StockUpdateParams {
  productId: string;
  stockChange: number;
  type: 'SET' | 'INCREMENT' | 'DECREMENT';
}

// Hook principal para obtener productos por organización
export const useProducts = (
  filters?: ProductFilters,
  includeDeleted: boolean = false
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['products', user?.organizationId, filters, includeDeleted],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getProductsByOrgId(
        user.organizationId,
        filters,
        includeDeleted
      );

      // Manejar errores de la respuesta
      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook para obtener un producto específico por ID
export const useProductById = (productId: string) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) {
        throw new Error('ID de producto requerido');
      }

      const response = await getProductById(productId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!productId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener producto por código de barras
export const useProductByBarcode = (barcode: string) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['product', 'barcode', barcode, user?.organizationId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      if (!barcode) {
        throw new Error('Código de barras requerido');
      }

      const response = await getProductByBarcode(user.organizationId, barcode);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!barcode && !!user?.organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para obtener producto por SKU
export const useProductBySku = (sku: string) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['product', 'sku', sku, user?.organizationId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      if (!sku) {
        throw new Error('SKU requerido');
      }

      const response = await getProductBySku(user.organizationId, sku);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!sku && !!user?.organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para obtener productos con stock bajo
export const useLowStockProducts = () => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['products', 'lowStock', user?.organizationId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getLowStockProducts(user.organizationId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutos (más frecuente para alertas de stock)
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para crear producto
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async (
      productData: Omit<
        Product,
        'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
      >
    ) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await createProduct(
        user.organizationId,
        user.id,
        productData
      );

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidar múltiples queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });
    },
    onError: (error) => {
      console.error('Error creando el producto:', error);
    },
  });
};

// Hook para actualizar producto
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      productId,
      updateData,
    }: {
      productId: string;
      updateData: Partial<
        Omit<
          Product,
          'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
        >
      >;
    }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await updateProduct(productId, user.id, updateData);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      const product = data;

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['product', variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });

      // Invalidar búsquedas por barcode y SKU si se actualizaron
      if (product?.barcode) {
        queryClient.invalidateQueries({
          queryKey: ['product', 'barcode', product.barcode],
        });
      }
      if (product?.sku) {
        queryClient.invalidateQueries({
          queryKey: ['product', 'sku', product.sku],
        });
      }
    },
    onError: (error) => {
      console.error('Error actualizando el producto:', error);
    },
  });
};

// Hook para actualizar stock
export const useUpdateStock = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ productId, stockChange, type }: StockUpdateParams) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await updateStock(productId, user.id, stockChange, type);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['product', variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });

      // También invalidar búsquedas por barcode y SKU del producto actualizado
      if (data?.barcode) {
        queryClient.invalidateQueries({
          queryKey: ['product', 'barcode', data.barcode],
        });
      }
      if (data?.sku) {
        queryClient.invalidateQueries({
          queryKey: ['product', 'sku', data.sku],
        });
      }
    },
    onError: (error) => {
      console.error('Error actualizando el stock:', error);
    },
  });
};

// Hook para eliminar producto (soft delete)
export const useSoftDeleteProduct = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ productId }: { productId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await softDeleteProduct(productId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['product', variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });
    },
    onError: (error) => {
      console.error('Error eliminando el producto:', error);
    },
  });
};

// Hook para restaurar producto eliminado
export const useRestoreProduct = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ productId }: { productId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await restoreProduct(productId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['product', variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });

      // Restaurar búsquedas por barcode y SKU
      if (data?.barcode) {
        queryClient.invalidateQueries({
          queryKey: ['product', 'barcode', data.barcode],
        });
      }
      if (data?.sku) {
        queryClient.invalidateQueries({
          queryKey: ['product', 'sku', data.sku],
        });
      }
    },
    onError: (error) => {
      console.error('Error restaurando el producto:', error);
    },
  });
};

// Hook para eliminar producto permanentemente (hard delete)
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ productId }: { productId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await deleteProduct(productId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      // Remover específicamente este producto del cache
      queryClient.removeQueries({
        queryKey: ['product', variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ['products', 'lowStock'],
      });
    },
    onError: (error) => {
      console.error('Error eliminando permanentemente el producto:', error);
    },
  });
};

// Hooks de conveniencia para casos comunes

// Hook para obtener solo productos activos
export const useActiveProducts = (filters?: Omit<ProductFilters, 'isActive'>) => {
  return useProducts({ ...filters, isActive: true });
};

// Hook para obtener todos los productos (activos e inactivos)
export const useAllProducts = (filters?: Omit<ProductFilters, 'isActive'>) => {
  return useProducts(filters);
};

// Hook para obtener solo productos inactivos
export const useInactiveProducts = (filters?: Omit<ProductFilters, 'isActive'>) => {
  return useProducts({ ...filters, isActive: false });
};

// Hook para obtener productos eliminados
export const useDeletedProducts = (filters?: ProductFilters) => {
  return useProducts(filters, true);
};

// Hook para obtener productos por categoría
export const useProductsByCategory = (categoryId: string, includeInactive: boolean = false) => {
  return useProducts({
    categoryId,
    isActive: includeInactive ? undefined : true
  });
};

// Hook para obtener productos por marca
export const useProductsByBrand = (brandId: string, includeInactive: boolean = false) => {
  return useProducts({
    brandId,
    isActive: includeInactive ? undefined : true
  });
};

// Hook para búsqueda de productos
export const useSearchProducts = (searchTerm: string) => {
  return useProducts({
    search: searchTerm,
    isActive: true
  });
};

// Hook compuesto para obtener productos con stock bajo activos
export const useActiveLowStockProducts = () => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['products', 'activeLowStock', user?.organizationId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      // Primero obtenemos productos con stock bajo
      const response = await getLowStockProducts(user.organizationId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      // Filtrar solo los activos (aunque la función ya debería hacerlo)
      return response.data?.filter(product => product.isActive) || [];
    },
    enabled: !!user?.organizationId,
    staleTime: 1 * 60 * 1000, // 1 minuto (muy frecuente para alertas críticas)
    gcTime: 3 * 60 * 1000,
  });
};

// Hooks de utilidad para operaciones de stock específicas

// Hook para incrementar stock
export const useIncrementStock = () => {
  const updateStockMutation = useUpdateStock();

  return useMutation({
    mutationFn: async ({ productId, amount }: { productId: string; amount: number }) => {
      return updateStockMutation.mutateAsync({
        productId,
        stockChange: amount,
        type: 'INCREMENT',
      });
    },
  });
};

// Hook para decrementar stock
export const useDecrementStock = () => {
  const updateStockMutation = useUpdateStock();

  return useMutation({
    mutationFn: async ({ productId, amount }: { productId: string; amount: number }) => {
      return updateStockMutation.mutateAsync({
        productId,
        stockChange: amount,
        type: 'DECREMENT',
      });
    },
  });
};

// Hook para establecer stock exacto
export const useSetStock = () => {
  const updateStockMutation = useUpdateStock();

  return useMutation({
    mutationFn: async ({ productId, amount }: { productId: string; amount: number }) => {
      return updateStockMutation.mutateAsync({
        productId,
        stockChange: amount,
        type: 'SET',
      });
    },
  });
};

export const useDeleteProductImage = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ productId }: { productId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await deleteProductImage(productId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['products', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['product', variables.productId],
      });
    },
    onError: (error) => {
      console.error('Error eliminando imagen del producto:', error);
    },
  });
};
