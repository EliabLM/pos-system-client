import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSupplier,
  getSuppliersByOrgId,
  getSupplierById,
  updateSupplier,
  softDeleteSupplier,
  toggleSupplierActiveStatus,
  getSupplierPurchaseHistory,
  getSupplierStatistics,
} from '@/actions/supplier';
import { useStore } from '@/store';
import { Supplier } from '@/generated/prisma';

// Tipos para los filtros de suppliers
interface SupplierFilters {
  search?: string;
  isActive?: boolean;
  city?: string;
  department?: string;
}

interface SupplierPagination {
  page?: number;
  limit?: number;
}

interface CreateSupplierParams {
  supplierData: Omit<
    Supplier,
    | 'id'
    | 'organizationId'
    | 'createdAt'
    | 'updatedAt'
    | 'isDeleted'
    | 'deletedAt'
  >;
}

interface UpdateSupplierParams {
  supplierId: string;
  updateData: Partial<
    Omit<
      Supplier,
      | 'id'
      | 'organizationId'
      | 'createdAt'
      | 'updatedAt'
      | 'isDeleted'
      | 'deletedAt'
    >
  >;
}

// Hook principal para obtener suppliers por organización
export const useSuppliers = (
  filters?: SupplierFilters,
  includeDeleted: boolean = false,
  pagination?: SupplierPagination
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: [
      'suppliers',
      user?.organizationId,
      filters,
      includeDeleted,
      pagination,
    ],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getSuppliersByOrgId(
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
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener un supplier específico por ID
export const useSupplierById = (supplierId: string) => {
  return useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: async () => {
      if (!supplierId) {
        throw new Error('ID de supplier requerido');
      }

      const response = await getSupplierById(supplierId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!supplierId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para crear supplier
export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ supplierData }: CreateSupplierParams) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await createSupplier(
        user.organizationId,
        user.id,
        supplierData
      );

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidar múltiples queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['suppliers', user?.organizationId],
      });
    },
    onError: (error) => {
      console.error('Error creando el supplier:', error);
    },
  });
};

// Hook para actualizar supplier
export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ supplierId, updateData }: UpdateSupplierParams) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await updateSupplier(supplierId, user.id, updateData);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['suppliers', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['supplier', variables.supplierId],
      });
    },
    onError: (error) => {
      console.error('Error actualizando el supplier:', error);
    },
  });
};

// Hook para eliminar supplier (soft delete)
export const useSoftDeleteSupplier = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ supplierId }: { supplierId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await softDeleteSupplier(supplierId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['suppliers', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['supplier', variables.supplierId],
      });
    },
    onError: (error) => {
      console.error('Error eliminando el supplier:', error);
    },
  });
};

// Hook para toggle active status
export const useToggleSupplierActiveStatus = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ supplierId }: { supplierId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await toggleSupplierActiveStatus(supplierId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['suppliers', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['supplier', variables.supplierId],
      });
    },
    onError: (error) => {
      console.error('Error cambiando estado del supplier:', error);
    },
  });
};

// Hook para obtener historial de compras
export const useSupplierPurchaseHistory = (
  supplierId: string,
  pagination?: SupplierPagination
) => {
  return useQuery({
    queryKey: ['supplier', supplierId, 'purchases', pagination],
    queryFn: async () => {
      if (!supplierId) {
        throw new Error('ID de supplier requerido');
      }

      const response = await getSupplierPurchaseHistory(supplierId, pagination);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!supplierId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para obtener estadísticas del supplier
export const useSupplierStatistics = (supplierId: string) => {
  return useQuery({
    queryKey: ['supplier', supplierId, 'statistics'],
    queryFn: async () => {
      if (!supplierId) {
        throw new Error('ID de supplier requerido');
      }

      const response = await getSupplierStatistics(supplierId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!supplierId,
    staleTime: 5 * 60 * 1000, // 5 minutos (estadísticas pueden ser menos frecuentes)
    gcTime: 10 * 60 * 1000,
  });
};

// ===========================
// HOOKS DE CONVENIENCIA
// ===========================

// Hook para obtener solo suppliers activos
export const useActiveSuppliers = (
  filters?: Omit<SupplierFilters, 'isActive'>,
  pagination?: SupplierPagination
) => {
  return useSuppliers({ ...filters, isActive: true }, false, pagination);
};

// Hook para obtener todos los suppliers (activos e inactivos)
export const useAllSuppliers = (
  filters?: SupplierFilters,
  pagination?: SupplierPagination
) => {
  return useSuppliers(filters, false, pagination);
};

// Hook para búsqueda de suppliers
export const useSearchSuppliers = (
  searchTerm: string,
  filters?: Omit<SupplierFilters, 'search'>,
  pagination?: SupplierPagination
) => {
  return useSuppliers({ ...filters, search: searchTerm }, false, pagination);
};

// Hook para obtener suppliers por ciudad
export const useSuppliersByCity = (
  city: string,
  filters?: Omit<SupplierFilters, 'city'>,
  pagination?: SupplierPagination
) => {
  return useSuppliers({ ...filters, city }, false, pagination);
};

// Hook para obtener suppliers por departamento
export const useSuppliersByDepartment = (
  department: string,
  filters?: Omit<SupplierFilters, 'department'>,
  pagination?: SupplierPagination
) => {
  return useSuppliers({ ...filters, department }, false, pagination);
};

// Hook para obtener suppliers eliminados
export const useDeletedSuppliers = (
  filters?: SupplierFilters,
  pagination?: SupplierPagination
) => {
  return useSuppliers(filters, true, pagination);
};
