import type { FC } from 'hono/jsx'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { BotCard } from '../components/organisms/BotCard'
import { AddBotForm } from '../components/organisms/AddBotForm'
import { Alert } from '../components/atoms/Alert'
import type { Bot } from '../core/types'

interface HealthCheckResult {
    botName: string
    status: 'online' | 'offline' | 'error'
    message: string
    timestamp: string
}

interface BotsPageProps {
    user: {
        name: string
        email: string
    }
    bots: Bot[]
    error?: string
    healthCheckResult?: HealthCheckResult
}

export const BotsPage: FC<BotsPageProps> = ({ user, bots, error, healthCheckResult }) => {
    const onlineBots = bots.filter(b => b.status === 'online').length
    const totalBots = bots.length

    return (
        <DashboardLayout
            title="Gerenciar Bots"
            currentPath="/dashboard/bots"
            user={user}
        >
            {/* Health Check Alert */}
            {healthCheckResult && (
                <div class="health-check-alert-container">
                    <Alert
                        type={healthCheckResult.status === 'online' ? 'success' : 'error'}
                        message={`${healthCheckResult.botName}: ${healthCheckResult.status === 'online' ? 'Online e Funcionando!' : 'Não está respondendo'}`}
                        details={`${healthCheckResult.message} • ${healthCheckResult.timestamp}`}
                    />
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div class="error-alert-container">
                    <Alert type="error" message={error} />
                </div>
            )}

            <div class="bots-header">
                <div class="bots-stats">
                    <div class="stat-item">
                        <span class="stat-value">{totalBots}</span>
                        <span class="stat-label">Total de Bots</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value stat-online">{onlineBots}</span>
                        <span class="stat-label">Online</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value stat-offline">{totalBots - onlineBots}</span>
                        <span class="stat-label">Offline/Erro</span>
                    </div>
                </div>
            </div>

            <div class="bots-content">
                <div class="bots-grid">
                    {bots.length === 0 ? (
                        <div class="empty-state">
                            <span class="empty-icon">🤖</span>
                            <h3>Nenhum bot configurado</h3>
                            <p>Adicione seu primeiro bot para começar</p>
                        </div>
                    ) : (
                        bots.map(bot => <BotCard key={bot.id} bot={bot} />)
                    )}
                </div>

                <div class="bots-sidebar">
                    <AddBotForm error={undefined} />
                </div>
            </div>
        </DashboardLayout>
    )
}
