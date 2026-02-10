import type { Result } from '../../../core/types'

export interface KvListProps {
    kv: KVNamespace
    prefix?: string
    limit?: number
    cursor?: string
}

export interface KvListResponse {
    keys: string[]
    cursor?: string
    list_complete: boolean
}

export async function kvList({
    kv,
    prefix,
    limit,
    cursor,
}: KvListProps): Promise<Result<KvListResponse>> {
    try {
        const list = await kv.list({
            prefix,
            limit,
            cursor,
        })

        return {
            success: true,
            data: {
                keys: list.keys.map(k => k.name),
                cursor: (list as any).cursor,
                list_complete: list.list_complete,
            },
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao listar do KV',
        }
    }
}
