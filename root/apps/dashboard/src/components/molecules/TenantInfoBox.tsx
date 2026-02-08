/** @jsxImportSource react */
import React from 'react'

interface TenantInfoBoxProps {
    tenantId: string
    plan?: string
}

export const TenantInfoBox: React.FC<TenantInfoBoxProps> = ({ tenantId, plan = 'Free' }) => {
    return (
        <div className="tenant-info-box">
            <div className="info-row">
                <span className="info-label">Tenant ID</span>
                <code className="info-value">{tenantId}</code>
            </div>
            <div className="info-row">
                <span className="info-label">Plano</span>
                <span className="info-value">{plan}</span>
            </div>

            <style>{`
                .tenant-info-box {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .info-row:last-child {
                    border-bottom: none;
                }
                
                .info-label {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
                
                .info-value {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                code.info-value {
                    background: var(--code-bg);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.875rem;
                }
            `}</style>
        </div>
    )
}
