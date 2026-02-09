import { useState } from 'react'
import type { Blueprint } from '../../core/types'

export const useBlueprintsUI = () => {
    const [isJsonModalOpen, setIsJsonModalOpen] = useState(false)
    const [editingBlueprint, setEditingBlueprint] = useState<Blueprint | null>(null)
    const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null)

    // Derived state or helper if needed
    const isEditorActive = !!selectedBlueprintId

    const openJsonModal = (blueprint?: Blueprint) => {
        setEditingBlueprint(blueprint || null)
        setIsJsonModalOpen(true)
    }

    const closeJsonModal = () => {
        setIsJsonModalOpen(false)
        setEditingBlueprint(null)
    }

    const selectBlueprintForEditor = (id: string | null) => {
        setSelectedBlueprintId(id)
    }

    return {
        isJsonModalOpen,
        editingBlueprint,
        selectedBlueprintId,
        isEditorActive,
        openJsonModal,
        closeJsonModal,
        selectBlueprintForEditor,
        setEditingBlueprint, // Exposed if manual set is needed
    }
}
