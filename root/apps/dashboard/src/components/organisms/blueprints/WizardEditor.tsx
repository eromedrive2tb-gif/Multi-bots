/** @jsxImportSource react */
import React, { useState } from 'react'
import type { Blueprint } from '../../../../../engine/src/core/types'

interface WizardEditorProps {
    initialBlueprint?: Blueprint
    onSave?: (blueprint: Blueprint) => Promise<void>
}

interface WizardConfig {
    name: string
    trigger: string
    // Welcome
    welcomeMessage: string
    captureName: boolean
    // Plans
    plansTitle: string
    isSubscription: boolean // Just for UI/Text context
    // Funnel - Upsell
    upsellEnabled: boolean
    upsellMessage: string
    upsellPlanId: string
    // Funnel - Downsell
    downsellEnabled: boolean
    downsellMessage: string
    downsellPlanId: string
    // Funnel - Order Bump
    orderBumpEnabled: boolean
    orderBumpMessage: string
    comboPlanId: string
    // Delivery
    deliveryLink: string
    deliveryMessage: string
}

export const WizardEditor: React.FC<WizardEditorProps> = ({
    initialBlueprint,
    onSave,
}) => {
    const [step, setStep] = useState(1)
    const [config, setConfig] = useState<WizardConfig>({
        name: initialBlueprint?.name || 'Fluxo VIP',
        trigger: initialBlueprint?.trigger || '/vip',
        // Welcome
        welcomeMessage: 'Olá! 👋 Bem-vindo ao nosso atendimento.\n\nPara começar, qual é o seu nome?',
        captureName: true,
        // Plans
        plansTitle: 'Excelente! Escolha o plano ideal para você:',
        isSubscription: true,
        // Upsell
        upsellEnabled: false,
        upsellMessage: 'Antes de continuar... temos uma oferta especial!\n\nQuer levar o plano ANUAL com 50% de desconto?',
        upsellPlanId: 'plano_anual_vip',
        // Downsell
        downsellEnabled: false,
        downsellMessage: 'Espere! 🛑\n\nNão vá embora ainda. Que tal um desconto exclusivo para entrar agora?',
        downsellPlanId: 'plano_promocional',
        // Order Bump
        orderBumpEnabled: false,
        orderBumpMessage: 'Gostaria de adicionar nosso E-book exclusivo por apenas R$ 9,90?',
        comboPlanId: 'plano_vip_ebook',
        // Delivery
        deliveryLink: 'https://t.me/+AbCdEfGhIjKl',
        deliveryMessage: '✅ <b>Pagamento Confirmado!</b>\n\nAqui está o seu link de acesso exclusivo:\n{{link}}\n\nSeja bem-vindo!'
    })

    const handleChange = (field: keyof WizardConfig, value: string | boolean) => {
        setConfig(prev => ({ ...prev, [field]: value }))
    }

    const generateBlueprint = (): Blueprint => {
        const steps: Record<string, any> = {}
        let currentStep = 'welcome'

        // 1. Welcome & Name
        steps['welcome'] = {
            type: 'organism',
            action: 'prompt',
            params: {
                text: config.welcomeMessage,
                variable: config.captureName ? 'customer_name' : 'temp_input',
                parse_mode: 'HTML'
            },
            next_step: 'show_plans'
        }

        // 2. Select Plan
        steps['show_plans'] = {
            type: 'molecule',
            action: 'select_plan',
            params: {
                text: config.plansTitle,
                message: config.plansTitle.replace('{{name}}', config.captureName ? '{{session.customer_name}}' : 'Visitante')
            },
            next_step: config.upsellEnabled ? 'upsell_offer' : (config.orderBumpEnabled ? 'order_bump_offer' : 'confirm_order')
        }

        // 3a. Upsell
        if (config.upsellEnabled) {
            steps['upsell_offer'] = {
                type: 'organism',
                action: 'prompt',
                params: {
                    text: config.upsellMessage,
                    variable: 'upsell_choice',
                    buttons: [
                        { text: '✅ Sim, eu quero!', callback: 'yes' },
                        { text: '❌ Não, obrigado', callback: 'no' }
                    ],
                    branches: {
                        'yes': 'apply_upsell',
                        'no': config.orderBumpEnabled ? 'order_bump_offer' : 'confirm_order'
                    }
                },
                next_step: null
            }

            steps['apply_upsell'] = {
                type: 'molecule',
                action: 'set_variable',
                params: {
                    variable: 'plan_id',
                    value: config.upsellPlanId
                },
                next_step: config.orderBumpEnabled ? 'order_bump_offer' : 'confirm_order'
            }
        }

        // 3b. Order Bump
        if (config.orderBumpEnabled) {
            steps['order_bump_offer'] = {
                type: 'organism',
                action: 'prompt',
                params: {
                    text: config.orderBumpMessage,
                    variable: 'bump_choice',
                    buttons: [
                        { text: '✅ Adicionar à oferta', callback: 'yes' },
                        { text: '❌ Pular', callback: 'no' }
                    ],
                    branches: {
                        'yes': 'apply_bump',
                        'no': 'confirm_order'
                    }
                },
                next_step: null
            }

            steps['apply_bump'] = {
                type: 'molecule',
                action: 'set_variable',
                params: {
                    variable: 'plan_id',
                    value: config.comboPlanId
                },
                next_step: 'confirm_order'
            }
        }

        // 4. Confirm Order (Logic hub for Downsell)
        steps['confirm_order'] = {
            type: 'organism',
            action: 'prompt',
            params: {
                text: 'Resumo do Pedido:\nItem: <b>{{session.plan_name}}</b>\nValor: <b>{{session.plan_price}}</b>\n\nPodemos gerar o PIX?',
                variable: 'pay_choice',
                parse_mode: 'HTML',
                buttons: [
                    { text: '✅ Sim, gerar PIX', callback: 'yes' },
                    { text: '❌ Cancelar', callback: 'no' }
                ],
                branches: {
                    'yes': 'generate_pix',
                    'no': config.downsellEnabled ? 'downsell_offer' : 'cancel'
                }
            },
            next_step: null
        }

        // 5a. Downsell
        if (config.downsellEnabled) {
            steps['downsell_offer'] = {
                type: 'organism',
                action: 'prompt',
                params: {
                    text: config.downsellMessage,
                    variable: 'downsell_choice',
                    buttons: [
                        { text: '✅ Aceitar Desconto', callback: 'yes' },
                        { text: '❌ Desistir', callback: 'no' }
                    ],
                    branches: {
                        'yes': 'apply_downsell',
                        'no': 'cancel'
                    }
                },
                next_step: null
            }

            steps['apply_downsell'] = {
                type: 'molecule',
                action: 'set_variable',
                params: {
                    variable: 'plan_id',
                    value: config.downsellPlanId
                },
                next_step: 'generate_pix'
            }
        }

        // 6. Generate PIX
        steps['generate_pix'] = {
            type: 'molecule',
            action: 'generate_pix',
            params: {
                plan_id: '{{session.plan_id}}',
                description: 'Acesso VIP',
                message: '💎 <b>Pagamento Gerado</b>\nvalor: {{pix_amount}}\n\n{{pix_code}}'
            },
            next_step: 'delivery'
        }

        // 7. Delivery / Cancel
        steps['cancel'] = {
            type: 'molecule',
            action: 'send_message',
            params: { text: 'Que pena! Espero te ver em breve.' },
            next_step: null
        }

        return {
            id: initialBlueprint?.id || `funnel_${Date.now()}`,
            name: config.name,
            version: '2.0',
            trigger: config.trigger,
            entry_step: 'welcome',
            steps
        }
    }

    const handleFinish = async () => {
        if (onSave) {
            await onSave(generateBlueprint())
        }
    }

    const renderInput = (label: string, field: keyof WizardConfig, type: 'text' | 'textarea' = 'text') => (
        <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>{label}</label>
            {type === 'textarea' ? (
                <textarea
                    value={config[field] as string}
                    onChange={e => handleChange(field, e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', minHeight: '80px', fontFamily: 'inherit' }}
                />
            ) : (
                <input
                    type="text"
                    value={config[field] as string}
                    onChange={e => handleChange(field, e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
            )}
        </div>
    )

    const renderToggle = (label: string, field: keyof WizardConfig) => (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
            <input
                type="checkbox"
                checked={config[field] as boolean}
                onChange={e => handleChange(field, e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label style={{ cursor: 'pointer', fontWeight: 500 }}>{label}</label>
        </div>
    )

    return (
        <div style={{
            height: '700px',
            background: '#1a1a2e',
            borderRadius: '12px',
            display: 'flex',
            color: 'white',
            overflow: 'hidden'
        }}>
            {/* Sidebar Steps */}
            <div style={{ width: '250px', background: '#16213e', padding: '24px', borderRight: '1px solid #0f3460' }}>
                <h3 style={{ marginBottom: '24px', color: '#6366f1' }}>🧙‍♂️ Wizard Pro</h3>
                {[1, 2, 3, 4].map(s => (
                    <div
                        key={s}
                        onClick={() => setStep(s)}
                        style={{
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '8px',
                            background: step === s ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                            color: step === s ? '#6366f1' : 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: step === s ? '#6366f1' : 'rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '12px'
                        }}>
                            {s}
                        </div>
                        {s === 1 ? 'Configuração' : s === 2 ? 'Funil' : s === 3 ? 'Pagamento' : 'Entrega'}
                    </div>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {step === 1 && (
                        <div>
                            <h2 style={{ marginBottom: '24px' }}>⚙️ Configuração Inicial</h2>
                            {renderInput('Nome do Fluxo', 'name')}
                            {renderInput('Comando de Ativação (Trigger)', 'trigger')}
                            {renderToggle('Coletar Nome do Usuário?', 'captureName')}

                            <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>💬 Boas-vindas</h3>
                            {renderInput('Texto de Boas-vindas', 'welcomeMessage', 'textarea')}

                            <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>📋 Planos</h3>
                            {renderInput('Título da Lista de Planos', 'plansTitle')}

                            <button
                                onClick={() => setStep(2)}
                                style={{ padding: '10px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '16px' }}
                            >
                                Ir para Funil ➡️
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h2 style={{ marginBottom: '24px' }}>🚀 Funil de Vendas</h2>
                            <p style={{ opacity: 0.7, marginBottom: '24px' }}>Configure estratégias para aumentar seu ticket médio.</p>

                            {/* Upsell Section */}
                            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                                {renderToggle('Ativar Upsell (Oferta após escolha)', 'upsellEnabled')}
                                {config.upsellEnabled && (
                                    <div style={{ paddingLeft: '16px', borderLeft: '2px solid #6366f1' }}>
                                        {renderInput('Mensagem de Upsell', 'upsellMessage', 'textarea')}
                                        {renderInput('ID do Plano de Upsell', 'upsellPlanId')}
                                    </div>
                                )}
                            </div>

                            {/* Order Bump Section */}
                            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                                {renderToggle('Ativar Order Bump (Adicional no checkout)', 'orderBumpEnabled')}
                                {config.orderBumpEnabled && (
                                    <div style={{ paddingLeft: '16px', borderLeft: '2px solid #22c55e' }}>
                                        {renderInput('Mensagem do Bump', 'orderBumpMessage', 'textarea')}
                                        {renderInput('ID do Plano Combo (Original + Bump)', 'comboPlanId')}
                                    </div>
                                )}
                            </div>

                            {/* Downsell Section */}
                            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px' }}>
                                {renderToggle('Ativar Downsell (Recuperação)', 'downsellEnabled')}
                                {config.downsellEnabled && (
                                    <div style={{ paddingLeft: '16px', borderLeft: '2px solid #ef4444' }}>
                                        {renderInput('Mensagem de Downsell', 'downsellMessage', 'textarea')}
                                        {renderInput('ID do Plano Mais Barato', 'downsellPlanId')}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button onClick={() => setStep(1)} style={styles.backBtn}>⬅️ Voltar</button>
                                <button onClick={() => setStep(3)} style={styles.nextBtn}>Próximo ➡️</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h2 style={{ marginBottom: '24px' }}>💳 Pagamento & Checkout</h2>
                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                <p style={{ color: '#22c55e', margin: 0 }}>
                                    ℹ️ O link de pagamento será gerado dinamicamente com base no plano final (após Upsell/Bump/Downsell).
                                </p>
                            </div>
                            {/* In V3 could add PIX styling options here */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button onClick={() => setStep(2)} style={styles.backBtn}>⬅️ Voltar</button>
                                <button onClick={() => setStep(4)} style={styles.nextBtn}>Próximo ➡️</button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div>
                            <h2 style={{ marginBottom: '24px' }}>📦 Entrega</h2>
                            {renderInput('Mensagem de Sucesso', 'deliveryMessage', 'textarea')}
                            {renderInput('Link do Grupo/Conteúdo', 'deliveryLink')}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button onClick={() => setStep(3)} style={styles.backBtn}>⬅️ Voltar</button>
                                <button onClick={handleFinish} style={styles.finishBtn}>🚀 Criar Fluxo Completo</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const styles = {
    backBtn: { padding: '10px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '6px', cursor: 'pointer' },
    nextBtn: { padding: '10px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    finishBtn: { padding: '10px 24px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }
}
