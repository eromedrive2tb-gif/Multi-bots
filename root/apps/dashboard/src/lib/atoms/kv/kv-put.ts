import type { Result } from '../../../core/types'

export interface KvPutProps {
    kv: KVNamespace
    key: string
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream
    expiration?: number
    expirationTtl?: number
    metadata?: any
}

export async function kvPut({
    kv,
    key,
    value,
    expiration,
    expirationTtl,
    metadata,
}: KvPutProps): Promise<Result<void>> {
    try {
        await kv.put(key, value, {
            expiration,
            expirationTtl,
            metadata,
        })

        return {
            success: true,
            data: undefined,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao salvar no KV',
        }
    }
}
