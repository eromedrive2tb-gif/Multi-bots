import type { FC } from 'hono/jsx'
import { Sidebar } from '../organisms/Sidebar'
import { Header } from '../organisms/Header'

interface DashboardLayoutProps {
    title: string
    currentPath: string
    user: {
        name: string
        email: string
    }
    children: any
}

export const DashboardLayout: FC<DashboardLayoutProps> = ({
    title,
    currentPath,
    user,
    children,
}) => {
    return (
        <div class="dashboard-layout">
            <Sidebar currentPath={currentPath} user={user} />
            <div class="dashboard-main">
                <Header title={title} user={user} />
                <main class="dashboard-content">
                    {children}
                </main>
            </div>
        </div>
    )
}
