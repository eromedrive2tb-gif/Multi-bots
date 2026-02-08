import type { Env, User } from '../core/types'

// Simple password hashing using Web Crypto API (Cloudflare compatible)
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const inputHash = await hashPassword(password)
    return inputHash === hash
}

// Generate unique IDs
export function generateId(): string {
    return crypto.randomUUID()
}

// Database helpers
export async function findUserByEmail(db: D1Database, email: string): Promise<User | null> {
    const result = await db.prepare(
        'SELECT id, tenant_id as tenantId, email, name, password_hash as passwordHash, created_at as createdAt FROM users WHERE email = ?'
    ).bind(email).first<User>()
    return result
}

export async function findUserById(db: D1Database, id: string): Promise<User | null> {
    const result = await db.prepare(
        'SELECT id, tenant_id as tenantId, email, name, password_hash as passwordHash, created_at as createdAt FROM users WHERE id = ?'
    ).bind(id).first<User>()
    return result
}

export async function createTenant(db: D1Database, name: string, email: string): Promise<string> {
    const id = generateId()
    await db.prepare(
        'INSERT INTO tenants (id, name, email) VALUES (?, ?, ?)'
    ).bind(id, name, email).run()
    return id
}

export async function createUser(
    db: D1Database,
    tenantId: string,
    email: string,
    name: string,
    passwordHash: string
): Promise<string> {
    const id = generateId()
    await db.prepare(
        'INSERT INTO users (id, tenant_id, email, name, password_hash) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, tenantId, email, name, passwordHash).run()
    return id
}

export async function createSession(
    db: D1Database,
    userId: string,
    tenantId: string,
    expiresAt: Date
): Promise<string> {
    const id = generateId()
    await db.prepare(
        'INSERT INTO sessions (id, user_id, tenant_id, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(id, userId, tenantId, expiresAt.toISOString()).run()
    return id
}

export async function findValidSession(db: D1Database, sessionId: string): Promise<{
    id: string
    userId: string
    tenantId: string
    expiresAt: string
} | null> {
    const result = await db.prepare(
        `SELECT id, user_id as userId, tenant_id as tenantId, expires_at as expiresAt 
     FROM sessions 
     WHERE id = ? AND expires_at > datetime('now')`
    ).bind(sessionId).first()
    return result as any
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
}

export async function updateUser(db: D1Database, userId: string, data: { name?: string, email?: string }): Promise<void> {
    const sets = []
    const params = []
    if (data.name) {
        sets.push('name = ?')
        params.push(data.name)
    }
    if (data.email) {
        sets.push('email = ?')
        params.push(data.email)
    }

    if (sets.length === 0) return

    params.push(userId)
    await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
}

export async function updatePassword(db: D1Database, userId: string, passwordHash: string): Promise<void> {
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, userId).run()
}
