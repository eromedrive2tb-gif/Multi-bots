import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserProvider } from './context/UserContext'

import { DashboardPage } from '../pages/dashboard'
import { BlueprintsPage } from '../pages/blueprints'
import { LoginPage } from '../pages/login'
import { RegisterPage } from '../pages/register'
import { BotsPage } from '../pages/bots'
import { SettingsPage } from '../pages/settings'
import { AnalyticsPage } from '../pages/analytics'
import { WebAppsPage } from './pages/WebAppsPage'
import { WebAppEditorPage } from './pages/WebAppEditorPage'

const queryClient = new QueryClient()

export const App = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/dashboard/blueprints" element={<BlueprintsPage />} />
                        <Route path="/dashboard/bots" element={<BotsPage />} />
                        <Route path="/dashboard/settings" element={<SettingsPage />} />
                        <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
                        <Route path="/dashboard/webapps" element={<WebAppsPage />} />
                        <Route path="/dashboard/webapps/:id" element={<WebAppEditorPage />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
            </UserProvider>
        </QueryClientProvider>
    )
}
