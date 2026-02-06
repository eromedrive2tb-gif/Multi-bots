import type { FC } from 'hono/jsx'

interface AuthLayoutProps {
    children: any
}

export const AuthLayout: FC<AuthLayoutProps> = ({ children }) => {
    return (
        <div class="auth-layout">
            <div class="auth-background">
                <div class="auth-gradient"></div>
            </div>
            <main class="auth-container">
                {children}
            </main>
        </div>
    )
}
