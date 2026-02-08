/** @jsxImportSource react */
import React from 'react'

interface BotStatsProps {
    total: number
    online: number
}

export const BotStats: React.FC<BotStatsProps> = ({ total, online }) => {
    return (
        <div className="bots-stats">
            <div className="stat-item">
                <span className="stat-value">{total}</span>
                <span className="stat-label">Total de Bots</span>
            </div>
            <div className="stat-item">
                <span className="stat-value stat-online">{online}</span>
                <span className="stat-label">Online</span>
            </div>
            <div className="stat-item">
                <span className="stat-value stat-offline">{total - online}</span>
                <span className="stat-label">Offline/Erro</span>
            </div>

            <style>{`
                .bots-stats {
                    display: flex;
                    gap: 32px;
                    background: var(--card-bg);
                    padding: 24px;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    margin-bottom: 24px;
                }
                
                .stat-item {
                    display: flex;
                    flex-direction: column;
                }
                
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                
                .stat-online {
                    color: #10b981;
                }
                
                .stat-offline {
                    color: #ef4444;
                }
                
                .stat-label {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
            `}</style>
        </div>
    )
}
