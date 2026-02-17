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
    welcomeMessage: string
    captureName: boolean
    plansTitle: string
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
        welcomeMessage: 'Olá! 👋 Bem-vindo ao nosso atendimento.\n\nPara começar, qual é o seu nome?',
        captureName: true,
        plansTitle: 'Excelente! Escolha o plano ideal para você:',
        deliveryLink: 'https://t.me/+AbCdEfGhIjKl',
        deliveryMessage: '✅ <b>Pagamento Confirmado!</b>\n\nAqui está o seu link de acesso exclusivo:\n{{link}}\n\nSeja bem-vindo!'
    })

    const handleChange = (field: keyof WizardConfig, value: string | boolean) => {
        setConfig(prev => ({ ...prev, [field]: value }))
    }

    const generateBlueprint = (): Blueprint => {
        const steps: Record<string, any> = {}

        // Step 1: Welcome & Name
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

        // Step 2: Select Plan
        steps['show_plans'] = {
            type: 'molecule',
            action: 'select_plan',
            params: {
                text: config.plansTitle,
                message: config.plansTitle.replace('{{name}}', '{{session.customer_name}}')
            },
            next_step: 'confirm_order'
        }

        // Step 3: Confirm & Branching
        steps['confirm_order'] = {
            type: 'organism',
            action: 'prompt',
            params: {
                text: 'Você selecionou: <b>{{session.plan_name}}</b>\nValor: <b>{{session.plan_price}}</b>\n\nPodemos gerar o PIX?',
                variable: 'pay_choice',
                parse_mode: 'HTML',
                buttons: [
                    { text: '✅ Sim, gerar PIX', callback: 'yes' },
                    { text: '❌ Cancelar', callback: 'no' }
                ],
                branches: {
                    'yes': 'generate_pix',
                    'no': 'cancel'
                }
            },
            next_step: null // handled by branches
        }

        // Step 4: Generate PIX
        steps['generate_pix'] = {
            type: 'molecule',
            action: 'generate_pix',
            params: {
                plan_id: '{{session.plan_id}}',
                description: 'Acesso VIP - {{session.plan_name}}',
                message: '💎 <b>Checkout VIP</b>\n\nValor: <b>{{pix_amount}}</b>\n\nCopie o código abaixo:\n<code>{{pix_code}}</code>'
            },
            next_step: 'delivery'
        }

        // Step 5: Delivery (Mocked for now, usually after webhook callback)
        // In a real flow, generate_pix ends the sync flow. The webhook triggers a new message.
        // But for "Wizard" simplicity, we might want to show what happens next?
        // Actually, generate_pix is the end of the synchronous flow.

        // Let's add the 'cancel' step
        steps['cancel'] = {
            type: 'molecule',
            action: 'send_message',
            params: {
                text: 'Tudo bem! Se mudar de ideia, estamos por aqui. 👋'
            },
            next_step: null
        }

        return {
            id: initialBlueprint?.id || `vip_flow_${Date.now()}`,
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
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', minHeight: '100px' }}
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
                <h3 style={{ marginBottom: '24px', color: '#6366f1' }}>🧙‍♂️ Wizard</h3>
                {[1, 2, 3].map(s => (
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
                        {s === 1 ? 'Configuração' : s === 2 ? 'Mensagens' : 'Pagamento'}
                    </div>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {step === 1 && (
                        <div>
                            <h2 style={{ marginBottom: '24px' }}>⚙️ Configurações do Bot</h2>
                            {renderInput('Nome do Fluxo', 'name')}
                            {renderInput('Comando de Ativação (Trigger)', 'trigger')}
                            <button
                                onClick={() => setStep(2)}
                                style={{ padding: '10px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '16px' }}
                            >
                                Próximo ➡️
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h2 style={{ marginBottom: '24px' }}>💬 Mensagens</h2>
                            {renderInput('Mensagem de Boas-vindas', 'welcomeMessage', 'textarea')}
                            {renderInput('Título da Lista de Planos', 'plansTitle')}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button
                                    onClick={() => setStep(1)}
                                    style={{ padding: '10px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    ⬅️ Voltar
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    style={{ padding: '10px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Próximo ➡️
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h2 style={{ marginBottom: '24px' }}>💳 Finalização</h2>
                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                <p style={{ color: '#22c55e', margin: 0 }}>
                                    ✅ O sistema de pagamento (PIX) será configurado automaticamente para usar seus gateways ativos.
                                </p>
                            </div>

                            {renderInput('Mensagem de Sucesso (Após Pagamento)', 'deliveryMessage', 'textarea')}
                            {renderInput('Link do Grupo VIP', 'deliveryLink')}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button
                                    onClick={() => setStep(2)}
                                    style={{ padding: '10px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    ⬅️ Voltar
                                </button>
                                <button
                                    onClick={handleFinish}
                                    style={{ padding: '10px 24px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    🚀 Criar Fluxo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
