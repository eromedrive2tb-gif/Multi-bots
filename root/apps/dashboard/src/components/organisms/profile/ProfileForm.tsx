/** @jsxImportSource react */
import React, { useState, useEffect } from 'react'
import { useSocket } from '../../../client/context/SocketContext'
import { Card, CardHeader, CardBody } from '../../atoms/ui/Card'
import { FormField } from '../../molecules/ui/FormField'
import { Button } from '../../atoms/ui/Button'
import { Input } from '../../atoms/ui/Input'

interface ProfileFormProps {
    user: { name: string; email: string }
    onSuccess: (message: string) => void
    onError: (message: string) => void
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ user, onSuccess, onError }) => {
    const [name, setName] = useState(user.name)
    const [loading, setLoading] = useState(false)
    const { request } = useSocket()

    useEffect(() => {
        setName(user.name)
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await request('UPDATE_PROFILE', { name })
            onSuccess('Perfil atualizado com sucesso!')
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Erro ao atualizar perfil')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader><h3>Perfil</h3></CardHeader>
            <CardBody>
                <form onSubmit={handleSubmit} className="settings-form">
                    <FormField
                        label="Nome"
                        name="name"
                        type="text"
                        value={name}
                        onChange={(e: any) => setName(e.target.value)}
                        required
                    />
                    <div className="form-field" style={{ marginBottom: '1rem' }}>
                        <label className="form-label">Email</label>
                        <Input name="email" type="email" value={user.email} disabled />
                    </div>
                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </form>
            </CardBody>
            <style>{`
                .settings-form { display: flex; flex-direction: column; gap: 16px; }
            `}</style>
        </Card>
    )
}
