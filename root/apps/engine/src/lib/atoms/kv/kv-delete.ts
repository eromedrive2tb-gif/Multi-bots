import type { Result } from '../../../core/types'

export interface KvDeleteProps {
    kv: KVNamespace
    key: string
}

export async function kvDelete({
    kv,
    key,
}: KvDeleteProps): Promise<Result<void>> {
    try {
        await kv.delete(key)

        return {
            success: true,
            data: undefined,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao deletar do KV',
        }
    }
}
