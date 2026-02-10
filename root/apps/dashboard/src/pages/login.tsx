/** @jsxImportSource react */
import React from 'react'
import { AuthLayout } from '../components/templates'
import { LoginForm } from '../components/organisms'

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
