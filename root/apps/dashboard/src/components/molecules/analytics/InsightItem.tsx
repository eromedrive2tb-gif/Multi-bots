/** @jsxImportSource react */
/** @jsxImportSource react */
import React, { ReactNode } from 'react'

interface InsightItemProps {
    icon: ReactNode
    label: string
    value: string | number
    variant?: 'normal' | 'alert'
}

export const InsightItem: React.FC<InsightItemProps> = ({ icon, label, value, variant = 'normal' }) => {
    return (
        <div className={`insight-item ${variant}`}>
            <span className="insight-icon">{icon}</span>
            <div className="insight-content">
                <span className="insight-label">{label}</span>
                <span className="insight-value">{value}</span>
            </div>

            <style>{`
                .insight-item {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                }
                
                .insight-item.alert {
                    border-color: rgba(239, 68, 68, 0.3);
                    background: rgba(239, 68, 68, 0.05);
                }
                
                .insight-icon {
                    font-size: 1.5rem;
                }
                
                .insight-content {
                    display: flex;
                    flex-direction: column;
                }
                
                .insight-label {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .insight-value {
                    font-weight: 600;
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    )
}
