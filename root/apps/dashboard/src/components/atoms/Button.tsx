import type { FC } from 'hono/jsx'

interface ButtonProps {
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    class?: string
    children: any
}

export const Button: FC<ButtonProps> = ({
    type = 'button',
    variant = 'primary',
    size = 'md',
    disabled = false,
    class: className = '',
    children,
}) => {
    return (
        <button
            type={type}
            disabled={disabled}
            class={`btn btn-${variant} btn-${size} ${className}`}
        >
            {children}
        </button>
    )
}
