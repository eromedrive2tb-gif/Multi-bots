/** @jsxImportSource react */
import React from 'react'
import { ACTION_CATEGORIES, ACTION_LIBRARY, getActionByKey } from '../../../../../engine/src/lib/shared'
import { Select } from '../../atoms'
import { IconRenderer } from '../../atoms'
import { BlueprintPropertyField } from '../../molecules/blueprints/BlueprintPropertyField'
import type { StepNode, StepNodeData } from '../../atoms/blueprints/BlueprintNode'
import { MousePointerClick, Settings, Lightbulb, Trash2, X } from 'lucide-react'

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
            <div className="glass-panel" style={styles.container}>
                <div style={styles.empty}>
                    <div style={styles.emptyIcon}>
                        <MousePointerClick size={48} />
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        Selecione um nó para editar
                    </p>
                </div>
            </div>
        )
    }

    const actionDef = getActionByKey(node.data.action)

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate(node.id, { label: e.target.value })
    }

    const handleActionChange = (newAction: string) => {
        const newActionDef = getActionByKey(newAction)
        const newType = newActionDef?.category === 'messaging' ? 'atom' : (newActionDef?.category === 'flow' ? 'organism' : 'molecule')
        onUpdate(node.id, {
            action: newAction,
            type: newType as 'atom' | 'molecule' | 'organism',
            params: {},
            configured: false,
        })
    }

    const handleParamChange = (key: string, value: string | number | boolean) => {
        const newParams = { ...node.data.params, [key]: value } as Record<string, any>
        const hasRequiredParams = actionDef?.params
            .filter((p: any) => p.required)
            .every((p: any) => newParams[p.key] !== undefined && newParams[p.key] !== '')
        onUpdate(node.id, {
            params: newParams,
            configured: hasRequiredParams ?? false,
        })
    }

    // Prepare groups for Select
    const selectGroups = Object.entries(ACTION_CATEGORIES).map(([catKey, cat]: [string, any]) => ({
        label: cat.label,
        icon: cat.icon,
        options: ACTION_LIBRARY
            .filter((a: any) => a.category === catKey)
            .map((action: any) => ({
                value: action.key,
                label: action.label,
                icon: action.icon,
            }))
    }))

    return (
        <div className="glass-panel" style={styles.container}>
            <div style={styles.header}>
                <div className="flex items-center gap-3">
                    <div style={{
                        background: 'var(--color-primary-light)',
                        padding: '8px',
                        borderRadius: '10px',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {actionDef?.icon ? <IconRenderer name={actionDef.icon} size={18} /> : <Settings size={18} />}
                    </div>
                    <div>
                        <h3 style={styles.title}>Propriedades</h3>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {actionDef?.label || 'Step'}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="btn-ghost" style={styles.closeBtn}>
                    <X size={18} />
                </button>
            </div>

            <div style={styles.content}>
                {/* Step ID */}
                <div className="form-field">
                    <label className="form-label">ID do Step</label>
                    <input
                        type="text"
                        value={node.data.label}
                        onChange={handleLabelChange}
                        className="input"
                    />
                </div>

                {/* Action Selector */}
                <div className="form-field">
                    <label className="form-label">Ação</label>
                    <Select
                        value={node.data.action}
                        onChange={handleActionChange}
                        groups={selectGroups}
                    />
                    {actionDef && (
                        <p style={styles.description}>{actionDef.description}</p>
                    )}
                </div>

                {/* Dynamic Parameters */}
                <div style={{ margin: '16px 0', padding: '16px 0', borderTop: '1px solid var(--color-border)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={14} className="text-primary" /> Configurações da Ação
                    </h4>
                    {actionDef?.params.map((param: any) => (
                        <BlueprintPropertyField
                            key={param.key}
                            param={param}
                            value={node.data.params[param.key]}
                            onChange={handleParamChange}
                        />
                    ))}
                    {(!actionDef?.params || actionDef.params.length === 0) && (
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px' }}>
                            Esta ação não requer parâmetros.
                        </p>
                    )}
                </div>

                <div className="help-box" style={styles.help}>
                    <strong className="flex items-center gap-2 mb-2" style={{ fontSize: '11px', color: 'var(--color-primary)' }}>
                        <Lightbulb size={14} /> Dica do Editor:
                    </strong>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                        Você pode usar variáveis dinâmicas nos campos:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <code style={styles.code}>{'{{user_name}}'}</code>
                        <code style={styles.code}>{'{{tenant_id}}'}</code>
                        <code style={styles.code}>{'{{session.campo}}'}</code>
                    </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                    <button
                        onClick={() => onDelete(node.id)}
                        className="btn btn-danger btn-block flex items-center justify-center gap-2"
                        style={{ height: '45px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                    >
                        <Trash2 size={16} /> Excluir Step
                    </button>
                </div>
            </div>
        </div>
    )
}

const styles = {
    container: {
        width: '350px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: 'none',
        borderLeft: '1px solid var(--color-border)',
        borderRadius: '0',
    } as React.CSSProperties,
    header: {
        padding: '20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    } as React.CSSProperties,
    title: {
        margin: 0,
        fontSize: '15px',
        fontWeight: 700,
        color: 'white',
    } as React.CSSProperties,
    closeBtn: {
        width: '32px',
        height: '32px',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
    } as React.CSSProperties,
    content: {
        padding: '20px',
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    } as React.CSSProperties,
    description: {
        fontSize: '11px',
        color: 'var(--color-text-muted)',
        marginTop: '8px',
        lineHeight: '1.4',
    } as React.CSSProperties,
    help: {
        background: 'rgba(6, 182, 212, 0.05)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid rgba(6, 182, 212, 0.1)',
        margin: '16px 0',
    } as React.CSSProperties,
    code: {
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '4px 8px',
        borderRadius: '6px',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        border: '1px solid var(--color-border)',
        color: 'var(--color-secondary)',
    } as React.CSSProperties,
    empty: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        textAlign: 'center',
        padding: '40px',
    } as React.CSSProperties,
    emptyIcon: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'var(--color-bg-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-primary)',
        boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)',
        opacity: 0.8,
    } as React.CSSProperties
}
