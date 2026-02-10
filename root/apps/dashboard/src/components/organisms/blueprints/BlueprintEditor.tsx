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
    type ActionParam,
} from '../../../../../engine/src/lib/shared/action-library'

import type { Blueprint } from '../../../../../engine/src/core/types'
import { BlueprintNode, type StepNode, type StepNodeData } from '../../atoms/blueprints/BlueprintNode'
import { BlueprintPropertyPanel } from './BlueprintPropertyPanel'

interface ApiResponse {
    success: boolean
    error?: string
    data?: { id: string }
}

const nodeTypes: NodeTypes = {
    step: BlueprintNode,
}

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
            <BlueprintPropertyPanel
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
