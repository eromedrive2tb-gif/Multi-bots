/** @jsxImportSource react */

import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import Editor from '@monaco-editor/react'
import { Card, CardHeader, CardBody } from '../../components/atoms/ui/Card'
import { Button } from '../../components/atoms/ui/Button'
import { Save, ArrowLeft, Play, Layout, FileJson, Code as CodeIcon, Globe, Upload, Zap, Layers } from 'lucide-react'
import type { WebAppPage } from '../../../../engine/src/core/types'
import { DashboardLayout } from '../../components/templates/DashboardLayout'
import { useUser } from '../context/UserContext'
import { DisclaimerBanner } from '../../components/atoms/ui/DisclaimerBanner'

// ============================================
// TYPES & CONSTANTS
// ============================================

type EditorTab = 'html' | 'css' | 'js'
type PageMode = 'classic' | 'singlefile' | 'declarative' | 'htmx'

interface ModeConfig {
    label: string
    icon: React.ReactNode
    tabs: EditorTab[]
    hint: string
    hintVariant: 'warning' | 'info' | 'caution'
    hintTitle: string
}

const MODE_CONFIG: Record<PageMode, ModeConfig> = {
    classic: {
        label: 'Classic',
        icon: <CodeIcon className="h-4 w-4" />,
        tabs: ['html', 'css', 'js'],
        hintTitle: '⚡ Modo Clássico — HTML + CSS + JS',
        hint: 'O modo mais versátil. Escreva HTML, CSS e JavaScript separados, montados automaticamente pela Engine. Ideal para landing pages de vendas, páginas de captura e mini-apps com lógica customizada. Use para campanhas de tráfego direto onde cada milissegundo de carregamento impacta a conversão.',
        hintVariant: 'info',
    },
    singlefile: {
        label: 'Single File',
        icon: <Upload className="h-4 w-4" />,
        tabs: [],
        hintTitle: '🚀 Modo Single File — Output do Vite',
        hint: 'Importe o HTML gerado pelo vite-plugin-singlefile. Zero processamento na Edge — o arquivo é servido exatamente como foi gerado. Performance máxima para SPAs enxutas. Projetos pesados (React + muitas libs) sofrerão penalidades severas de SEO e carregamento no dispositivo do cliente se não forem rigorosamente otimizados.',
        hintVariant: 'warning',
    },
    declarative: {
        label: 'Alpine.js',
        icon: <Layers className="h-4 w-4" />,
        tabs: ['html', 'css'],
        hintTitle: '🏔️ Modo Declarativo — Alpine.js Injetado',
        hint: 'Apenas HTML e CSS. A Engine injeta o Alpine.js automaticamente via CDN. Perfeito para interatividade local (modais, toggles, tabs, accordions) sem precisar escrever JavaScript imperativo. Ideal para páginas de FAQ, catálogos de produtos e formulários dinâmicos em nichos de infoprodutos e afiliados. Use x-data, x-show, x-on e @click diretamente no HTML.',
        hintVariant: 'info',
    },
    htmx: {
        label: 'HTMX',
        icon: <Zap className="h-4 w-4" />,
        tabs: ['html', 'css'],
        hintTitle: '🔌 Modo HTMX — Comunicação com APIs Externas',
        hint: 'Apenas HTML e CSS. A Engine injeta o HTMX automaticamente via CDN. Use EXCLUSIVAMENTE para o cliente final se comunicar com webhooks e APIs de terceiros (n8n, Make, Gateways de pagamento). O HTMX faz requisições HTTP diretamente do HTML — sem JS, sem build. Ideal para checkout flows, formulários de pagamento e integrações com automações externas. O CRM permanece 100% isolado.',
        hintVariant: 'caution',
    },
}

const TAB_ICONS: Record<EditorTab, React.ReactNode> = {
    html: <Layout className="h-4 w-4 mr-2" />,
    css: <FileJson className="h-4 w-4 mr-2" />,
    js: <CodeIcon className="h-4 w-4 mr-2" />,
}

const TAB_LABELS: Record<EditorTab, string> = {
    html: 'HTML',
    css: 'CSS',
    js: 'JS',
}

// ============================================
// COMPONENT
// ============================================

export function WebAppEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { tenantId } = useUser()
    const { request, isConnected } = useSocket()
    const isNew = id === 'new'

    // State
    const [name, setName] = useState('')
    const [pageId, setPageId] = useState('')
    const [html, setHtml] = useState('<!-- Seu HTML aqui -->\n<div class="container">\n  <h1>Olá Mundo</h1>\n  <button id="btn">Clique-me</button>\n</div>')
    const [css, setCss] = useState('/* Seu CSS aqui */\n.container { padding: 20px; text-align: center; }\nbutton { padding: 10px 20px; background: #0088cc; color: white; border: none; border-radius: 4px; }')
    const [js, setJs] = useState('// Seu JS aqui\ndocument.getElementById("btn").addEventListener("click", () => {\n  if (window.Telegram && window.Telegram.WebApp) {\n    window.Telegram.WebApp.showAlert("Olá do botão!");\n  } else {\n    alert("Olá do botão (fora do Telegram)!");\n  }\n});')

    const [pageMode, setPageMode] = useState<PageMode>('classic')
    const [activeTab, setActiveTab] = useState<EditorTab>('html')
    const [saving, setSaving] = useState(false)
    const [previewKey, setPreviewKey] = useState(0)
    const [singleFileHtml, setSingleFileHtml] = useState('')

    const currentConfig = MODE_CONFIG[pageMode]

    // Fetch existing page
    useEffect(() => {
        if (!isNew && id && isConnected) {
            fetchPage(id)
        }
    }, [id, isNew, isConnected])

    const fetchPage = async (fetchId: string) => {
        try {
            const data = await request<WebAppPage>('FETCH_PAGE', { id: fetchId })
            if (data) {
                setName(data.name)
                setPageId(data.id)
                // Backward compat: old 'composed' → 'classic'
                const mode = ((data as any).mode || 'classic') as PageMode
                setPageMode(mode === ('composed' as any) ? 'classic' : mode)
                setHtml(data.html)
                setCss(data.css)
                setJs(data.js)
                if ((data as any).singleFileHtml) {
                    setSingleFileHtml((data as any).singleFileHtml)
                }
            }
        } catch (error) {
            console.error('Error loading page:', error)
        }
    }

    // When switching modes, ensure the active tab is valid for the new mode
    const switchMode = (newMode: PageMode) => {
        setPageMode(newMode)
        const config = MODE_CONFIG[newMode]
        if (config.tabs.length > 0 && !config.tabs.includes(activeTab)) {
            setActiveTab(config.tabs[0])
        }
    }

    const handleSave = async () => {
        if (!name || !pageId) {
            alert('Por favor, preencha o Nome e o ID da página.')
            return
        }

        setSaving(true)
        try {
            const payload: Record<string, any> = {
                id: pageId,
                name,
                mode: pageMode,
                html,
                css,
                js: pageMode === 'classic' ? js : '',
            }

            if (pageMode === 'singlefile') {
                payload.singleFileHtml = singleFileHtml
            }

            await request('SAVE_PAGE', payload)

            if (isNew) {
                navigate(`/dashboard/webapps/${pageId}`)
            } else {
                setPreviewKey(prev => prev + 1)
            }
        } catch (error) {
            console.error('Error saving:', error)
            alert('Erro ao salvar página.')
        } finally {
            setSaving(false)
        }
    }

    // Get current editor value based on active tab
    const getEditorValue = (): string => {
        switch (activeTab) {
            case 'html': return html
            case 'css': return css
            case 'js': return js
        }
    }

    const getEditorLanguage = (): string => {
        return activeTab === 'js' ? 'javascript' : activeTab
    }

    const handleEditorChange = (value: string | undefined) => {
        const v = value || ''
        switch (activeTab) {
            case 'html': setHtml(v); break
            case 'css': setCss(v); break
            case 'js': setJs(v); break
        }
    }

    // ============================================
    // RENDER
    // ============================================

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
                            Preview
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </div>
                </div>

                {/* Mode Selector */}
                <div className="mode-selector">
                    {(Object.keys(MODE_CONFIG) as PageMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => switchMode(mode)}
                            className={`mode-button ${pageMode === mode ? 'active' : ''}`}
                        >
                            {MODE_CONFIG[mode].icon}
                            <span>{MODE_CONFIG[mode].label}</span>
                        </button>
                    ))}
                </div>

                {/* Mode Hint */}
                <DisclaimerBanner
                    variant={currentConfig.hintVariant}
                    title={currentConfig.hintTitle}
                    message={currentConfig.hint}
                    dismissible
                />

                {/* Main Content */}
                <div className="editor-main-grid">
                    {/* Editor Column */}
                    <Card className="editor-card">
                        {pageMode === 'singlefile' ? (
                            /* Singlefile Mode: Upload area */
                            <>
                                <div className="singlefile-upload-area">
                                    <div className="singlefile-info">
                                        <Upload className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
                                        <h3>Importar HTML (vite-plugin-singlefile)</h3>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                            Cole o HTML completo gerado pelo Vite ou importe um arquivo .html
                                        </p>
                                        <input
                                            type="file"
                                            accept=".html,.htm"
                                            style={{ display: 'none' }}
                                            id="singlefile-input"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    const reader = new FileReader()
                                                    reader.onload = (ev) => {
                                                        setSingleFileHtml(ev.target?.result as string ?? '')
                                                    }
                                                    reader.readAsText(file)
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="secondary"
                                            onClick={() => document.getElementById('singlefile-input')?.click()}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Carregar arquivo .html
                                        </Button>
                                    </div>
                                    {singleFileHtml && (
                                        <Editor
                                            height="300px"
                                            defaultLanguage="html"
                                            language="html"
                                            theme="vs-dark"
                                            value={singleFileHtml}
                                            onChange={(v) => setSingleFileHtml(v || '')}
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 13,
                                                wordWrap: 'on',
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true,
                                            }}
                                        />
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Classic / Declarative / HTMX: Tab-based editor */
                            <>
                                <div className="tab-menu">
                                    {currentConfig.tabs.map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                                        >
                                            {TAB_ICONS[tab]}
                                            {TAB_LABELS[tab]}
                                        </button>
                                    ))}
                                </div>
                                <div className="editor-wrapper">
                                    <Editor
                                        height="100%"
                                        defaultLanguage={getEditorLanguage()}
                                        language={getEditorLanguage()}
                                        theme="vs-dark"
                                        value={getEditorValue()}
                                        onChange={handleEditorChange}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 13,
                                            wordWrap: 'on',
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                        }}
                                    />
                                </div>
                            </>
                        )}
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
                        gap: 12px;
                    }
                    .editor-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding-bottom: 4px;
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

                    /* Mode Selector */
                    .mode-selector {
                        display: flex;
                        gap: 6px;
                        padding: 4px;
                        background: var(--color-bg-secondary);
                        border-radius: 10px;
                        border: 1px solid var(--color-border);
                    }
                    .mode-button {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 8px 16px;
                        font-size: 0.8rem;
                        font-weight: 500;
                        background: transparent;
                        border: none;
                        border-radius: 8px;
                        color: var(--color-text-secondary);
                        cursor: pointer;
                        transition: all 0.2s;
                        flex: 1;
                        justify-content: center;
                    }
                    .mode-button:hover {
                        background: var(--color-bg-tertiary);
                        color: var(--color-text-primary);
                    }
                    .mode-button.active {
                        background: var(--color-primary);
                        color: white;
                        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
                    }

                    /* Editor Grid */
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

                    /* Singlefile Upload */
                    .singlefile-upload-area {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        overflow: auto;
                    }
                    .singlefile-info {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                        padding: 32px 24px;
                        text-align: center;
                    }
                    .singlefile-info h3 {
                        font-size: 1rem;
                        font-weight: 600;
                        color: var(--color-text-primary);
                        margin: 0;
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
                        .mode-selector {
                            flex-wrap: wrap;
                        }
                    }
                `}</style>
            </div>
        </DashboardLayout>
    )
}
