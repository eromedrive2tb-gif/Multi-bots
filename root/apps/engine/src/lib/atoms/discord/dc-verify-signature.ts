/**
 * ATOM: dc-verify-signature
 * Responsabilidade: Verifica a assinatura de um request do Discord
 * SRP: Apenas verifica a assinatura, não processa o corpo
 */

/**
 * Converte uma string hex para Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
    const arr = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
        arr[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }
    return arr
}

export interface DcVerifySignatureProps {
    publicKey: string
    signature: string
    timestamp: string
    body: string
}

/**
 * Verifica a assinatura usando Web Crypto API (Ed25519)
 */
export async function dcVerifySignature({
    publicKey,
    signature,
    timestamp,
    body,
}: DcVerifySignatureProps): Promise<boolean> {
    try {
        const encoder = new TextEncoder()
        const data = encoder.encode(timestamp + body)
        const signatureBin = hexToUint8Array(signature)
        const publicKeyBin = hexToUint8Array(publicKey)

        const key = await crypto.subtle.importKey(
            'raw',
            publicKeyBin as any,
            { name: 'Ed25519' } as any,
            false,
            ['verify']
        )

        return await crypto.subtle.verify(
            { name: 'Ed25519' } as any,
            key,
            signatureBin as any,
            data as any
        )
    } catch (error) {
        console.error('[Discord] Signature verification error:', error)
        return false
    }
}
