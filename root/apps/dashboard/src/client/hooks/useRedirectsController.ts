import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSocket } from '../context/SocketContext'

export interface CreateRedirectDTO {
    slug: string
    destinationUrl: string
    destinationType: 'url' | 'bot'
    botId?: string
    flowId?: string
    domain: string
    cloakerEnabled: boolean
    cloakerMethod: 'redirect' | 'safe_page' | 'mirror'
    cloakerSafeUrl?: string
    mode?: string
}

export const useRedirectsController = () => {
    const queryClient = useQueryClient()
    const { request, isConnected } = useSocket()

    // Query: List Redirects
    const listQuery = useQuery({
        queryKey: ['redirects'],
        queryFn: async () => {
            return await request<any[]>('FETCH_REDIRECTS') || []
        },
        enabled: isConnected
    })

    // Query: Stats
    const statsQuery = useQuery({
        queryKey: ['redirect-stats'],
        queryFn: async () => {
            return await request<any>('FETCH_RED_STATS')
        },
        enabled: isConnected
    })

    // Query: Bots (for dropdown)
    const botsQuery = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            return await request<any[]>('FETCH_BOTS') || []
        },
        enabled: isConnected
    })

    // Helper: Fetch blueprints for a specific bot (not a hook, just a promise function)
    const fetchBotBlueprints = async (botId: string) => {
        return await request<any[]>('FETCH_BLUEPRINTS', { botId }) || []
    }

    // Mutation: Create Redirect
    const createMutation = useMutation({
        mutationFn: async (data: CreateRedirectDTO) => {
            await request('CREATE_REDIRECT', data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['redirects'] })
            queryClient.invalidateQueries({ queryKey: ['redirect-stats'] })
        }
    })

    // Mutation: Delete Redirect
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await request('DELETE_REDIRECT', { id })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['redirects'] })
            queryClient.invalidateQueries({ queryKey: ['redirect-stats'] })
        }
    })

    // Mutation: Update Redirect
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: CreateRedirectDTO }) => {
            await request('UPDATE_REDIRECT', { id, data })
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

