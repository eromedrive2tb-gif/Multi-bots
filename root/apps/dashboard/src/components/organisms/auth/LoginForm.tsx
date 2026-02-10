/** @jsxImportSource react */
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FormField } from '../../molecules/ui/FormField'
import { Button } from '../../atoms/ui/Button'
import { Card, CardHeader, CardBody } from '../../atoms/ui/Card'

interface LoginFormProps {
    error?: string
}

export const LoginForm: React.FC<LoginFormProps> = ({ error: initialError }) => {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(initialError || '')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const result = await response.json() as any

            if (result.success) {
                navigate('/dashboard')
            } else {
                setError(result.error || 'Erro ao fazer login')
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
                <h1 className="auth-title">Entrar</h1>
                <p className="auth-subtitle">Acesse sua dashboard</p>
            </CardHeader>
            <CardBody>
                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="auth-form">
                    <FormField
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e: any) => setEmail(e.target.value)}
                        required
                    />
                    <FormField
                        label="Senha"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e: any) => setPassword(e.target.value)}
                        required
                    />
                    <Button type="submit" variant="primary" className="btn-block" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                </form>
                <div className="auth-footer">
                    <p>
                        Não tem conta?{' '}
                        <Link to="/register" className="link">Criar conta</Link>
                    </p>
                </div>
            </CardBody>
        </Card>
    )
}
