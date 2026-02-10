/** @jsxImportSource react */
import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { AnalyticsFilterParams, BlueprintMetric, BotMetric } from '../../../core/analytics-types'
import { ClearMetricsButton } from '../../molecules/analytics/ClearMetricsButton'

interface FilterBarProps {
    bots: BotMetric[]
    blueprints: BlueprintMetric[]
    currentFilters: AnalyticsFilterParams
}

export const FilterBar: React.FC<FilterBarProps> = ({ bots, blueprints, currentFilters }) => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [botId, setBotId] = useState(currentFilters.botId || '')
    const [blueprintId, setBlueprintId] = useState(currentFilters.blueprintId || '')
    const [status, setStatus] = useState(currentFilters.status || 'all')
    const [dateFrom, setDateFrom] = useState(currentFilters.dateFrom || '')
    const [dateTo, setDateTo] = useState(currentFilters.dateTo || '')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (botId) params.set('botId', botId)
        if (blueprintId) params.set('blueprintId', blueprintId)
        if (status !== 'all') params.set('status', status)
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)

        navigate(`/dashboard/analytics?${params.toString()}`)
    }

    return (
        <form onSubmit={handleSubmit} className="filter-bar">
            <div className="filter-group">
                <label htmlFor="botId">Bot</label>
                <select
                    name="botId"
                    id="botId"
                    className="filter-select"
                    value={botId}
                    onChange={(e) => setBotId(e.target.value)}
                >
                    <option value="">Todos os Bots</option>
                    {bots.map(bot => (
                        <option key={bot.botId} value={bot.botId}>
                            {bot.botName} ({bot.provider})
                        </option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label htmlFor="blueprintId">Blueprint</label>
                <select
                    name="blueprintId"
                    id="blueprintId"
                    className="filter-select"
                    value={blueprintId}
                    onChange={(e) => setBlueprintId(e.target.value)}
                >
                    <option value="">Todas os Blueprints</option>
                    {blueprints.map(bp => (
                        <option key={bp.blueprintId} value={bp.blueprintId}>
                            {bp.blueprintName} ({bp.trigger})
                        </option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label htmlFor="status">Status</label>
                <select
                    name="status"
                    id="status"
                    className="filter-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                </select>
            </div>

            <div className="filter-group">
                <label htmlFor="dateFrom">De</label>
                <input
                    type="date"
                    name="dateFrom"
                    id="dateFrom"
                    className="filter-input"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                />
            </div>

            <div className="filter-group">
                <label htmlFor="dateTo">Até</label>
                <input
                    type="date"
                    name="dateTo"
                    id="dateTo"
                    className="filter-input"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                />
            </div>

            <button type="submit" className="btn btn-primary filter-btn">
                🔍 Filtrar
            </button>

            <div className="filter-separator" style={{ borderLeft: '1px solid var(--color-border)', height: '2rem', margin: '0 var(--space-sm)' }}></div>

            <ClearMetricsButton />
        </form>
    )
}
