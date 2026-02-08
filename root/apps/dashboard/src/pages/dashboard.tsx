/** @jsxImportSource react */
import React from 'react'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { StatsGrid } from '../components/organisms/StatsGrid'
import { Card, CardHeader, CardBody } from '../components/atoms/Card'
import { useUser } from '../client/context/UserContext'

export const DashboardPage: React.FC = () => {
    const { user, tenantId } = useUser()
    const displayUser = user || { name: 'Usuário', email: '' }
    const displayTenantId = tenantId || ''

    const stats = [
        { label: 'Total Bots', value: 3, icon: '🤖', trend: 'up' as const, trendValue: '+2' },
        { label: 'Mensagens Hoje', value: 128, icon: '💬', trend: 'up' as const, trendValue: '+15%' },
        { label: 'Usuários Ativos', value: 45, icon: '👥', trend: 'neutral' as const, trendValue: '0%' },
        { label: 'Uptime', value: '99.9%', icon: '✅', trend: 'up' as const, trendValue: '+0.1%' },
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

            <StatsGrid stats={stats} />

            <div className="dashboard-section">
                <Card>
                    <CardHeader>
                        <h3>Atividade Recente</h3>
                    </CardHeader>
                    <CardBody>
                        <div className="activity-list">
                            <div className="activity-item">
                                <span className="activity-icon">🚀</span>
                                <span className="activity-text">Bot "Atendimento" iniciado</span>
                                <span className="activity-time">há 2 min</span>
                            </div>
                            <div className="activity-item">
                                <span className="activity-icon">💬</span>
                                <span className="activity-text">15 novas mensagens recebidas</span>
                                <span className="activity-time">há 5 min</span>
                            </div>
                            <div className="activity-item">
                                <span className="activity-icon">⚙️</span>
                                <span className="activity-text">Configurações atualizadas</span>
                                <span className="activity-time">há 1 hora</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </DashboardLayout>
    )
}
