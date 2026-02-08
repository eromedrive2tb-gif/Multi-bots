/** @jsxImportSource react */
import React from 'react'
import { AuthLayout } from '../components/templates/AuthLayout'
import { LoginForm } from '../components/organisms/LoginForm'

interface LoginPageProps {
    error?: string
}

export const LoginPage: React.FC<LoginPageProps> = ({ error }) => {
    return (
        <AuthLayout>
            <LoginForm error={error} />
        </AuthLayout>
    )
}
