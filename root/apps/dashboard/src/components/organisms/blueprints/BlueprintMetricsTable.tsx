/** @jsxImportSource react */
import React from 'react'
import type { BlueprintMetric } from '../../../core/analytics-types'

interface BlueprintMetricsTableProps {
    blueprints: BlueprintMetric[]
}

export const BlueprintMetricsTable: React.FC<BlueprintMetricsTableProps> = ({ blueprints }) => {
    if (blueprints.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-icon">📋</span>
                <h3>Nenhum blueprint encontrado</h3>
                <p>Crie seu primeiro blueprint para ver as métricas</p>
            </div>
        )
    }

    return (
        <div className="metrics-table-container">
            <table className="metrics-table">
                <thead>
                    <tr>
                        <th>Blueprint</th>
                        <th>Trigger</th>
                        <th>Status</th>
                        <th>Execuções</th>
                        <th>Completos</th>
                        <th>Conversão</th>
                        <th>Erros</th>
                    </tr>
                </thead>
                <tbody>
                    {blueprints.map(bp => (
                        <tr key={bp.blueprintId}>
                            <td className="blueprint-name">
                                <span className="name">{bp.blueprintName}</span>
                            </td>
                            <td>
                                <code className="trigger-badge">{bp.trigger}</code>
                            </td>
                            <td>
                                <span className={`status-badge ${bp.isActive ? 'status-active' : 'status-inactive'}`}>
                                    {bp.isActive ? '🟢 Ativo' : '⚫ Inativo'}
                                </span>
                            </td>
                            <td className="metric-value">{bp.flowStarts}</td>
                            <td className="metric-value">{bp.flowCompletions}</td>
                            <td>
                                <div className="conversion-cell">
                                    <span className={`conversion-value ${bp.completionRate >= 50 ? 'good' : bp.completionRate >= 25 ? 'medium' : 'low'}`}>
                                        {bp.completionRate}%
                                    </span>
                                    <div className="conversion-bar">
                                        <div
                                            className={`conversion-fill ${bp.completionRate >= 50 ? 'good' : bp.completionRate >= 25 ? 'medium' : 'low'}`}
                                            style={{ width: `${bp.completionRate}%` }}
                                        />
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span className={`error-count ${bp.totalErrors > 0 ? 'has-errors' : ''}`}>
                                    {bp.totalErrors}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
