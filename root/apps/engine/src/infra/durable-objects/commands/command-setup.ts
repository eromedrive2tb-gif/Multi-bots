/**
 * COMMAND SETUP (Composition Root)
 * Wires up all Command Handlers to the Command Registry.
 * Called once during DO initialization.
 * 
 * Mirrors the pattern from registry-setup.ts used by the Engine.
 */

import { registerCommand } from './command-registry'

// Handlers
import { fetchAnalytics, clearAnalytics } from './handlers/analytics.handler'
import { fetchBlueprints, fetchBlueprint, saveBlueprint } from './handlers/blueprints.handler'
import { fetchBots } from './handlers/bots.handler'
import {
    fetchBroadcasts, sendBroadcast, createCampaign, activateCampaign,
    fetchCampaigns, pauseCampaign, deleteCampaign, fetchRecipients
} from './handlers/broadcasts.handler'
import { fetchCustomers } from './handlers/customers.handler'
import { fetchGateways, saveGateway, deleteGateway } from './handlers/gateways.handler'
import {
    fetchGroups, fetchGroup, saveVipGroup, deleteVipGroup,
    syncGroups, syncGroupMembers, fetchGroupMembers
} from './handlers/groups.handler'
import { fetchPages, savePageHandler } from './handlers/pages.handler'
import {
    fetchPaymentsSummary, fetchPlans, createPlan, deletePlan, fetchTransactions
} from './handlers/payments.handler'
import { updateProfile, updatePassword, fetchMe, logout } from './handlers/profile.handler'
import { fetchRedirects, fetchRedirectStats } from './handlers/redirects.handler'

// ============================================
// SETUP
// ============================================

let isSetup = false

export function setupCommandRegistry(): void {
    if (isSetup) return
    isSetup = true

    // Analytics
    registerCommand('FETCH_ANALYTICS', fetchAnalytics)
    registerCommand('CLEAR_ANALYTICS', clearAnalytics)

    // Blueprints
    registerCommand('FETCH_BLUEPRINTS', fetchBlueprints)
    registerCommand('FETCH_BLUEPRINT', fetchBlueprint)
    registerCommand('SAVE_BLUEPRINT', saveBlueprint)

    // Bots
    registerCommand('FETCH_BOTS', fetchBots)

    // Broadcasts & Campaigns
    registerCommand('FETCH_BROADCASTS', fetchBroadcasts)
    registerCommand('SEND_BROADCAST', sendBroadcast)
    registerCommand('CREATE_CAMPAIGN', createCampaign)
    registerCommand('ACTIVATE_CAMPAIGN', activateCampaign)
    registerCommand('FETCH_CAMPAIGNS', fetchCampaigns)
    registerCommand('PAUSE_CAMPAIGN', pauseCampaign)
    registerCommand('DELETE_CAMPAIGN', deleteCampaign)
    registerCommand('FETCH_RECIPIENTS', fetchRecipients)

    // Customers
    registerCommand('FETCH_CUSTOMERS', fetchCustomers)

    // Gateways
    registerCommand('FETCH_GATEWAYS', fetchGateways)
    registerCommand('SAVE_GATEWAY', saveGateway)
    registerCommand('ADD_GATEWAY', saveGateway)  // Alias
    registerCommand('DELETE_GATEWAY', deleteGateway)

    // Groups
    registerCommand('FETCH_GROUPS', fetchGroups)
    registerCommand('FETCH_GROUP', fetchGroup)
    registerCommand('CREATE_GROUP', saveVipGroup)
    registerCommand('SAVE_VIP_GROUP', saveVipGroup)  // Alias
    registerCommand('DELETE_GROUP', deleteVipGroup)
    registerCommand('DELETE_VIP_GROUP', deleteVipGroup)  // Alias
    registerCommand('SYNC_GROUPS', syncGroups)
    registerCommand('SYNC_GROUP_MEMBERS', syncGroupMembers)
    registerCommand('FETCH_GROUP_MEMBERS', fetchGroupMembers)

    // Pages
    registerCommand('FETCH_PAGES', fetchPages)
    registerCommand('SAVE_PAGE', savePageHandler)

    // Payments
    registerCommand('FETCH_PAYMENTS_SUMMARY', fetchPaymentsSummary)
    registerCommand('FETCH_PAYMENTS_PLANS', fetchPlans)  // Alias
    registerCommand('FETCH_PLANS', fetchPlans)
    registerCommand('CREATE_PLAN', createPlan)
    registerCommand('ADD_PLAN', createPlan)  // Alias
    registerCommand('DELETE_PLAN', deletePlan)
    registerCommand('FETCH_PAYMENTS_TRANSACTIONS', fetchTransactions)  // Alias
    registerCommand('FETCH_TRANSACTIONS', fetchTransactions)

    // Profile & Auth
    registerCommand('UPDATE_PROFILE', updateProfile)
    registerCommand('UPDATE_PASSWORD', updatePassword)
    registerCommand('FETCH_ME', fetchMe)
    registerCommand('LOGOUT', logout)

    // Redirects
    registerCommand('FETCH_REDIRECTS', fetchRedirects)
    registerCommand('FETCH_RED_STATS', fetchRedirectStats)

    console.log('[CommandRegistry] All commands registered.')
}
