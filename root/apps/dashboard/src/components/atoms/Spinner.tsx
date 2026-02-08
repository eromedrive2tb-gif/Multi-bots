/** @jsxImportSource react */
import type { FC } from 'react'

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export const Spinner: FC<SpinnerProps> = ({
    size = 'md',
    className = '',
}) => {
    return <div className={`spinner spinner-${size} ${className}`}></div>
}
