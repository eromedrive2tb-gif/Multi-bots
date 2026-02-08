/** @jsxImportSource react */
import type { FC, ReactNode } from 'react'

interface AuthLayoutProps {
    children: ReactNode
}

export const AuthLayout: FC<AuthLayoutProps> = ({ children }) => {
    return (
        <div className="auth-layout">
            <div className="auth-background">
                <div className="auth-gradient"></div>
            </div>
            <main className="auth-container">
                {children}
            </main>
        </div>
    )
}
