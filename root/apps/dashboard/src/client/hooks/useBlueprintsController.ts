import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BlueprintClientService } from '../services/BlueprintService'
import type { Blueprint, BlueprintListItem } from '../../../../engine/src/core/types'

// Singleton instance for the service (or inject via context if preferred)
const blueprintService = new BlueprintClientService()

export const useBlueprintsController = () => {
    const queryClient = useQueryClient()

    // Query: List Blueprints
    const listQuery = useQuery({
        queryKey: ['blueprints'],
        queryFn: async () => {
            const result = await blueprintService.listBlueprints()
            if (!result.success) throw new Error(result.error)
            return result.data
        }
    })

    // Mutation: Delete Blueprint
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const result = await blueprintService.deleteBlueprint(id)
            if (!result.success) throw new Error(result.error)
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blueprints'] })
        }
    })

    // Mutation: Save Blueprint (Create or Update)
    const saveMutation = useMutation({
        mutationFn: async (blueprint: Blueprint) => {
            const result = await blueprintService.saveBlueprint(blueprint)
            if (!result.success) throw new Error(result.error)
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blueprints'] })
        }
    })

    // Query: Get Single Blueprint (Lazy/On-Demand)
    // Helper to fetch a specific blueprint details when needed (e.g. for editing)
    const fetchBlueprint = async (id: string): Promise<Blueprint | null> => {
        const result = await blueprintService.getBlueprint(id)
        if (!result.success) {
            console.error('Failed to fetch blueprint:', result.error)
            return null
        }
        return result.data
    }

    return {
        blueprints: listQuery.data || [],
        isLoading: listQuery.isLoading || deleteMutation.isPending || saveMutation.isPending,
        error: listQuery.error || deleteMutation.error || saveMutation.error,
        deleteBlueprint: deleteMutation.mutateAsync,
        saveBlueprint: saveMutation.mutateAsync,
        fetchBlueprint,
        isSaving: saveMutation.isPending,
        isDeleting: deleteMutation.isPending
    }
}
