import type { FC } from 'hono/jsx'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { Card, CardHeader, CardBody } from '../components/atoms/Card'
import { FormField } from '../components/molecules/FormField'
import { Button } from '../components/atoms/Button'
import { Input } from '../components/atoms/Input'

interface SettingsPageProps {
    user: {
        name: string
        email: string
    }
    tenantId: string
}

export const SettingsPage: FC<SettingsPageProps> = ({ user, tenantId }) => {
    return (
        <DashboardLayout
            title="Configurações"
            currentPath="/dashboard/settings"
            user={user}
        >
            <div class="settings-grid">
                <Card>
                    <CardHeader>
                        <h3>Perfil</h3>
                    </CardHeader>
                    <CardBody>
                        <form method="post" action="/api/settings/profile" class="settings-form">
                            <FormField
                                label="Nome"
                                name="name"
                                type="text"
                                value={user.name}
                            />
                            <div class="form-field">
                                <label class="form-label">Email</label>
                                <Input
                                    name="email"
                                    type="email"
                                    value={user.email}
                                    disabled
                                />
                            </div>
                            <Button type="submit" variant="primary">
                                Salvar Alterações
                            </Button>
                        </form>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <h3>Informações do Tenant</h3>
                    </CardHeader>
                    <CardBody>
                        <div class="info-row">
                            <span class="info-label">Tenant ID</span>
                            <code class="info-value">{tenantId}</code>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Plano</span>
                            <span class="info-value">Free</span>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <h3>Alterar Senha</h3>
                    </CardHeader>
                    <CardBody>
                        <form method="post" action="/api/settings/password" class="settings-form">
                            <FormField
                                label="Senha Atual"
                                name="currentPassword"
                                type="password"
                                required
                            />
                            <FormField
                                label="Nova Senha"
                                name="newPassword"
                                type="password"
                                required
                            />
                            <FormField
                                label="Confirmar Nova Senha"
                                name="confirmPassword"
                                type="password"
                                required
                            />
                            <Button type="submit" variant="secondary">
                                Alterar Senha
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </DashboardLayout>
    )
}
