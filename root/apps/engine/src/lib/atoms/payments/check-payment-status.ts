/**
 * ATOM: check-payment-status
 * Responsabilidade: Consulta status de pagamento no gateway externo
 * SRP: Apenas consulta API, não atualiza banco
 * Timeout: 5 segundos
 */

import type { PaymentGatewayProvider, TransactionStatus } from '../../../core/payment-types'

export interface CheckPaymentStatusProps {
    provider: PaymentGatewayProvider
    credentials: Record<string, string>
    externalId: string
}

export interface CheckPaymentStatusResult {
    success: true
    status: TransactionStatus
    paidAt: string | null
}

export interface CheckPaymentStatusError {
    success: false
    error: string
}

const TIMEOUT_MS = 5000

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        return await fetch(url, { ...options, signal: controller.signal })
    } finally {
        clearTimeout(timeoutId)
    }
}

function mapStatusFromMercadoPago(mpStatus: string): TransactionStatus {
    switch (mpStatus) {
        case 'approved': return 'paid'
        case 'pending': case 'in_process': return 'pending'
        case 'refunded': return 'refunded'
        case 'cancelled': case 'rejected': return 'cancelled'
        default: return 'pending'
    }
}

export async function checkPaymentStatus(
    props: CheckPaymentStatusProps
): Promise<CheckPaymentStatusResult | CheckPaymentStatusError> {
    try {
        switch (props.provider) {
            case 'mercadopago': {
                const response = await fetchWithTimeout(
                    `https://api.mercadopago.com/v1/payments/${props.externalId}`,
                    {
                        headers: { 'Authorization': `Bearer ${props.credentials.access_token}` },
                    }
                )
                if (!response.ok) {
                    return { success: false, error: `MercadoPago: ${response.status}` }
                }
                const data = await response.json() as any
                return {
                    success: true,
                    status: mapStatusFromMercadoPago(data.status),
                    paidAt: data.date_approved || null,
                }
            }

            case 'pushinpay': {
                const response = await fetchWithTimeout(
                    `https://api.pushinpay.com.br/api/transactions/${props.externalId}`,
                    {
                        headers: { 'Authorization': `Bearer ${props.credentials.api_key}` },
                    }
                )
                if (!response.ok) {
                    return { success: false, error: `PushinPay: ${response.status}` }
                }
                const data = await response.json() as any
                const status: TransactionStatus = data.status === 'paid' ? 'paid' : 'pending'
                return { success: true, status, paidAt: data.paid_at || null }
            }

            case 'asaas': {
                const baseUrl = props.credentials.environment === 'production'
                    ? 'https://api.asaas.com/v3'
                    : 'https://sandbox.asaas.com/api/v3'

                const response = await fetchWithTimeout(
                    `${baseUrl}/payments/${props.externalId}`,
                    {
                        headers: { 'access_token': props.credentials.api_key },
                    }
                )
                if (!response.ok) {
                    return { success: false, error: `Asaas: ${response.status}` }
                }
                const data = await response.json() as any
                let status: TransactionStatus = 'pending'
                if (data.status === 'CONFIRMED' || data.status === 'RECEIVED') status = 'paid'
                else if (data.status === 'REFUNDED') status = 'refunded'
                else if (data.status === 'OVERDUE') status = 'expired'

                return { success: true, status, paidAt: data.confirmedDate || null }
            }

            default:
                return { success: false, error: `Provider não suportado: ${props.provider}` }
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return { success: false, error: `Timeout: ${props.provider} não respondeu em ${TIMEOUT_MS}ms` }
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao consultar pagamento',
        }
    }
}
