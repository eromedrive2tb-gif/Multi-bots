/**
 * MAIN APPLICATION ENTRY POINT
 * Follows SRP - Only app setup and route registration
 * All route handlers are in /routes directory
 */

import { Hono } from 'hono'
import { renderer } from './renderer'
import type { Env } from '../../engine/src/core/types'
import { authMiddleware } from '../../engine/src/middleware/auth'
import { registerRoutes } from '../../engine/src/routes'

// Dashboard Pages (protected routes only - auth handled in routes)
import { DashboardPage } from './pages/dashboard'
import { SettingsPage } from './pages/settings'
import { setupRegistry } from '../../engine/src/lib/molecules'

// ============================================
// APP INITIALIZATION
// ============================================

// Initialize Action Registry (DIP Composition Root)
setupRegistry()

const app = new Hono<{ Bindings: Env }>()

// Apply renderer middleware
app.use('*', renderer)

// ============================================
// REGISTER API ROUTES
// ============================================

registerRoutes(app)

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ============================================
// SPA CATCH-ALL
// ============================================

// Serves the base HTML for all other routes to allow React Router to take over
app.get('*', async (c) => {
  // If we are already in an API route but it wasn't matched, it should be a 404 JSON
  if (c.req.path.startsWith('/api/')) {
    return c.json({ success: false, error: 'API route not found' }, 404)
  }

  // Otherwise, serve the SPA shell
  return c.render(<div id="root"></div>)
})

export default app
