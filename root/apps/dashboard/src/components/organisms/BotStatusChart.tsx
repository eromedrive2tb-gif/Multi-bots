import type { FC } from 'hono/jsx'
import type { BotMetric } from '../../core/analytics-types'

interface BotStatusChartProps {
    bots: BotMetric[]
}

export const BotStatusChart: FC<BotStatusChartProps> = ({ bots }) => {
    const online = bots.filter(b => b.status === 'online').length
    const offline = bots.filter(b => b.status === 'offline').length
    const error = bots.filter(b => b.status === 'error').length
    const total = bots.length

    if (total === 0) {
        return (
            <div class="empty-state">
                <span class="empty-icon">🤖</span>
                <h3>Nenhum bot configurado</h3>
                <p>Adicione um bot para ver as estatísticas</p>
            </div>
        )
    }

    const onlinePercent = Math.round((online / total) * 100)
    const offlinePercent = Math.round((offline / total) * 100)
    const errorPercent = Math.round((error / total) * 100)

    return (
        <div class="bot-status-chart">
            <div class="chart-header">
                <h3>Status dos Bots</h3>
                <span class="total-badge">{total} bots</span>
            </div>

            <div class="status-bar">
                {online > 0 && (
                    <div
                        class="status-segment online"
                        style={`width: ${onlinePercent}%`}
                        title={`Online: ${online}`}
                    />
                )}
                {offline > 0 && (
                    <div
                        class="status-segment offline"
                        style={`width: ${offlinePercent}%`}
                        title={`Offline: ${offline}`}
                    />
                )}
                {error > 0 && (
                    <div
                        class="status-segment error"
                        style={`width: ${errorPercent}%`}
                        title={`Error: ${error}`}
                    />
                )}
            </div>

            <div class="status-legend">
                <div class="legend-item">
                    <span class="legend-dot online" />
                    <span class="legend-label">Online</span>
                    <span class="legend-value">{online} ({onlinePercent}%)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot offline" />
                    <span class="legend-label">Offline</span>
                    <span class="legend-value">{offline} ({offlinePercent}%)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot error" />
                    <span class="legend-label">Erro</span>
                    <span class="legend-value">{error} ({errorPercent}%)</span>
                </div>
            </div>

            <div class="bots-list">
                {bots.map(bot => (
                    <div key={bot.botId} class={`bot-item ${bot.status}`}>
                        <div class="bot-info">
                            <span class="bot-name">{bot.botName}</span>
                            <span class="bot-provider">{bot.provider === 'telegram' ? '📱' : '💬'} {bot.provider}</span>
                        </div>
                        <div class="bot-stats">
                            <span class="stat">
                                <strong>{bot.totalFlows}</strong> fluxos
                            </span>
                            <span class="stat">
                                <strong>{bot.totalUsers}</strong> usuários
                            </span>
                        </div>
                        <span class={`bot-status-badge ${bot.status}`}>
                            {bot.status === 'online' ? '🟢' : bot.status === 'error' ? '🔴' : '⚫'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
