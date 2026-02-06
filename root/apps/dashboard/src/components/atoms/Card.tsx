import type { FC } from 'hono/jsx'

interface CardProps {
    class?: string
    children: any
}

export const Card: FC<CardProps> = ({ class: className = '', children }) => {
    return <div class={`card ${className}`}>{children}</div>
}

interface CardHeaderProps {
    class?: string
    children: any
}

export const CardHeader: FC<CardHeaderProps> = ({ class: className = '', children }) => {
    return <div class={`card-header ${className}`}>{children}</div>
}

interface CardBodyProps {
    class?: string
    children: any
}

export const CardBody: FC<CardBodyProps> = ({ class: className = '', children }) => {
    return <div class={`card-body ${className}`}>{children}</div>
}
