/** @jsxImportSource react */
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { Alert } from '../components/atoms/Alert'
import { Button } from '../components/atoms/Button'
import { BlueprintEditor } from '../client/blueprint-editor'
import { BlueprintTable } from '../components/organisms/BlueprintTable'
import { BlueprintJsonModal } from '../components/organisms/BlueprintJsonModal'
import type { Blueprint, BlueprintListItem } from '../core/types'

export const BlueprintsPage: React.FC = () => {
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingBlueprint, setEditingBlueprint] = useState<Blueprint | null>(null)
    const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null)

    // Fetch blueprints
    const { data: blueprintsData = [], isLoading, error: fetchError } = useQuery({
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

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/blueprints/${id}/delete`, { method: 'POST' })
            const result = await response.json() as any
            if (!result.success) throw new Error(result.error)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blueprints'] })
            if (selectedBlueprintId === selectedBlueprintId) setSelectedBlueprintId(null)
        }
    })

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

    const handleEditJson = async (id: string) => {
        try {
            const resp = await fetch(`/api/blueprints/${id}`)
            const res = await resp.json() as any
            if (res.success) {
                setEditingBlueprint(res.data)
                setIsModalOpen(true)
            }
        } catch (err) {
            console.error('Error fetching blueprint:', err)
        }
    }

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este blueprint?')) {
            deleteMutation.mutate(id)
        }
    }

    return (
        <DashboardLayout title="Blueprints" currentPath="/dashboard/blueprints">
            <div className="blueprints-page-wrapper">
                {/* Status Messages */}
                <div className="alert-container">
                    {fetchError && <Alert type="error" message={fetchError.message} />}
                    {saveMutation.isSuccess && <Alert type="success" message="Blueprint salvo com sucesso!" />}
                    {saveMutation.isError && <Alert type="error" message={saveMutation.error.message} />}
                </div>

                {/* List Section */}
                <div className="blueprints-list-section">
                    <div className="section-header">
                        <h2>📋 Seus Blueprints</h2>
                        <div className="header-actions">
                            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
                                📤 Upload JSON
                            </Button>
                            <Button variant="primary" onClick={() => setSelectedBlueprintId(null)}>
                                ➕ Novo Blueprint
                            </Button>
                        </div>
                    </div>

                    <BlueprintTable
                        blueprints={blueprintsData}
                        isLoading={isLoading}
                        onSelect={setSelectedBlueprintId}
                        onEditJson={handleEditJson}
                        onDelete={handleDelete}
                    />
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
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingBlueprint(null)
                }}
                onSave={(bp) => saveMutation.mutate(bp)}
                initialBlueprint={editingBlueprint}
                isSaving={saveMutation.isPending}
            />

            <style>{`
                .blueprints-page-wrapper { display: flex; flex-direction: column; gap: 24px; }
                .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .section-header h2 { margin: 0; font-size: 1.25rem; color: var(--text-primary); }
                .blueprints-list-section { background: var(--card-bg); border-radius: 12px; padding: 20px; border: 1px solid var(--border-color); }
                .editor-section { background: var(--card-bg); border-radius: 12px; padding: 20px; border: 1px solid var(--border-color); }
                .editor-canvas-container { min-height: 700px; border-radius: 8px; overflow: hidden; }
                .editor-loading { display: flex; align-items: center; justify-content: center; height: 700px; background: #1a1a2e; color: white; }
                .alert-container { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
                .header-actions { display: flex; gap: 8px; }
            `}</style>
        </DashboardLayout>
    )
}
