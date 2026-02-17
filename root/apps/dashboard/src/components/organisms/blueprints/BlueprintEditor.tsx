/** @jsxImportSource react */
import React, { useState } from 'react'
import { VisualEditor } from './VisualEditor'
import { WizardEditor } from './WizardEditor'
import type { Blueprint } from '../../../../../engine/src/core/types'

interface BlueprintEditorProps {
    initialBlueprint?: Blueprint
    onSave?: (blueprint: Blueprint) => Promise<void>
}

type EditorMode = 'wizard' | 'visual'

export const BlueprintEditor: React.FC<BlueprintEditorProps> = ({
    initialBlueprint,
    onSave,
}) => {
    // Default to 'visual' if editing existing blueprint (for safety), or 'wizard' for new?
    // User requested Wizard for easy creation. 
    // Let's default to Wizard for new (unless initialBlueprint has complex steps?)
    // For now, let's allow user to switch.
    const [mode, setMode] = useState<EditorMode>('visual')

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
            {/* Mode Switcher */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                background: '#16213e',
                padding: '8px',
                borderRadius: '8px',
                width: 'fit-content',
                margin: '0 auto'
            }}>
                <button
                    onClick={() => setMode('wizard')}
                    style={{
                        padding: '8px 24px',
                        borderRadius: '6px',
                        border: 'none',
                        background: mode === 'wizard' ? '#6366f1' : 'transparent',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 600,
                        opacity: mode === 'wizard' ? 1 : 0.6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    🧙‍♂️ Iniciante
                </button>
                <button
                    onClick={() => setMode('visual')}
                    style={{
                        padding: '8px 24px',
                        borderRadius: '6px',
                        border: 'none',
                        background: mode === 'visual' ? '#6366f1' : 'transparent',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 600,
                        opacity: mode === 'visual' ? 1 : 0.6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    ⚡ Avançado
                </button>
            </div>

            {/* Editor Content */}
            {mode === 'wizard' ? (
                <WizardEditor initialBlueprint={initialBlueprint} onSave={onSave} />
            ) : (
                <VisualEditor initialBlueprint={initialBlueprint} onSave={onSave} />
            )}
        </div>
    )
}

export default BlueprintEditor
