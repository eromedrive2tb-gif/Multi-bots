
import type { Result } from '../../../core/types'

export interface BotBlueprintStatus {
    blueprintId: string
    botId: string
    isActive: boolean
}

interface DbGetBotBlueprintsParams {
    db: D1Database
    botId: string
}

export async function dbGetBotBlueprints(params: DbGetBotBlueprintsParams): Promise<Result<BotBlueprintStatus[]>> {
    try {
        const { results } = await params.db.prepare(
            `SELECT blueprint_id, bot_id, is_active FROM bot_blueprints WHERE bot_id = ?`
        ).bind(params.botId).all()

        const data: BotBlueprintStatus[] = results.map((r: any) => ({
            blueprintId: r.blueprint_id,
            botId: r.bot_id,
            isActive: Boolean(r.is_active)
        }))

        return { success: true, data }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro ao listar blueprints do bot' }
    }
}

interface DbToggleBotBlueprintParams {
    db: D1Database
    botId: string
    blueprintId: string
    isActive: boolean
}

export async function dbToggleBotBlueprint(params: DbToggleBotBlueprintParams): Promise<Result<boolean>> {
    try {
        const now = new Date().toISOString()

        // Upsert logic: If exists update, if not insert
        await params.db.prepare(
            `INSERT INTO bot_blueprints (bot_id, blueprint_id, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(bot_id, blueprint_id) DO UPDATE SET
             is_active = excluded.is_active,
             updated_at = excluded.updated_at`
        ).bind(
            params.botId,
            params.blueprintId,
            params.isActive ? 1 : 0,
            now,
            now
        ).run()

        return { success: true, data: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar status do blueprint' }
    }
}
