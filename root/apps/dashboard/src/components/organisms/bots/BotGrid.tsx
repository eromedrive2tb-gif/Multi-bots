/** @jsxImportSource react */
import React from 'react'
import { BotCard } from '../../molecules/bots/BotCard'
import type { Bot } from '../../../../../engine/src/core/types'

interface BotGridProps {
    bots: Bot[]
    isLoading: boolean
    onUpdate: () => void
}

export const BotGrid: React.FC<BotGridProps> = ({ bots, isLoading, onUpdate }) => {
    if (isLoading) {
        return <div className="empty-state">Carregando bots...</div>
    }

    if (bots.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-icon">🤖</span>
                <h3>Nenhum bot configurado</h3>
                <p>Adicione seu primeiro bot para começar</p>
            </div>
        )
    }

    return (
        <div className="bots-grid">
            {bots.map(bot => (
                <BotCard
                    key={bot.id}
                    bot={bot}
                    onUpdate={onUpdate}
                />
            ))}

            <style>{`
                .bots-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 20px;
                }

                .empty-state {
                    text-align: center;
                    padding: 60px 40px;
                    color: var(--text-secondary);
                    background: var(--card-bg);
                    border-radius: 12px;
                    border: 1px dashed var(--border-color);
                    grid-column: 1 / -1;
                }
                
                .empty-icon {
                    font-size: 3.5rem;
                    display: block;
                    margin-bottom: 20px;
                }

                .empty-state h3 {
                    margin-bottom: 8px;
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    )
}
