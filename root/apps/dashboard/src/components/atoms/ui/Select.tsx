/** @jsxImportSource react */
import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { IconRenderer } from './IconRenderer'

interface SelectOption {
    value: string
    label: string
    icon?: React.ReactNode | string
}

interface SelectGroup {
    label: string
    icon?: React.ReactNode | string
    options: SelectOption[]
}

interface SelectProps {
    value: string
    onChange: (value: string) => void
    options?: SelectOption[]
    groups?: SelectGroup[]
    placeholder?: string
    className?: string
    disabled?: boolean
}

export const Select: React.FC<SelectProps> = ({
    value,
    onChange,
    options = [],
    groups = [],
    placeholder = 'Selecione...',
    className = '',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Find current label
    const allOptions = groups.length > 0
        ? groups.flatMap(g => g.options)
        : options

    const selectedOption = allOptions.find(opt => opt.value === value)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (val: string) => {
        if (disabled) return
        onChange(val)
        setIsOpen(false)
    }

    return (
        <div
            ref={containerRef}
            className={`custom-select-container ${className} ${disabled ? 'disabled' : ''}`}
            style={{ position: 'relative', width: '100%' }}
        >
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                style={styles.trigger}
            >
                <div style={styles.value}>
                    {selectedOption?.icon && (
                        <span style={styles.icon}>
                            {typeof selectedOption.icon === 'string' ? <IconRenderer name={selectedOption.icon} size={16} /> : selectedOption.icon}
                        </span>
                    )}
                    <span style={{ color: selectedOption ? 'white' : 'var(--color-text-muted)' }}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown size={16} className={`chevron ${isOpen ? 'rotate' : ''}`} style={styles.chevron} />
            </button>

            {isOpen && (
                <div className="custom-select-dropdown glass-panel" style={styles.dropdown}>
                    {groups.length > 0 ? (
                        groups.map((group, gIdx) => (
                            <div key={gIdx} className="select-group">
                                <div style={styles.groupLabel}>
                                    {group.icon && (
                                        <span style={styles.groupIcon}>
                                            {typeof group.icon === 'string' ? <IconRenderer name={group.icon} size={14} /> : group.icon}
                                        </span>
                                    )}
                                    {group.label}
                                </div>
                                {group.options.map((opt, oIdx) => (
                                    <div
                                        key={oIdx}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`select-option ${value === opt.value ? 'selected' : ''}`}
                                        style={styles.option}
                                    >
                                        <div style={styles.optionContent}>
                                            {opt.icon && (
                                                <span style={styles.optionIcon}>
                                                    {typeof opt.icon === 'string' ? <IconRenderer name={opt.icon} size={16} /> : opt.icon}
                                                </span>
                                            )}
                                            <span>{opt.label}</span>
                                        </div>
                                        {value === opt.value && <Check size={14} className="text-primary" />}
                                    </div>
                                ))}
                            </div>
                        ))
                    ) : (
                        options.map((opt, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleSelect(opt.value)}
                                className={`select-option ${value === opt.value ? 'selected' : ''}`}
                                style={styles.option}
                            >
                                <div style={styles.optionContent}>
                                    {opt.icon && (
                                        <span style={styles.optionIcon}>
                                            {typeof opt.icon === 'string' ? <IconRenderer name={opt.icon} size={16} /> : opt.icon}
                                        </span>
                                    )}
                                    <span>{opt.label}</span>
                                </div>
                                {value === opt.value && <Check size={14} className="text-primary" />}
                            </div>
                        ))
                    )}
                </div>
            )}

            <style>{`
                .custom-select-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    padding: 10px 12px;
                    background: var(--color-bg-tertiary);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: 14px;
                    color: white;
                }
                .custom-select-trigger:hover:not(.disabled) {
                    border-color: var(--color-primary);
                    background: var(--color-bg-secondary);
                }
                .custom-select-trigger.open {
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 3px var(--color-primary-light);
                }
                .chevron {
                    transition: transform var(--transition-normal);
                    opacity: 0.6;
                }
                .chevron.rotate {
                    transform: rotate(180deg);
                }
                .custom-select-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    max-height: 300px;
                    overflow-y: auto;
                    border-radius: var(--radius-lg);
                    padding: 6px;
                    border: 1px solid var(--color-border);
                    box-shadow: var(--shadow-xl);
                }
                .select-option {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 12px;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    color: var(--color-text-secondary);
                    font-size: 13px;
                }
                .select-option:hover {
                    background: var(--color-primary-light);
                    color: white;
                }
                .select-option.selected {
                    background: rgba(6, 182, 212, 0.15);
                    color: var(--color-primary);
                    font-weight: 500;
                }
            `}</style>
        </div>
    )
}

const styles = {
    trigger: {
        outline: 'none',
    } as React.CSSProperties,
    value: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    } as React.CSSProperties,
    icon: {
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
    } as React.CSSProperties,
    dropdown: {
        display: 'flex',
        flexDirection: 'column',
    } as React.CSSProperties,
    groupLabel: {
        padding: '12px 12px 6px 12px',
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--color-primary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    } as React.CSSProperties,
    groupIcon: {
        fontSize: '14px',
    } as React.CSSProperties,
    optionContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    } as React.CSSProperties,
    optionIcon: {
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
    } as React.CSSProperties,
    chevron: {
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
    } as React.CSSProperties,
    option: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        fontSize: '13px',
    } as React.CSSProperties
}
