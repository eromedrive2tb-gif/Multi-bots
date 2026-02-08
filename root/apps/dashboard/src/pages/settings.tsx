/** @jsxImportSource react */
import React, { useState } from 'react'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { Card, CardHeader, CardBody } from '../components/atoms/Card'
import { Alert } from '../components/atoms/Alert'
import { TenantInfoBox } from '../components/molecules/TenantInfoBox'
import { ProfileForm } from '../components/organisms/ProfileForm'
import { PasswordForm } from '../components/organisms/PasswordForm'
import { useUser } from '../client/context/UserContext'

export const SettingsPage: React.FC = () => {
    const { user, tenantId, isLoading } = useUser()
    const [alert, setAlert] = React.useState<{ type: 'success' | 'error', message: string } | null>(null)

    if (isLoading) {
        return (
            <DashboardLayout title="Configurações" currentPath="/dashboard/settings">
                <div className="p-8 text-center">Carregando configurações...</div>
            </DashboardLayout>
        )
    }

    const displayUser = user || { name: 'Usuário', email: '' }

    return (
        <DashboardLayout title="Configurações" currentPath="/dashboard/settings">
            <div className="settings-grid">
                {alert && (
                    <div className="settings-alert-container">
                        <Alert
                            type={alert.type}
                            message={alert.message}
                            onClose={() => setAlert(null)}
                        />
                    </div>
                )}

                <div className="settings-main">
                    <ProfileForm
                        user={displayUser}
                        onSuccess={(msg) => setAlert({ type: 'success', message: msg })}
                        onError={(msg) => setAlert({ type: 'error', message: msg })}
                    />

                    <PasswordForm
                        onSuccess={(msg) => setAlert({ type: 'success', message: msg })}
                        onError={(msg) => setAlert({ type: 'error', message: msg })}
                    />
                </div>

                <div className="settings-sidebar">
                    <Card>
                        <CardHeader><h3>Informações do Tenant</h3></CardHeader>
                        <CardBody>
                            <TenantInfoBox tenantId={tenantId || ''} />
                        </CardBody>
                    </Card>
                </div>
            </div>

            <style>{`
                .settings-grid {
                    display: grid;
                    grid-template-columns: 1fr 350px;
                    gap: 32px;
                }
                
                .settings-main {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                
                .settings-alert-container {
                    grid-column: 1 / -1;
                    margin-bottom: 8px;
                }
                
                @media (max-width: 1024px) {
                    .settings-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </DashboardLayout>
    )
}
