/** @jsxImportSource react */
import React from 'react'
import { AuthLayout } from '../components/templates/AuthLayout'
import { RegisterForm } from '../components/organisms/RegisterForm'

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
