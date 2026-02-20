/** @jsxImportSource react */
import React from 'react'
import { Bot, Smartphone, MessageSquare, Circle, CheckCircle2, AlertCircle } from 'lucide-react'
import type { BotMetric } from '../../../../../engine/src/core/analytics-types'

interface BotStatusChartProps {
    bots: BotMetric[]
}

export const BotStatusChart: React.FC<BotStatusChartProps> = ({ bots }) => {
    const online = bots.filter(b => b.status === 'online').length
    const offline = bots.filter(b => b.status === 'offline').length
    const error = bots.filter(b => b.status === 'error').length
    const total = bots.length

    if (total === 0) {
        return (
            <div className="empty-state flex flex-col items-center gap-2 text-slate-400">
                <span className="empty-icon text-cyan-400"><Bot size={32} /></span>
                <h3 className="text-white">Nenhum bot configurado</h3>
                <p>Adicione um bot para ver as estatísticas</p>
            </div>
        )
    }

    const onlinePercent = Math.round((online / total) * 100)
    const offlinePercent = Math.round((offline / total) * 100)
    const errorPercent = Math.round((error / total) * 100)

    return (
        <div className="bot-status-chart">
            <div className="chart-header">
                <h3>Status dos Bots</h3>
                <span className="total-badge">{total} bots</span>
            </div>

            <div className="status-bar">
                {online > 0 && (
                    <div
                        className="status-segment online"
                        style={{ width: `${onlinePercent}%` }}
                        title={`Online: ${online}`}
                    />
                )}
                {offline > 0 && (
                    <div
                        className="status-segment offline"
                        style={{ width: `${offlinePercent}%` }}
                        title={`Offline: ${offline}`}
                    />
                )}
                {error > 0 && (
                    <div
                        className="status-segment error"
                        style={{ width: `${errorPercent}%` }}
                        title={`Error: ${error}`}
                    />
                )}
            </div>

            <div className="status-legend">
                <div className="legend-item">
                    <span className="legend-dot online" />
                    <span className="legend-label">Online</span>
                    <span className="legend-value">{online} ({onlinePercent}%)</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot offline" />
                    <span className="legend-label">Offline</span>
                    <span className="legend-value">{offline} ({offlinePercent}%)</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot error" />
                    <span className="legend-label">Erro</span>
                    <span className="legend-value">{error} ({errorPercent}%)</span>
                </div>
            </div>

            <div className="bots-list">
                {bots.map(bot => (
                    <div key={bot.botId} className={`bot-item ${bot.status}`}>
                        <div className="bot-info flex items-center gap-2">
                            <span className="bot-name text-white font-bold">{bot.botName}</span>
                            <span className="bot-provider text-xs text-slate-400 flex items-center gap-1">
                                {bot.provider === 'telegram' ? <Smartphone size={14} className="text-cyan-400" /> : <MessageSquare size={14} className="text-emerald-400" />} {bot.provider}
                            </span>
                        </div>
                        <div className="bot-stats">
                            <span className="stat">
                                <strong>{bot.totalFlows}</strong> fluxos
                            </span>
                            <span className="stat">
                                <strong>{bot.totalUsers}</strong> usuários
                            </span>
                        </div>
                        <span className={`bot-status-badge ${bot.status} flex items-center`}>
                            {bot.status === 'online' ? <CheckCircle2 size={16} className="text-emerald-400" /> : bot.status === 'error' ? <AlertCircle size={16} className="text-rose-400" /> : <Circle size={16} className="text-slate-500" />}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
