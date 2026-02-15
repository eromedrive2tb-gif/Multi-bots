/** @jsxImportSource react */
import { Spinner } from '../../atoms/ui/Spinner'
import { RedirectCard } from '../../molecules/redirects/RedirectCard'
import { Redirect } from '../../../client/services/RedirectsClientService'
import React from 'react'

interface RedirectListProps {
    redirects: Redirect[]
    isLoading: boolean
    onEdit: (r: Redirect) => void
    onDelete: (id: string) => void
}

export const RedirectList: React.FC<RedirectListProps> = ({ redirects, isLoading, onEdit, onDelete }) => {
    const copyLink = (r: Redirect) => {
        const url = `https://${r.domain}/r/${r.slug}`
        navigator.clipboard.writeText(url).catch(() => alert(url))
    }

    const openLink = (r: Redirect) => {
        window.open(`https://${r.domain}/r/${r.slug}`, '_blank')
    }

    if (isLoading) {
        return <div className="loading-center"><Spinner size="lg" /></div>
    }

    if (!redirects || redirects.length === 0) {
        return (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                Nenhum link criado. Clique em "Criar Link" para começar.
            </div>
        )
    }

    return (
        <div className="redir-cards">
            {redirects.map(r => (
                <RedirectCard
                    key={r.id}
                    redirect={r}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onCopy={copyLink}
                    onOpen={openLink}
                />
            ))}
        </div>
    )
}
