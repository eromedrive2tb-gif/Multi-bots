import type { FC } from 'hono/jsx'
import { Card, CardHeader, CardBody } from '../atoms/Card'
import { Button } from '../atoms/Button'
import { FormField } from '../molecules/FormField'

interface AddBotFormProps {
    error?: string
}

export const AddBotForm: FC<AddBotFormProps> = ({ error }) => {
    return (
        <Card class="add-bot-form">
            <CardHeader>
                <h3>➕ Adicionar Novo Bot</h3>
            </CardHeader>
            <CardBody>
                {error && (
                    <div class="alert alert-error">{error}</div>
                )}

                <form method="post" action="/api/bots" class="bot-form">
                    <FormField
                        label="Nome do Bot"
                        name="name"
                        type="text"
                        placeholder="Meu Bot"
                        required
                    />

                    <div class="form-field">
                        <label class="form-label">Provider *</label>
                        <div class="provider-select">
                            <label class="provider-option">
                                <input type="radio" name="provider" value="telegram" required checked />
                                <span class="provider-card">
                                    <span class="provider-icon">📱</span>
                                    <span class="provider-name">Telegram</span>
                                </span>
                            </label>
                            <label class="provider-option">
                                <input type="radio" name="provider" value="discord" />
                                <span class="provider-card">
                                    <span class="provider-icon">🎮</span>
                                    <span class="provider-name">Discord</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    <div class="credentials-section telegram-creds">
                        <h4>Credenciais Telegram</h4>
                        <FormField
                            label="Bot Token"
                            name="telegram_token"
                            type="password"
                            placeholder="123456:ABC-DEF..."
                        />
                        <p class="form-hint">
                            Obtenha o token com o @BotFather no Telegram
                        </p>
                    </div>

                    <div class="credentials-section discord-creds" style="display: none">
                        <h4>Credenciais Discord</h4>
                        <FormField
                            label="Application ID"
                            name="discord_application_id"
                            type="text"
                            placeholder="123456789012345678"
                        />
                        <FormField
                            label="Public Key"
                            name="discord_public_key"
                            type="text"
                            placeholder="abc123..."
                        />
                        <FormField
                            label="Bot Token"
                            name="discord_token"
                            type="password"
                            placeholder="MTIzNDU2Nzg5..."
                        />
                        <p class="form-hint">
                            Encontre essas informações no Discord Developer Portal
                        </p>
                    </div>

                    <Button type="submit" variant="primary">
                        Adicionar Bot
                    </Button>
                </form>

                <script dangerouslySetInnerHTML={{
                    __html: `
                    document.querySelectorAll('input[name="provider"]').forEach(radio => {
                        radio.addEventListener('change', function() {
                            const telegramCreds = document.querySelector('.telegram-creds');
                            const discordCreds = document.querySelector('.discord-creds');
                            
                            if (this.value === 'telegram') {
                                telegramCreds.style.display = 'block';
                                discordCreds.style.display = 'none';
                            } else {
                                telegramCreds.style.display = 'none';
                                discordCreds.style.display = 'block';
                            }
                        });
                    });
                `}} />
            </CardBody>
        </Card>
    )
}
