/** @jsxImportSource react */
import type { FC } from 'react'
import { Hammer, Clock, Sparkles, ShieldCheck } from 'lucide-react'
import { Card, CardBody } from '../../atoms/ui/Card'

interface MaintenanceNoticeProps {
    title: string
    message: string
}

export const MaintenanceNotice: FC<MaintenanceNoticeProps> = ({
    title,
    message
}) => {
    return (
        <div className="maintenance-container" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: 'var(--space-xl)'
        }}>
            <Card className="maintenance-card" style={{
                maxWidth: '600px',
                width: '100%',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                background: 'rgba(15, 23, 42, 0.4)',
                backdropFilter: 'blur(12px)',
                borderColor: 'var(--color-border)',
                animation: 'fade-in-up 0.6s ease-out'
            }}>
                {/* Decorative Elements */}
                <div style={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-10%',
                    width: '150px',
                    height: '150px',
                    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
                    zIndex: 0
                }} />

                <CardBody style={{ position: 'relative', zIndex: 1, padding: 'var(--space-2xl)' }}>
                    <div className="maintenance-icon-wrapper" style={{
                        display: 'inline-flex',
                        position: 'relative',
                        marginBottom: 'var(--space-xl)'
                    }}>
                        <div style={{
                            position: 'absolute',
                            inset: '-15px',
                            background: 'var(--color-primary-light)',
                            borderRadius: '50%',
                            filter: 'blur(15px)',
                            animation: 'maintenance-pulse 3s infinite ease-in-out'
                        }} />
                        <div style={{
                            background: 'var(--color-bg-secondary)',
                            padding: '20px',
                            borderRadius: '24px',
                            border: '1px solid var(--color-border)',
                            boxShadow: 'var(--shadow-lg)'
                        }}>
                            <Hammer size={48} style={{
                                color: 'var(--color-primary)',
                                filter: 'drop-shadow(0 0 8px var(--color-primary))'
                            }} />
                        </div>
                        <Sparkles size={20} style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            color: 'var(--color-secondary)',
                            animation: 'maintenance-float 4s infinite alternate ease-in-out'
                        }} />
                        <ShieldCheck size={20} style={{
                            position: 'absolute',
                            bottom: '5px',
                            left: '-15px',
                            color: 'var(--color-success)',
                            animation: 'maintenance-float 3s infinite alternate-reverse ease-in-out'
                        }} />
                    </div>

                    <h1 style={{
                        fontSize: '2.25rem',
                        fontWeight: '850',
                        marginBottom: 'var(--space-md)',
                        background: 'linear-gradient(135deg, #fff 30%, var(--color-primary) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.02em'
                    }}>
                        {title}
                    </h1>

                    <p style={{
                        fontSize: '1.125rem',
                        color: 'var(--color-text-secondary)',
                        lineHeight: '1.7',
                        marginBottom: 'var(--space-2xl)',
                        maxWidth: '480px',
                        marginInline: 'auto'
                    }}>
                        {message}
                    </p>

                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-md)',
                        padding: 'var(--space-md) var(--space-xl)',
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--color-warning)',
                            boxShadow: '0 0 10px var(--color-warning)',
                            animation: 'maintenance-blink 1.5s infinite'
                        }} />
                        <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
                        <span style={{
                            fontSize: '0.875rem',
                            color: 'var(--color-text-primary)',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Status: Em Breve
                        </span>
                    </div>
                </CardBody>
            </Card>

            <style>{`
                @keyframes maintenance-pulse {
                    0% { transform: scale(1); opacity: 0.2; }
                    50% { transform: scale(1.3); opacity: 0.4; }
                    100% { transform: scale(1); opacity: 0.2; }
                }
                @keyframes maintenance-float {
                    0% { transform: translateY(0) rotate(0); }
                    100% { transform: translateY(-12px) rotate(15deg); }
                }
                @keyframes maintenance-blink {
                    0%, 100% { opacity: 1; filter: brightness(1.2); }
                    50% { opacity: 0.4; filter: brightness(0.8); }
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
