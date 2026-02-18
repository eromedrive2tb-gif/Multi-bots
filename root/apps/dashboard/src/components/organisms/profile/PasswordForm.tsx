/** @jsxImportSource react */
import React, { useState } from 'react'
import { useSocket } from '../../../client/context/SocketContext'
import { Card, CardHeader, CardBody } from '../../atoms/ui/Card'
import { FormField } from '../../molecules/ui/FormField'
import { Button } from '../../atoms/ui/Button'

interface PasswordFormProps {
    onSuccess: (message: string) => void
    onError: (message: string) => void
}

export const PasswordForm: React.FC<PasswordFormProps> = ({ onSuccess, onError }) => {
    const { request } = useSocket()
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            onError('As senhas não coincidem')
            return
        }
        setLoading(true)
        try {
            await request('UPDATE_PASSWORD', passwordData)
            onSuccess('Senha alterada com sucesso!')
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Erro ao alterar senha')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader><h3>Alterar Senha</h3></CardHeader>
            <CardBody>
                <form onSubmit={handleSubmit} className="settings-form">
                    <FormField
                        label="Senha Atual"
                        name="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e: any) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        required
                    />
                    <FormField
                        label="Nova Senha"
                        name="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e: any) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                    />
                    <FormField
                        label="Confirmar Nova Senha"
                        name="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e: any) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required
                    />
                    <Button type="submit" variant="secondary" disabled={loading}>
                        {loading ? 'Alterando...' : 'Alterar Senha'}
                    </Button>
                </form>
            </CardBody>
            <style>{`
                .settings-form { display: flex; flex-direction: column; gap: 16px; }
            `}</style>
        </Card>
    )
}
