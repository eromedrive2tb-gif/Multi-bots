/** @jsxImportSource react */
import React from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { getActionByKey, getCategoryColor } from '../../../../engine/src/lib/shared/action-library'

export interface StepNodeData extends Record<string, unknown> {
    label: string
    action: string
    type: 'atom' | 'molecule' | 'organism'
    params: Record<string, unknown>
    configured: boolean
}

export type StepNode = Node<StepNodeData, 'step'>

export const BlueprintNode: React.FC<NodeProps<StepNode>> = ({ data, selected }) => {
    const actionDef = getActionByKey(data.action)
    const categoryColor = actionDef ? getCategoryColor(actionDef.category) : '#666'
    const icon = actionDef?.icon || '⚙️'
    const label = actionDef?.label || data.action

    // Preview do conteúdo
    const preview = data.params.text
        ? String(data.params.text).substring(0, 30) + (String(data.params.text).length > 30 ? '...' : '')
        : ''

    return (
        <div
            style={{
                padding: '0',
                borderRadius: '12px',
                background: '#1e1e2e',
                border: `2px solid ${selected ? '#fff' : categoryColor}`,
                color: 'white',
                minWidth: '180px',
                boxShadow: selected
                    ? `0 0 0 2px ${categoryColor}, 0 8px 16px rgba(0,0,0,0.3)`
                    : '0 4px 12px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease',
                overflow: 'hidden',
            }}
        >
            <Handle
                type="target"
                position={Position.Top}
                style={{ background: categoryColor, width: 12, height: 12, border: '2px solid #1e1e2e' }}
            />

            {/* Header */}
            <div
                style={{
                    background: categoryColor,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}
            >
                <span style={{ fontSize: '18px' }}>{icon}</span>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{label}</span>
            </div>

            {/* Body */}
            <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>{data.label}</div>
                {preview && (
                    <div
                        style={{
                            fontSize: '12px',
                            background: 'rgba(255,255,255,0.1)',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            fontStyle: 'italic',
                        }}
                    >
                        "{preview}"
                    </div>
                )}
                {!data.configured && (
                    <div
                        style={{
                            fontSize: '10px',
                            color: '#f59e0b',
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        ⚠️ Clique para configurar
                    </div>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                id="success"
                style={{
                    background: '#10b981',
                    width: 12,
                    height: 12,
                    border: '2px solid #1e1e2e',
                    left: '30%',
                }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="error"
                style={{
                    background: '#ef4444',
                    width: 12,
                    height: 12,
                    border: '2px solid #1e1e2e',
                    left: '70%',
                }}
            />
        </div>
    )
}
