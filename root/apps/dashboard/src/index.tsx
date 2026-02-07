import { Hono } from 'hono'
import type { Context } from 'hono'
import { renderer } from './renderer'
import { getCookie } from 'hono/cookie'
import type { Env, TelegramCredentials } from './core/types'
import { loginSchema, registerSchema } from './core/types'
import { tgSetWebhook } from './lib/atoms/telegram'
import { dbGetBots, dbGetBotById } from './lib/atoms/database'

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

// Helper to get base URL for webhooks
// Priority: 1) ENV var, 2) X-Forwarded headers, 3) Request origin
function getBaseUrl(c: Context<{ Bindings: Env }>): string {
  // 1. Check for explicit WEBHOOK_BASE_URL env var (production)
  if (c.env.WEBHOOK_BASE_URL) {
    return c.env.WEBHOOK_BASE_URL.replace(/\/$/, '') // Remove trailing slash
  }

  // 2. Try X-Forwarded headers (set by reverse proxies/tunnels)
  const forwardedProto = c.req.header('X-Forwarded-Proto') || 'https'
  const forwardedHost = c.req.header('X-Forwarded-Host') || c.req.header('Host')

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  // 3. Fallback to request URL origin
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

// Blueprints Management
import { BlueprintsPage } from './pages/blueprints'
import { dbGetBlueprints as dbGetBlueprintsList } from './lib/atoms/database'

app.get('/dashboard/blueprints', authMiddleware, async (c) => {
  const tenant = c.get('tenant')

  const result = await dbGetBlueprintsList({
    db: c.env.DB,
    tenantId: tenant.tenantId
  })

  return c.render(
    <BlueprintsPage
      user={tenant.user}
      blueprints={result.success ? result.data : []}
      error={result.success ? undefined : result.error}
    />
  )
})

app.get('/dashboard/blueprints/new', authMiddleware, async (c) => {
  const tenant = c.get('tenant')

  return c.render(
    <BlueprintsPage
      user={tenant.user}
      blueprints={[]}
    />
  )
})

app.get('/dashboard/blueprints/:id', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')

  const listResult = await dbGetBlueprintsList({
    db: c.env.DB,
    tenantId: tenant.tenantId
  })

  const bpResult = await dbGetBlueprintById({
    db: c.env.DB,
    tenantId: tenant.tenantId,
    id
  })

  return c.render(
    <BlueprintsPage
      user={tenant.user}
      blueprints={listResult.success ? listResult.data : []}
      selectedBlueprint={bpResult.success && bpResult.data ? JSON.stringify(bpResult.data) : undefined}
      error={bpResult.success ? undefined : bpResult.error}
    />
  )
})

// Bots Management
import { BotsPage } from './pages/bots'
import { BotManagerService } from './lib/organisms/BotManagerService'
import type { BotProvider, DiscordCredentials } from './core/types'

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

// Reconfigure Webhook for a single bot
app.post('/api/bots/:id/webhook', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const botId = c.req.param('id')

  const webhookBaseUrl = getBaseUrl(c)
  const bot = await dbGetBotById({ db: c.env.DB, id: botId })

  if (!bot || bot.tenantId !== tenant.tenantId) {
    return c.json({ success: false, error: 'Bot não encontrado' }, 404)
  }

  if (bot.provider === 'telegram') {
    const tgCreds = bot.credentials as TelegramCredentials
    const webhookUrl = `${webhookBaseUrl}/webhooks/telegram/${botId}`

    try {
      await tgSetWebhook({
        token: tgCreds.token,
        url: webhookUrl,
        secretToken: bot.webhookSecret || undefined,
      })

      return c.json({
        success: true,
        message: `Webhook configurado para ${webhookUrl}`,
        webhookUrl,
      })
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao configurar webhook'
      }, 500)
    }
  }

  return c.json({ success: false, error: 'Provider não suportado' }, 400)
})

// Refresh ALL webhooks for tenant (useful after domain change)
app.post('/api/bots/webhooks/refresh', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const webhookBaseUrl = getBaseUrl(c)

  const bots = await dbGetBots({ db: c.env.DB, tenantId: tenant.tenantId })
  const results: { botId: string; name: string; success: boolean; webhookUrl?: string; error?: string }[] = []

  for (const bot of bots) {
    if (bot.provider === 'telegram') {
      const tgCreds = bot.credentials as TelegramCredentials
      const webhookUrl = `${webhookBaseUrl}/webhooks/telegram/${bot.id}`

      try {
        await tgSetWebhook({
          token: tgCreds.token,
          url: webhookUrl,
          secretToken: bot.webhookSecret || undefined,
        })
        results.push({ botId: bot.id, name: bot.name, success: true, webhookUrl })
      } catch (error) {
        results.push({
          botId: bot.id,
          name: bot.name,
          success: false,
          error: error instanceof Error ? error.message : 'Erro'
        })
      }
    }
  }

  return c.json({
    success: true,
    baseUrl: webhookBaseUrl,
    results,
  })
})

// ============================================
// BLUEPRINT API ENDPOINTS
// ============================================


import { dbGetBlueprints, dbGetBlueprintById } from './lib/atoms/database'
import { syncSaveBlueprint, syncDeleteBlueprint } from './lib/molecules/blueprint-sync'
import { blueprintSchema } from './core/types'

// List all blueprints for tenant
app.get('/api/blueprints', authMiddleware, async (c) => {
  const tenant = c.get('tenant')

  const result = await dbGetBlueprints({
    db: c.env.DB,
    tenantId: tenant.tenantId
  })

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 500)
  }

  return c.json({ success: true, data: result.data })
})

// Get single blueprint
app.get('/api/blueprints/:id', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')

  const result = await dbGetBlueprintById({
    db: c.env.DB,
    tenantId: tenant.tenantId,
    id
  })

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 500)
  }

  if (!result.data) {
    return c.json({ success: false, error: 'Blueprint não encontrado' }, 404)
  }

  return c.json({ success: true, data: result.data })
})

// Create new blueprint
app.post('/api/blueprints', authMiddleware, async (c) => {
  const tenant = c.get('tenant')

  try {
    const body = await c.req.json()

    // Validate blueprint
    const parsed = blueprintSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({
        success: false,
        error: `Blueprint inválido: ${parsed.error.message}`
      }, 400)
    }

    const result = await syncSaveBlueprint({
      db: c.env.DB,
      kv: c.env.BLUEPRINTS_KV,
      tenantId: tenant.tenantId,
      blueprint: parsed.data,
    })

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true, data: result.data }, 201)
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar blueprint'
    }, 500)
  }
})

// Update blueprint
app.put('/api/blueprints/:id', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')

  try {
    const body = await c.req.json()

    // Ensure ID matches
    body.id = id

    // Validate blueprint
    const parsed = blueprintSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({
        success: false,
        error: `Blueprint inválido: ${parsed.error.message}`
      }, 400)
    }

    const result = await syncSaveBlueprint({
      db: c.env.DB,
      kv: c.env.BLUEPRINTS_KV,
      tenantId: tenant.tenantId,
      blueprint: parsed.data,
    })

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 500)
    }

    return c.json({ success: true, data: result.data })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar blueprint'
    }, 500)
  }
})

// Delete blueprint
app.delete('/api/blueprints/:id', authMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')

  const result = await syncDeleteBlueprint({
    db: c.env.DB,
    kv: c.env.BLUEPRINTS_KV,
    tenantId: tenant.tenantId,
    blueprintId: id,
  })

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 500)
  }

  return c.json({ success: true })
})

// ============================================
// SYNC & DEBUG ENDPOINTS
// ============================================

import { fullSyncBlueprintsToKv } from './lib/molecules/blueprint-sync'
import { executeFromTrigger } from './core/engine'
import type { UniversalContext } from './core/types'

// Sync all blueprints from D1 to KV
app.post('/api/blueprints/sync', authMiddleware, async (c) => {
  const tenant = c.get('tenant')

  const result = await fullSyncBlueprintsToKv({
    db: c.env.DB,
    kv: c.env.BLUEPRINTS_KV,
    tenantId: tenant.tenantId,
  })

  if (!result.success) {
    return c.json({ success: false, error: result.error }, 500)
  }

  return c.json({
    success: true,
    message: `Sincronizado: ${result.data.synced} blueprints | Falhas: ${result.data.failed}`,
    data: result.data,
  })
})

// Debug endpoint: Test blueprint execution (without Telegram)
app.post('/api/debug/trigger', authMiddleware, async (c) => {
  const tenant = c.get('tenant')

  try {
    const body = await c.req.json<{ trigger: string; userId?: string }>()
    const trigger = body.trigger || '/start'
    const userId = body.userId || 'debug_user_123'

    // Build mock UniversalContext
    const ctx: UniversalContext = {
      provider: 'tg',
      tenantId: tenant.tenantId,
      userId,
      chatId: userId,
      botToken: 'debug_token',
      metadata: {
        userName: tenant.user.name,
        lastInput: trigger,
        command: trigger.startsWith('/') ? trigger.slice(1) : undefined,
      },
    }

    console.log('[DEBUG] Testing trigger:', trigger, 'for tenant:', tenant.tenantId)

    // Execute flow
    const result = await executeFromTrigger(
      {
        blueprints: c.env.BLUEPRINTS_KV,
        sessions: c.env.SESSIONS_KV,
      },
      ctx
    )

    console.log('[DEBUG] Flow result:', JSON.stringify(result))

    return c.json({
      success: result.success,
      trigger,
      tenantId: tenant.tenantId,
      result,
    })
  } catch (error) {
    console.error('[DEBUG] Error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, 500)
  }
})

// ============================================
// TELEGRAM WEBHOOK ENDPOINT
// ============================================

import { handleTelegramWebhook } from './lib/organisms/TelegramWebhookHandler'
import type { TelegramUpdate } from './lib/atoms/telegram'


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

  try {
    const update = await c.req.json<TelegramUpdate>()

    await handleTelegramWebhook(update, {
      env: c.env,
      botId,
      tenantId: bot.tenantId,
    })

    return c.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return c.json({ ok: true }) // Always return 200 to Telegram
  }
})

export default app

