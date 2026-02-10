
export interface DbCheckBlueprintActiveProps {
    db: D1Database
    botId: string
    blueprintId: string
}

/**
 * Checks if a blueprint is explicitly active for a bot.
 * Returns true ONLY if record exists and is_active = 1.
 */
export async function dbCheckBlueprintActive({
    db,
    botId,
    blueprintId
}: DbCheckBlueprintActiveProps): Promise<boolean> {
    try {
        const row = await db.prepare(
            `SELECT is_active FROM bot_blueprints WHERE bot_id = ? AND blueprint_id = ?`
        ).bind(botId, blueprintId).first<{ is_active: number }>()

        // Default to INACTIVE if no record found (user must explicitly enable)
        // Or should we default to active if not found? 
        // The prompt implementation plan said "Default to inactive". 
        // But existing bots... might break?
        // Let's stick to strict: Must exist and be 1.
        return row?.is_active === 1
    } catch (error) {
        console.error('Error checking blueprint activation:', error)
        return false // Fail safe
    }
}
