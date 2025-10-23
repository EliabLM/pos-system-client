import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSystemConfig,
  getAllSystemConfigs,
  updateSystemConfig,
  getBusinessType,
  setBusinessType,
} from '@/actions/system-config';
import { useStore } from '@/store';
import { toast } from 'sonner';

// Hook para obtener una configuración específica
export function useSystemConfig(key: string) {
  const user = useStore((state) => state.user);
  const organizationId = user?.organizationId ?? '';

  return useQuery({
    queryKey: ['system-config', organizationId, key],
    queryFn: async () => {
      const response = await getSystemConfig(organizationId, key);
      return response.data;
    },
    enabled: !!organizationId && !!key,
  });
}

// Hook para obtener todas las configuraciones
export function useAllSystemConfigs() {
  const user = useStore((state) => state.user);
  const organizationId = user?.organizationId ?? '';

  return useQuery({
    queryKey: ['system-configs', organizationId],
    queryFn: async () => {
      const response = await getAllSystemConfigs(organizationId);
      return response.data;
    },
    enabled: !!organizationId,
  });
}

// Hook para actualizar configuración (NO usar para business_type)
export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);
  const organizationId = user?.organizationId ?? '';
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      // Prevenir cambio de business_type
      if (key === 'business_type') {
        throw new Error(
          'No se puede cambiar el tipo de negocio después del onboarding'
        );
      }

      const response = await updateSystemConfig(
        organizationId,
        userId,
        key,
        value
      );
      if (response.status !== 200) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['system-configs', organizationId],
      });
      toast.success('Configuración actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar configuración');
    },
  });
}

// Hook específico para obtener tipo de negocio (SOLO LECTURA)
export function useBusinessType() {
  const user = useStore((state) => state.user);
  const organizationId = user?.organizationId ?? '';

  return useQuery({
    queryKey: ['business-type', organizationId],
    queryFn: async () => {
      return await getBusinessType(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

// Hook para establecer tipo de negocio
// ⚠️ IMPORTANTE: Solo debe usarse durante el onboarding
// Una vez establecido, NO puede cambiarse
export function useSetBusinessType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      businessType,
    }: {
      organizationId: string;
      businessType: 'liquor_store' | 'shoe_store';
    }) => {
      // Verificar que no exista ya un business_type
      const existing = await getBusinessType(organizationId);
      if (existing) {
        throw new Error(
          'El tipo de negocio ya fue configurado y no puede ser modificado'
        );
      }

      const response = await setBusinessType(organizationId, businessType);
      if (response.status !== 201) {
        throw new Error(response.message);
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['business-type', variables.organizationId],
      });
    },
  });
}
