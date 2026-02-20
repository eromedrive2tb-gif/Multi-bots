/** @jsxImportSource react */
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FormField } from '../../molecules/ui/FormField'
import { Button } from '../../atoms/ui/Button'
import { Card, CardHeader, CardBody } from '../../atoms/ui/Card'
import { Rocket } from 'lucide-react'

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
                <div className="flex flex-col items-center justify-center mb-6">
                    <div className="logo-icon-wrap mb-4" style={{
                        background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                        borderRadius: '16px',
                        padding: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 25px rgba(6, 182, 212, 0.5)'
                    }}>
                        <Rocket size={32} color="white" />
                    </div>
                    <h1 className="auth-title text-center text-3xl font-black text-white">Entrar</h1>
                    <p className="auth-subtitle text-center text-slate-400 mt-2">Acesse sua dashboard</p>
                </div>
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
