/** @jsxImportSource react */
/**
 * Blueprint Editor - N8N-Style Workflow Builder
 * Visual editor com painel de propriedades editável
 */

import React, { useCallback, useState, useEffect, type ChangeEvent } from 'react'
import { Save, Plus, Play, MousePointer2 } from 'lucide-react'
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Panel,
    type Node,
    type Edge,
    type Connection,
    type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
    ACTION_LIBRARY,
    ACTION_CATEGORIES,
    getActionByKey,
    getCategoryColor,
} from '../../../../../engine/src/lib/shared'

import type { Blueprint } from '../../../../../engine/src/core/types'
import { BlueprintNode, type StepNode, type StepNodeData } from '../../atoms/blueprints/BlueprintNode'
import { BlueprintPropertyPanel } from './BlueprintPropertyPanel'
import { useSocket } from '../../../client/context/SocketContext'
import { Button, Input, IconRenderer } from '../../atoms'

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

export const VisualEditor: React.FC<BlueprintEditorProps> = ({
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

    // Load initial blueprint with auto-layout
    useEffect(() => {
        if (!initialBlueprint) return

        const newNodes: StepNode[] = []
        const newEdges: Edge[] = []

        // Helper to find all connections from a step
        const getStepConnections = (step: any) => {
            const conns: { target: string, type: 'success' | 'error', label?: string }[] = []
            const negativeKeys = ['no', 'cancel', 'error', 'false', 'rejeitar', 'negativo']

            if (step.next_step) conns.push({ target: step.next_step, type: 'success' })
            if (step.on_error) conns.push({ target: step.on_error, type: 'error' })

            // Action specific connections
            if (step.action === 'condition') {
                if (step.params?.true_step) conns.push({ target: step.params.true_step, type: 'success', label: 'true' })
                if (step.params?.false_step) conns.push({ target: step.params.false_step, type: 'error', label: 'false' })
            }

            if (step.action === 'prompt' && step.params?.branches) {
                Object.entries(step.params.branches).forEach(([key, target]) => {
                    const isNegative = negativeKeys.includes(key.toLowerCase())
                    conns.push({
                        target: target as string,
                        type: isNegative ? 'error' : 'success',
                        label: key
                    })
                })
            }

            return conns
        }

        // Layout algorithm: Breadth-First Search to determine levels
        const levels: Record<string, number> = {}
        const levelItems: Record<number, string[]> = {}
        const queue: { id: string, level: number }[] = []

        if (initialBlueprint.entry_step) {
            queue.push({ id: initialBlueprint.entry_step, level: 0 })
            levels[initialBlueprint.entry_step] = 0
        }

        const processed = new Set<string>()

        while (queue.length > 0) {
            const { id, level } = queue.shift()!
            if (processed.has(id)) continue
            processed.add(id)

            if (!levelItems[level]) levelItems[level] = []
            if (!levelItems[level].includes(id)) levelItems[level].push(id)

            const step = initialBlueprint.steps[id]
            if (step) {
                const conns = getStepConnections(step)
                conns.forEach(c => {
                    if (levels[c.target] === undefined || levels[c.target] < level + 1) {
                        levels[c.target] = level + 1
                        queue.push({ id: c.target, level: level + 1 })
                    }
                })
            }
        }

        // Add unvisited nodes (orphans)
        Object.keys(initialBlueprint.steps).forEach(id => {
            if (!processed.has(id)) {
                levels[id] = 0
                if (!levelItems[0]) levelItems[0] = []
                levelItems[0].push(id)
            }
        })

        // Create Nodes with calculated positions
        const NODE_WIDTH = 250
        const NODE_HEIGHT = 220
        const HORIZONTAL_GAP = 100
        const VERTICAL_GAP = 150

        Object.entries(initialBlueprint.steps).forEach(([stepId, step]) => {
            const level = levels[stepId] || 0
            const itemsInLevel = levelItems[level] || [stepId]
            const indexInLevel = itemsInLevel.indexOf(stepId)

            // Calculate X to center the level
            const levelWidth = itemsInLevel.length * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP
            const startX = -levelWidth / 2
            const x = startX + indexInLevel * (NODE_WIDTH + HORIZONTAL_GAP)
            const y = level * (NODE_HEIGHT + VERTICAL_GAP)

            newNodes.push({
                id: stepId,
                type: 'step',
                position: { x, y },
                data: {
                    label: stepId,
                    action: step.action,
                    type: step.type,
                    params: step.params || {},
                    configured: Object.keys(step.params || {}).length > 0,
                },
            })

            // Create Edges
            const conns = getStepConnections(step)
            conns.forEach((conn, idx) => {
                const isError = conn.type === 'error'
                newEdges.push({
                    id: `${stepId}-${conn.target}-${idx}`,
                    source: stepId,
                    target: conn.target,
                    sourceHandle: conn.type,
                    animated: true,
                    style: {
                        stroke: isError ? '#ef4444' : '#10b981',
                        strokeWidth: 3,
                        strokeDasharray: isError ? '5,5' : undefined
                    },
                    label: conn.label,
                    labelStyle: conn.label ? { fill: isError ? '#ef4444' : '#10b981', fontSize: 10, fontWeight: 700 } : undefined,
                    labelBgStyle: conn.label ? { fill: '#1e293b', fillOpacity: 0.8 } : undefined
                })
            })
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
            const isError = params.sourceHandle === 'error'
            const edgeStyle = isError
                ? { stroke: '#ef4444', strokeWidth: 3, strokeDasharray: '5,5' }
                : { stroke: '#10b981', strokeWidth: 3 }

            setEdges((eds: Edge[]) =>
                addEdge({
                    ...params,
                    animated: true,
                    style: edgeStyle,
                    label: isError ? 'erro' : undefined,
                    labelStyle: isError ? { fill: '#ef4444', fontSize: 10, fontWeight: 700 } : undefined,
                    labelBgStyle: { fill: '#1e293b', fillOpacity: 0.8 }
                }, eds)
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
                    type: actionDef.category === 'messaging' ? 'atom' : (actionDef.category === 'flow' ? 'organism' : 'molecule'),
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

    const { request } = useSocket()

    const handleSave = useCallback(async () => {
        setSaving(true)
        setMessage('')

        try {
            const blueprint = buildBlueprint()

            if (onSave) {
                await onSave(blueprint)
                setMessage('✅ Salvo!')
            } else {
                await request('SAVE_BLUEPRINT', blueprint)
                setMessage('✅ Salvo!')
            }
        } catch (error) {
            setMessage(`❌ ${error instanceof Error ? error.message : 'Erro'}`)
        } finally {
            setSaving(false)
            setTimeout(() => setMessage(''), 3000)
        }
    }, [buildBlueprint, onSave, request])

    return (
        <div className="visual-editor-container" style={{
            display: 'flex',
            height: '800px',
            background: '#0f172a',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-2xl)'
        }}>
            {/* Canvas */}
            <div style={{ flex: 1, position: 'relative' }}>
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
                    <Controls
                        position="bottom-left"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            background: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            padding: '4px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            marginBottom: '20px',
                            marginLeft: '10px'
                        }}
                    />
                    <MiniMap
                        position="top-right"
                        nodeColor={(node: Node) => {
                            const data = node.data as StepNodeData
                            const actionDef = getActionByKey(data?.action)
                            return actionDef ? getCategoryColor(actionDef.category) : '#666'
                        }}
                        style={{
                            background: 'rgba(15, 23, 42, 0.9)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            top: 20,
                            right: 20,
                            margin: 0
                        }}
                        maskColor="rgba(0, 0, 0, 0.4)"
                    />
                    <Background color="#1e293b" gap={20} size={1} />

                    {/* Top Panel - Toolbar */}
                    <Panel position="top-left" style={{ margin: '15px' }}>
                        <div className="glass-panel" style={{
                            padding: '10px 16px',
                            borderRadius: '14px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '12px' }}>
                                <div style={{ background: 'var(--color-primary)', color: 'white', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                                    <Play size={16} fill="white" />
                                </div>
                                <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>Fluxo</span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ width: '160px' }}>
                                    <Input
                                        name="blueprintId"
                                        value={blueprintId}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setBlueprintId(e.target.value)}
                                        placeholder="ID do Blueprint"
                                        className="sm"
                                    />
                                </div>
                                <div style={{ width: '100px' }}>
                                    <Input
                                        name="trigger"
                                        value={trigger}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTrigger(e.target.value)}
                                        placeholder="Trigger"
                                        className="sm"
                                    />
                                </div>
                            </div>

                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={saving}
                                className={saving ? 'opacity-50' : ''}
                            >
                                <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Fluxo'}
                            </Button>

                            {message && (
                                <div style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    background: message.includes('❌') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    color: message.includes('❌') ? '#ef4444' : '#10b981',
                                    border: `1px solid ${message.includes('❌') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                }}>
                                    {message}
                                </div>
                            )}
                        </div>
                    </Panel>

                    {/* Add Node Panel - Toolbox */}
                    <Panel position="bottom-center" style={{ marginBottom: '25px' }}>
                        <div className="glass-panel" style={{
                            padding: '10px 20px',
                            borderRadius: '20px',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 15px 40px rgba(0,0,0,0.4)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'rgba(255,255,255,0.5)',
                                borderRight: '1px solid rgba(255,255,255,0.1)',
                                paddingRight: '15px',
                                marginRight: '5px'
                            }}>
                                <MousePointer2 size={16} />
                                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nodes</span>
                            </div>

                            {Object.entries(ACTION_CATEGORIES).map(([catKey, cat]) => (
                                <ActionDropdown
                                    key={catKey}
                                    category={catKey as keyof typeof ACTION_CATEGORIES}
                                    onSelect={addNode}
                                />
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

            <style>{`
                .visual-editor-container .react-flow__handle {
                    border-radius: 4px;
                }
                .visual-editor-container .react-flow__edge-path {
                    stroke-linecap: round;
                }
                .visual-editor-container .react-flow__edge-label {
                    background: transparent;
                }
                .visual-editor-container .react-flow__edge-label-bg {
                    fill: #0f172a;
                    fill-opacity: 0.8;
                    rx: 4;
                    ry: 4;
                }
                .visual-editor-container .react-flow__controls-button {
                    border: none !important;
                    background: transparent !important;
                    fill: rgba(255,255,255,0.7) !important;
                    border-radius: 6px !important;
                    width: 28px !important;
                    height: 28px !important;
                    margin: 2px 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                .visual-editor-container .react-flow__controls-button:hover {
                    background: rgba(255,255,255,0.1) !important;
                    fill: white !important;
                }
                .visual-editor-container .react-flow__controls-button svg {
                    width: 14px !important;
                    height: 14px !important;
                    fill: currentColor !important;
                }
                .visual-editor-container .react-flow__minimap {
                    width: 150px !important;
                    height: 100px !important;
                }
            `}</style>
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
    const dropdownRef = React.useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as any)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                className="action-toolbox-btn"
                style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <div style={{
                    color: cat.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <IconRenderer name={cat.icon} size={16} />
                </div>
                {cat.label}
                <div className="btn-hover-indicator" style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: open ? '80%' : '0',
                    height: '2px',
                    background: cat.color,
                    transition: 'width 0.3s ease',
                    boxShadow: `0 0 10px ${cat.color}`
                }} />
            </button>

            {open && (
                <div
                    className="glass-panel"
                    style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 15px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        borderRadius: '16px',
                        padding: '8px',
                        marginBottom: '8px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        minWidth: '240px',
                        zIndex: 1000,
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}
                >
                    <div style={{ padding: '8px 12px 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', color: cat.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {cat.label}
                        </span>
                    </div>

                    {actions.map((action) => (
                        <button
                            key={action.key}
                            onClick={() => {
                                onSelect(action.key)
                                setOpen(false)
                            }}
                            className="action-item-btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%',
                                padding: '10px 12px',
                                border: 'none',
                                background: 'transparent',
                                color: 'white',
                                cursor: 'pointer',
                                borderRadius: '10px',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '8px',
                                borderRadius: '8px',
                                color: cat.color,
                                display: 'flex'
                            }}>
                                <IconRenderer name={action.icon} size={16} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'rgba(255,255,255,0.9)' }}>{action.label}</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', lineHeight: '1.2' }}>{action.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <style>{`
                .action-toolbox-btn:hover {
                    background: rgba(255,255,255,0.08) !important;
                    border-color: rgba(255,255,255,0.15) !important;
                    transform: translateY(-2px);
                }
                .action-toolbox-btn:active {
                    transform: translateY(0);
                }
                .action-item-btn:hover {
                    background: rgba(255,255,255,0.05) !important;
                    padding-left: 16px !important;
                }
                .action-item-btn:hover div:first-child {
                    background: rgba(255,255,255,0.1) !important;
                }
            `}</style>
        </div>
    )
}

export default VisualEditor
