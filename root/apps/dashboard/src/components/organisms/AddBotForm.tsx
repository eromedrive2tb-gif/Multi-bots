/** @jsxImportSource react */
import React, { useState } from 'react'
import { Card, CardHeader, CardBody } from '../atoms/Card'
import { Button } from '../atoms/Button'
import { FormField } from '../molecules/FormField'

interface AddBotFormProps {
    onSuccess?: () => void
}

export const AddBotForm: React.FC<AddBotFormProps> = ({ onSuccess }) => {
    const [name, setName] = useState('')
    const [provider, setProvider] = useState<'telegram' | 'discord'>('telegram')
    const [telegramToken, setTelegramToken] = useState('')
    const [discordAppId, setDiscordAppId] = useState('')
    const [discordPublicKey, setDiscordPublicKey] = useState('')
    const [discordToken, setDiscordToken] = useState('')
    const [error, setError] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(undefined)

        const credentials = provider === 'telegram'
            ? { token: telegramToken }
            : { applicationId: discordAppId, publicKey: discordPublicKey, token: discordToken }

        try {
            const response = await fetch('/api/bots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, provider, credentials }),
            })

            const result = await response.json() as any
            if (result.success) {
                // Reset form
                setName('')
                setTelegramToken('')
                setDiscordAppId('')
                setDiscordPublicKey('')
                setDiscordToken('')
                if (onSuccess) onSuccess()
            } else {
                setError(result.error || 'Erro ao adicionar bot')
            }
        } catch (err) {
            setError('Erro de conexão')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="add-bot-form">
            <CardHeader>
                <h3>➕ Adicionar Novo Bot</h3>
            </CardHeader>
            <CardBody>
                {error && (
                    <div className="alert alert-error">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="bot-form">
                    <FormField
                        label="Nome do Bot"
                        name="name"
                        type="text"
                        placeholder="Meu Bot"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />

                    <div className="form-field">
                        <label className="form-label">Provider *</label>
                        <div className="provider-select">
                            <label className="provider-option">
                                <input
                                    type="radio"
                                    name="provider"
                                    value="telegram"
                                    checked={provider === 'telegram'}
                                    onChange={() => setProvider('telegram')}
                                    required
                                />
                                <span className="provider-card">
                                    <span className="provider-icon">📱</span>
                                    <span className="provider-name">Telegram</span>
                                </span>
                            </label>
                            <label className="provider-option">
                                <input
                                    type="radio"
                                    name="provider"
                                    value="discord"
                                    checked={provider === 'discord'}
                                    onChange={() => setProvider('discord')}
                                />
                                <span className="provider-card">
                                    <span className="provider-icon">🎮</span>
                                    <span className="provider-name">Discord</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    {provider === 'telegram' ? (
                        <div className="credentials-section telegram-creds">
                            <h4>Credenciais Telegram</h4>
                            <FormField
                                label="Bot Token"
                                name="telegram_token"
                                type="password"
                                placeholder="123456:ABC-DEF..."
                                value={telegramToken}
                                onChange={(e) => setTelegramToken(e.target.value)}
                                required
                            />
                            <p className="form-hint">
                                Obtenha o token com o @BotFather no Telegram
                            </p>
                        </div>
                    ) : (
                        <div className="credentials-section discord-creds">
                            <h4>Credenciais Discord</h4>
                            <FormField
                                label="Application ID"
                                name="discord_application_id"
                                type="text"
                                placeholder="123456789012345678"
                                value={discordAppId}
                                onChange={(e) => setDiscordAppId(e.target.value)}
                                required
                            />
                            <FormField
                                label="Public Key"
                                name="discord_public_key"
                                type="text"
                                placeholder="abc123..."
                                value={discordPublicKey}
                                onChange={(e) => setDiscordPublicKey(e.target.value)}
                                required
                            />
                            <FormField
                                label="Bot Token"
                                name="discord_token"
                                type="password"
                                placeholder="MTIzNDU2Nzg5..."
                                value={discordToken}
                                onChange={(e) => setDiscordToken(e.target.value)}
                                required
                            />
                            <p className="form-hint">
                                Encontre essas informações no Discord Developer Portal
                            </p>
                        </div>
                    )}

                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Adicionando...' : 'Adicionar Bot'}
                    </Button>
                </form>
            </CardBody>
        </Card>
    )
}
