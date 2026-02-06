import type { FC } from 'hono/jsx'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { StatsGrid } from '../components/organisms/StatsGrid'
import { Card, CardHeader, CardBody } from '../components/atoms/Card'

interface DashboardPageProps {
    user: {
        name: string
        email: string
    }
    tenantId: string
}

export const DashboardPage: FC<DashboardPageProps> = ({ user, tenantId }) => {
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
            user={user}
        >
            <div class="dashboard-welcome">
                <h2>Bem-vindo, {user.name}! 👋</h2>
                <p class="text-muted">Tenant ID: {tenantId}</p>
            </div>

            <StatsGrid stats={stats} />

            <div class="dashboard-section">
                <Card>
                    <CardHeader>
                        <h3>Atividade Recente</h3>
                    </CardHeader>
                    <CardBody>
                        <div class="activity-list">
                            <div class="activity-item">
                                <span class="activity-icon">🚀</span>
                                <span class="activity-text">Bot "Atendimento" iniciado</span>
                                <span class="activity-time">há 2 min</span>
                            </div>
                            <div class="activity-item">
                                <span class="activity-icon">💬</span>
                                <span class="activity-text">15 novas mensagens recebidas</span>
                                <span class="activity-time">há 5 min</span>
                            </div>
                            <div class="activity-item">
                                <span class="activity-icon">⚙️</span>
                                <span class="activity-text">Configurações atualizadas</span>
                                <span class="activity-time">há 1 hora</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </DashboardLayout>
    )
}
