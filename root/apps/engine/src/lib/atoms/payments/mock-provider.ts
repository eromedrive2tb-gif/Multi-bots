/**
 * ATOM: mock-provider
 * Responsabilidade: Gerar dados fictícios de PIX para testes
 */

import type { PixResult } from '../../../core/payment-types'

export interface GenerateMockPixProps {
    amount: number
    description: string
    externalReference: string
    expirationMinutes: number
}

export async function generateMockPix(props: GenerateMockPixProps): Promise<PixResult> {
    const expiresAt = new Date(Date.now() + props.expirationMinutes * 60000).toISOString()

    // QR Code estático de teste (1x1 pixel transparente)
    const mockQrcode = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

    return {
        success: true,
        transactionId: props.externalReference,
        externalId: props.externalReference,
        pixCode: `00020126580014BR.GOV.BCB.PIX0136test-key-123-mock-gateway-integration520400005303986540${props.amount.toFixed(2).padStart(4, '0')}5802BR5913MOCK GATEWAY6008BRASILIA62070503***6304ABCD`,
        pixQrcode: mockQrcode,
        amount: props.amount,
        expiresAt,
    } as any
}
