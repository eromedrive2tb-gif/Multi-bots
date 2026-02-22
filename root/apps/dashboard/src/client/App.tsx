/** @jsxImportSource react */
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserProvider } from './context/UserContext'
import { SocketProvider } from './context/SocketContext'

import { DashboardPage } from '../pages/dashboard'
import { BlueprintsPage } from '../pages/blueprints'
import { LoginPage } from '../pages/login'
import { RegisterPage } from '../pages/register'
import { BotsPage } from '../pages/bots'
import { SettingsPage } from '../pages/settings'
import { AnalyticsPage } from '../pages/analytics'
import { WebAppsPage } from './pages/WebAppsPage'
import { WebAppEditorPage } from './pages/WebAppEditorPage'
import { CustomersPage } from './pages/CustomersPage'
import { FinanceiroPage } from '../pages/financeiro'
import { PostagensPage } from '../pages/postagens'
import { RemarketingPage } from '../pages/remarketing'
import { RedirecionadoresPage } from '../pages/redirecionadores'
import { GatewaysPage } from '../pages/gateways'
import { PlanosPage } from '../pages/planos'
import ComunidadesPage from '../pages/comunidades'
import ComunidadesDetailsPage from '../pages/comunidades-details'
import SafePixWalletPage from '../pages/safepix-wallet'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false, // Prevents "disparada" when switching tabs
            refetchOnMount: true, // Allow refetch on initial mount
            refetchOnReconnect: true,
            staleTime: 1000 * 60 * 5, // Data remains "fresh" for 5 minutes (saves edge costs)
        },
    },
})

export const App = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <SocketProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/dashboard/comunidades" element={<ComunidadesPage />} />
                            <Route path="/dashboard/comunidades/:id" element={<ComunidadesDetailsPage />} />
                            <Route path="/dashboard/blueprints" element={<BlueprintsPage />} />
                            <Route path="/dashboard/bots" element={<BotsPage />} />
                            <Route path="/dashboard/settings" element={<SettingsPage />} />
                            <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
                            <Route path="/dashboard/webapps" element={<WebAppsPage />} />
                            <Route path="/dashboard/webapps/:id" element={<WebAppEditorPage />} />
                            <Route path="/dashboard/customers" element={<CustomersPage />} />
                            <Route path="/dashboard/financeiro" element={<FinanceiroPage />} />
                            <Route path="/dashboard/postagens" element={<PostagensPage />} />
                            <Route path="/dashboard/remarketing" element={<RemarketingPage />} />
                            <Route path="/dashboard/redirecionadores" element={<RedirecionadoresPage />} />
                            <Route path="/dashboard/gateways" element={<GatewaysPage />} />
                            <Route path="/dashboard/planos" element={<PlanosPage />} />
                            <Route path="/dashboard/safepix-wallet" element={<SafePixWalletPage />} />
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </BrowserRouter>
                </SocketProvider>
            </UserProvider>
        </QueryClientProvider>
    )
}
