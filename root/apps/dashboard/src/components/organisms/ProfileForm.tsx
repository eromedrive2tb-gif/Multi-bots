/** @jsxImportSource react */
import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '../atoms/Card'
import { FormField } from '../molecules/FormField'
import { Button } from '../atoms/Button'
import { Input } from '../atoms/Input'

interface ProfileFormProps {
    user: { name: string; email: string }
    onSuccess: (message: string) => void
    onError: (message: string) => void
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ user, onSuccess, onError }) => {
    const [name, setName] = useState(user.name)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setName(user.name)
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/settings/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })
            const result = await res.json() as any
            if (result.success) {
                onSuccess('Perfil atualizado com sucesso!')
            } else {
                onError(result.error || 'Erro ao atualizar perfil')
            }
        } catch (err) {
            onError('Erro de conexão ao servidor')
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
                        onChange={(e) => setName(e.target.value)}
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
