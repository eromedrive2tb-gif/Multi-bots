/**
 * ORGANISM: AuthService
 * Responsabilidade: Gerenciamento de Autenticação e Usuários
 * Orquestra: Atoms de Auth e Database
 */

import {
    hashPassword,
    verifyPassword,
    findUserByEmail,
    createTenant,
    createUser,
    createSession,
    deleteSession,
    findUserById,
    updateUser,
    updatePassword
} from '../../atoms'

export class AuthService {
    constructor(private db: D1Database) { }

    /**
     * Realiza login de usuário
     */
    async login(email: string, password: string): Promise<{ success: boolean; user?: any; sessionId?: string; error?: string }> {
        // Find user
        const user = await findUserByEmail(this.db, email)
        if (!user) {
            return { success: false, error: "Email ou senha inválidos" }
        }

        // Verify password
        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) {
            return { success: false, error: "Email ou senha inválidos" }
        }

        // Create session
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        const sessionId = await createSession(this.db, user.id, user.tenantId, expiresAt)

        return {
            success: true,
            user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId },
            sessionId
        }
    }

    /**
     * Registra novo tenant e usuário
     */
    async register(name: string, email: string, password: string): Promise<{ success: boolean; user?: any; sessionId?: string; error?: string }> {
        // Check if email exists
        const existingUser = await findUserByEmail(this.db, email)
        if (existingUser) {
            return { success: false, error: "Email já cadastrado" }
        }

        try {
            // Create tenant
            const tenantId = await createTenant(this.db, name, email)

            // Create user
            const passwordHash = await hashPassword(password)
            const userId = await createUser(this.db, tenantId, email, name, passwordHash)

            // Create session
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            const sessionId = await createSession(this.db, userId, tenantId, expiresAt)

            return {
                success: true,
                user: { id: userId, email, name, tenantId },
                sessionId
            }
        } catch (error) {
            console.error('Register error:', error)
            return { success: false, error: "Erro interno ao criar conta" }
        }
    }

    /**
     * Realiza logout
     */
    async logout(sessionId: string): Promise<void> {
        await deleteSession(this.db, sessionId)
    }

    /**
     * Atualiza perfil do usuário
     */
    async updateProfile(userId: string, name: string): Promise<{ success: boolean; error?: string }> {
        try {
            await updateUser(this.db, userId, { name })
            return { success: true }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar perfil' }
        }
    }

    /**
     * Altera senha do usuário
     */
    async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
        const user = await findUserById(this.db, userId)
        if (!user) {
            return { success: false, error: 'Usuário não encontrado' }
        }

        const isValid = await verifyPassword(currentPassword, user.passwordHash)
        if (!isValid) {
            return { success: false, error: 'Senha atual incorreta' }
        }

        const newHash = await hashPassword(newPassword)
        await updatePassword(this.db, user.id, newHash)

        return { success: true }
    }
}
