/** @jsxImportSource react */
import React from 'react'
import { DashboardLayout } from '../components/templates'
import { MaintenanceNotice } from '../components/organisms'

export const SafePixWalletPage: React.FC = () => {
    return (
        <DashboardLayout title="Carteira SafePix" currentPath="/dashboard/safepix-wallet">
            <MaintenanceNotice
                title="Página em Manutenção"
                message="Estamos preparando algo incrível para você. A Carteira SafePix trará segurança e agilidade para sua gestão financeira diretamente aqui no dashboard."
            />
        </DashboardLayout>
    )
}

export default SafePixWalletPage
