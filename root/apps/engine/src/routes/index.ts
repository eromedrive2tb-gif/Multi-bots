/**
 * ROUTES INDEX
 * Centralizes all route modules for easy import
 * Implements route composition pattern
 */

import { Hono } from 'hono'
import type { Env } from '../core/types'
import { authRoutes } from './auth.routes'
import { botsRoutes } from './bots.routes'
import { blueprintsRoutes } from './blueprints.routes'
import { webhooksRoutes } from './webhooks.routes'
import { analyticsRoutes } from './analytics.routes'
import { customersRoutes } from './customers.routes'
import { paymentsRoutes } from './payments.routes'
import { paymentWebhooksRoutes } from './webhooks-payment.routes'
import { broadcastRoutes } from './broadcasts.routes'
import { redirectRoutes } from './redirects.routes'
import { vipGroupsRoutes } from './vip-groups.routes'
import remarketingRoutes from '../features/remarketing/interface/RemarketingController'
import { webappsController } from '../features/dynamic-webapps'

/**
 * Registers all route modules on the main app
 */
export function registerRoutes(app: Hono<{ Bindings: Env }>) {
    // Mount all routes directly on the app
    // Each route file handles its own path prefixes
    app.route('/', authRoutes)
    app.route('/', botsRoutes)
    app.route('/', blueprintsRoutes)
    app.route('/', webhooksRoutes)
    app.route('/', analyticsRoutes)
    app.route('/', customersRoutes)
    app.route('/', paymentsRoutes)
    app.route('/', paymentWebhooksRoutes)
    app.route('/', broadcastRoutes)
    app.route('/', redirectRoutes)
    app.route('/', vipGroupsRoutes)
    app.route('/', remarketingRoutes)
    app.route('/', webappsController)
}

// Export individual routes for testing
export { authRoutes, botsRoutes, blueprintsRoutes, webhooksRoutes, analyticsRoutes, customersRoutes, paymentsRoutes, paymentWebhooksRoutes, broadcastRoutes, redirectRoutes, vipGroupsRoutes }
