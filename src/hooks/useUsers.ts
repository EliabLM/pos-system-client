import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  updateUser,
  getUsersByOrgId,
  getAllUsers,
  getUserById,
  getUserByEmail,
  updateUserRole,
  toggleUserStatus,
  getUsersByRole,
  softDeleteUser,
  restoreUser,
  deleteUser,
  registerUser,
  updateUserOrg,
} from '@/actions/user';
import { useStore } from '@/store';
import { User, UserRole } from '@/generated/prisma';

// Tipos para los filtros de usuarios
interface UserFilters {
  isActive?: boolean;
  role?: UserRole;
  storeId?: string;
  search?: string;
}

interface UserRoleUpdateParams {
  userId: string;
  newRole: UserRole;
}

interface UserOrgUpdateParams {
  userId: string;
  orgId: string;
}

interface UserStatusToggleParams {
  userId: string;
  isActive: boolean;
}

// Hook principal para obtener usuarios por organización
export const useUsers = (
  filters?: UserFilters,
  includeDeleted: boolean = false
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['users', user?.organizationId, filters, includeDeleted],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getUsersByOrgId(
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

// Hook para obtener todos los usuarios (solo super admin)
export const useAllUsers = (
  filters?: {
    isActive?: boolean;
    role?: UserRole;
    organizationId?: string;
    search?: string;
  },
  includeDeleted: boolean = false
) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['allUsers', filters, includeDeleted],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await getAllUsers(user.id, filters, includeDeleted);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.id && user?.role === 'ADMIN',
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook para obtener un usuario específico por ID
export const useUserById = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('ID de usuario requerido');
      }

      const response = await getUserById(userId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener usuario por email
export const useUserByEmail = (email: string) => {
  return useQuery({
    queryKey: ['user', 'email', email],
    queryFn: async () => {
      if (!email) {
        throw new Error('Email requerido');
      }

      const response = await getUserByEmail(email);

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

// Hook para obtener usuarios por rol
export const useUsersByRole = (role: UserRole) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['users', 'role', role, user?.organizationId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      if (!role) {
        throw new Error('Rol requerido');
      }

      const response = await getUsersByRole(user.organizationId, role);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId && !!role,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para crear usuario
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async (
      userData: Omit<
        User,
        'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
      >
    ) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await createUser(user.organizationId, user.id, userData);

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidar múltiples queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['users', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['allUsers'],
      });
    },
    onError: (error) => {
      console.error('Error creando el usuario:', error);
    },
  });
};

export const useRegisterUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      userData: Omit<
        User,
        'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
      >
    ) => {
      const response = await registerUser(userData);

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidar múltiples queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['users'],
      });
      queryClient.invalidateQueries({
        queryKey: ['allUsers'],
      });
    },
    onError: (error) => {
      console.error('Error creando el usuario:', error);
    },
  });
};

// Hook para actualizar usuario
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      userId,
      updateData,
    }: {
      userId: string;
      updateData: Partial<
        Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>
      >;
    }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await updateUser(userId, user.id, updateData);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      const updatedUser = data;

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['users', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['user', variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ['allUsers'],
      });

      // Invalidar búsqueda por email si se actualizó
      if (updatedUser?.email) {
        queryClient.invalidateQueries({
          queryKey: ['user', 'email', updatedUser.email],
        });
      }
    },
    onError: (error) => {
      console.error('Error actualizando el usuario:', error);
    },
  });
};

// Hook para actualizar rol de usuario
export const useUpdateUserOrg = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, orgId }: UserOrgUpdateParams) => {
      const response = await updateUserOrg(userId, orgId);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['users'],
      });
      queryClient.invalidateQueries({
        queryKey: ['user', variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ['users', 'organizationId'],
      });
      queryClient.invalidateQueries({
        queryKey: ['allUsers'],
      });
    },
    onError: (error) => {
      console.error('Error actualizando la organización del usuario:', error);
    },
  });
};

// Hook para actualizar rol de usuario
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ userId, newRole }: UserRoleUpdateParams) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await updateUserRole(userId, user.id, newRole);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['users', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['user', variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ['users', 'role'],
      });
      queryClient.invalidateQueries({
        queryKey: ['allUsers'],
      });
    },
    onError: (error) => {
      console.error('Error actualizando el rol del usuario:', error);
    },
  });
};

// Hook para activar/desactivar usuario
export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ userId, isActive }: UserStatusToggleParams) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await toggleUserStatus(userId, user.id, isActive);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['users', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['user', variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ['users', 'role'],
      });
      queryClient.invalidateQueries({
        queryKey: ['allUsers'],
      });
    },
    onError: (error) => {
      console.error('Error cambiando el estado del usuario:', error);
    },
  });
};

// Hook para eliminar usuario (soft delete)
export const useSoftDeleteUser = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await softDeleteUser(userId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['users', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['user', variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ['users', 'role'],
      });
      queryClient.invalidateQueries({
        queryKey: ['allUsers'],
      });
    },
    onError: (error) => {
      console.error('Error eliminando el usuario:', error);
    },
  });
};

// Hook para restaurar usuario eliminado
export const useRestoreUser = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await restoreUser(userId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['users', user?.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['user', variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ['users', 'role'],
      });
      queryClient.invalidateQueries({
        queryKey: ['allUsers'],
      });

      // Restaurar búsqueda por email
      if (data?.email) {
        queryClient.invalidateQueries({
          queryKey: ['user', 'email', data.email],
        });
      }
    },
    onError: (error) => {
      console.error('Error restaurando el usuario:', error);
    },
  });
};

// Hook para eliminar usuario permanentemente (hard delete)
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await deleteUser(userId, user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['users', user?.organizationId],
      });
      // Remover específicamente este usuario del cache
      queryClient.removeQueries({
        queryKey: ['user', variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ['users', 'role'],
      });
      queryClient.invalidateQueries({
        queryKey: ['allUsers'],
      });
    },
    onError: (error) => {
      console.error('Error eliminando permanentemente el usuario:', error);
    },
  });
};

// Hooks de conveniencia para casos comunes

// Hook para obtener solo usuarios activos
export const useActiveUsers = (filters?: Omit<UserFilters, 'isActive'>) => {
  return useUsers({ ...filters, isActive: true });
};

// Hook para obtener todos los usuarios (activos e inactivos)
export const useAllUsersInOrg = (filters?: Omit<UserFilters, 'isActive'>) => {
  return useUsers(filters);
};

// Hook para obtener solo usuarios inactivos
export const useInactiveUsers = (filters?: Omit<UserFilters, 'isActive'>) => {
  return useUsers({ ...filters, isActive: false });
};

// Hook para obtener usuarios eliminados
export const useDeletedUsers = (filters?: UserFilters) => {
  return useUsers(filters, true);
};

// Hook para obtener usuarios por tienda específica
export const useUsersByStore = (
  storeId: string,
  includeInactive: boolean = false
) => {
  return useUsers({
    storeId,
    isActive: includeInactive ? undefined : true,
  });
};

// Hook para búsqueda de usuarios
export const useSearchUsers = (searchTerm: string) => {
  return useUsers({
    search: searchTerm,
    isActive: true,
  });
};

// Hooks específicos por rol

// Hook para obtener administradores
export const useAdmins = () => {
  return useUsersByRole('ADMIN');
};

// Hook para obtener vendedores
export const useSellers = () => {
  return useUsersByRole('SELLER');
};

// Hooks de utilidad para operaciones específicas

// Hook para activar usuario
export const useActivateUser = () => {
  const toggleStatusMutation = useToggleUserStatus();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return toggleStatusMutation.mutateAsync({
        userId,
        isActive: true,
      });
    },
  });
};

// Hook para desactivar usuario
export const useDeactivateUser = () => {
  const toggleStatusMutation = useToggleUserStatus();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return toggleStatusMutation.mutateAsync({
        userId,
        isActive: false,
      });
    },
  });
};

// Hook compuesto para obtener estadísticas de usuarios
export const useUserStats = () => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['userStats', user?.organizationId],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      // Obtener todos los usuarios para calcular estadísticas
      const response = await getUsersByOrgId(user.organizationId, {}, false);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      const users = response.data || [];

      const stats = {
        total: users.length,
        active: users.filter((u) => u.isActive).length,
        inactive: users.filter((u) => !u.isActive).length,
        byRole: {
          ADMIN: users.filter((u) => u.role === 'ADMIN').length,
          SELLER: users.filter((u) => u.role === 'SELLER').length,
        },
        recentActivity: users.filter((u) => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(u.updatedAt) > weekAgo;
        }).length,
      };

      return stats;
    },
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para verificar si el usuario actual puede realizar acciones administrativas
export const useCanManageUsers = () => {
  const user = useStore((state) => state.user);

  return user?.role === 'ADMIN';
};

// Hook para obtener el perfil del usuario actual
export const useCurrentUserProfile = () => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['currentUser', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await getUserById(user.id);

      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000,
  });
};
