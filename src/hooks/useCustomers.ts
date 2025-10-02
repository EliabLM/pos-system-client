import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCustomer,
  getCustomersByOrgId,
  getCustomerById,
  getCustomerByEmail,
  getCustomerByDocument,
  updateCustomer,
  softDeleteCustomer,
  toggleCustomerActiveStatus,
  getCustomerPurchaseHistory,
  getCustomerStatistics,
  getTopCustomersByPurchases,
} from '@/actions/customer';
import { useStore } from '@/store';
import { Customer } from '@/generated/prisma';

// Tipos para los filtros de customers
interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  city?: string;
  department?: string;
}

interface CustomerPagination {
  page?: number;
  limit?: number;
}

interface CreateCustomerParams {
  customerData: Omit<
    Customer,
    | 'id'
    | 'organizationId'
    | 'createdAt'
    | 'updatedAt'
    | 'isDeleted'
    | 'deletedAt'
  >;
}

interface UpdateCustomerParams {
  customerId: string;
  updateData: Partial<
    Omit<
      Customer,
      | 'id'
      | 'organizationId'
      | 'createdAt'
      | 'updatedAt'
      | 'isDeleted'
      | 'deletedAt'
    >
  >;
}

// Hook principal para obtener customers por organización
export const useCustomers = (
  filters?: CustomerFilters,
  includeDeleted: boolean = false,
  pagination?: CustomerPagination
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: [
      'customers',
      user?.organizationId,
      filters,
      includeDeleted,
      pagination,
    ],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getCustomersByOrgId(
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

// Hook para obtener un customer específico por ID
export const useCustomerById = (customerId: string) => {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      if (!customerId) {
        throw new Error('ID de customer requerido');
      }

      const response = await getCustomerById(customerId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!customerId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener customer por email
export const useCustomerByEmail = (email: string) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['customer', 'email', user?.organizationId, email],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      if (!email) {
        throw new Error('Email requerido');
      }

      const response = await getCustomerByEmail(user.organizationId, email);

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

// Hook para obtener customer por documento
export const useCustomerByDocument = (document: string) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['customer', 'document', user?.organizationId, document],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      if (!document) {
        throw new Error('Documento requerido');
      }

      const response = await getCustomerByDocument(
        user.organizationId,
        document
      );

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!document && !!user?.organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para crear customer
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ customerData }: CreateCustomerParams) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await createCustomer(
        user.organizationId,
        user.id,
        customerData
      );

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidar múltiples queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['customers', user?.organizationId],
      });
    },
    onError: (error) => {
      console.error('Error creando el customer:', error);
    },
  });
};

// Hook para actualizar customer
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ customerId, updateData }: UpdateCustomerParams) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await updateCustomer(customerId, user.id, updateData);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['customers', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['customer', variables.customerId],
      });

      // Invalidar queries por email si existe
      if (data?.email) {
        queryClient.invalidateQueries({
          queryKey: ['customer', 'email', user?.organizationId, data.email],
        });
      }

      // Invalidar queries por documento si existe
      if (data?.document) {
        queryClient.invalidateQueries({
          queryKey: ['customer', 'document', user?.organizationId, data.document],
        });
      }
    },
    onError: (error) => {
      console.error('Error actualizando el customer:', error);
    },
  });
};

// Hook para eliminar customer (soft delete)
export const useSoftDeleteCustomer = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ customerId }: { customerId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await softDeleteCustomer(customerId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['customers', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['customer', variables.customerId],
      });
    },
    onError: (error) => {
      console.error('Error eliminando el customer:', error);
    },
  });
};

// Hook para toggle active status
export const useToggleCustomerActiveStatus = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ customerId }: { customerId: string }) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await toggleCustomerActiveStatus(customerId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['customers', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['customer', variables.customerId],
      });
    },
    onError: (error) => {
      console.error('Error cambiando estado del customer:', error);
    },
  });
};

// Hook para obtener historial de compras
export const useCustomerPurchaseHistory = (
  customerId: string,
  pagination?: CustomerPagination
) => {
  return useQuery({
    queryKey: ['customer', customerId, 'purchases', pagination],
    queryFn: async () => {
      if (!customerId) {
        throw new Error('ID de customer requerido');
      }

      const response = await getCustomerPurchaseHistory(customerId, pagination);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para obtener estadísticas del customer
export const useCustomerStatistics = (customerId: string) => {
  return useQuery({
    queryKey: ['customer', customerId, 'statistics'],
    queryFn: async () => {
      if (!customerId) {
        throw new Error('ID de customer requerido');
      }

      const response = await getCustomerStatistics(customerId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutos (estadísticas pueden ser menos frecuentes)
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para obtener top customers por compras
export const useTopCustomersByPurchases = (limit: number = 10) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['customers', 'top', user?.organizationId, limit],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getTopCustomersByPurchases(
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

// Hook para obtener solo customers activos
export const useActiveCustomers = (
  filters?: Omit<CustomerFilters, 'isActive'>,
  pagination?: CustomerPagination
) => {
  return useCustomers({ ...filters, isActive: true }, false, pagination);
};

// Hook para obtener todos los customers (activos e inactivos)
export const useAllCustomers = (
  filters?: CustomerFilters,
  pagination?: CustomerPagination
) => {
  return useCustomers(filters, false, pagination);
};

// Hook para búsqueda de customers
export const useSearchCustomers = (
  searchTerm: string,
  filters?: Omit<CustomerFilters, 'search'>,
  pagination?: CustomerPagination
) => {
  return useCustomers({ ...filters, search: searchTerm }, false, pagination);
};

// Hook para obtener customers por ciudad
export const useCustomersByCity = (
  city: string,
  filters?: Omit<CustomerFilters, 'city'>,
  pagination?: CustomerPagination
) => {
  return useCustomers({ ...filters, city }, false, pagination);
};

// Hook para obtener customers por departamento
export const useCustomersByDepartment = (
  department: string,
  filters?: Omit<CustomerFilters, 'department'>,
  pagination?: CustomerPagination
) => {
  return useCustomers({ ...filters, department }, false, pagination);
};

// Hook para obtener customers eliminados
export const useDeletedCustomers = (
  filters?: CustomerFilters,
  pagination?: CustomerPagination
) => {
  return useCustomers(filters, true, pagination);
};
