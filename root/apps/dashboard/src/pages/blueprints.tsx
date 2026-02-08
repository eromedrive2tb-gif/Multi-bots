/** @jsxImportSource react */
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { Alert } from '../components/atoms/Alert'
import { Button } from '../components/atoms/Button'
import { BlueprintEditor } from '../client/blueprint-editor'
import type { Blueprint } from '../core/types'
import { BlueprintJsonModal } from '../components/organisms/BlueprintJsonModal'

interface BlueprintListItem {
    id: string
    name: string
    trigger: string
    version: string
    isActive: boolean
    updatedAt: string
}

export const BlueprintsPage: React.FC = () => {
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingBlueprint, setEditingBlueprint] = useState<Blueprint | null>(null)
    const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null)

    // Fetch blueprints
    const { data: blueprintsData, isLoading, error: fetchError } = useQuery({
        queryKey: ['blueprints'],
        queryFn: async () => {
            const response = await fetch('/api/blueprints')
            const result = (await response.json()) as any
            if (!result.success) throw new Error(result.error)
            return result.data as BlueprintListItem[]
        }
    })

    // Selected blueprint for editor
    const { data: selectedBlueprint, isLoading: isLoadingBlueprint } = useQuery({
        queryKey: ['blueprint', selectedBlueprintId],
        queryFn: async () => {
            if (!selectedBlueprintId) return null
            const response = await fetch(`/api/blueprints/${selectedBlueprintId}`)
            const result = await response.json() as any
            if (!result.success) throw new Error(result.error)
            return result.data as Blueprint
        },
        enabled: !!selectedBlueprintId
    })

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/blueprints/${id}/delete`, { method: 'POST' })
            const result = await response.json() as any
            if (!result.success) throw new Error(result.error)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blueprints'] })
            if (selectedBlueprintId) setSelectedBlueprintId(null)
        }
    })

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (blueprint: any) => {
            const isNew = !editingBlueprint && !blueprintsData?.find(b => b.id === blueprint.id)
            const url = isNew ? '/api/blueprints' : `/api/blueprints/${blueprint.id}`
            const method = isNew ? 'POST' : 'PUT'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(blueprint),
            })

            const result = await response.json() as any
            if (!result.success) throw new Error(result.error)
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blueprints'] })
            setIsModalOpen(false)
            setEditingBlueprint(null)
        }
    })

    const openJsonModal = (blueprint: Blueprint | null = null) => {
        setEditingBlueprint(blueprint)
        setIsModalOpen(true)
    }

    const closeJsonModal = () => {
        setIsModalOpen(false)
        setEditingBlueprint(null)
    }

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza?')) {
            deleteMutation.mutate(id)
        }
    }

    return (
        <DashboardLayout
            title="Blueprints"
            currentPath="/dashboard/blueprints"
        >
            <div className="blueprints-page-wrapper">
                {/* Messages */}
                {fetchError && (
                    <div className="alert-container">
                        <Alert type="error" message={fetchError.message} />
                    </div>
                )}
                {saveMutation.isSuccess && (
                    <div className="alert-container">
                        <Alert type="success" message="Blueprint salvo com sucesso!" />
                    </div>
                )}
                {saveMutation.isError && (
                    <div className="alert-container">
                        <Alert type="error" message={saveMutation.error.message} />
                    </div>
                )}

                {/* Blueprint List Section */}
                <div className="blueprints-list-section">
                    <div className="section-header">
                        <h2>📋 Seus Blueprints</h2>
                        <div className="header-actions">
                            <Button
                                variant="secondary"
                                onClick={() => openJsonModal()}
                            >
                                📤 Upload JSON
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setSelectedBlueprintId(null)
                                }}
                            >
                                ➕ Novo Blueprint
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="empty-state">Carregando blueprints...</div>
                    ) : !blueprintsData || blueprintsData.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">🔧</span>
                            <h3>Nenhum blueprint configurado</h3>
                            <p>Crie seu primeiro blueprint para automatizar fluxos do bot</p>
                            <Button
                                variant="primary"
                                onClick={() => openJsonModal()}
                            >
                                📤 Importar JSON
                            </Button>
                        </div>
                    ) : (
                        <div className="blueprints-table-wrapper">
                            <table className="blueprints-table">
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
                                    {blueprintsData.map(bp => (
                                        <tr key={bp.id}>
                                            <td>
                                                <button
                                                    className="blueprint-link-btn"
                                                    onClick={() => setSelectedBlueprintId(bp.id)}
                                                >
                                                    {bp.name}
                                                </button>
                                            </td>
                                            <td>
                                                <code className="trigger-code">{bp.trigger}</code>
                                            </td>
                                            <td>{bp.version}</td>
                                            <td>
                                                <span className={`status-badge ${bp.isActive ? 'active' : 'inactive'}`}>
                                                    {bp.isActive ? '✅ Ativo' : '⏸️ Inativo'}
                                                </span>
                                            </td>
                                            <td>{new Date(bp.updatedAt).toLocaleDateString('pt-BR')}</td>
                                            <td>
                                                <div className="actions-row">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => setSelectedBlueprintId(bp.id)}
                                                    >
                                                        ✏️ Visual
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={async () => {
                                                            try {
                                                                const resp = await fetch(`/api/blueprints/${bp.id}`)
                                                                const res = await resp.json() as any
                                                                if (res.success) {
                                                                    openJsonModal(res.data)
                                                                }
                                                            } catch (err) {
                                                                console.error('Error fetching blueprint:', err)
                                                            }
                                                        }}
                                                    >
                                                        📝 JSON
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleDelete(bp.id)}
                                                    >
                                                        🗑️
                                                    </Button>
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
                <div className="editor-section">
                    <div className="section-header">
                        <h2>🎨 Editor Visual</h2>
                    </div>
                    <div className="editor-canvas-container">
                        {isLoadingBlueprint ? (
                            <div className="editor-loading">Carregando editor...</div>
                        ) : (
                            <BlueprintEditor
                                initialBlueprint={selectedBlueprint || undefined}
                                onSave={async (bp) => {
                                    saveMutation.mutate(bp)
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            <BlueprintJsonModal
                isOpen={isModalOpen}
                onClose={closeJsonModal}
                onSave={(bp) => saveMutation.mutate(bp)}
                initialBlueprint={editingBlueprint}
                isSaving={saveMutation.isPending}
            />

            <style>{`
        .blueprints-page-wrapper {
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
        
        .blueprint-link-btn {
          background: none;
          border: none;
          color: var(--primary);
          text-decoration: none;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          font-size: inherit;
        }
        
        .blueprint-link-btn:hover {
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
        
        .editor-section {
          background: var(--card-bg);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid var(--border-color);
        }
        
        .editor-canvas-container {
          min-height: 700px;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .editor-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 700px;
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
        
        .alert-container {
          margin-bottom: 16px;
        }
        
        .header-actions {
          display: flex;
          gap: 8px;
        }
      `}</style>
        </DashboardLayout>
    )
}
