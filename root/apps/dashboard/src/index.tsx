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
import { pagesRoutes } from './routes/pages.routes'
import { getPage } from '../../engine/src/lib/molecules/kv-page-manager'
import { WebAppPage } from '../../engine/src/core/types'

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
app.route('/', pagesRoutes)

// ============================================
// PUBLIC WEBAPP VIEW ROUTE
// ============================================

app.get('/view/:tenantId/:pageId', async (c) => {
  const { tenantId, pageId } = c.req.param()

  // Fetch page from KV
  const result = await getPage(c.env, tenantId, pageId)

  if (!result.success) {
    return c.html('<h1>Página não encontrada</h1>', 404)
  }

  const page = result.data as WebAppPage

  // Construct the HTML document
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.name}</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        /* Reset basico */
        body { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        
        /* Custom CSS */
        ${page.css}
    </style>
</head>
<body>
    ${page.html}

    <script type="module">
        // Initialize Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
        }

        // Custom JS
        ${page.js}
    </script>
</body>
</html>
    `

  return c.html(html)
})

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
// Force Rebuild Trigger: 1
