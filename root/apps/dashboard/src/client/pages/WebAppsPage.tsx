/** @jsxImportSource react */

import React, { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardBody } from '../../components/atoms/ui/Card'
import { Button } from '../../components/atoms/ui/Button'
import { Plus, Code, Globe, Calendar, Trash2 } from 'lucide-react'
import type { WebAppPage } from '../../../../engine/src/core/types'
import { DashboardLayout } from '../../components/templates/DashboardLayout'
import { DisclaimerBanner } from '../../components/atoms/ui/DisclaimerBanner'

const WEBAPP_DISCLAIMER = '⚠️ Esta opção é otimizada para SPAs pequenas (HTML puro, HTMX, Alpine.js) ou projetos Vite enxutos. Projetos grandes, de alta densidade de arquivos e funções complexas (como e-commerces pesados em React), sofrerão penalidades severas de performance no dispositivo do usuário (Client-Side) e em SEO se não forem rigorosamente otimizados com micro-frontends ou Edge-Rendering.'

export function WebAppsPage() {
    const [pages, setPages] = useState<WebAppPage[]>([])
    const [loading, setLoading] = useState(true)
    const { request, isConnected } = useSocket()

    useEffect(() => {
        if (isConnected) {
            fetchPages()
        }
    }, [isConnected])

    const fetchPages = async () => {
        try {
            const data = await request<WebAppPage[]>('FETCH_PAGES')
            if (data) {
                setPages(data)
            }
        } catch (error) {
            console.error('Failed to fetch pages', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir o WebApp "${name}"? Esta ação é irreversível e removerá todos os dados da página.`)) {
            return
        }

        try {
            await request<any>('DELETE_PAGE', { id })
            setPages(prev => prev.filter(p => p.id !== id))
        } catch (error) {
            console.error('Failed to delete page', error)
            alert('Erro ao excluir página: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
        }
    }



    return (
        <DashboardLayout title="WebApps" currentPath="/dashboard/webapps">
            <div className="webapps-container">
                <div className="webapps-header">
                    <div>
                        <h1 className="webapps-title">WebApps</h1>
                        <p className="text-muted">
                            Crie mini-apps dinâmicos para seus bots do Telegram.
                        </p>
                    </div>
                    <Link to="/dashboard/webapps/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Página
                        </Button>
                    </Link>
                </div>

                <DisclaimerBanner
                    variant="warning"
                    title="Aviso de Performance"
                    message={WEBAPP_DISCLAIMER}
                    dismissible
                />

                {loading ? (
                    <div className="loading-state">Carregando...</div>
                ) : pages.length === 0 ? (
                    <Card>
                        <CardBody className="empty-state">
                            <div className="empty-icon-wrapper">
                                <Code className="empty-icon" />
                            </div>
                            <div className="empty-text">
                                <h3 className="empty-title">Nenhum WebApp encontrado</h3>
                                <p className="text-muted">Comece criando sua primeira página dinâmica.</p>
                            </div>
                            <Link to="/dashboard/webapps/new">
                                <Button variant="secondary">Criar WebApp</Button>
                            </Link>
                        </CardBody>
                    </Card>
                ) : (
                    <div className="webapps-grid">
                        {pages.map((page) => (
                            <Card key={page.id} className="webapp-card">
                                <CardHeader className="webapp-card-header">
                                    <h3 className="webapp-name">
                                        {page.name}
                                    </h3>
                                    <Globe className="h-4 w-4 text-muted" />
                                </CardHeader>
                                <CardBody>
                                    <div className="webapp-id">
                                        ID: {page.id}
                                    </div>
                                    <div className="webapp-date">
                                        <Calendar className="mr-1 h-3 w-3" />
                                        Atualizado em {new Date(page.updatedAt).toLocaleDateString()}
                                    </div>
                                    <div className="webapp-actions">
                                        <Link to={`/dashboard/webapps/${page.id}`} className="action-link">
                                            <Button variant="secondary" className="w-full">
                                                Editar
                                            </Button>
                                        </Link>
                                        <a
                                            href={`/view/${page.tenantId}/${page.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="action-link"
                                        >
                                            <Button variant="secondary">
                                                <Globe className="h-4 w-4" />
                                            </Button>
                                        </a>
                                        <Button
                                            variant="secondary"
                                            className="action-delete"
                                            onClick={() => { handleDelete(page.id, page.name) }}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}

                <style>{`
                    .webapps-container {
                        display: flex;
                        flex-direction: column;
                        gap: 24px;
                    }
                    .webapps-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    .webapps-title {
                        font-size: 1.875rem;
                        font-weight: 700;
                        letter-spacing: -0.025em;
                        margin-bottom: 4px;
                    }
                    .loading-state {
                        padding: 40px;
                        text-align: center;
                        color: var(--color-text-muted);
                    }
                    .empty-state {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 40px 0;
                        gap: 16px;
                    }
                    .empty-icon-wrapper {
                        background: var(--color-bg-tertiary);
                        padding: 16px;
                        border-radius: 9999px;
                    }
                    .empty-icon {
                        height: 32px;
                        width: 32px;
                        color: var(--color-text-muted);
                    }
                    .empty-text {
                        text-align: center;
                    }
                    .empty-title {
                        font-weight: 600;
                        font-size: 1.125rem;
                    }
                    .webapps-grid {
                        display: grid;
                        gap: 16px;
                        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    }
                    .webapp-card {
                        transition: box-shadow 0.2s;
                    }
                    .webapp-card:hover {
                        box-shadow: var(--shadow-md);
                    }
                    .webapp-card-header {
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                        padding-bottom: 8px;
                    }
                    .webapp-name {
                        font-size: 0.875rem;
                        font-weight: 500;
                    }
                    .webapp-id {
                        font-size: 0.75rem;
                        color: var(--color-text-muted);
                        margin-bottom: 4px;
                    }
                    .webapp-date {
                        display: flex;
                        align-items: center;
                        font-size: 0.75rem;
                        color: var(--color-text-muted);
                        margin-bottom: 16px;
                    }
                    .webapp-actions {
                        display: flex;
                        gap: 8px;
                        margin-top: auto;
                    }
                    .action-link {
                        flex: 1;
                        text-decoration: none;
                    }
                    .action-delete {
                        padding: 8px;
                        border-color: rgba(239, 68, 68, 0.2);
                    }
                    .action-delete:hover {
                        background: rgba(239, 68, 68, 0.05);
                        border-color: rgba(239, 68, 68, 0.4);
                    }
                    .text-red-500 {
                        color: #ef4444;
                    }
                    .w-full {
                        width: 100%;
                    }
                `}</style>
            </div>
        </DashboardLayout>
    )
}
