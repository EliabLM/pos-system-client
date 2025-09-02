import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPaymentMethod, updatePaymentMethod, getPaymentMethodsByOrgId, softDeletePaymentMethod } from '@/actions/payment-methods'
import { useStore } from '@/store'
import { PaymentMethod } from '@/generated/prisma';

export const usePaymentMethods = (isActive?: boolean) => {
    const user = useStore(state => state.user);

    return useQuery({
        queryKey: ['payment-methods', user?.organizationId, isActive],
        queryFn: async () => {
            if (!user?.organizationId) {
                throw new Error('Usuario no tiene organización asignada')
            }

            const response = await getPaymentMethodsByOrgId(user.organizationId, isActive)

            // Manejar errores de la respuesta
            if (response.status !== 200) {
                throw new Error(response.message)
            }

            return response.data
        },
        enabled: !!user?.organizationId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    })
}

// Create payment-method hook
export const useCreatePaymentMethod = () => {
    const queryClient = useQueryClient()
    const user = useStore(state => state.user);

    return useMutation({
        mutationFn: async (createData: Omit<PaymentMethod, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>) => {
            if (!user?.organizationId) {
                throw new Error('Usuario no tiene organización asignada')
            }

            const response = await createPaymentMethod(user.organizationId, user.id, createData)

            if (response.status !== 201) {
                throw new Error(response.message)
            }

            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['payment-methods', user?.organizationId]
            })
        },
        onError: (error) => {
            console.error('Error creando el método de pago:', error)
        }
    })
}

// Hook adicional para obtener métodos de pago activos
export const useActivePaymentMethods = () => {
    return usePaymentMethods(true)
}

// Hook adicional para obtener todos los métodos de pago
export const useAllPaymentMethods = () => {
    return usePaymentMethods()
}

// Hook para eliminar métodos de pago (soft)
export const useSoftDeletePaymentMethod = () => {
    const queryClient = useQueryClient()
    const user = useStore(state => state.user);

    return useMutation({
        mutationFn: async ({ paymentMethodId }: { paymentMethodId: string }) => {
            if (!user?.organizationId) {
                throw new Error('Usuario no tiene organización asignada')
            }

            const response = await softDeletePaymentMethod(paymentMethodId, user.id);

            if (response.status !== 200) {
                throw new Error(response.message)
            }

            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['payment-methods', user?.organizationId]
            })
        },
        onError: (error) => {
            console.error('Error eliminando el método de pago:', error)
        }
    })
}

export const useUpdatePaymentMethod = () => {
    const queryClient = useQueryClient()
    const user = useStore(state => state.user);

    return useMutation({
        mutationFn: async ({ paymentMethodId, updateData }: {
            paymentMethodId: string, updateData: Partial<Omit<PaymentMethod, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>>
        }) => {
            if (!user?.organizationId) {
                throw new Error('Usuario no tiene organización asignada')
            }

            const response = await updatePaymentMethod(paymentMethodId, user.id, updateData)

            if (response.status !== 200) {
                throw new Error(response.message)
            }

            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['payment-methods', user?.organizationId]
            })
        },
        onError: (error) => {
            console.error('Error actualizando el método de pago:', error)
        }
    })
}