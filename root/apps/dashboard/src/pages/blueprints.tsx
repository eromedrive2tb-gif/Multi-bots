/** @jsxImportSource react */
import React, { useEffect, useState } from 'react'
import { Alert } from '../components/atoms/Alert'
import { Button } from '../components/atoms/Button'
import { BlueprintEditor } from '../components/organisms/BlueprintEditor'
import { BlueprintTable } from '../components/organisms/BlueprintTable'
import { BlueprintJsonModal } from '../components/organisms/BlueprintJsonModal'
import { useBlueprintsController } from '../client/hooks/useBlueprintsController'
import { useBlueprintsUI } from '../client/hooks/useBlueprintsUI'
import type { Blueprint } from '../../../engine/src/core/types'
import { BlueprintsTemplate } from '../components/templates/BlueprintsTemplate'

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
        openJsonModal,
        closeJsonModal,
        selectBlueprintForEditor
    } = useBlueprintsUI()

    // Local state just for the loaded blueprint content in the visual editor
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
            if (selectedBlueprintId === blueprint.id) {
                setVisualEditorBlueprint(blueprint)
            }
        } catch (err) {
            console.error('Save failed', err)
        }
    }

    const handleCreateNew = () => {
        selectBlueprintForEditor(null)
        setVisualEditorBlueprint(undefined)
    }

    return (
        <BlueprintsTemplate
            title="Blueprints"
            currentPath="/dashboard/blueprints"
            alertSlot={error && <Alert type="error" message={(error as Error).message} />}
            listSlot={
                <>
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

                    <style>{`
                        .header-actions { display: flex; gap: 8px; }
                        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                        .section-header h2 { margin: 0; font-size: 1.25rem; color: var(--text-primary); }
                    `}</style>
                </>
            }
            editorSlot={
                isLoadingEditor ? (
                    <div className="editor-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '700px', background: '#1a1a2e', color: 'white' }}>
                        Carregando editor...
                    </div>
                ) : (
                    <BlueprintEditor
                        initialBlueprint={visualEditorBlueprint ? { ...visualEditorBlueprint, version: visualEditorBlueprint.version || '1.0' } : undefined}
                        onSave={handleSave}
                    />
                )
            }
            modalSlot={
                <BlueprintJsonModal
                    isOpen={isJsonModalOpen}
                    onClose={closeJsonModal}
                    onSave={handleSave}
                    initialBlueprint={editingBlueprint}
                    isSaving={isSaving}
                />
            }
        />
    )
}
