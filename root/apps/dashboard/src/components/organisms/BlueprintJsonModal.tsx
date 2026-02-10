/** @jsxImportSource react */
import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../atoms/Button'
import type { Blueprint } from '../../../../engine/src/core/types'

interface BlueprintJsonModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (blueprint: Blueprint) => void
    initialBlueprint: Blueprint | null
    isSaving?: boolean
}

export const BlueprintJsonModal: React.FC<BlueprintJsonModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialBlueprint,
    isSaving = false
}) => {
    const [jsonValue, setJsonValue] = useState('')
    const [validation, setValidation] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null)

    // Sync internal state when initialBlueprint changes
    useEffect(() => {
        if (isOpen) {
            if (initialBlueprint) {
                setJsonValue(JSON.stringify(initialBlueprint, null, 2))
            } else {
                setJsonValue('')
            }
            setValidation(null)
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
        }
    }, [initialBlueprint, isOpen])

    if (!isOpen) return null

    const handleFormatJson = () => {
        try {
            const parsed = JSON.parse(jsonValue)
            setJsonValue(JSON.stringify(parsed, null, 2))
            setValidation({ message: '✅ JSON formatado com sucesso!', type: 'success' })
        } catch (e: any) {
            setValidation({ message: '❌ JSON inválido: ' + e.message, type: 'error' })
        }
    }

    const handleValidateJson = () => {
        try {
            const parsed = JSON.parse(jsonValue)
            const errors: string[] = []
            if (!parsed.id) errors.push('Campo "id" é obrigatório')
            if (!parsed.name) errors.push('Campo "name" é obrigatório')
            if (!parsed.trigger) errors.push('Campo "trigger" é obrigatório')
            if (!parsed.entry_step) errors.push('Campo "entry_step" é obrigatório')
            if (!parsed.steps || typeof parsed.steps !== 'object') errors.push('Campo "steps" é obrigatório e deve ser um objeto')

            if (errors.length > 0) {
                setValidation({ message: '⚠️ Problemas encontrados:\n• ' + errors.join('\n• '), type: 'warning' })
            } else {
                const stepCount = Object.keys(parsed.steps).length
                setValidation({ message: `✅ JSON válido! ${stepCount} steps encontrados.`, type: 'success' })
            }
        } catch (e: any) {
            setValidation({ message: '❌ JSON inválido: ' + e.message, type: 'error' })
        }
    }

    const handleSave = () => {
        try {
            const blueprint = JSON.parse(jsonValue)
            onSave(blueprint)
        } catch (e: any) {
            setValidation({ message: '❌ JSON inválido: ' + e.message, type: 'error' })
        }
    }

    const handleLoadExample = () => {
        const example = {
            id: "meu_fluxo",
            name: "Meu Fluxo de Exemplo",
            description: "Um fluxo simples de boas-vindas",
            trigger: "/start",
            version: "1.0.0",
            entry_step: "welcome",
            steps: {
                welcome: {
                    type: "molecule",
                    action: "send_message",
                    params: {
                        text: "👋 Olá! Bem-vindo ao nosso bot!\n\nDigite /ajuda para ver os comandos.",
                        parse_mode: "markdown"
                    },
                    next_step: null
                }
            }
        }
        setJsonValue(JSON.stringify(example, null, 2))
        setValidation({ message: '📋 Exemplo carregado! Personalize e salve.', type: 'info' })
    }

    // Using specialized layout for JSON Editor while using global modal classes
    const modalContent = (
        <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '900px', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
                <div className="modal-header" style={{ margin: '0', padding: '20px', borderBottom: '1px solid var(--color-border)', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="modal-title" style={{ margin: '0' }}>
                        {initialBlueprint ? `📝 Editar: ${initialBlueprint.name}` : '📤 Upload Blueprint JSON'}
                    </h3>
                    <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1, maxHeight: 'calc(90vh - 140px)' }}>
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden', background: '#0d0d14' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Editor JSON</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="secondary" size="sm" onClick={handleFormatJson}>🔧 Formatar</Button>
                                <Button variant="secondary" size="sm" onClick={handleValidateJson}>✅ Validar</Button>
                                <Button variant="secondary" size="sm" onClick={handleLoadExample}>📋 Exemplo</Button>
                            </div>
                        </div>
                        <textarea
                            style={{
                                width: '100%',
                                minHeight: '400px',
                                padding: '16px',
                                background: 'transparent',
                                border: 'none',
                                color: '#e0e0e0',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.875rem',
                                lineHeight: '1.6',
                                outline: 'none',
                                resize: 'vertical'
                            }}
                            value={jsonValue}
                            onChange={e => setJsonValue(e.target.value)}
                            placeholder='{"id": "meu_fluxo", "name": "Meu Fluxo", "trigger": "/start", "steps": {...}}'
                        />
                        {validation && (
                            <div style={{
                                padding: '12px 16px',
                                fontSize: '0.875rem',
                                borderTop: '1px solid var(--color-border)',
                                background: validation.type === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                                    validation.type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                                        validation.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                color: validation.type === 'success' ? '#10b981' :
                                    validation.type === 'error' ? '#ef4444' :
                                        validation.type === 'warning' ? '#f59e0b' : '#6366f1'
                            }}>
                                {validation.message.split('\n').map((line, i) => (
                                    <React.Fragment key={i}>
                                        {line}
                                        {i < validation.message.split('\n').length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-actions" style={{ margin: '0', padding: '16px 20px', background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)' }}>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? '⏳ Salvando...' : '💾 Salvar Blueprint'}
                    </Button>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
