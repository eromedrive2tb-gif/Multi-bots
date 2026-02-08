/** @jsxImportSource react */
import type { FC, ReactNode } from 'react'

interface CardProps {
    className?: string
    children: ReactNode
}

export const Card: FC<CardProps> = ({ className = '', children }) => {
    return <div className={`card ${className}`}>{children}</div>
}

interface CardHeaderProps {
    className?: string
    children: ReactNode
}

export const CardHeader: FC<CardHeaderProps> = ({ className = '', children }) => {
    return <div className={`card-header ${className}`}>{children}</div>
}

interface CardBodyProps {
    className?: string
    children: ReactNode
}

export const CardBody: FC<CardBodyProps> = ({ className = '', children }) => {
    return <div className={`card-body ${className}`}>{children}</div>
}
