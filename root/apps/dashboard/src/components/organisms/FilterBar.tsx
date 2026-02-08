import type { FC } from 'hono/jsx'
import type { AnalyticsFilterParams } from '../../core/analytics-types'
import type { BlueprintMetric } from '../../core/analytics-types'
import type { BotMetric } from '../../core/analytics-types'
import { ClearMetricsButton } from '../molecules/ClearMetricsButton'

interface FilterBarProps {
    bots: BotMetric[]
    blueprints: BlueprintMetric[]
    currentFilters: AnalyticsFilterParams
}

export const FilterBar: FC<FilterBarProps> = ({ bots, blueprints, currentFilters }) => {
    return (
        <form method="get" action="/dashboard/analytics" class="filter-bar">
            <div class="filter-group">
                <label for="botId">Bot</label>
                <select name="botId" id="botId" class="filter-select">
                    <option value="">Todos os Bots</option>
                    {bots.map(bot => (
                        <option
                            value={bot.botId}
                            selected={currentFilters.botId === bot.botId}
                        >
                            {bot.botName} ({bot.provider})
                        </option>
                    ))}
                </select>
            </div>

            <div class="filter-group">
                <label for="blueprintId">Blueprint</label>
                <select name="blueprintId" id="blueprintId" class="filter-select">
                    <option value="">Todas os Blueprints</option>
                    {blueprints.map(bp => (
                        <option
                            value={bp.blueprintId}
                            selected={currentFilters.blueprintId === bp.blueprintId}
                        >
                            {bp.blueprintName} ({bp.trigger})
                        </option>
                    ))}
                </select>
            </div>

            <div class="filter-group">
                <label for="status">Status</label>
                <select name="status" id="status" class="filter-select">
                    <option value="all" selected={currentFilters.status === 'all'}>Todos</option>
                    <option value="active" selected={currentFilters.status === 'active'}>Ativos</option>
                    <option value="inactive" selected={currentFilters.status === 'inactive'}>Inativos</option>
                </select>
            </div>

            <div class="filter-group">
                <label for="dateFrom">De</label>
                <input
                    type="date"
                    name="dateFrom"
                    id="dateFrom"
                    class="filter-input"
                    value={currentFilters.dateFrom || ''}
                />
            </div>

            <div class="filter-group">
                <label for="dateTo">Até</label>
                <input
                    type="date"
                    name="dateTo"
                    id="dateTo"
                    class="filter-input"
                    value={currentFilters.dateTo || ''}
                />
            </div>

            <button type="submit" class="btn btn-primary filter-btn">
                🔍 Filtrar
            </button>

            <div class="filter-separator" style="border-left: 1px solid var(--color-border); height: 2rem; margin: 0 var(--space-sm);"></div>

            <ClearMetricsButton />
        </form>
    )
}
