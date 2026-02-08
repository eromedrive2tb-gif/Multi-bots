import type { FC } from 'hono/jsx'
import type { BlueprintMetric } from '../../core/analytics-types'

interface BlueprintMetricsTableProps {
    blueprints: BlueprintMetric[]
}

export const BlueprintMetricsTable: FC<BlueprintMetricsTableProps> = ({ blueprints }) => {
    if (blueprints.length === 0) {
        return (
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <h3>Nenhum blueprint encontrado</h3>
                <p>Crie seu primeiro blueprint para ver as métricas</p>
            </div>
        )
    }

    return (
        <div class="metrics-table-container">
            <table class="metrics-table">
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
                            <td class="blueprint-name">
                                <span class="name">{bp.blueprintName}</span>
                            </td>
                            <td>
                                <code class="trigger-badge">{bp.trigger}</code>
                            </td>
                            <td>
                                <span class={`status-badge ${bp.isActive ? 'status-active' : 'status-inactive'}`}>
                                    {bp.isActive ? '🟢 Ativo' : '⚫ Inativo'}
                                </span>
                            </td>
                            <td class="metric-value">{bp.flowStarts}</td>
                            <td class="metric-value">{bp.flowCompletions}</td>
                            <td>
                                <div class="conversion-cell">
                                    <span class={`conversion-value ${bp.completionRate >= 50 ? 'good' : bp.completionRate >= 25 ? 'medium' : 'low'}`}>
                                        {bp.completionRate}%
                                    </span>
                                    <div class="conversion-bar">
                                        <div
                                            class={`conversion-fill ${bp.completionRate >= 50 ? 'good' : bp.completionRate >= 25 ? 'medium' : 'low'}`}
                                            style={`width: ${bp.completionRate}%`}
                                        />
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class={`error-count ${bp.totalErrors > 0 ? 'has-errors' : ''}`}>
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
