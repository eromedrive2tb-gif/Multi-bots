/** @jsxImportSource react */
/**
 * Blueprint Editor - N8N-Style Workflow Builder
 * Visual editor com painel de propriedades editável
 */

import React, { useCallback, useState, useEffect, type ChangeEvent } from 'react'
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Panel,
    Handle,
    Position,
    type Node,
    type Edge,
    type Connection,
    type NodeTypes,
    type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
    ACTION_LIBRARY,
    ACTION_CATEGORIES,
    getActionByKey,
    getCategoryColor,
    type ActionDefinition,
    type ActionParam,
} from './action-library'

// ============================================
// TYPES
// ============================================

interface StepNodeData extends Record<string, unknown> {
    label: string
    action: string
    type: 'atom' | 'molecule' | 'organism'
    params: Record<string, unknown>
    configured: boolean
}

type StepNode = Node<StepNodeData, 'step'>

import type { Blueprint, BlueprintStep } from '../core/types'

interface ApiResponse {
    success: boolean
    error?: string
    data?: { id: string }
}

// ============================================
// CUSTOM NODE COMPONENT
// ============================================

const WorkflowNode: React.FC<NodeProps<StepNode>> = ({ data, selected }) => {
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

const nodeTypes: NodeTypes = {
    step: WorkflowNode,
}

// ============================================
// PROPERTY PANEL COMPONENT
// ============================================

interface PropertyPanelProps {
    node: StepNode | null
    onUpdate: (nodeId: string, data: Partial<StepNodeData>) => void
    onDelete: (nodeId: string) => void
    onClose: () => void
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ node, onUpdate, onDelete, onClose }) => {
    if (!node) {
        return (
            <div style={panelStyles.container}>
                <div style={panelStyles.empty}>
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
        <div style={panelStyles.container}>
            <div style={panelStyles.header}>
                <h3 style={panelStyles.title}>
                    {actionDef?.icon || '⚙️'} Propriedades
                </h3>
                <button onClick={onClose} style={panelStyles.closeBtn}>
                    ✕
                </button>
            </div>

            <div style={panelStyles.content}>
                {/* Step ID */}
                <div style={panelStyles.field}>
                    <label style={panelStyles.label}>ID do Step</label>
                    <input
                        type="text"
                        value={node.data.label}
                        onChange={handleLabelChange}
                        style={panelStyles.input}
                    />
                </div>

                {/* Action Selector */}
                <div style={panelStyles.field}>
                    <label style={panelStyles.label}>Ação</label>
                    <select
                        value={node.data.action}
                        onChange={handleActionChange}
                        style={panelStyles.select}
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
                        <p style={panelStyles.description}>{actionDef.description}</p>
                    )}
                </div>

                {/* Dynamic Parameters */}
                {actionDef?.params.map((param) => (
                    <div key={param.key} style={panelStyles.field}>
                        <label style={panelStyles.label}>
                            {param.label}
                            {param.required && <span style={{ color: '#ef4444' }}> *</span>}
                        </label>
                        {renderParamInput(param, node.data.params[param.key], handleParamChange)}
                    </div>
                ))}

                {/* Variables Help */}
                <div style={panelStyles.help}>
                    <strong>💡 Variáveis disponíveis:</strong>
                    <code style={panelStyles.code}>{'{{user_name}}'}</code>
                    <code style={panelStyles.code}>{'{{tenant_id}}'}</code>
                    <code style={panelStyles.code}>{'{{session.campo}}'}</code>
                </div>

                {/* Delete Button */}
                <button onClick={() => onDelete(node.id)} style={panelStyles.deleteBtn}>
                    🗑️ Excluir Step
                </button>
            </div>
        </div>
    )
}

// Render input based on param type
function renderParamInput(
    param: ActionParam,
    value: unknown,
    onChange: (key: string, value: string | number | boolean) => void
): React.ReactNode {
    const strValue = value !== undefined ? String(value) : param.defaultValue !== undefined ? String(param.defaultValue) : ''

    switch (param.type) {
        case 'textarea':
        case 'json':
            return (
                <textarea
                    value={strValue}
                    onChange={(e) => onChange(param.key, e.target.value)}
                    placeholder={param.placeholder}
                    style={{ ...panelStyles.input, minHeight: '80px', resize: 'vertical' }}
                />
            )
        case 'number':
            return (
                <input
                    type="number"
                    value={strValue}
                    onChange={(e) => onChange(param.key, Number(e.target.value))}
                    placeholder={param.placeholder}
                    style={panelStyles.input}
                />
            )
        case 'select':
            return (
                <select
                    value={strValue}
                    onChange={(e) => onChange(param.key, e.target.value)}
                    style={panelStyles.select}
                >
                    {param.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            )
        case 'boolean':
            return (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={value === true || value === 'true'}
                        onChange={(e) => onChange(param.key, e.target.checked)}
                    />
                    {param.label}
                </label>
            )
        default:
            return (
                <input
                    type="text"
                    value={strValue}
                    onChange={(e) => onChange(param.key, e.target.value)}
                    placeholder={param.placeholder}
                    style={panelStyles.input}
                />
            )
    }
}

// Panel styles
const panelStyles: Record<string, React.CSSProperties> = {
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

// ============================================
// BLUEPRINT EDITOR COMPONENT
// ============================================

interface BlueprintEditorProps {
    initialBlueprint?: Blueprint
    onSave?: (blueprint: Blueprint) => Promise<void>
}

export const BlueprintEditor: React.FC<BlueprintEditorProps> = ({
    initialBlueprint,
    onSave,
}) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<StepNode>([])
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
    const [selectedNode, setSelectedNode] = useState<StepNode | null>(null)
    const [blueprintId, setBlueprintId] = useState(initialBlueprint?.id || '')
    const [trigger, setTrigger] = useState(initialBlueprint?.trigger || '/start')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    // Load initial blueprint
    useEffect(() => {
        if (!initialBlueprint) return

        const newNodes: StepNode[] = []
        const newEdges: Edge[] = []
        let y = 0

        Object.entries(initialBlueprint.steps).forEach(([stepId, step]) => {
            newNodes.push({
                id: stepId,
                type: 'step',
                position: { x: 250, y },
                data: {
                    label: stepId,
                    action: step.action,
                    type: step.type,
                    params: step.params || {},
                    configured: Object.keys(step.params || {}).length > 0,
                },
            })

            if (step.next_step) {
                newEdges.push({
                    id: `${stepId}-${step.next_step}`,
                    source: stepId,
                    target: step.next_step,
                    sourceHandle: 'success',
                    animated: true,
                    style: { stroke: '#10b981', strokeWidth: 2 },
                })
            }

            if (step.on_error) {
                newEdges.push({
                    id: `${stepId}-error-${step.on_error}`,
                    source: stepId,
                    target: step.on_error,
                    sourceHandle: 'error',
                    animated: true,
                    style: { stroke: '#ef4444', strokeWidth: 2 },
                    label: 'erro',
                    labelStyle: { fill: '#ef4444', fontSize: 10 },
                })
            }

            y += 150
        })

        setNodes(newNodes)
        setEdges(newEdges)
        setBlueprintId(initialBlueprint.id)
        setTrigger(initialBlueprint.trigger)
    }, [initialBlueprint, setNodes, setEdges])

    // Update selected node when nodes change
    useEffect(() => {
        if (selectedNode) {
            const updated = nodes.find((n) => n.id === selectedNode.id)
            if (updated) setSelectedNode(updated)
        }
    }, [nodes, selectedNode])

    const onConnect = useCallback(
        (params: Connection) => {
            const edgeStyle = params.sourceHandle === 'error'
                ? { stroke: '#ef4444', strokeWidth: 2 }
                : { stroke: '#10b981', strokeWidth: 2 }
            setEdges((eds: Edge[]) =>
                addEdge({ ...params, animated: true, style: edgeStyle }, eds)
            )
        },
        [setEdges]
    )

    const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node as StepNode)
    }, [])

    const handlePaneClick = useCallback(() => {
        setSelectedNode(null)
    }, [])

    const updateNodeData = useCallback(
        (nodeId: string, updates: Partial<StepNodeData>) => {
            setNodes((nds: StepNode[]) =>
                nds.map((n) =>
                    n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
                )
            )
        },
        [setNodes]
    )

    const deleteNode = useCallback(
        (nodeId: string) => {
            setNodes((nds: StepNode[]) => nds.filter((n) => n.id !== nodeId))
            setEdges((eds: Edge[]) =>
                eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
            )
            setSelectedNode(null)
        },
        [setNodes, setEdges]
    )

    const addNode = useCallback(
        (actionKey: string) => {
            const actionDef = getActionByKey(actionKey)
            if (!actionDef) return

            const id = `step_${Date.now()}`
            const newNode: StepNode = {
                id,
                type: 'step',
                position: { x: 250 + Math.random() * 100, y: nodes.length * 150 },
                data: {
                    label: id,
                    action: actionKey,
                    type: actionDef.category === 'messaging' ? 'atom' : 'molecule',
                    params: {},
                    configured: false,
                },
            }
            setNodes((nds: StepNode[]) => [...nds, newNode])
            setSelectedNode(newNode)
        },
        [nodes.length, setNodes]
    )

    const buildBlueprint = useCallback((): Blueprint => {
        const steps: Blueprint['steps'] = {}

        nodes.forEach((node: StepNode) => {
            const successEdge = edges.find(
                (e: Edge) => e.source === node.id && e.sourceHandle === 'success'
            )
            const errorEdge = edges.find(
                (e: Edge) => e.source === node.id && e.sourceHandle === 'error'
            )

            steps[node.id] = {
                type: node.data.type,
                action: node.data.action,
                params: node.data.params || {},
                next_step: successEdge?.target || null,
                on_error: errorEdge?.target || null,
            }
        })

        return {
            id: blueprintId || `bp_${Date.now()}`,
            name: blueprintId,
            trigger,
            entry_step: nodes[0]?.id || 'start',
            steps,
            version: '1.0',
        }
    }, [nodes, edges, blueprintId, trigger])

    const handleSave = useCallback(async () => {
        setSaving(true)
        setMessage('')

        try {
            const blueprint = buildBlueprint()

            if (onSave) {
                await onSave(blueprint)
                setMessage('✅ Salvo!')
            } else {
                const isNew = !initialBlueprint
                const url = isNew ? '/api/blueprints' : `/api/blueprints/${blueprint.id}`
                const method = isNew ? 'POST' : 'PUT'

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(blueprint),
                })

                const result: ApiResponse = await response.json()
                setMessage(result.success ? '✅ Salvo!' : `❌ ${result.error}`)
            }
        } catch (error) {
            setMessage(`❌ ${error instanceof Error ? error.message : 'Erro'}`)
        } finally {
            setSaving(false)
            setTimeout(() => setMessage(''), 3000)
        }
    }, [buildBlueprint, onSave, initialBlueprint])

    return (
        <div style={{ display: 'flex', height: '700px', background: '#1a1a2e', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Canvas */}
            <div style={{ flex: 1 }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={handleNodeClick}
                    onPaneClick={handlePaneClick}
                    nodeTypes={nodeTypes}
                    fitView
                    proOptions={{ hideAttribution: true }}
                >
                    <Controls />
                    <MiniMap
                        nodeColor={(node: Node) => {
                            const data = node.data as StepNodeData
                            const actionDef = getActionByKey(data?.action)
                            return actionDef ? getCategoryColor(actionDef.category) : '#666'
                        }}
                        style={{ background: '#16213e' }}
                    />
                    <Background color="#0f3460" gap={20} />

                    {/* Top Panel */}
                    <Panel position="top-left">
                        <div style={{
                            background: 'rgba(22, 33, 62, 0.95)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center',
                        }}>
                            <input
                                type="text"
                                value={blueprintId}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setBlueprintId(e.target.value)}
                                placeholder="ID do Blueprint"
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #0f3460',
                                    background: '#1a1a2e',
                                    color: 'white',
                                    width: '150px',
                                }}
                            />
                            <input
                                type="text"
                                value={trigger}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setTrigger(e.target.value)}
                                placeholder="Trigger"
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #0f3460',
                                    background: '#1a1a2e',
                                    color: 'white',
                                    width: '100px',
                                }}
                            />
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: saving ? '#666' : '#10b981',
                                    color: 'white',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                {saving ? '...' : '💾 Salvar'}
                            </button>
                            {message && (
                                <span style={{ color: message.startsWith('✅') ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                                    {message}
                                </span>
                            )}
                        </div>
                    </Panel>

                    {/* Add Node Panel */}
                    <Panel position="bottom-left">
                        <div style={{
                            background: 'rgba(22, 33, 62, 0.95)',
                            padding: '12px',
                            borderRadius: '8px',
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                            maxWidth: '400px',
                        }}>
                            <span style={{ color: 'white', fontWeight: 600, width: '100%', marginBottom: '4px' }}>
                                ➕ Adicionar Step
                            </span>
                            {Object.entries(ACTION_CATEGORIES).map(([catKey, cat]) => (
                                <div key={catKey} style={{ position: 'relative' }}>
                                    <ActionDropdown
                                        category={catKey as keyof typeof ACTION_CATEGORIES}
                                        onSelect={addNode}
                                    />
                                </div>
                            ))}
                        </div>
                    </Panel>
                </ReactFlow>
            </div>

            {/* Property Panel */}
            <PropertyPanel
                node={selectedNode}
                onUpdate={updateNodeData}
                onDelete={deleteNode}
                onClose={() => setSelectedNode(null)}
            />
        </div>
    )
}

// ============================================
// ACTION DROPDOWN
// ============================================

interface ActionDropdownProps {
    category: keyof typeof ACTION_CATEGORIES
    onSelect: (actionKey: string) => void
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({ category, onSelect }) => {
    const [open, setOpen] = useState(false)
    const cat = ACTION_CATEGORIES[category]
    const actions = ACTION_LIBRARY.filter((a) => a.category === category)

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: cat.color,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}
            >
                {cat.icon} {cat.label}
            </button>
            {open && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        background: '#1e1e2e',
                        borderRadius: '8px',
                        padding: '8px',
                        marginBottom: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        minWidth: '200px',
                        zIndex: 100,
                    }}
                    onMouseLeave={() => setOpen(false)}
                >
                    {actions.map((action) => (
                        <button
                            key={action.key}
                            onClick={() => {
                                onSelect(action.key)
                                setOpen(false)
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 12px',
                                border: 'none',
                                background: 'transparent',
                                color: 'white',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                textAlign: 'left',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                            }}
                        >
                            <span style={{ fontSize: '18px' }}>{action.icon}</span>
                            <div>
                                <div style={{ fontWeight: 500, fontSize: '13px' }}>{action.label}</div>
                                <div style={{ fontSize: '11px', opacity: 0.6 }}>{action.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default BlueprintEditor
