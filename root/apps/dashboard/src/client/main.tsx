/** @jsxImportSource react */
/**
 * Client-side React entry point
 * Hydrates the BlueprintEditor component
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import { BlueprintEditor } from './blueprint-editor'

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('blueprint-editor-root')

    if (!container) {
        console.warn('Blueprint editor container not found')
        return
    }

    // Get initial data from data attribute
    const initialDataAttr = container.dataset.initialBlueprint
    let initialBlueprint = undefined

    if (initialDataAttr) {
        try {
            initialBlueprint = JSON.parse(initialDataAttr)
        } catch (e) {
            console.error('Failed to parse initial blueprint:', e)
        }
    }

    const root = createRoot(container)
    root.render(
        <React.StrictMode>
            <BlueprintEditor initialBlueprint={initialBlueprint} />
        </React.StrictMode>
    )
})
