/** @jsxImportSource react */
import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { Alert } from '../components/atoms/Alert'
import { Button } from '../components/atoms/Button'
import { BlueprintEditor } from '../client/blueprint-editor'
import { BlueprintTable } from '../components/organisms/BlueprintTable'
import { BlueprintJsonModal } from '../components/organisms/BlueprintJsonModal'
import { useBlueprintsController } from '../client/hooks/useBlueprintsController'
import { useBlueprintsUI } from '../client/hooks/useBlueprintsUI'
import type { Blueprint } from '../core/types'

export const BlueprintsPage: React.FC = () => {
    // 1. Logic Controller (Data & API)
    const {
        blueprints,
        isLoading,
        error,
        deleteBlueprint,
        saveBlueprint,
        fetchBlueprint,
        isSaving
    } = useBlueprintsController()

    // 2. UI Controller (Local State)
    const {
        isJsonModalOpen,
        editingBlueprint,
        selectedBlueprintId,
        isEditorActive,
        openJsonModal,
        closeJsonModal,
        selectBlueprintForEditor,
        setEditingBlueprint
    } = useBlueprintsUI()

    // Local state just for the loaded blueprint content in the visual editor
    // We could move this to the UI hook but it might depend on the fetch logic
    const [visualEditorBlueprint, setVisualEditorBlueprint] = useState<Blueprint | undefined>(undefined)
    const [isLoadingEditor, setIsLoadingEditor] = useState(false)

    // Effect to load blueprint data when selected
    useEffect(() => {
        if (selectedBlueprintId) {
            setIsLoadingEditor(true)
            fetchBlueprint(selectedBlueprintId)
                .then(bp => {
                    if (bp) setVisualEditorBlueprint(bp)
                })
                .finally(() => setIsLoadingEditor(false))
        } else {
            setVisualEditorBlueprint(undefined)
        }
    }, [selectedBlueprintId]) // eslint-disable-line react-hooks/exhaustive-deps

    // Handlers mapped to Controller Actions
    const handleEditJson = async (id: string) => {
        const bp = await fetchBlueprint(id)
        if (bp) openJsonModal(bp)
    }

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este blueprint?')) {
            await deleteBlueprint(id)
            if (selectedBlueprintId === id) selectBlueprintForEditor(null)
        }
    }

    const handleSave = async (blueprint: Blueprint) => {
        try {
            await saveBlueprint(blueprint)
            closeJsonModal()
            // If we are editing the same one in visual editor, update it
            if (selectedBlueprintId === blueprint.id) {
                setVisualEditorBlueprint(blueprint) // Optimistic update or re-fetch?
            }
        } catch (err) {
            console.error('Save failed', err)
        }
    }

    const handleCreateNew = () => {
        selectBlueprintForEditor(null)
        setVisualEditorBlueprint(undefined)
        // Optionally start with a default template here or just empty
    }

    return (
        <DashboardLayout title="Blueprints" currentPath="/dashboard/blueprints">
            <div className="blueprints-page-wrapper">
                {/* Status Messages */}
                <div className="alert-container">
                    {error && <Alert type="error" message={(error as Error).message} />}
                    {/* Success message could be handled by a global toaster or local UI state if needed, omitting for simplicity/SRP */}
                </div>

                {/* List Section */}
                <div className="blueprints-list-section">
                    <div className="section-header">
                        <h2>📋 Seus Blueprints</h2>
                        <div className="header-actions">
                            <Button variant="secondary" onClick={() => openJsonModal()}>
                                📤 Upload JSON
                            </Button>
                            <Button variant="primary" onClick={handleCreateNew}>
                                ➕ Novo Blueprint
                            </Button>
                        </div>
                    </div>

                    <BlueprintTable
                        blueprints={blueprints}
                        isLoading={isLoading}
                        onSelect={selectBlueprintForEditor}
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
                        {isLoadingEditor ? (
                            <div className="editor-loading">Carregando editor...</div>
                        ) : (
                            <BlueprintEditor
                                initialBlueprint={visualEditorBlueprint ? { ...visualEditorBlueprint, version: visualEditorBlueprint.version || '1.0' } : undefined}
                                onSave={handleSave}
                            />
                        )}
                    </div>
                </div>
            </div>

            <BlueprintJsonModal
                isOpen={isJsonModalOpen}
                onClose={closeJsonModal}
                onSave={handleSave}
                initialBlueprint={editingBlueprint}
                isSaving={isSaving}
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
