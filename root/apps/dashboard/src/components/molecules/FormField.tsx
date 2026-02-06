import type { FC } from 'hono/jsx'
import { Input } from '../atoms/Input'

interface FormFieldProps {
    label: string
    name: string
    type?: 'text' | 'email' | 'password' | 'number'
    placeholder?: string
    value?: string
    required?: boolean
    error?: string
}

export const FormField: FC<FormFieldProps> = ({
    label,
    name,
    type = 'text',
    placeholder,
    value,
    required = false,
    error,
}) => {
    return (
        <div class="form-field">
            <label for={name} class="form-label">
                {label}
                {required && <span class="required">*</span>}
            </label>
            <Input
                type={type}
                name={name}
                id={name}
                placeholder={placeholder}
                value={value}
                required={required}
                error={error}
            />
            {error && <span class="form-error">{error}</span>}
        </div>
    )
}
