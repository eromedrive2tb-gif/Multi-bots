import type { FC } from 'hono/jsx'
import { Card, CardHeader, CardBody } from '../atoms/Card'
import { Button } from '../atoms/Button'
import { StatusBadge, ProviderBadge } from '../atoms/StatusBadge'
import type { Bot } from '../../core/types'

interface BotCardProps {
    bot: Bot
}

export const BotCard: FC<BotCardProps> = ({ bot }) => {
    const lastCheckFormatted = bot.lastCheck
        ? new Date(bot.lastCheck).toLocaleString('pt-BR')
        : 'Nunca verificado'

    return (
        <Card class="bot-card">
            <CardHeader>
                <div class="bot-card-header">
                    <div class="bot-info">
                        <h3 class="bot-name">{bot.name}</h3>
                        <div class="bot-badges">
                            <ProviderBadge provider={bot.provider} />
                            <StatusBadge status={bot.status} />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardBody>
                <div class="bot-details">
                    <div class="bot-detail-row">
                        <span class="detail-label">ID</span>
                        <code class="detail-value">{bot.id.slice(0, 8)}...</code>
                    </div>
                    <div class="bot-detail-row">
                        <span class="detail-label">Última verificação</span>
                        <span class="detail-value">{lastCheckFormatted}</span>
                    </div>
                    {bot.statusMessage && (
                        <div class="bot-detail-row">
                            <span class="detail-label">Status</span>
                            <span class="detail-value detail-status">{bot.statusMessage}</span>
                        </div>
                    )}
                </div>

                <div class="bot-actions">
                    <form method="post" action={`/api/bots/${bot.id}/check`} class="inline-form">
                        <Button type="submit" variant="secondary" size="sm">
                            🔄 Verificar
                        </Button>
                    </form>
                    <form method="post" action={`/api/bots/${bot.id}/delete`} class="inline-form">
                        <Button type="submit" variant="danger" size="sm">
                            🗑️ Remover
                        </Button>
                    </form>
                </div>
            </CardBody>
        </Card>
    )
}
