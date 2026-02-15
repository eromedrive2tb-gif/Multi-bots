/** @jsxImportSource react */
import { Button } from '../../atoms/ui/Button'
import { Redirect } from '../../../client/services/RedirectsClientService'
import React from 'react'

interface RedirectCardProps {
    redirect: Redirect
    onEdit: (r: Redirect) => void
    onDelete: (id: string) => void
    onCopy: (r: Redirect) => void
    onOpen: (r: Redirect) => void
}

export const RedirectCard: React.FC<RedirectCardProps> = ({ redirect: r, onEdit, onDelete, onCopy, onOpen }) => {
    return (
        <div className="redir-card">
            <div className="redir-card-url">
                🔗 https://{r.domain}/r/{r.slug}
                {r.cloakerEnabled && <span className="redir-badge redir-badge-cloaker">◉ V2</span>}
            </div>
            <div className="redir-card-shortcode">
                shk={r.id.slice(0, 8)} <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }} onClick={() => navigator.clipboard.writeText(r.id.slice(0, 8))}>📋</button>
            </div>
            <div className="redir-card-badges">
                <span className={`redir-badge ${r.slugType === 'random' ? 'redir-badge-random' : 'redir-badge-custom'}`}>
                    {r.slugType === 'random' ? 'Aleatório' : 'Personalizado'}
                </span>
                <span className="redir-badge" style={{ background: 'rgba(59,130,246,.15)', color: '#3b82f6' }}>
                    {r.destinationType === 'bot' ? '🤖 Bot' : '🌐 URL'}
                </span>
                <span className={`redir-badge ${r.isActive ? 'redir-badge-active' : 'redir-badge-inactive'}`}>
                    {r.isActive ? 'Ativo' : 'Inativo'}
                </span>
                <span className="redir-card-clicks">⚡ {r.totalClicks} cliques</span>
            </div>
            {r.cloakerEnabled && (
                <div className="redir-cloaker-stats">
                    <span className="blocked">⊘ {r.blockedCount || 0} bloqueados</span>
                    <span className="allowed">✓ {r.allowedCount || 0} permitidos</span>
                </div>
            )}
            <div className="redir-card-actions">
                <Button size="sm" variant="secondary" onClick={() => onEdit(r)}>✏️ Editar</Button>
                <Button size="sm" variant="secondary" onClick={() => { if (confirm('Excluir?')) onDelete(r.id) }}>🗑️</Button>
                <Button size="sm" variant="secondary" onClick={() => onCopy(r)}>📋</Button>
                <Button size="sm" variant="secondary" onClick={() => onOpen(r)}>🔗</Button>
            </div>
        </div>
    )
}
