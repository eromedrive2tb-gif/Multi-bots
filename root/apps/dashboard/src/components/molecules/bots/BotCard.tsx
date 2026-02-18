/** @jsxImportSource react */
import React, { useState } from 'react'
import { useSocket } from '../../../client/context/SocketContext'
import { Card, CardHeader, CardBody } from '../../atoms/ui/Card'
import { Button } from '../../atoms/ui/Button'
import { StatusBadge, ProviderBadge } from '../../atoms/ui/StatusBadge'
import { BotBlueprintsModal } from '../../organisms/blueprints/BotBlueprintsModal'
import type { Bot } from '../../../../../engine/src/core/types'

interface BotCardProps {
    bot: Bot
    onUpdate?: () => void
}

export const BotCard: React.FC<BotCardProps> = ({ bot, onUpdate }) => {
    const { request } = useSocket()
    const [loading, setLoading] = useState(false)
    const [showBlueprintsModal, setShowBlueprintsModal] = useState(false)

    const lastCheckFormatted = bot.lastCheck
        ? new Date(bot.lastCheck).toLocaleString('pt-BR')
        : 'Nunca verificado'

    const handleAction = async (action: 'check' | 'delete' | 'sync') => {
        if (action === 'delete' && !confirm('Tem certeza que deseja remover este bot?')) return

        setLoading(true)
        try {
            const socketAction = action === 'check' ? 'CHECK_BOT_HEALTH' :
                action === 'delete' ? 'DELETE_BOT' : 'SYNC_BOT_COMMANDS'

            await request(socketAction, { id: bot.id })

            if (action === 'sync') {
                alert('Comandos sincronizados com sucesso!')
            } else if (onUpdate) {
                onUpdate()
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Erro de conexão')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="bot-card">
            <CardHeader>
                <div className="bot-card-header">
                    <div className="bot-info">
                        <h3 className="bot-name">{bot.name}</h3>
                        <div className="bot-badges">
                            <ProviderBadge provider={bot.provider} />
                            <StatusBadge status={bot.status} />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardBody>
                <div className="bot-details">
                    <div className="bot-detail-row">
                        <span className="detail-label">ID</span>
                        <code className="detail-value">{bot.id.slice(0, 8)}...</code>
                    </div>
                    <div className="bot-detail-row">
                        <span className="detail-label">Última verificação</span>
                        <span className="detail-value">{lastCheckFormatted}</span>
                    </div>
                    {bot.statusMessage && (
                        <div className="bot-detail-row">
                            <span className="detail-label">Status</span>
                            <span className="detail-value detail-status">{bot.statusMessage}</span>
                        </div>
                    )}
                </div>

                <div className="bot-actions">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAction('check')}
                        disabled={loading}
                    >
                        🔄 {loading ? '...' : 'Verificar'}
                    </Button>

                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowBlueprintsModal(true)}
                        disabled={loading}
                    >
                        ⚡ {loading ? '...' : 'Gerenciar Comandos'}
                    </Button>

                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleAction('delete')}
                        disabled={loading}
                    >
                        🗑️ {loading ? '...' : 'Remover'}
                    </Button>
                </div>
            </CardBody>

            <BotBlueprintsModal
                isOpen={showBlueprintsModal}
                onClose={() => setShowBlueprintsModal(false)}
                bot={bot}
            />
        </Card>
    )
}
