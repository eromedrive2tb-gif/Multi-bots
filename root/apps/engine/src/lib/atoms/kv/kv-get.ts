import type { Result } from '../../../core/types'

export interface KvGetProps {
    kv: KVNamespace
    key: string
    type?: 'text' | 'json' | 'arrayBuffer' | 'stream'
}

export async function kvGet<T = any>({
    kv,
    key,
    type = 'json',
}: KvGetProps): Promise<Result<T | null>> {
    try {
        const data = await kv.get(key, type as any)

        return {
            success: true,
            data: data as T | null,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao buscar no KV',
        }
    }
}
