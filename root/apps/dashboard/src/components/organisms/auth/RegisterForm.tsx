/** @jsxImportSource react */
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FormField } from '../../molecules/ui/FormField'
import { Button } from '../../atoms/ui/Button'
import { Card, CardHeader, CardBody } from '../../atoms/ui/Card'

interface RegisterFormProps {
    error?: string
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ error: initialError }) => {
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState(initialError || '')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError('Senhas não conferem')
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, confirmPassword }),
            })

            const result = await response.json() as any

            if (result.success) {
                navigate('/dashboard')
            } else {
                setError(result.error || 'Erro ao criar conta')
            }
        } catch (err) {
            setError('Erro de conexão. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="auth-card">
            <CardHeader>
                <h1 className="auth-title">Criar Conta</h1>
                <p className="auth-subtitle">Configure sua dashboard multi-tenant</p>
            </CardHeader>
            <CardBody>
                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="auth-form">
                    <FormField
                        label="Nome"
                        name="name"
                        type="text"
                        placeholder="Seu nome ou empresa"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <FormField
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <FormField
                        label="Senha"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <FormField
                        label="Confirmar Senha"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <Button type="submit" variant="primary" className="btn-block" disabled={loading}>
                        {loading ? 'Criando...' : 'Criar Conta'}
                    </Button>
                </form>
                <div className="auth-footer">
                    <p>
                        Já tem conta?{' '}
                        <Link to="/login" className="link">Entrar</Link>
                    </p>
                </div>
            </CardBody>
        </Card>
    )
}
