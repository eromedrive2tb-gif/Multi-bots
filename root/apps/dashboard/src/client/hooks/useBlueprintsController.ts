import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSocket } from '../context/SocketContext'
import type { Blueprint, BlueprintListItem } from '../../../../engine/src/core/types'

export const useBlueprintsController = () => {
    const queryClient = useQueryClient()
    const { request, isConnected } = useSocket()

    // Query: List Blueprints
    const listQuery = useQuery({
        queryKey: ['blueprints'],
        queryFn: async () => {
            return await request<BlueprintListItem[]>('FETCH_BLUEPRINTS') || []
        }
    })

    // Mutation: Delete Blueprint
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await request('DELETE_BLUEPRINT', { id })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blueprints'] })
        }
    })

    // Mutation: Save Blueprint (Create or Update)
    const saveMutation = useMutation({
        mutationFn: async (blueprint: Blueprint) => {
            await request('SAVE_BLUEPRINT', blueprint)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blueprints'] })
        }
    })

    // Query: Get Single Blueprint (Lazy/On-Demand)
    // Helper to fetch a specific blueprint details when needed (e.g. for editing)
    const fetchBlueprint = async (id: string): Promise<Blueprint | null> => {
        return await request<Blueprint>('FETCH_BLUEPRINT', { id })
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
