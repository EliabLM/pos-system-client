import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createSupplier,
  getSuppliersByOrgId,
  getSupplierById,
  getSupplierByTaxId,
  getSupplierByEmail,
  updateSupplier,
  softDeleteSupplier,
  toggleSupplierActiveStatus,
  getSupplierPurchaseHistory,
  getSupplierStatistics,
  getTopSuppliersByPurchases,
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

// Hook para obtener supplier por TaxId (NIT/RUC)
export const useSupplierByTaxId = (taxId: string) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['supplier', 'taxId', user?.organizationId, taxId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      if (!taxId) {
        throw new Error('TaxId requerido');
      }

      const response = await getSupplierByTaxId(user.organizationId, taxId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!taxId && !!user?.organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para obtener supplier por email
export const useSupplierByEmail = (email: string) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['supplier', 'email', user?.organizationId, email],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      if (!email) {
        throw new Error('Email requerido');
      }

      const response = await getSupplierByEmail(user.organizationId, email);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!email && !!user?.organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// ===========================
// HOOKS DE MUTACIÓN
// ===========================

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
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['suppliers', user?.organizationId],
      });
      toast.success('Proveedor creado exitosamente');
    },
    onError: (error) => {
      console.error('Error creando el proveedor:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al crear el proveedor'
      );
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

      // Invalidar queries por taxId si existe
      if (data?.taxId) {
        queryClient.invalidateQueries({
          queryKey: ['supplier', 'taxId', user?.organizationId, data.taxId],
        });
      }

      // Invalidar queries por email si existe
      if (data?.email) {
        queryClient.invalidateQueries({
          queryKey: ['supplier', 'email', user?.organizationId, data.email],
        });
      }

      toast.success('Proveedor actualizado exitosamente');
    },
    onError: (error) => {
      console.error('Error actualizando el proveedor:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al actualizar el proveedor'
      );
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
      toast.success('Proveedor eliminado exitosamente');
    },
    onError: (error) => {
      console.error('Error eliminando el proveedor:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al eliminar el proveedor'
      );
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['suppliers', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['supplier', variables.supplierId],
      });
      toast.success(
        data?.isActive
          ? 'Proveedor activado exitosamente'
          : 'Proveedor desactivado exitosamente'
      );
    },
    onError: (error) => {
      console.error('Error cambiando estado del proveedor:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al cambiar el estado del proveedor'
      );
    },
  });
};

// ===========================
// HOOKS ANALÍTICOS
// ===========================

// Hook para obtener historial de compras del supplier
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

// Hook para obtener top suppliers por compras
export const useTopSuppliersByPurchases = (limit: number = 10) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['suppliers', 'top', user?.organizationId, limit],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getTopSuppliersByPurchases(
        user.organizationId,
        limit
      );

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
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
