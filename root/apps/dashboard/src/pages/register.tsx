import type { FC } from 'hono/jsx'
import { AuthLayout } from '../components/templates/AuthLayout'
import { RegisterForm } from '../components/organisms/RegisterForm'

interface RegisterPageProps {
    error?: string
}

export const RegisterPage: FC<RegisterPageProps> = ({ error }) => {
    return (
        <AuthLayout>
            <RegisterForm error={error} />
        </AuthLayout>
    )
}
