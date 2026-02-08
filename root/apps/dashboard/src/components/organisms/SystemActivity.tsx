/** @jsxImportSource react */
import React from 'react'
import { Card, CardHeader, CardBody } from '../atoms/Card'
import type { OverviewMetrics } from '../../core/analytics-types'

interface SystemActivityProps {
    overview: OverviewMetrics
}

export const SystemActivity: React.FC<SystemActivityProps> = ({ overview }) => {
    return (
        <Card className="system-activity-card">
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
            <style>{`
                .activity-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                
                .activity-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 0;
                }
                
                .activity-icon {
                    font-size: 1.25rem;
                }
                
                .activity-text {
                    color: var(--text-secondary);
                    font-size: 0.9375rem;
                }
            `}</style>
        </Card>
    )
}
