/** @jsxImportSource react */
import type { FC, ReactNode } from 'react'
import { Sidebar } from '../organisms/general/Sidebar'
import { Header } from '../organisms/general/Header'
import { useUser } from '../../client/context/UserContext'

interface DashboardLayoutProps {
    title: string
    currentPath: string
    children: ReactNode
}

export const DashboardLayout: FC<DashboardLayoutProps> = ({
    title,
    currentPath,
    children,
}) => {
    const { user, isLoading } = useUser()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    // Default to empty object if no user (should be handled by redirect if not authenticated)
    const displayUser = user || { name: 'Usuário', email: '' }

    return (
        <div className="dashboard-layout">
            <Sidebar currentPath={currentPath} user={displayUser} />
            <div className="dashboard-main">
                <Header title={title} user={displayUser} />
                <main className="dashboard-content">
                    {children}
                </main>
            </div>
        </div>
    )
}
