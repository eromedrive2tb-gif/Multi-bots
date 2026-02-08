/** @jsxImportSource react */
import React, { useState } from 'react'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { Card, CardHeader, CardBody } from '../components/atoms/Card'
import { FormField } from '../components/molecules/FormField'
import { Button } from '../components/atoms/Button'
import { Input } from '../components/atoms/Input'
import { Alert } from '../components/atoms/Alert'

import { useUser } from '../client/context/UserContext'

export const SettingsPage: React.FC = () => {
    const { user, tenantId, isLoading } = useUser()

    const [profileName, setProfileName] = useState('')
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [loading, setLoading] = useState(false)

    // Sync profile name when user loads
    React.useEffect(() => {
        if (user?.name) {
            setProfileName(user.name)
        }
    }, [user])

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setAlert(null)
        try {
            const res = await fetch('/api/settings/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: profileName })
            })
            const result = await res.json() as any
            if (result.success) {
                setAlert({ type: 'success', message: 'Perfil atualizado com sucesso!' })
                // window.location.reload() or refetch auth-me would be better but we'll stick to alert for now
            } else {
                setAlert({ type: 'error', message: result.error || 'Erro ao atualizar perfil' })
            }
        } catch (e) {
            setAlert({ type: 'error', message: 'Erro de conexão' })
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setAlert({ type: 'error', message: 'As senhas não coincidem' })
            return
        }
        setLoading(true)
        setAlert(null)
        try {
            const res = await fetch('/api/settings/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(passwordData)
            })
            const result = await res.json() as any
            if (result.success) {
                setAlert({ type: 'success', message: 'Senha alterada com sucesso!' })
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
            } else {
                setAlert({ type: 'error', message: result.error || 'Erro ao alterar senha' })
            }
        } catch (e) {
            setAlert({ type: 'error', message: 'Erro de conexão' })
        } finally {
            setLoading(false)
        }
    }

    if (isLoading) {
        return (
            <DashboardLayout title="Configurações" currentPath="/dashboard/settings">
                <div className="p-8 text-center">Carregando configurações...</div>
            </DashboardLayout>
        )
    }

    const displayUser = user || { name: 'Usuário', email: '' }

    return (
        <DashboardLayout
            title="Configurações"
            currentPath="/dashboard/settings"
        >
            <div className="settings-grid">
                {alert && (
                    <div className="settings-alert-container" style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                        <Alert
                            type={alert.type}
                            message={alert.message}
                            onClose={() => setAlert(null)}
                        />
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <h3>Perfil</h3>
                    </CardHeader>
                    <CardBody>
                        <form onSubmit={handleProfileSubmit} className="settings-form">
                            <FormField
                                label="Nome"
                                name="name"
                                type="text"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                            />
                            <div className="form-field">
                                <label className="form-label">Email</label>
                                <Input
                                    name="email"
                                    type="email"
                                    value={displayUser.email}
                                    disabled
                                />
                            </div>
                            <Button type="submit" variant="primary" disabled={loading}>
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </form>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <h3>Informações do Tenant</h3>
                    </CardHeader>
                    <CardBody>
                        <div className="info-row">
                            <span className="info-label">Tenant ID</span>
                            <code className="info-value">{tenantId}</code>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Plano</span>
                            <span className="info-value">Free</span>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <h3>Alterar Senha</h3>
                    </CardHeader>
                    <CardBody>
                        <form onSubmit={handlePasswordSubmit} className="settings-form">
                            <FormField
                                label="Senha Atual"
                                name="currentPassword"
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                required
                            />
                            <FormField
                                label="Nova Senha"
                                name="newPassword"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                required
                            />
                            <FormField
                                label="Confirmar Nova Senha"
                                name="confirmPassword"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                required
                            />
                            <Button type="submit" variant="secondary" disabled={loading}>
                                {loading ? 'Alterando...' : 'Alterar Senha'}
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </DashboardLayout>
    )
}
