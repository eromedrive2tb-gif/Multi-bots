/** @jsxImportSource react */
import React, { type ChangeEvent } from 'react'
import { ACTION_CATEGORIES, ACTION_LIBRARY, getActionByKey } from '../../../../engine/src/lib/shared/action-library'
import { BlueprintPropertyField } from '../molecules/BlueprintPropertyField'
import type { StepNode, StepNodeData } from '../atoms/BlueprintNode'

interface BlueprintPropertyPanelProps {
    node: StepNode | null
    onUpdate: (nodeId: string, data: Partial<StepNodeData>) => void
    onDelete: (nodeId: string) => void
    onClose: () => void
}

export const BlueprintPropertyPanel: React.FC<BlueprintPropertyPanelProps> = ({
    node,
    onUpdate,
    onDelete,
    onClose,
}) => {
    if (!node) {
        return (
            <div style={styles.container}>
                <div style={styles.empty}>
                    <span style={{ fontSize: '48px', opacity: 0.5 }}>👆</span>
                    <p>Selecione um nó para editar suas propriedades</p>
                </div>
            </div>
        )
    }

    const actionDef = getActionByKey(node.data.action)

    const handleLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
        onUpdate(node.id, { label: e.target.value })
    }

    const handleActionChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const newAction = e.target.value
        const newActionDef = getActionByKey(newAction)
        const newType = newActionDef?.category === 'messaging' ? 'atom' : 'molecule'
        onUpdate(node.id, {
            action: newAction,
            type: newType as 'atom' | 'molecule' | 'organism',
            params: {},
            configured: false,
        })
    }

    const handleParamChange = (key: string, value: string | number | boolean) => {
        const newParams = { ...node.data.params, [key]: value }
        const hasRequiredParams = actionDef?.params
            .filter((p) => p.required)
            .every((p) => newParams[p.key] !== undefined && newParams[p.key] !== '')
        onUpdate(node.id, {
            params: newParams,
            configured: hasRequiredParams ?? false,
        })
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.title}>
                    {actionDef?.icon || '⚙️'} Propriedades
                </h3>
                <button onClick={onClose} style={styles.closeBtn}>
                    ✕
                </button>
            </div>

            <div style={styles.content}>
                {/* Step ID */}
                <div style={styles.field}>
                    <label style={styles.label}>ID do Step</label>
                    <input
                        type="text"
                        value={node.data.label}
                        onChange={handleLabelChange}
                        style={styles.input}
                    />
                </div>

                {/* Action Selector */}
                <div style={styles.field}>
                    <label style={styles.label}>Ação</label>
                    <select
                        value={node.data.action}
                        onChange={handleActionChange}
                        style={styles.select}
                    >
                        {Object.entries(ACTION_CATEGORIES).map(([catKey, cat]) => (
                            <optgroup key={catKey} label={`${cat.icon} ${cat.label}`}>
                                {ACTION_LIBRARY.filter((a) => a.category === catKey).map((action) => (
                                    <option key={action.key} value={action.key}>
                                        {action.icon} {action.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    {actionDef && (
                        <p style={styles.description}>{actionDef.description}</p>
                    )}
                </div>

                {/* Dynamic Parameters using Molecule */}
                {actionDef?.params.map((param) => (
                    <BlueprintPropertyField
                        key={param.key}
                        param={param}
                        value={node.data.params[param.key]}
                        onChange={handleParamChange}
                    />
                ))}

                {/* Variables Help */}
                <div style={styles.help}>
                    <strong>💡 Variáveis disponíveis:</strong>
                    <code style={styles.code}>{'{{user_name}}'}</code>
                    <code style={styles.code}>{'{{tenant_id}}'}</code>
                    <code style={styles.code}>{'{{session.campo}}'}</code>
                </div>

                {/* Delete Button */}
                <button onClick={() => onDelete(node.id)} style={styles.deleteBtn}>
                    🗑️ Excluir Step
                </button>
            </div>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        width: '320px',
        background: '#16213e',
        borderLeft: '1px solid #0f3460',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
    },
    header: {
        padding: '16px',
        borderBottom: '1px solid #0f3460',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        margin: 0,
        fontSize: '16px',
        fontWeight: 600,
    },
    closeBtn: {
        background: 'transparent',
        border: 'none',
        color: 'white',
        fontSize: '18px',
        cursor: 'pointer',
        opacity: 0.6,
    },
    content: {
        padding: '16px',
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    label: {
        fontSize: '12px',
        fontWeight: 500,
        opacity: 0.8,
    },
    input: {
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid #0f3460',
        background: '#1a1a2e',
        color: 'white',
        fontSize: '14px',
        fontFamily: 'inherit',
    },
    select: {
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid #0f3460',
        background: '#1a1a2e',
        color: 'white',
        fontSize: '14px',
    },
    description: {
        fontSize: '11px',
        opacity: 0.6,
        margin: '4px 0 0 0',
    },
    help: {
        background: 'rgba(99, 102, 241, 0.1)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    code: {
        background: 'rgba(255,255,255,0.1)',
        padding: '4px 8px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '11px',
    },
    deleteBtn: {
        marginTop: 'auto',
        padding: '12px',
        border: 'none',
        borderRadius: '6px',
        background: 'rgba(239, 68, 68, 0.2)',
        color: '#ef4444',
        cursor: 'pointer',
        fontWeight: 500,
        fontSize: '14px',
    },
    empty: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        opacity: 0.6,
        textAlign: 'center',
        padding: '20px',
    },
}
