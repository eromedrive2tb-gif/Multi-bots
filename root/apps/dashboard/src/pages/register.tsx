/** @jsxImportSource react */
import React from 'react'
import { AuthLayout } from '../components/templates'
import { RegisterForm } from '../components/organisms'

interface RegisterPageProps {
    error?: string
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ error }) => {
    return (
        <AuthLayout>
            <RegisterForm error={error} />
        </AuthLayout>
    )
}
