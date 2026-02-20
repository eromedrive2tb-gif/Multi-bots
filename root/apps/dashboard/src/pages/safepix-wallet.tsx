import React from 'react'
import { DashboardLayout } from '../components/templates'
import { Wallet } from 'lucide-react'

export const SafePixWalletPage: React.FC = () => {
    return (
        <DashboardLayout title="Carteira SafePix" currentPath="/dashboard/safepix-wallet">
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '60vh', background: 'var(--color-bg-card)', borderRadius: '12px',
                border: '1px dashed rgba(6, 182, 212, 0.4)', textAlign: 'center', padding: '24px'
            }}>
                <Wallet size={64} className="text-cyan-neon" style={{ marginBottom: '16px', opacity: 0.8 }} />
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Em Breve</h2>
                <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
                    A Carteira SafePix está em desenvolvimento. Em breve você poderá gerenciar seus saques e saldos diretamente por aqui.
                </p>
            </div>
        </DashboardLayout>
    )
}

export default SafePixWalletPage
