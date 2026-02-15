import type { Result } from '../../../../engine/src/core/types'

export interface Redirect {
    id: string; slug: string; slugType: string; mode: string; destinationUrl: string;
    destinationType: 'url' | 'bot'; botId?: string; flowId?: string;
    domain: string; cloakerEnabled: boolean; cloakerMethod: 'redirect' | 'safe_page' | 'mirror';
    cloakerSafeUrl: string | null; pixelId?: string;
    utmSource: string | null; utmMedium: string | null; utmCampaign: string | null;
    totalClicks: number; blockedCount: number; allowedCount: number;
    isActive: boolean; createdAt: string
}

export interface RedirectStats { totalLinks: number; totalClicks: number; withCloaker: number }

export interface CreateRedirectDTO {
    slug: string
    destinationUrl: string
    destinationType: 'url' | 'bot'
    botId?: string
    flowId?: string
    domain: string
    cloakerEnabled: boolean
    cloakerMethod: 'redirect' | 'safe_page' | 'mirror'
    cloakerSafeUrl?: string
    mode?: string
}

export class RedirectsClientService {
    async listRedirects(): Promise<Result<Redirect[]>> {
        try {
            const res = await fetch('/api/redirects')
            const r = await res.json() as any
            if (!r.success) return { success: false, error: r.error }
            return { success: true, data: r.data }
        } catch (e) {
            return { success: false, error: 'Falha ao listar redirecionamentos' }
        }
    }

    async getStats(): Promise<Result<RedirectStats>> {
        try {
            const res = await fetch('/api/redirects/stats')
            const r = await res.json() as any
            if (!r.success) return { success: false, error: r.error }
            return { success: true, data: r.data }
        } catch (e) {
            return { success: false, error: 'Falha ao obter estatísticas' }
        }
    }

    async createRedirect(data: CreateRedirectDTO): Promise<Result<void>> {
        try {
            const res = await fetch('/api/redirects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            const r = await res.json() as any
            if (!r.success) return { success: false, error: r.error }
            return { success: true, data: undefined }
        } catch (e) {
            return { success: false, error: 'Falha ao criar redirecionamento' }
        }
    }

    async updateRedirect(id: string, data: CreateRedirectDTO): Promise<Result<void>> {
        try {
            const res = await fetch(`/api/redirects/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            const r = await res.json() as any
            if (!r.success) return { success: false, error: r.error }
            return { success: true, data: undefined }
        } catch (e) {
            return { success: false, error: 'Falha ao atualizar redirecionamento' }
        }
    }

    async deleteRedirect(id: string): Promise<Result<void>> {
        try {
            const res = await fetch(`/api/redirects/${id}/delete`, { method: 'POST' })
            const r = await res.json() as any
            if (!r.success) return { success: false, error: r.error }
            return { success: true, data: undefined }
        } catch (e) {
            return { success: false, error: 'Falha ao excluir redirecionamento' }
        }
    }

    async listBots(): Promise<Result<any[]>> {
        try {
            const res = await fetch('/api/bots')
            const r = await res.json() as any
            if (!r.success) return { success: false, error: r.error }
            return { success: true, data: r.data }
        } catch (e) {
            return { success: false, error: 'Falha ao listar bots' }
        }
    }

    async getBotBlueprints(botId: string): Promise<Result<any[]>> {
        try {
            const res = await fetch(`/api/bots/${botId}/blueprints`)
            const r = await res.json() as any
            if (!r.success) return { success: false, error: r.error }
            // Correctly returning data as verified in previous debug steps
            return { success: true, data: r.data }
        } catch (e) {
            return { success: false, error: 'Falha ao buscar blueprints' }
        }
    }
}
