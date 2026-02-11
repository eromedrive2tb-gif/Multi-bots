
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Card, CardHeader, CardBody } from '../../components/atoms/ui/Card'
import { Button } from '../../components/atoms/ui/Button'
import { Save, ArrowLeft, Play, Layout, FileJson, Code as CodeIcon, Globe } from 'lucide-react'
import type { WebAppPage } from '../../../../engine/src/core/types'
import { DashboardLayout } from '../../components/templates/DashboardLayout'
import { useUser } from '../context/UserContext'

type Tab = 'html' | 'css' | 'js'

export function WebAppEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { tenantId } = useUser()
    const isNew = id === 'new'

    // State
    const [name, setName] = useState('')
    const [pageId, setPageId] = useState('')
    const [html, setHtml] = useState('<!-- Seu HTML aqui -->\n<div class="container">\n  <h1>Olá Mundo</h1>\n  <button id="btn">Clique-me</button>\n</div>')
    const [css, setCss] = useState('/* Seu CSS aqui */\n.container { padding: 20px; text-align: center; }\nbutton { padding: 10px 20px; background: #0088cc; color: white; border: none; border-radius: 4px; }')
    const [js, setJs] = useState('// Seu JS aqui\ndocument.getElementById("btn").addEventListener("click", () => {\n  if (window.Telegram && window.Telegram.WebApp) {\n    window.Telegram.WebApp.showAlert("Olá do botão!");\n  } else {\n    alert("Olá do botão (fora do Telegram)!");\n  }\n});')

    const [activeTab, setActiveTab] = useState<Tab>('html')
    const [saving, setSaving] = useState(false)
    const [previewKey, setPreviewKey] = useState(0) // Force iframe reload

    // Fetch existing page
    useEffect(() => {
        if (!isNew && id) {
            fetchPage(id)
        }
    }, [id])

    const fetchPage = async (pageId: string) => {
        try {
            const res = await fetch(`/api/pages/${pageId}`)
            const json = await res.json()
            if (json.success) {
                const data = json.data as WebAppPage
                setName(data.name)
                setPageId(data.id)
                setHtml(data.html)
                setCss(data.css)
                setJs(data.js)
            }
        } catch (error) {
            console.error('Error loading page:', error)
        }
    }

    const handleSave = async () => {
        if (!name || !pageId) {
            alert('Por favor, preencha o Nome e o ID da página.')
            return
        }

        setSaving(true)
        try {
            const payload = {
                id: pageId,
                name,
                html,
                css,
                js
            }

            const res = await fetch('/api/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const json = await res.json()

            if (json.success) {
                if (isNew) {
                    navigate(`/dashboard/webapps/${pageId}`)
                } else {
                    setPreviewKey(prev => prev + 1)
                }
            } else {
                alert(`Erro ao salvar: ${json.error}`)
            }
        } catch (error) {
            console.error('Error saving:', error)
            alert('Erro ao salvar página.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <DashboardLayout title={isNew ? 'Novo WebApp' : 'Editar WebApp'} currentPath="/dashboard/webapps">
            <div className="editor-container">
                {/* Header Actions */}
                <div className="editor-header">
                    <div className="header-left">
                        <Link to="/dashboard/webapps">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Voltar
                            </Button>
                        </Link>
                        <div className="editor-title-group">
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Nome do WebApp"
                                className="editor-name-input"
                            />
                            <div className="editor-id-group">
                                <span className="text-muted">ID:</span>
                                <input
                                    value={pageId}
                                    onChange={e => {
                                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                        setPageId(val)
                                    }}
                                    disabled={!isNew}
                                    placeholder="page-id-slug"
                                    className="editor-id-input"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="header-right">
                        <Button onClick={() => setPreviewKey(prev => prev + 1)} variant="secondary">
                            <Play className="h-4 w-4 mr-2" />
                            Atualizar Preview
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="editor-main-grid">
                    {/* Editor Column */}
                    <Card className="editor-card">
                        <div className="tab-menu">
                            <button
                                onClick={() => setActiveTab('html')}
                                className={`tab-button ${activeTab === 'html' ? 'active' : ''}`}
                            >
                                <Layout className="h-4 w-4 mr-2" />
                                HTML
                            </button>
                            <button
                                onClick={() => setActiveTab('css')}
                                className={`tab-button ${activeTab === 'css' ? 'active' : ''}`}
                            >
                                <FileJson className="h-4 w-4 mr-2" />
                                CSS
                            </button>
                            <button
                                onClick={() => setActiveTab('js')}
                                className={`tab-button ${activeTab === 'js' ? 'active' : ''}`}
                            >
                                <CodeIcon className="h-4 w-4 mr-2" />
                                JS
                            </button>
                        </div>
                        <div className="editor-wrapper">
                            <Editor
                                height="100%"
                                defaultLanguage={activeTab === 'js' ? 'javascript' : activeTab}
                                language={activeTab === 'js' ? 'javascript' : activeTab}
                                theme="vs-dark"
                                value={activeTab === 'html' ? html : activeTab === 'css' ? css : js}
                                onChange={(value) => {
                                    if (activeTab === 'html') setHtml(value || '')
                                    else if (activeTab === 'css') setCss(value || '')
                                    else setJs(value || '')
                                }}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    wordWrap: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true
                                }}
                            />
                        </div>
                    </Card>

                    {/* Preview Column */}
                    <Card className="preview-card">
                        <CardHeader className="preview-header">
                            <span className="text-sm font-medium flex items-center">
                                <Globe className="h-4 w-4 mr-2" />
                                Preview
                            </span>
                        </CardHeader>
                        <div className="preview-body">
                            {(!isNew && id && tenantId) ? (
                                <iframe
                                    key={previewKey}
                                    src={`/view/${tenantId}/${id}`}
                                    className="preview-iframe"
                                    title="Device Preview"
                                />
                            ) : (
                                <div className="preview-placeholder">
                                    {isNew ? 'Salve para visualizar o preview' : 'Carregando preview...'}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <style>{`
                    .editor-container {
                        display: flex;
                        flex-direction: column;
                        height: calc(100vh - 160px);
                        gap: 16px;
                    }
                    .editor-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding-bottom: 8px;
                    }
                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }
                    .header-right {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .editor-title-group {
                        display: flex;
                        flex-direction: column;
                    }
                    .editor-name-input {
                        font-size: 1.25rem;
                        font-weight: 700;
                        background: transparent;
                        border: none;
                        color: var(--color-text-primary);
                        outline: none;
                    }
                    .editor-name-input::placeholder {
                        color: var(--color-text-muted);
                    }
                    .editor-id-group {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 0.75rem;
                    }
                    .editor-id-input {
                        background: transparent;
                        border: none;
                        color: var(--color-text-muted);
                        outline: none;
                    }
                    .editor-main-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 16px;
                        flex: 1;
                        min-height: 0;
                    }
                    .editor-card {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        overflow: hidden;
                    }
                    .tab-menu {
                        display: flex;
                        border-bottom: 1px solid var(--color-border);
                        background: var(--color-bg-secondary);
                    }
                    .tab-button {
                        display: flex;
                        align-items: center;
                        padding: 10px 16px;
                        font-size: 0.875rem;
                        font-weight: 500;
                        background: transparent;
                        border: none;
                        border-bottom: 2px solid transparent;
                        color: var(--color-text-secondary);
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .tab-button:hover {
                        color: var(--color-text-primary);
                        background: var(--color-bg-tertiary);
                    }
                    .tab-button.active {
                        border-bottom-color: var(--color-primary);
                        color: var(--color-primary);
                    }
                    .editor-wrapper {
                        flex: 1;
                        min-height: 0;
                    }
                    .preview-card {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        overflow: hidden;
                    }
                    .preview-header {
                        padding: 10px 16px;
                    }
                    .preview-body {
                        flex: 1;
                        background: white;
                        position: relative;
                        min-height: 0;
                    }
                    .preview-iframe {
                        width: 100%;
                        height: 100%;
                        border: none;
                    }
                    .preview-placeholder {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        color: #64748b;
                        background: #f8fafc;
                    }

                    @media (max-width: 1024px) {
                        .editor-main-grid {
                            grid-template-columns: 1fr;
                            overflow-y: auto;
                        }
                        .editor-container {
                            height: auto;
                        }
                        .editor-card, .preview-card {
                            height: 500px;
                        }
                    }
                `}</style>
            </div>
        </DashboardLayout>
    )
}
