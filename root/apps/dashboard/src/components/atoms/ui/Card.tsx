/** @jsxImportSource react */
import type { FC, ReactNode } from 'react'

interface CardProps {
    className?: string
    children: ReactNode
    style?: React.CSSProperties
}

export const Card: FC<CardProps> = ({ className = '', children, style }) => {
    return <div className={`card ${className}`} style={style}>{children}</div>
}

interface CardHeaderProps {
    className?: string
    children: ReactNode
    style?: React.CSSProperties
}

export const CardHeader: FC<CardHeaderProps> = ({ className = '', children, style }) => {
    return <div className={`card-header ${className}`} style={style}>{children}</div>
}

interface CardBodyProps {
    className?: string
    children: ReactNode
    style?: React.CSSProperties
}

export const CardBody: FC<CardBodyProps> = ({ className = '', children, style }) => {
    return <div className={`card-body ${className}`} style={style}>{children}</div>
}
