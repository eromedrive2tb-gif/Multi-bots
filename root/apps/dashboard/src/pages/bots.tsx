/** @jsxImportSource react */
import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSocket } from '../client/context/SocketContext'
import { DashboardLayout } from '../components/templates'
import { BotGrid } from '../components/organisms'
import { BotStats } from '../components/molecules'
import { AddBotForm } from '../components/organisms'
import { Alert } from '../components/atoms'
import type { Bot } from '../../../engine/src/core/types'

export const BotsPage: React.FC = () => {
    const queryClient = useQueryClient()

    const { request, isConnected } = useSocket()
    const { data: bots = [], isLoading, error } = useQuery<Bot[]>({
        queryKey: ['bots'],
        queryFn: () => request('FETCH_BOTS'),
        enabled: isConnected
    })

    const onlineBots = bots.filter(b => b.status === 'online').length

    const refreshBots = () => {
        queryClient.invalidateQueries({ queryKey: ['bots'] })
    }

    return (
        <DashboardLayout title="Gerenciar Bots" currentPath="/dashboard/bots">
            {error && (
                <div style={{ marginBottom: '24px' }}>
                    <Alert type="error" message={(error as Error).message} />
                </div>
            )}

            <BotStats total={bots.length} online={onlineBots} />

            <div className="bots-content">
                <div className="bots-main">
                    <BotGrid bots={bots} isLoading={isLoading} onUpdate={refreshBots} />
                </div>

                <div className="bots-sidebar">
                    <AddBotForm onSuccess={refreshBots} />
                </div>
            </div>

            <style>{`
                .bots-content {
                    display: grid;
                    grid-template-columns: 1fr 350px;
                    gap: 32px;
                    align-items: start;
                }
                
                @media (max-width: 1024px) {
                    .bots-content {
                        grid-template-columns: 1fr;
                    }
                    .bots-sidebar {
                        order: -1;
                    }
                }
            `}</style>
        </DashboardLayout>
    )
}
