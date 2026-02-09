/** @jsxImportSource react */
import React from 'react'
import type { ActionParam } from '../../client/action-library'

interface BlueprintPropertyFieldProps {
    param: ActionParam
    value: unknown
    onChange: (key: string, value: string | number | boolean) => void
}

export const BlueprintPropertyField: React.FC<BlueprintPropertyFieldProps> = ({
    param,
    value,
    onChange,
}) => {
    const strValue = value !== undefined ? String(value) : param.defaultValue !== undefined ? String(param.defaultValue) : ''

    const renderInput = () => {
        switch (param.type) {
            case 'textarea':
            case 'json':
                return (
                    <textarea
                        value={strValue}
                        onChange={(e) => onChange(param.key, e.target.value)}
                        placeholder={param.placeholder}
                        style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                    />
                )
            case 'number':
                return (
                    <input
                        type="number"
                        value={strValue}
                        onChange={(e) => onChange(param.key, Number(e.target.value))}
                        placeholder={param.placeholder}
                        style={styles.input}
                    />
                )
            case 'select':
                return (
                    <select
                        value={strValue}
                        onChange={(e) => onChange(param.key, e.target.value)}
                        style={styles.select}
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
                        <span style={styles.label}>{param.label}</span>
                    </label>
                )
            default:
                return (
                    <input
                        type="text"
                        value={strValue}
                        onChange={(e) => onChange(param.key, e.target.value)}
                        placeholder={param.placeholder}
                        style={styles.input}
                    />
                )
        }
    }

    return (
        <div style={styles.field}>
            {param.type !== 'boolean' && (
                <label style={styles.label}>
                    {param.label}
                    {param.required && <span style={{ color: '#ef4444' }}> *</span>}
                </label>
            )}
            {renderInput()}
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    label: {
        fontSize: '12px',
        fontWeight: 500,
        opacity: 0.8,
        color: 'white',
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
}
