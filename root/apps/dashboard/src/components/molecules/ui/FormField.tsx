/** @jsxImportSource react */
import React from 'react'
import { Input } from '../../atoms/ui/Input'

interface FormFieldProps {
    label: string
    name: string
    type?: 'text' | 'email' | 'password' | 'number'
    placeholder?: string
    value?: string
    required?: boolean
    error?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const FormField: React.FC<FormFieldProps> = ({
    label,
    name,
    type = 'text',
    placeholder,
    value,
    required = false,
    error,
    onChange
}) => {
    return (
        <div className="form-field">
            <label htmlFor={name} className="form-label">
                {label}
                {required && <span className="required">*</span>}
            </label>
            <Input
                type={type}
                name={name}
                id={name}
                placeholder={placeholder}
                value={value}
                required={required}
                error={error}
                onChange={onChange}
            />
            {error && <span className="form-error">{error}</span>}
        </div>
    )
}
