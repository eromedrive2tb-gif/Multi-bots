/**
 * Database Atoms - Barrel Export
 */

export { dbSaveBot, type DbSaveBotProps } from './db-save-bot'
export { dbGetBots, dbGetBotById, type DbGetBotsProps } from './db-get-bots'
export { dbUpdateBotStatus, type DbUpdateBotStatusProps } from './db-update-bot-status'
export { dbDeleteBot, type DbDeleteBotProps } from './db-delete-bot'
export { dbDeleteBotEvents, type DbDeleteBotEventsProps } from './db-delete-bot-events'

// Blueprint atoms
export { dbSaveBlueprint, type DbSaveBlueprintProps } from './db-save-blueprint'
export { dbDeleteBlueprint, type DbDeleteBlueprintProps } from './db-delete-blueprint'
export {
    dbGetBlueprints,
    dbGetBlueprintById,
    dbGetBlueprintByTrigger,
    type DbGetBlueprintsProps,
    type BlueprintListItem
} from './db-get-blueprints'
// Bot-Blueprint Activation
export { dbGetBotBlueprints, dbToggleBotBlueprint, type BotBlueprintStatus } from './db-bot-blueprints'
export { dbCheckBlueprintActive, type DbCheckBlueprintActiveProps } from './db-check-blueprint-active'

// Auth atoms
export * from './auth'

// Analytics atoms
export * from './db-log-analytics'
export * from './db-get-analytics'
export * from './db-clear-analytics'

// CRM (Customer) atoms
export * from './db-upsert-customer'
export * from './db-get-customers'
export * from './db-get-customer-by-id'
export * from './db-delete-customer'
export * from './db-clear-customers'
export * from './db-log-customer-history'
export * from './db-get-customer-history'
