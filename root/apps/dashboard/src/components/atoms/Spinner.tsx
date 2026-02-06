import type { FC } from 'hono/jsx'

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    class?: string
}

export const Spinner: FC<SpinnerProps> = ({
    size = 'md',
    class: className = '',
}) => {
    return <div class={`spinner spinner-${size} ${className}`}></div>
}
