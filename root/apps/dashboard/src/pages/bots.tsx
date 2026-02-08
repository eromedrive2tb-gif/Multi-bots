/** @jsxImportSource react */
import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { BotCard } from '../components/organisms/BotCard'
import { AddBotForm } from '../components/organisms/AddBotForm'
import { Alert } from '../components/atoms/Alert'
import type { Bot } from '../core/types'

export const BotsPage: React.FC = () => {
    const queryClient = useQueryClient()

    const { data: bots = [], isLoading, error } = useQuery<Bot[]>({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await fetch('/api/bots')
            const result = await response.json() as any
            if (!result.success) throw new Error(result.error)
            return result.data
        }
    })

    const onlineBots = bots.filter(b => b.status === 'online').length
    const totalBots = bots.length

    const refreshBots = () => {
        queryClient.invalidateQueries({ queryKey: ['bots'] })
    }

    return (
        <DashboardLayout
            title="Gerenciar Bots"
            currentPath="/dashboard/bots"
        >
            {/* Error Alert */}
            {error && (
                <div className="error-alert-container">
                    <Alert type="error" message={(error as Error).message} />
                </div>
            )}

            <div className="bots-header">
                <div className="bots-stats">
                    <div className="stat-item">
                        <span className="stat-value">{totalBots}</span>
                        <span className="stat-label">Total de Bots</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value stat-online">{onlineBots}</span>
                        <span className="stat-label">Online</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value stat-offline">{totalBots - onlineBots}</span>
                        <span className="stat-label">Offline/Erro</span>
                    </div>
                </div>
            </div>

            <div className="bots-content">
                <div className="bots-grid">
                    {isLoading ? (
                        <div className="empty-state">Carregando bots...</div>
                    ) : bots.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">🤖</span>
                            <h3>Nenhum bot configurado</h3>
                            <p>Adicione seu primeiro bot para começar</p>
                        </div>
                    ) : (
                        bots.map(bot => (
                            <BotCard
                                key={bot.id}
                                bot={bot}
                                onUpdate={refreshBots}
                            />
                        ))
                    )}
                </div>

                <div className="bots-sidebar">
                    <AddBotForm onSuccess={refreshBots} />
                </div>
            </div>
        </DashboardLayout>
    )
}
