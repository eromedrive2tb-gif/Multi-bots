import type { FC } from 'hono/jsx'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { Alert } from '../components/atoms/Alert'
import { Button } from '../components/atoms/Button'
import type { BlueprintListItem } from '../lib/atoms/database/db-get-blueprints'

interface BlueprintsPageProps {
    user: {
        name: string
        email: string
    }
    blueprints: BlueprintListItem[]
    selectedBlueprint?: string  // JSON stringified blueprint for editor
    error?: string
    success?: string
}

export const BlueprintsPage: FC<BlueprintsPageProps> = ({
    user,
    blueprints,
    selectedBlueprint,
    error,
    success
}) => {
    return (
        <DashboardLayout
            title="Blueprints"
            currentPath="/dashboard/blueprints"
            user={user}
        >
            {/* Messages */}
            {error && (
                <div class="alert-container">
                    <Alert type="error" message={error} />
                </div>
            )}
            {success && (
                <div class="alert-container">
                    <Alert type="success" message={success} />
                </div>
            )}

            <div class="blueprints-container">
                {/* Blueprint List */}
                <div class="blueprints-list-section">
                    <div class="section-header">
                        <h2>📋 Seus Blueprints</h2>
                        <a href="/dashboard/blueprints/new" class="btn btn-primary">
                            ➕ Novo Blueprint
                        </a>
                    </div>

                    {blueprints.length === 0 ? (
                        <div class="empty-state">
                            <span class="empty-icon">🔧</span>
                            <h3>Nenhum blueprint configurado</h3>
                            <p>Crie seu primeiro blueprint para automatizar fluxos do bot</p>
                        </div>
                    ) : (
                        <div class="blueprints-table-wrapper">
                            <table class="blueprints-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Trigger</th>
                                        <th>Versão</th>
                                        <th>Status</th>
                                        <th>Atualizado</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {blueprints.map(bp => (
                                        <tr key={bp.id}>
                                            <td>
                                                <a href={`/dashboard/blueprints/${bp.id}`} class="blueprint-link">
                                                    {bp.name}
                                                </a>
                                            </td>
                                            <td>
                                                <code class="trigger-code">{bp.trigger}</code>
                                            </td>
                                            <td>{bp.version}</td>
                                            <td>
                                                <span class={`status-badge ${bp.isActive ? 'active' : 'inactive'}`}>
                                                    {bp.isActive ? '✅ Ativo' : '⏸️ Inativo'}
                                                </span>
                                            </td>
                                            <td>{new Date(bp.updatedAt).toLocaleDateString('pt-BR')}</td>
                                            <td>
                                                <div class="actions-row">
                                                    <a href={`/dashboard/blueprints/${bp.id}`} class="btn btn-sm btn-secondary">
                                                        ✏️ Editar
                                                    </a>
                                                    <form method="post" action={`/api/blueprints/${bp.id}/delete`} class="inline-form">
                                                        <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('Tem certeza?')">
                                                            🗑️
                                                        </button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Visual Editor Section */}
                <div class="editor-section">
                    <div class="section-header">
                        <h2>🎨 Editor Visual</h2>
                    </div>

                    {/* React Flow container - will be hydrated client-side */}
                    <div
                        id="blueprint-editor-root"
                        data-initial-blueprint={selectedBlueprint || ''}
                        class="editor-canvas-container"
                    >
                        <div class="editor-loading">
                            <span>Carregando editor...</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Client-side React bundle */}
            <script type="module" src="/root/apps/dashboard/src/client/main.tsx"></script>

            <style>{`
                .blueprints-container {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                
                .section-header h2 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: var(--text-primary);
                }
                
                .blueprints-list-section {
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 20px;
                    border: 1px solid var(--border-color);
                }
                
                .blueprints-table-wrapper {
                    overflow-x: auto;
                }
                
                .blueprints-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .blueprints-table th,
                .blueprints-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .blueprints-table th {
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
                
                .blueprint-link {
                    color: var(--primary);
                    text-decoration: none;
                    font-weight: 500;
                }
                
                .blueprint-link:hover {
                    text-decoration: underline;
                }
                
                .trigger-code {
                    background: var(--code-bg);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.875rem;
                }
                
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 8px;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }
                
                .status-badge.active {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                }
                
                .status-badge.inactive {
                    background: rgba(107, 114, 128, 0.1);
                    color: #6b7280;
                }
                
                .actions-row {
                    display: flex;
                    gap: 8px;
                }
                
                .inline-form {
                    display: inline;
                }
                
                .editor-section {
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 20px;
                    border: 1px solid var(--border-color);
                }
                
                .editor-canvas-container {
                    min-height: 600px;
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .editor-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 600px;
                    background: #1a1a2e;
                    color: white;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 40px;
                    color: var(--text-secondary);
                }
                
                .empty-icon {
                    font-size: 3rem;
                    display: block;
                    margin-bottom: 16px;
                }
                
                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 500;
                    text-decoration: none;
                    border: none;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }
                
                .btn-primary {
                    background: var(--primary);
                    color: white;
                }
                
                .btn-primary:hover {
                    background: var(--primary-dark);
                }
                
                .btn-secondary {
                    background: var(--border-color);
                    color: var(--text-primary);
                }
                
                .btn-danger {
                    background: #ef4444;
                    color: white;
                }
                
                .btn-sm {
                    padding: 4px 12px;
                    font-size: 0.75rem;
                }
                
                .alert-container {
                    margin-bottom: 16px;
                }
            `}</style>
        </DashboardLayout>
    )
}
