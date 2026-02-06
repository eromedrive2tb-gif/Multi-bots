import type { FC } from 'hono/jsx'

interface InputProps {
    type?: 'text' | 'email' | 'password' | 'number'
    name: string
    id?: string
    placeholder?: string
    value?: string
    required?: boolean
    disabled?: boolean
    error?: string
    class?: string
}

export const Input: FC<InputProps> = ({
    type = 'text',
    name,
    id,
    placeholder,
    value,
    required = false,
    disabled = false,
    error,
    class: className = '',
}) => {
    return (
        <input
            type={type}
            name={name}
            id={id || name}
            placeholder={placeholder}
            value={value}
            required={required}
            disabled={disabled}
            class={`input ${error ? 'input-error' : ''} ${className}`}
        />
    )
}
