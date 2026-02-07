/**
 * MAIN APPLICATION ENTRY POINT
 * Follows SRP - Only app setup and route registration
 * All route handlers are in /routes directory
 */

import { Hono } from 'hono'
import { renderer } from './renderer'
import type { Env } from './core/types'
import { authMiddleware } from './middleware/auth'
import { registerRoutes } from './routes'

// Dashboard Pages (protected routes only - auth handled in routes)
import { DashboardPage } from './pages/dashboard'
import { SettingsPage } from './pages/settings'

// ============================================
// APP INITIALIZATION
// ============================================

const app = new Hono<{ Bindings: Env }>()

// Apply renderer middleware
app.use(renderer)

// ============================================
// REGISTER ALL ROUTES
// ============================================

registerRoutes(app)

// ============================================
// CORE PROTECTED ROUTES
// ============================================

// Home redirect
app.get('/', async (c) => {
  return c.redirect('/login')
})

// Dashboard
app.get('/dashboard', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  return c.render(
    <DashboardPage
      user={tenant.user}
      tenantId={tenant.tenantId}
    />
  )
})

// Settings
app.get('/dashboard/settings', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  return c.render(
    <SettingsPage
      user={tenant.user}
      tenantId={tenant.tenantId}
    />
  )
})

// ============================================
// STATIC ASSETS
// ============================================

// Serve client-side JavaScript
app.get('/assets/*', async (c) => {
  // In production, assets would be served by Cloudflare's static assets
  // For local dev, we rely on Vite
  return c.text('Static asset', 200)
})

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
