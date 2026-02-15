import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RedirectsClientService, CreateRedirectDTO } from '../services/RedirectsClientService'

// Singleton instance
const redirectsService = new RedirectsClientService()

export const useRedirectsController = () => {
    const queryClient = useQueryClient()

    // Query: List Redirects
    const listQuery = useQuery({
        queryKey: ['redirects'],
        queryFn: async () => {
            const result = await redirectsService.listRedirects()
            if (!result.success) throw new Error(result.error)
            return result.data
        }
    })

    // Query: Stats
    const statsQuery = useQuery({
        queryKey: ['redirect-stats'],
        queryFn: async () => {
            const result = await redirectsService.getStats()
            if (!result.success) throw new Error(result.error)
            return result.data
        }
    })

    // Query: Bots (for dropdown)
    const botsQuery = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const result = await redirectsService.listBots()
            if (!result.success) throw new Error(result.error)
            return result.data
        }
    })

    // Helper: Fetch blueprints for a specific bot (not a hook, just a promise function)
    const fetchBotBlueprints = async (botId: string) => {
        const result = await redirectsService.getBotBlueprints(botId)
        if (!result.success) throw new Error(result.error)
        return result.data
    }

    // Mutation: Create Redirect
    const createMutation = useMutation({
        mutationFn: async (data: CreateRedirectDTO) => {
            const result = await redirectsService.createRedirect(data)
            if (!result.success) throw new Error(result.error)
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['redirects'] })
            queryClient.invalidateQueries({ queryKey: ['redirect-stats'] })
        }
    })

    // Mutation: Delete Redirect
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const result = await redirectsService.deleteRedirect(id)
            if (!result.success) throw new Error(result.error)
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['redirects'] })
            queryClient.invalidateQueries({ queryKey: ['redirect-stats'] })
        }
    })

    // Mutation: Update Redirect
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: CreateRedirectDTO }) => {
            const result = await redirectsService.updateRedirect(id, data)
            if (!result.success) throw new Error(result.error)
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['redirects'] })
        }
    })

    return {
        redirects: listQuery.data || [],
        stats: statsQuery.data,
        bots: botsQuery.data || [],
        isLoading: listQuery.isLoading || statsQuery.isLoading,
        isCreating: createMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isUpdating: updateMutation.isPending,
        createRedirect: createMutation.mutateAsync,
        updateRedirect: updateMutation.mutateAsync,
        deleteRedirect: deleteMutation.mutateAsync,
        fetchBotBlueprints
    }
}
