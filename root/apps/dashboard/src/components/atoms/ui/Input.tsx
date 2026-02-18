/** @jsxImportSource react */
import type { FC, ChangeEvent } from 'react'

interface InputProps {
    type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'time' | 'datetime-local'
    name: string
    id?: string
    placeholder?: string
    value?: string
    required?: boolean
    disabled?: boolean
    error?: string
    className?: string
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void
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
    className = '',
    onChange
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
            className={`input ${error ? 'input-error' : ''} ${className}`}
            onChange={onChange}
        />
    )
}
