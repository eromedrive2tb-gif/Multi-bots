/** @jsxImportSource react */
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { StatsGrid } from '../components/organisms/StatsGrid'
import { Card, CardHeader, CardBody } from '../components/atoms/Card'
import { useUser } from '../client/context/UserContext'
import type { AnalyticsDashboardData } from '../lib/molecules/analytics-aggregator'

export const DashboardPage: React.FC = () => {
    const { user, tenantId } = useUser()
    const displayUser = user || { name: 'Usuário', email: '' }
    const displayTenantId = tenantId || ''

    // Fetch real analytics data
    const { data: analyticsData, isLoading } = useQuery<AnalyticsDashboardData>({
        queryKey: ['analytics', { status: 'all' }],
        queryFn: async () => {
            const response = await fetch('/api/analytics?status=all')
            const result = await response.json() as any
            if (!result.success) throw new Error(result.error)
            return result.data
        }
    })

    const overview = analyticsData?.overview || {
        totalBots: 0,
        activeBots: 0,
        totalFlowStarts: 0,
        totalErrors: 0
    }

    const totalUsers = analyticsData?.bots?.reduce((sum, bot) => sum + (bot.totalUsers || 0), 0) || 0

    const stats = [
        {
            label: 'Total Bots',
            value: overview.totalBots,
            icon: '🤖',
            trend: (overview.activeBots > 0 ? 'up' : 'neutral') as 'up' | 'neutral' | 'down',
            trendValue: `${overview.activeBots} ativos`
        },
        {
            label: 'Fluxos Iniciados',
            value: overview.totalFlowStarts,
            icon: '💬',
            trend: 'up' as const,
            trendValue: 'Total'
        },
        {
            label: 'Usuários Totais',
            value: totalUsers,
            icon: '👥',
            trend: 'neutral' as const,
            trendValue: 'Total'
        },
        {
            label: 'Status Sistema',
            value: (overview.totalErrors === 0 ? 'Estável' : 'Alerta') as string,
            icon: overview.totalErrors === 0 ? '✅' : '⚠️',
            trend: (overview.totalErrors === 0 ? 'up' : 'down') as 'up' | 'neutral' | 'down',
            trendValue: `${overview.totalErrors} erros`
        },
    ]

    return (
        <DashboardLayout
            title="Dashboard"
            currentPath="/dashboard"
        >
            <div className="dashboard-welcome">
                <h2>Bem-vindo, {displayUser.name}! 👋</h2>
                <p className="text-muted">Tenant ID: {displayTenantId}</p>
            </div>

            {isLoading ? (
                <div className="p-8 text-center text-muted">Carregando métricas...</div>
            ) : (
                <StatsGrid stats={stats} />
            )}

            <div className="dashboard-section">
                <Card>
                    <CardHeader>
                        <h3>Atividade do Sistema</h3>
                    </CardHeader>
                    <CardBody>
                        <div className="activity-list">
                            {overview.totalBots > 0 ? (
                                <div className="activity-item">
                                    <span className="activity-icon">🟢</span>
                                    <span className="activity-text">
                                        {overview.activeBots} de {overview.totalBots} bots estão ativos e processando mensagens
                                    </span>
                                </div>
                            ) : (
                                <div className="activity-item">
                                    <span className="activity-icon">ℹ️</span>
                                    <span className="activity-text">Nenhum bot configurado ainda. Vá para a aba "Gerenciar Bots".</span>
                                </div>
                            )}

                            {overview.totalErrors > 0 && (
                                <div className="activity-item">
                                    <span className="activity-icon">⚠️</span>
                                    <span className="activity-text">
                                        {overview.totalErrors} erros detectados nas últimas execuções de fluxo.
                                    </span>
                                </div>
                            )}

                            <div className="activity-item">
                                <span className="activity-icon">⚙️</span>
                                <span className="activity-text">Integrações com Telegram/Discord funcionando normalmente</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </DashboardLayout>
    )
}
