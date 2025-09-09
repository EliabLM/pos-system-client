import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOrganization,
  updateOrganization,
  getAllOrganizations,
  getOrganizationById,
  getOrganizationByEmail,
  getOrganizationByNit,
  getActiveOrganizations,
  getOrganizationsByDepartment,
  getOrganizationsByCity,
  getOrganizationStatistics,
  toggleOrganizationStatus,
  softDeleteOrganization,
  restoreOrganization,
  deleteOrganization,
} from '@/actions/organization';
import { useStore } from '@/store';
import { Organization } from '@/generated/prisma';

// Tipos para los filtros de organizaciones
interface OrganizationFilters {
  isActive?: boolean;
  city?: string;
  department?: string;
  search?: string;
}

// Hook principal para obtener todas las organizaciones (solo admin)
export const useOrganizations = (
  filters?: OrganizationFilters,
  includeDeleted: boolean = false
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['organizations', 'all', filters, includeDeleted],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await getAllOrganizations(
        user.id,
        filters,
        includeDeleted
      );

      // Manejar errores de la respuesta
      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook para obtener una organización específica por ID
export const useOrganizationById = (organizationId: string) => {
  return useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('ID de organización requerido');
      }

      const response = await getOrganizationById(organizationId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener organización por email
export const useOrganizationByEmail = (email: string) => {
  return useQuery({
    queryKey: ['organization', 'email', email],
    queryFn: async () => {
      if (!email) {
        throw new Error('Email requerido');
      }

      const response = await getOrganizationByEmail(email);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!email,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para obtener organización por NIT
export const useOrganizationByNit = (nit: string) => {
  return useQuery({
    queryKey: ['organization', 'nit', nit],
    queryFn: async () => {
      if (!nit) {
        throw new Error('NIT requerido');
      }

      const response = await getOrganizationByNit(nit);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!nit,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para obtener organizaciones activas
export const useActiveOrganizations = () => {
  return useQuery({
    queryKey: ['organizations', 'active'],
    queryFn: async () => {
      const response = await getActiveOrganizations();

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para obtener organizaciones por departamento
export const useOrganizationsByDepartment = (department: string) => {
  return useQuery({
    queryKey: ['organizations', 'department', department],
    queryFn: async () => {
      if (!department) {
        throw new Error('Departamento requerido');
      }

      const response = await getOrganizationsByDepartment(department);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!department,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para obtener organizaciones por ciudad
export const useOrganizationsByCity = (city: string) => {
  return useQuery({
    queryKey: ['organizations', 'city', city],
    queryFn: async () => {
      if (!city) {
        throw new Error('Ciudad requerida');
      }

      const response = await getOrganizationsByCity(city);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!city,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para obtener estadísticas de una organización
export const useOrganizationStatistics = (organizationId: string) => {
  return useQuery({
    queryKey: ['organization', 'statistics', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('ID de organización requerido');
      }

      const response = await getOrganizationStatistics(organizationId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutos (estadísticas cambian frecuentemente)
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para crear organización
export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      organizationData,
    }: {
      userId: string;
      organizationData: Omit<
        Organization,
        'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
      >;
    }) => {
      const response = await createOrganization(userId, organizationData);

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidar múltiples queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['organizations'],
      });
    },
    onError: (error) => {
      console.error('Error creando la organización:', error);
    },
  });
};

// Hook para actualizar organización
export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      organizationId,
      updateData,
    }: {
      organizationId: string;
      updateData: Partial<
        Omit<
          Organization,
          'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
        >
      >;
    }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await updateOrganization(
        organizationId,
        user.id,
        updateData
      );

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      const organization = data;

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['organizations'],
      });
      queryClient.invalidateQueries({
        queryKey: ['organization', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['organization', 'statistics', variables.organizationId],
      });

      // Invalidar búsquedas por email y NIT si se actualizaron
      if (organization?.email) {
        queryClient.invalidateQueries({
          queryKey: ['organization', 'email', organization.email],
        });
      }
      if (organization?.nit) {
        queryClient.invalidateQueries({
          queryKey: ['organization', 'nit', organization.nit],
        });
      }

      // Invalidar por ciudad y departamento si se actualizaron
      if (organization?.city) {
        queryClient.invalidateQueries({
          queryKey: ['organizations', 'city', organization.city],
        });
      }
      if (organization?.department) {
        queryClient.invalidateQueries({
          queryKey: ['organizations', 'department', organization.department],
        });
      }
    },
    onError: (error) => {
      console.error('Error actualizando la organización:', error);
    },
  });
};

// Hook para cambiar el estado de una organización (activar/desactivar)
export const useToggleOrganizationStatus = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      organizationId,
      isActive,
    }: {
      organizationId: string;
      isActive: boolean;
    }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await toggleOrganizationStatus(
        organizationId,
        user.id,
        isActive
      );

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['organizations'],
      });
      queryClient.invalidateQueries({
        queryKey: ['organization', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['organizations', 'active'],
      });
      queryClient.invalidateQueries({
        queryKey: ['organization', 'statistics', variables.organizationId],
      });

      // Invalidar búsquedas por email y NIT
      if (data?.email) {
        queryClient.invalidateQueries({
          queryKey: ['organization', 'email', data.email],
        });
      }
      if (data?.nit) {
        queryClient.invalidateQueries({
          queryKey: ['organization', 'nit', data.nit],
        });
      }
    },
    onError: (error) => {
      console.error('Error cambiando el estado de la organización:', error);
    },
  });
};

// Hook para eliminar organización (soft delete)
export const useSoftDeleteOrganization = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ organizationId }: { organizationId: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await softDeleteOrganization(organizationId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations'],
      });
      queryClient.invalidateQueries({
        queryKey: ['organization', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['organizations', 'active'],
      });
    },
    onError: (error) => {
      console.error('Error eliminando la organización:', error);
    },
  });
};

// Hook para restaurar organización eliminada
export const useRestoreOrganization = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ organizationId }: { organizationId: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await restoreOrganization(organizationId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations'],
      });
      queryClient.invalidateQueries({
        queryKey: ['organization', variables.organizationId],
      });

      // Restaurar búsquedas por email y NIT
      if (data?.email) {
        queryClient.invalidateQueries({
          queryKey: ['organization', 'email', data.email],
        });
      }
      if (data?.nit) {
        queryClient.invalidateQueries({
          queryKey: ['organization', 'nit', data.nit],
        });
      }
      if (data?.city) {
        queryClient.invalidateQueries({
          queryKey: ['organizations', 'city', data.city],
        });
      }
      if (data?.department) {
        queryClient.invalidateQueries({
          queryKey: ['organizations', 'department', data.department],
        });
      }
    },
    onError: (error) => {
      console.error('Error restaurando la organización:', error);
    },
  });
};

// Hook para eliminar organización permanentemente (hard delete)
export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ organizationId }: { organizationId: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await deleteOrganization(organizationId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations'],
      });
      // Remover específicamente esta organización del cache
      queryClient.removeQueries({
        queryKey: ['organization', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['organizations', 'active'],
      });
    },
    onError: (error) => {
      console.error('Error eliminando permanentemente la organización:', error);
    },
  });
};

// Hooks de conveniencia para casos comunes

// Hook para obtener solo organizaciones activas con filtros
export const useActiveOrganizationsWithFilters = (
  filters?: Omit<OrganizationFilters, 'isActive'>
) => {
  return useOrganizations({ ...filters, isActive: true });
};

// Hook para obtener todas las organizaciones (activas e inactivas)
export const useAllOrganizations = (
  filters?: Omit<OrganizationFilters, 'isActive'>
) => {
  return useOrganizations(filters);
};

// Hook para obtener solo organizaciones inactivas
export const useInactiveOrganizations = (
  filters?: Omit<OrganizationFilters, 'isActive'>
) => {
  return useOrganizations({ ...filters, isActive: false });
};

// Hook para obtener organizaciones eliminadas
export const useDeletedOrganizations = (filters?: OrganizationFilters) => {
  return useOrganizations(filters, true);
};

// Hook para búsqueda de organizaciones
export const useSearchOrganizations = (searchTerm: string) => {
  return useOrganizations({
    search: searchTerm,
    isActive: true,
  });
};

// Hook para obtener organizaciones por región (departamento y ciudad)
export const useOrganizationsByRegion = (
  department?: string,
  city?: string
) => {
  return useOrganizations({
    department,
    city,
    isActive: true,
  });
};

// Hooks de utilidad para operaciones específicas

// Hook para activar organización
export const useActivateOrganization = () => {
  const toggleStatusMutation = useToggleOrganizationStatus();

  return useMutation({
    mutationFn: async ({ organizationId }: { organizationId: string }) => {
      return toggleStatusMutation.mutateAsync({
        organizationId,
        isActive: true,
      });
    },
  });
};

// Hook para desactivar organización
export const useDeactivateOrganization = () => {
  const toggleStatusMutation = useToggleOrganizationStatus();

  return useMutation({
    mutationFn: async ({ organizationId }: { organizationId: string }) => {
      return toggleStatusMutation.mutateAsync({
        organizationId,
        isActive: false,
      });
    },
  });
};

// Hook para obtener la organización actual del usuario
export const useCurrentOrganization = () => {
  const user = useStore((state) => state.user);

  return useOrganizationById(user?.organizationId || '');
};

// Hook para obtener estadísticas de la organización actual del usuario
export const useCurrentOrganizationStatistics = () => {
  const user = useStore((state) => state.user);

  return useOrganizationStatistics(user?.organizationId || '');
};

// Hook compuesto para obtener organizaciones con estadísticas básicas
export const useOrganizationsWithStats = (filters?: OrganizationFilters) => {
  const organizationsQuery = useOrganizations(filters);

  return {
    ...organizationsQuery,
    data: organizationsQuery.data || [],
  };
};

// Hook para verificar si el usuario puede gestionar organizaciones (es admin)
export const useCanManageOrganizations = () => {
  const user = useStore((state) => state.user);

  // Asumiendo que solo los usuarios con rol ADMIN pueden gestionar organizaciones
  return user?.role === 'ADMIN';
};

// Hook para obtener el total de organizaciones por estado
export const useOrganizationsCounts = () => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['organizations', 'counts'],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const [activeResponse, inactiveResponse, deletedResponse] =
        await Promise.all([
          getAllOrganizations(user.id, { isActive: true }),
          getAllOrganizations(user.id, { isActive: false }),
          getAllOrganizations(user.id, {}, true), // incluir eliminadas
        ]);

      const activeCount = activeResponse.data?.length || 0;
      const inactiveCount = inactiveResponse.data?.length || 0;
      const deletedCount = (
        deletedResponse.data?.filter((org) => org.isDeleted) || []
      ).length;
      const totalCount = activeCount + inactiveCount;

      return {
        active: activeCount,
        inactive: inactiveCount,
        deleted: deletedCount,
        total: totalCount,
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
  });
};
