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
}

// Export individual routes for testing
export { authRoutes, botsRoutes, blueprintsRoutes, webhooksRoutes, analyticsRoutes }
