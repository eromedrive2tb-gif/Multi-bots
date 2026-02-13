/**
 * ATOM: generate-pix
 * Responsabilidade: Gera um pagamento PIX via gateway externo
 * SRP: Apenas chama a API do gateway, não salva no banco
 * 
 * Suporta múltiplos gateways: MercadoPago, PushinPay, Asaas
 * Timeout: 5 segundos conforme regras de resiliência
 */

import type { PaymentGatewayProvider } from '../../../core/payment-types'

export interface GeneratePixProps {
    provider: PaymentGatewayProvider
    credentials: Record<string, string>
    amount: number // centavos
    description: string
    externalReference?: string // ID interno para correlação
    expirationMinutes?: number
    payerEmail?: string
    payerName?: string
}

export interface GeneratePixResult {
    success: true
    externalId: string
    pixCode: string // código copia-e-cola
    pixQrcode: string | null // base64 do QR
    expiresAt: string
}

export interface GeneratePixError {
    success: false
    error: string
}

const TIMEOUT_MS = 5000

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        })
        return response
    } finally {
        clearTimeout(timeoutId)
    }
}

/**
 * MercadoPago PIX Generation
 */
async function generatePixMercadoPago(
    credentials: Record<string, string>,
    props: GeneratePixProps
): Promise<GeneratePixResult | GeneratePixError> {
    const { access_token } = credentials
    if (!access_token) {
        return { success: false, error: 'MercadoPago: access_token não configurado' }
    }

    const expirationDate = new Date(
        Date.now() + (props.expirationMinutes || 30) * 60 * 1000
    ).toISOString()

    const body = {
        transaction_amount: props.amount / 100, // MP usa reais, não centavos
        description: props.description,
        payment_method_id: 'pix',
        payer: {
            email: props.payerEmail || 'customer@email.com',
            first_name: props.payerName || 'Cliente',
        },
        external_reference: props.externalReference,
        date_of_expiration: expirationDate,
    }

    const response = await fetchWithTimeout('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': props.externalReference || crypto.randomUUID(),
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const errorData = await response.text()
        return { success: false, error: `MercadoPago error ${response.status}: ${errorData}` }
    }

    const data = await response.json() as any
    const pixInfo = data.point_of_interaction?.transaction_data

    return {
        success: true,
        externalId: String(data.id),
        pixCode: pixInfo?.qr_code || '',
        pixQrcode: pixInfo?.qr_code_base64 || null,
        expiresAt: data.date_of_expiration || expirationDate,
    }
}

/**
 * PushinPay PIX Generation
 */
async function generatePixPushinPay(
    credentials: Record<string, string>,
    props: GeneratePixProps
): Promise<GeneratePixResult | GeneratePixError> {
    const { api_key } = credentials
    if (!api_key) {
        return { success: false, error: 'PushinPay: api_key não configurado' }
    }

    const body = {
        value: props.amount, // PushinPay usa centavos
        webhook_url: credentials.webhook_url || '',
        external_reference: props.externalReference,
    }

    const response = await fetchWithTimeout('https://api.pushinpay.com.br/api/pix/cashIn', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const errorData = await response.text()
        return { success: false, error: `PushinPay error ${response.status}: ${errorData}` }
    }

    const data = await response.json() as any

    return {
        success: true,
        externalId: data.id || data.transaction_id || '',
        pixCode: data.qr_code || data.pix_code || '',
        pixQrcode: data.qr_code_base64 || null,
        expiresAt: new Date(Date.now() + (props.expirationMinutes || 30) * 60 * 1000).toISOString(),
    }
}

/**
 * Asaas PIX Generation
 */
async function generatePixAsaas(
    credentials: Record<string, string>,
    props: GeneratePixProps
): Promise<GeneratePixResult | GeneratePixError> {
    const { api_key, environment } = credentials
    if (!api_key) {
        return { success: false, error: 'Asaas: api_key não configurado' }
    }

    const baseUrl = environment === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/api/v3'

    // 1. Criar cobrança
    const chargeBody = {
        billingType: 'PIX',
        value: props.amount / 100, // Asaas usa reais
        description: props.description,
        externalReference: props.externalReference,
        dueDate: new Date(Date.now() + (props.expirationMinutes || 30) * 60 * 1000)
            .toISOString().split('T')[0],
    }

    const chargeResponse = await fetchWithTimeout(`${baseUrl}/payments`, {
        method: 'POST',
        headers: {
            'access_token': api_key,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(chargeBody),
    })

    if (!chargeResponse.ok) {
        const errorData = await chargeResponse.text()
        return { success: false, error: `Asaas error ${chargeResponse.status}: ${errorData}` }
    }

    const chargeData = await chargeResponse.json() as any

    // 2. Buscar QR Code PIX
    const pixResponse = await fetchWithTimeout(`${baseUrl}/payments/${chargeData.id}/pixQrCode`, {
        method: 'GET',
        headers: { 'access_token': api_key },
    })

    let pixCode = ''
    let pixQrcode: string | null = null

    if (pixResponse.ok) {
        const pixData = await pixResponse.json() as any
        pixCode = pixData.payload || ''
        pixQrcode = pixData.encodedImage || null
    }

    return {
        success: true,
        externalId: chargeData.id,
        pixCode,
        pixQrcode,
        expiresAt: new Date(Date.now() + (props.expirationMinutes || 30) * 60 * 1000).toISOString(),
    }
}

/**
 * Entry point: gera PIX pelo provider configurado
 */
export async function generatePix(
    props: GeneratePixProps
): Promise<GeneratePixResult | GeneratePixError> {
    try {
        switch (props.provider) {
            case 'mercadopago':
                return await generatePixMercadoPago(props.credentials, props)
            case 'pushinpay':
                return await generatePixPushinPay(props.credentials, props)
            case 'asaas':
                return await generatePixAsaas(props.credentials, props)
            case 'stripe':
                return { success: false, error: 'Stripe PIX: implementação pendente' }
            default:
                return { success: false, error: `Provider não suportado: ${props.provider}` }
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return { success: false, error: `Timeout: gateway ${props.provider} não respondeu em ${TIMEOUT_MS}ms` }
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar PIX',
        }
    }
}
