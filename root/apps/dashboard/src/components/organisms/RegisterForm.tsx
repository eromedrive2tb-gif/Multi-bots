import type { FC } from 'hono/jsx'
import { FormField } from '../molecules/FormField'
import { Button } from '../atoms/Button'
import { Card, CardHeader, CardBody } from '../atoms/Card'

interface RegisterFormProps {
    error?: string
}

export const RegisterForm: FC<RegisterFormProps> = ({ error }) => {
    return (
        <Card class="auth-card">
            <CardHeader>
                <h1 class="auth-title">Criar Conta</h1>
                <p class="auth-subtitle">Configure sua dashboard multi-tenant</p>
            </CardHeader>
            <CardBody>
                {error && (
                    <div class="alert alert-error">
                        {error}
                    </div>
                )}
                <form method="post" action="/api/auth/register" class="auth-form">
                    <FormField
                        label="Nome"
                        name="name"
                        type="text"
                        placeholder="Seu nome ou empresa"
                        required
                    />
                    <FormField
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        required
                    />
                    <FormField
                        label="Senha"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                    />
                    <FormField
                        label="Confirmar Senha"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        required
                    />
                    <Button type="submit" variant="primary" class="btn-block">
                        Criar Conta
                    </Button>
                </form>
                <div class="auth-footer">
                    <p>
                        Já tem conta?{' '}
                        <a href="/login" class="link">Entrar</a>
                    </p>
                </div>
            </CardBody>
        </Card>
    )
}
