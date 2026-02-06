import { Hono } from 'hono'
import type { Context } from 'hono'
import { renderer } from './renderer'
import { getCookie } from 'hono/cookie'
import type { Env } from './core/types'
import { loginSchema, registerSchema } from './core/types'
import {
  hashPassword,
  verifyPassword,
  findUserByEmail,
  createTenant,
  createUser,
  createSession,
  findValidSession,
  findUserById,
  deleteSession
} from './lib/auth'
import { authMiddleware, setSessionCookie, clearSessionCookie } from './middleware/auth'

// Pages
import { LoginPage } from './pages/login'
import { RegisterPage } from './pages/register'
import { DashboardPage } from './pages/dashboard'
import { SettingsPage } from './pages/settings'

// Helper to get base URL from forwarded headers (for tunnels like cloudflared)
function getBaseUrl(c: Context): string {
  // Try X-Forwarded headers first (set by reverse proxies/tunnels)
  const forwardedProto = c.req.header('X-Forwarded-Proto') || 'https'
  const forwardedHost = c.req.header('X-Forwarded-Host') || c.req.header('Host')

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  // Fallback to request URL origin
  return new URL(c.req.url).origin
}

const app = new Hono<{ Bindings: Env }>()

app.use(renderer)

// ============================================
// PUBLIC ROUTES
// ============================================

// Redirect root to dashboard or login
app.get('/', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (sessionId) {
    const session = await findValidSession(c.env.DB, sessionId)
    if (session) {
      return c.redirect('/dashboard')
    }
  }
  return c.redirect('/login')
})

// Login Page
app.get('/login', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (sessionId) {
    const session = await findValidSession(c.env.DB, sessionId)
    if (session) {
      return c.redirect('/dashboard')
    }
  }
  return c.render(<LoginPage />)
})

// Register Page
app.get('/register', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (sessionId) {
    const session = await findValidSession(c.env.DB, sessionId)
    if (session) {
      return c.redirect('/dashboard')
    }
  }
  return c.render(<RegisterPage />)
})

// ============================================
// AUTH API
// ============================================

// Login
app.post('/api/auth/login', async (c) => {
  try {
    const formData = await c.req.formData()
    const email = formData.get('email')?.toString() || ''
    const password = formData.get('password')?.toString() || ''

    // Validate input
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      return c.render(<LoginPage error="Email ou senha inválidos" />)
    }

    // Find user
    const user = await findUserByEmail(c.env.DB, email)
    if (!user) {
      return c.render(<LoginPage error="Email ou senha inválidos" />)
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return c.render(<LoginPage error="Email ou senha inválidos" />)
    }

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const sessionId = await createSession(c.env.DB, user.id, user.tenantId, expiresAt)

    setSessionCookie(c, sessionId)
    return c.redirect('/dashboard')

  } catch (error) {
    console.error('Login error:', error)
    return c.render(<LoginPage error="Erro ao fazer login. Tente novamente." />)
  }
})

// Register
app.post('/api/auth/register', async (c) => {
  try {
    const formData = await c.req.formData()
    const name = formData.get('name')?.toString() || ''
    const email = formData.get('email')?.toString() || ''
    const password = formData.get('password')?.toString() || ''
    const confirmPassword = formData.get('confirmPassword')?.toString() || ''

    // Validate input
    const result = registerSchema.safeParse({ name, email, password, confirmPassword })
    if (!result.success) {
      const error = result.error.errors[0]?.message || 'Dados inválidos'
      return c.render(<RegisterPage error={error} />)
    }

    // Check if email exists
    const existingUser = await findUserByEmail(c.env.DB, email)
    if (existingUser) {
      return c.render(<RegisterPage error="Email já cadastrado" />)
    }

    // Create tenant
    const tenantId = await createTenant(c.env.DB, name, email)

    // Create user
    const passwordHash = await hashPassword(password)
    const userId = await createUser(c.env.DB, tenantId, email, name, passwordHash)

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const sessionId = await createSession(c.env.DB, userId, tenantId, expiresAt)

    setSessionCookie(c, sessionId)
    return c.redirect('/dashboard')

  } catch (error) {
    console.error('Register error:', error)
    return c.render(<RegisterPage error="Erro ao criar conta. Tente novamente." />)
  }
})

// Logout
app.post('/api/auth/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (sessionId) {
    await deleteSession(c.env.DB, sessionId)
  }
  clearSessionCookie(c)
  return c.redirect('/login')
})

// ============================================
// PROTECTED ROUTES (require auth)
// ============================================

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

// Bots Management
import { BotsPage } from './pages/bots'
import { BotManagerService } from './lib/organisms/BotManagerService'
import type { BotProvider, TelegramCredentials, DiscordCredentials } from './core/types'

app.get('/dashboard/bots', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const origin = getBaseUrl(c)
  const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
  const bots = await botManager.listBots()

  return c.render(
    <BotsPage
      user={tenant.user}
      bots={bots}
    />
  )
})

// ============================================
// BOT API ENDPOINTS
// ============================================

// Add Bot
app.post('/api/bots', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const formData = await c.req.formData()

  const name = formData.get('name')?.toString() || ''
  const provider = formData.get('provider')?.toString() as BotProvider

  let credentials: TelegramCredentials | DiscordCredentials

  if (provider === 'telegram') {
    credentials = {
      token: formData.get('telegram_token')?.toString() || '',
    }
  } else if (provider === 'discord') {
    credentials = {
      applicationId: formData.get('discord_application_id')?.toString() || '',
      publicKey: formData.get('discord_public_key')?.toString() || '',
      token: formData.get('discord_token')?.toString() || '',
    }
  } else {
    return c.redirect('/dashboard/bots?error=Provider+inválido')
  }

  const origin = getBaseUrl(c)
  const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
  const result = await botManager.addBot(name, provider, credentials)

  if (!result.success) {
    const bots = await botManager.listBots()
    return c.render(
      <BotsPage
        user={tenant.user}
        bots={bots}
        error={result.error}
      />
    )
  }

  return c.redirect('/dashboard/bots')
})

// Check Bot Health
app.post('/api/bots/:id/check', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const botId = c.req.param('id')

  const origin = getBaseUrl(c)
  const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
  const bot = await botManager.getBot(botId)
  const result = await botManager.checkBotHealth(botId)
  const bots = await botManager.listBots()

  // Create health check result for alert
  const healthCheckResult = {
    botName: bot?.name || 'Bot',
    status: result.status as 'online' | 'offline' | 'error',
    message: result.error || 'Token válido e respondendo',
    timestamp: new Date().toLocaleString('pt-BR'),
  }

  return c.render(
    <BotsPage
      user={tenant.user}
      bots={bots}
      healthCheckResult={healthCheckResult}
    />
  )
})

// Delete Bot
app.post('/api/bots/:id/delete', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const botId = c.req.param('id')

  const origin = getBaseUrl(c)
  const botManager = new BotManagerService(c.env.DB, tenant.tenantId, origin)
  await botManager.removeBot(botId)

  return c.redirect('/dashboard/bots')
})

// ============================================
// TELEGRAM WEBHOOK ENDPOINT
// ============================================

import { handleTelegramWebhook } from './lib/organisms/TelegramWebhookHandler'
import type { TelegramUpdate } from './lib/atoms/telegram'
import { dbGetBotById } from './lib/atoms/database'

app.post('/webhooks/telegram/:botId', async (c) => {
  const botId = c.req.param('botId')
  const webhookSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token')

  // Get bot from database
  const bot = await dbGetBotById({ db: c.env.DB, id: botId })

  if (!bot) {
    return c.json({ error: 'Bot not found' }, 404)
  }

  // Verify webhook secret
  if (bot.webhookSecret && bot.webhookSecret !== webhookSecret) {
    return c.json({ error: 'Invalid secret' }, 401)
  }

  // Get user info for the health response
  const userResult = await c.env.DB.prepare(`
    SELECT u.name FROM users u 
    JOIN tenants t ON u.tenant_id = t.id 
    WHERE t.id = ?
    LIMIT 1
  `).bind(bot.tenantId).first<{ name: string }>()

  const userName = userResult?.name || 'Usuário'

  try {
    const update = await c.req.json<TelegramUpdate>()

    await handleTelegramWebhook(update, {
      db: c.env.DB,
      botId,
      tenantId: bot.tenantId,
      userName,
    })

    return c.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return c.json({ ok: true }) // Always return 200 to Telegram
  }
})

export default app

