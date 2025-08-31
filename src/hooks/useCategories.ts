import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCategory, getCategoriesByOrgId, softDeleteCategory, updateCategory } from '@/actions/category'
import { useStore } from '@/store'
import { Category } from '@/generated/prisma';

export const useCategories = (isActive?: boolean) => {
    const user = useStore(state => state.user);

    return useQuery({
        queryKey: ['categories', user?.organizationId, isActive],
        queryFn: async () => {
            if (!user?.organizationId) {
                throw new Error('Usuario no tiene organización asignada')
            }

            const response = await getCategoriesByOrgId(user.organizationId, isActive)

            // Manejar errores de la respuesta
            if (response.status !== 200) {
                throw new Error(response.message)
            }

            return response.data
        },
        enabled: !!user?.organizationId, // Solo ejecutar si hay orgId
        staleTime: 5 * 60 * 1000, // 5 minutos
        gcTime: 10 * 60 * 1000, // 10 minutos (antes era cacheTime)
    })
}

// Hook para crear categoría
export const useCreateCategory = () => {
    const queryClient = useQueryClient()
    const user = useStore(state => state.user);

    return useMutation({
        mutationFn: async (categoryData: Omit<Category, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>) => {
            if (!user?.organizationId) {
                throw new Error('Usuario no tiene organización asignada')
            }

            const response = await createCategory(user.organizationId, user.id, categoryData)

            if (response.status !== 201) {
                throw new Error(response.message)
            }

            return response.data
        },
        onSuccess: (newCategory) => {
            // Invalidar todas las queries de categorías para esta organización
            queryClient.invalidateQueries({
                queryKey: ['categories', user?.organizationId]
            })

            // Opcional: Agregar optimistic update
            // queryClient.setQueryData(['categories', user?.organizationId], (oldData: Category[] | undefined) => {
            //     return oldData ? [...oldData, newCategory] : [newCategory]
            // })
        },
        onError: (error) => {
            console.error('Error creando categoría:', error)
        }
    })
}

// Hook adicional para obtener categorías activas (caso común)
export const useActiveCategories = () => {
    return useCategories(true)
}

// Hook adicional para obtener todas las categorías (activas e inactivas)
export const useAllCategories = () => {
    return useCategories() // sin parámetro = todas
}

// Hook para eliminar categorías (soft)
export const useSoftDeleteCategory = () => {
    const queryClient = useQueryClient()
    const user = useStore(state => state.user);

    return useMutation({
        mutationFn: async ({ categoryId }: { categoryId: string }) => {
            if (!user?.organizationId) {
                throw new Error('Usuario no tiene organización asignada')
            }

            const response = await softDeleteCategory(categoryId, user.id);

            if (response.status !== 200) {
                throw new Error(response.message)
            }

            return response.data
        },
        onSuccess: (newCategory) => {
            // Invalidar todas las queries de categorías para esta organización
            queryClient.invalidateQueries({
                queryKey: ['categories', user?.organizationId]
            })
        },
        onError: (error) => {
            console.error('Error eliminando categoría:', error)
        }
    })
}

export const useUpdateCategory = () => {
    const queryClient = useQueryClient()
    const user = useStore(state => state.user);

    return useMutation({
        mutationFn: async (
            { categoryId,
                categoryData }:
                {
                    categoryId: string,
                    categoryData: Partial<Omit<Category,
                        'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>>

                }) => {

            if (!user?.organizationId) {
                throw new Error('Usuario no tiene organización asignada')
            }

            const response = await updateCategory(categoryId, user.id, categoryData)

            if (response.status !== 200) {
                throw new Error(response.message)
            }

            return response.data
        },
        onSuccess: (newCategory) => {
            // Invalidar todas las queries de categorías para esta organización
            queryClient.invalidateQueries({
                queryKey: ['categories', user?.organizationId]
            })
        },
        onError: (error) => {
            console.error('Error actualizando categoría:', error)
        }
    })
}