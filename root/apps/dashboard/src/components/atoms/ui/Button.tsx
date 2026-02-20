/** @jsxImportSource react */
import type { FC, ReactNode } from 'react'

interface ButtonProps {
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    className?: string
    children: ReactNode
    onClick?: () => void
}

export const Button: FC<ButtonProps> = ({
    type = 'button',
    variant = 'primary',
    size = 'md',
    disabled = false,
    className = '',
    children,
    onClick
}) => {
    return (
        <button
            type={type}
            disabled={disabled}
            className={`btn btn-${variant} btn-${size} ${className}`}
            onClick={onClick}
        >
            {variant === 'primary' && <div className="btn-shimmer" />}
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'inherit', position: 'relative', zIndex: 10, width: '100%' }}>
                {children}
            </span>
        </button>
    )
}
