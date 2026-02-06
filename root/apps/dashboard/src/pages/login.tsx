import type { FC } from 'hono/jsx'
import { AuthLayout } from '../components/templates/AuthLayout'
import { LoginForm } from '../components/organisms/LoginForm'

interface LoginPageProps {
    error?: string
}

export const LoginPage: FC<LoginPageProps> = ({ error }) => {
    return (
        <AuthLayout>
            <LoginForm error={error} />
        </AuthLayout>
    )
}
