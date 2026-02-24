/** @jsxImportSource react */
import React from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { getActionByKey, getCategoryColor } from '../../../../../engine/src/lib/shared'
import { IconRenderer } from '../ui/IconRenderer'
import { AlertTriangle } from 'lucide-react'

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
    const icon = actionDef?.icon || 'Settings'
    const label = actionDef?.label || data.action

    // Preview do conteúdo
    const preview = data.params.text
        ? String(data.params.text).substring(0, 35) + (String(data.params.text).length > 35 ? '...' : '')
        : ''

    return (
        <div
            className={`premium-node ${selected ? 'selected' : ''}`}
            style={{
                padding: '0',
                borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${selected ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`,
                color: 'white',
                minWidth: '220px',
                boxShadow: selected
                    ? `0 0 20px rgba(6, 182, 212, 0.4), 0 8px 32px rgba(0,0,0,0.5)`
                    : '0 4px 16px rgba(0,0,0,0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* Animated Glow when selected */}
            {selected && <div className="node-glow" style={{
                position: 'absolute',
                inset: '-2px',
                borderRadius: '18px',
                background: `linear-gradient(45deg, transparent, ${categoryColor}, transparent)`,
                zIndex: -1,
                opacity: 0.5,
            }} />}

            <Handle
                type="target"
                position={Position.Top}
                style={{
                    background: categoryColor,
                    width: 10,
                    height: 10,
                    border: '2px solid #0f172a',
                    boxShadow: `0 0 8px ${categoryColor}`
                }}
            />

            {/* Header */}
            <div
                style={{
                    background: `linear-gradient(90deg, ${categoryColor}dd, ${categoryColor}88)`,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <IconRenderer name={icon} size={16} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.02em' }}>{label}</span>
                    <span style={{ fontSize: '9px', opacity: 0.8, textTransform: 'uppercase' }}>{actionDef?.category}</span>
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: '14px' }}>
                <div style={{
                    fontSize: '10px',
                    color: 'var(--color-text-muted)',
                    marginBottom: '8px',
                    fontFamily: 'var(--font-mono)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <span style={{ opacity: 0.5 }}>ID:</span> {data.label}
                </div>

                {preview ? (
                    <div
                        style={{
                            fontSize: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.9)',
                            lineHeight: '1.4'
                        }}
                    >
                        {preview}
                    </div>
                ) : (
                    <div style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', opacity: 0.3 }}>
                        <span style={{ fontSize: '10px' }}>Sem conteúdo</span>
                    </div>
                )}

                {!data.configured && (
                    <div
                        style={{
                            fontSize: '11px',
                            color: '#fbbf24',
                            marginTop: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(245, 158, 11, 0.2)'
                        }}
                    >
                        <AlertTriangle size={14} />
                        <span>Configuração pendente</span>
                    </div>
                )}
            </div>

            {/* Output Handles */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="success"
                style={{
                    background: '#10b981',
                    width: 12,
                    height: 12,
                    border: '2px solid #0f172a',
                    left: '30%',
                    bottom: -6,
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                    cursor: 'crosshair',
                    zIndex: 10
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
                    border: '2px solid #0f172a',
                    left: '70%',
                    bottom: -6,
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                    cursor: 'crosshair',
                    zIndex: 10
                }}
            />
        </div>
    )
}
