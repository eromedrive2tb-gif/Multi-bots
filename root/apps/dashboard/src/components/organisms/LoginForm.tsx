import type { FC } from 'hono/jsx'
import { FormField } from '../molecules/FormField'
import { Button } from '../atoms/Button'
import { Card, CardHeader, CardBody } from '../atoms/Card'

interface LoginFormProps {
    error?: string
}

export const LoginForm: FC<LoginFormProps> = ({ error }) => {
    return (
        <Card class="auth-card">
            <CardHeader>
                <h1 class="auth-title">Entrar</h1>
                <p class="auth-subtitle">Acesse sua dashboard</p>
            </CardHeader>
            <CardBody>
                {error && (
                    <div class="alert alert-error">
                        {error}
                    </div>
                )}
                <form method="post" action="/api/auth/login" class="auth-form">
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
                    <Button type="submit" variant="primary" class="btn-block">
                        Entrar
                    </Button>
                </form>
                <div class="auth-footer">
                    <p>
                        Não tem conta?{' '}
                        <a href="/register" class="link">Criar conta</a>
                    </p>
                </div>
            </CardBody>
        </Card>
    )
}
