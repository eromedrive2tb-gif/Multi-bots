/**
 * Database Atoms - Barrel Export
 */

export { dbSaveBot, type DbSaveBotProps } from './db-save-bot'
export { dbGetBots, dbGetBotById, type DbGetBotsProps } from './db-get-bots'
export { dbUpdateBotStatus, type DbUpdateBotStatusProps } from './db-update-bot-status'
export { dbDeleteBot, type DbDeleteBotProps } from './db-delete-bot'
export { dbCleanupBotRecords, type DbCleanupBotRecordsProps } from './db-cleanup-bot-records'

// Auth atoms
export * from './auth'


// Blueprint atoms
export { dbSaveBlueprint, type DbSaveBlueprintProps } from './db-save-blueprint'
// Consolidated in db-get-blueprints.ts
export { dbGetBlueprints, dbGetBlueprintById, dbGetBlueprintByTrigger, type DbGetBlueprintsProps, type DbGetBlueprintByIdProps, type DbGetBlueprintByTriggerProps } from './db-get-blueprints'
// db-list-blueprints.ts doesn't exist, removed.
export { dbDeleteBlueprint, type DbDeleteBlueprintProps } from './db-delete-blueprint'
export { dbGetBotBlueprints, dbToggleBotBlueprint } from './db-bot-blueprints'
export { dbCheckBlueprintActive } from './db-check-blueprint-active'

// Customer atoms
export { dbUpsertCustomer, type DbUpsertCustomerProps } from './db-upsert-customer'
export { dbGetCustomers, type DbGetCustomersProps } from './db-get-customers'
export { dbGetCustomerById, type DbGetCustomerByIdProps } from './db-get-customer-by-id'
export { dbGetCustomerByExternalId, type DbGetCustomerByExternalIdProps } from './db-get-customer-by-external-id' // New
export { dbDeleteCustomer, type DbDeleteCustomerProps } from './db-delete-customer'
export { dbGetCustomerHistory, type DbGetCustomerHistoryProps } from './db-get-customer-history'
export { dbLogCustomerHistory, type DbLogCustomerHistoryProps } from './db-log-customer-history'
export { dbClearCustomers, type DbClearCustomersProps } from './db-clear-customers'


// Payment atoms
export { dbSaveGateway, type DbSaveGatewayProps } from './db-save-gateway'
export { dbGetGateways, type DbGetGatewaysProps } from './db-get-gateways'
export { dbDeleteGateway, type DbDeleteGatewayProps } from './db-delete-gateway'
export { dbSavePlan, type DbSavePlanProps } from './db-save-plan'
export { dbGetPlans, type DbGetPlansProps } from './db-get-plans'
export { dbDeletePlan, type DbDeletePlanProps } from './db-delete-plan'
export { dbGetTransactions, dbGetFinancialSummary, type DbGetTransactionsProps } from './db-get-transactions'
export { dbSaveTransaction, type DbSaveTransactionProps } from './db-save-transaction'
export { dbUpdateTransaction, type DbUpdateTransactionProps } from './db-update-transaction'

// Redirect atoms
export { dbGetRedirects, dbGetRedirectStats, dbTrackClick, dbSaveRedirect, dbUpdateRedirect, dbDeleteRedirect, dbGetRedirectBySlug } from './db-redirects'

// Groups Atoms
export { dbGetVipGroups, type DbGetVipGroupsProps } from './db-get-vip-groups'
export { dbSaveVipGroup, type DbSaveVipGroupProps } from './db-save-vip-group'
export { dbGetVipGroupById, type DbGetVipGroupByIdProps } from './db-get-vip-group-by-id'
export { dbDeleteVipGroup, type DbDeleteVipGroupProps } from './db-delete-vip-group'
export { dbSaveVipGroupMember, type DbSaveVipGroupMemberProps } from '../groups/db-save-vip-group-member'
export { dbGetVipGroupMembers, type DbGetVipGroupMembersProps } from '../groups/db-get-vip-group-members'
export { dbUpdateVipGroupMemberStatus, type DbUpdateVipGroupMemberStatusProps } from '../groups/db-update-vip-group-member-status'

// Analytics
export { dbGetOverviewMetrics, dbGetBlueprintMetrics, dbGetBotMetrics, dbGetStepMetrics } from './db-get-analytics'
export { dbLogAnalyticsEvent } from './db-log-analytics'
export { dbClearAnalytics } from './db-clear-analytics'

// Remarketing
export { dbSaveCampaign, dbGetCampaigns, dbUpdateCampaignStatus, dbDeleteCampaign } from './db-remarketing'
export { dbSaveBroadcast } from './db-save-broadcast'
export { dbGetBroadcasts, dbUpdateBroadcastStatus, dbDeleteBroadcast } from './db-get-broadcasts'
export { dbPopulateCampaignRecipients, type DbPopulateCampaignRecipientsProps } from './db-populate-campaign-recipients'
export { dbGetCampaignRecipients, type DbGetCampaignRecipientsProps } from './db-get-campaign-recipients'
