/** @jsxImportSource react */
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../components/templates'
import { StatsGrid } from '../components/organisms'
import { SystemActivity } from '../components/organisms'
import { Bot, MessageSquare, Users, CheckCircle, AlertTriangle } from 'lucide-react'
import { useUser } from '../client/context/UserContext'
import { useSocket } from '../client/context/SocketContext'
import type { AnalyticsDashboardData } from '../../../engine/src/lib/molecules/analytics/analytics-aggregator'

export const DashboardPage: React.FC = () => {
    const { user, tenantId } = useUser()
    const displayUser = user || { name: 'Usuário', email: '' }
    const displayTenantId = tenantId || ''

    // Fetch real analytics data
    const { request, isConnected } = useSocket()
    // Fetch real analytics data
    const { data: analyticsData, isLoading } = useQuery<AnalyticsDashboardData>({
        queryKey: ['analytics', { status: 'all' }],
        queryFn: () => request('FETCH_ANALYTICS', { status: 'all' }),
        enabled: isConnected
    })

    const overview = analyticsData?.overview || {
        totalBots: 0,
        activeBots: 0,
        totalFlowStarts: 0,
        totalFlowCompletions: 0,
        totalErrors: 0,
        completionRate: 0,
        activeBlueprints: 0,
        totalBlueprints: 0
    }

    const totalUsers = analyticsData?.bots?.reduce((sum: number, bot: any) => sum + (bot.totalUsers || 0), 0) || 0

    const stats = [
        {
            label: 'Total Bots',
            value: overview.totalBots,
            icon: <Bot size={24} />,
            trend: (overview.activeBots > 0 ? 'up' : 'neutral') as 'up' | 'neutral' | 'down',
            trendValue: `${overview.activeBots} ativos`
        },
        {
            label: 'Fluxos Iniciados',
            value: overview.totalFlowStarts,
            icon: <MessageSquare size={24} />,
            trend: 'up' as const,
            trendValue: 'Total'
        },
        {
            label: 'Usuários Totais',
            value: totalUsers,
            icon: <Users size={24} />,
            trend: 'neutral' as const,
            trendValue: 'Total'
        },
        {
            label: 'Status Sistema',
            value: (overview.totalErrors === 0 ? 'Estável' : 'Alerta') as string,
            icon: overview.totalErrors === 0 ? <CheckCircle size={24} /> : <AlertTriangle size={24} />,
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
                <h2 className="text-white text-3xl font-black">Bem-vindo, <span className="text-gradient-primary">{displayUser.name}</span>!</h2>
                <p className="text-slate-400 mt-1">Tenant ID: {displayTenantId}</p>
            </div>

            {isLoading ? (
                <div className="p-8 text-center text-muted">Carregando métricas...</div>
            ) : (
                <>
                    <StatsGrid stats={stats} />
                    <div className="dashboard-section">
                        <SystemActivity overview={overview} />
                    </div>
                </>
            )}

            <style>{`
                .dashboard-welcome { margin-bottom: 24px; }
                .dashboard-welcome h2 { font-size: 1.75rem; margin-bottom: 4px; }
                .dashboard-section { margin-top: 24px; }
            `}</style>
        </DashboardLayout>
    )
}
