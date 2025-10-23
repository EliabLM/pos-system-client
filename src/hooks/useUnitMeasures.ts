import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUnitMeasure,
  getUnitMeasuresByOrgId,
} from '@/actions/unit-measure';
import { useStore } from '@/store';
import { UnitMeasure } from '@/generated/prisma';

export const useUnitMeasures = (isActive?: boolean) => {
  const user = useStore((state) => state.user);

  return useQuery({
    queryKey: ['unit-measures', user?.organizationId, isActive],
    queryFn: async () => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await getUnitMeasuresByOrgId(
        user.organizationId,
        isActive
      );

      // Manejar errores de la respuesta
      if (response.status !== 200) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!user?.organizationId, // Solo ejecutar si hay orgId
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook para crear unidad de medida
export const useCreateUnitMeasure = () => {
  const queryClient = useQueryClient();
  const user = useStore((state) => state.user);

  return useMutation({
    mutationFn: async (
      unitMeasureData: Omit<
        UnitMeasure,
        | 'id'
        | 'organizationId'
        | 'createdAt'
        | 'updatedAt'
        | 'isDeleted'
        | 'deletedAt'
      >
    ) => {
      if (!user?.organizationId) {
        throw new Error('Usuario no tiene organización asignada');
      }

      const response = await createUnitMeasure(
        user.organizationId,
        user.id,
        unitMeasureData
      );

      if (response.status !== 201) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidar todas las queries de unidades de medida para esta organización
      queryClient.invalidateQueries({
        queryKey: ['unit-measures', user?.organizationId],
      });
    },
    onError: (error) => {
      console.error('Error creando unidad de medida:', error);
    },
  });
};

// Hook adicional para obtener unidades de medida activas (caso común)
export const useActiveUnitMeasures = () => {
  return useUnitMeasures(true);
};

// Hook adicional para obtener todas las unidades de medida (activas e inactivas)
export const useAllUnitMeasures = () => {
  return useUnitMeasures(); // sin parámetro = todas
};
