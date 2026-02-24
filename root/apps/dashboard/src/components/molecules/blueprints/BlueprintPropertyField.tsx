/** @jsxImportSource react */
import { Select } from '../../atoms'
import type { ActionParam } from '../../../../../engine/src/lib/shared'

interface BlueprintPropertyFieldProps {
    param: ActionParam
    value: unknown
    onChange: (key: string, value: string | number | boolean) => void
}

export const BlueprintPropertyField: React.FC<BlueprintPropertyFieldProps> = ({
    param,
    value,
    onChange,
}) => {
    const strValue = value !== undefined
        ? (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))
        : (param.defaultValue !== undefined ? String(param.defaultValue) : '')

    const renderInput = () => {
        switch (param.type) {
            case 'textarea':
            case 'json':
                return (
                    <textarea
                        value={strValue}
                        onChange={(e) => onChange(param.key, e.target.value)}
                        placeholder={param.placeholder}
                        className="input"
                        style={{ minHeight: '80px', resize: 'vertical' }}
                    />
                )
            case 'number':
                return (
                    <input
                        type="number"
                        value={strValue}
                        onChange={(e) => onChange(param.key, Number(e.target.value))}
                        placeholder={param.placeholder}
                        className="input"
                    />
                )
            case 'select':
                return (
                    <Select
                        value={strValue}
                        onChange={(val) => onChange(param.key, val)}
                        options={param.options?.map(opt => ({
                            value: opt.value,
                            label: opt.label
                        }))}
                    />
                )
            case 'boolean':
                return (
                    <label className="flex items-center gap-2 cursor-pointer py-2">
                        <input
                            type="checkbox"
                            checked={value === true || value === 'true'}
                            onChange={(e) => onChange(param.key, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-white">{param.label}</span>
                    </label>
                )
            default:
                return (
                    <input
                        type="text"
                        value={strValue}
                        onChange={(e) => onChange(param.key, e.target.value)}
                        placeholder={param.placeholder}
                        className="input"
                    />
                )
        }
    }

    return (
        <div className="flex flex-col gap-1.5 mb-4">
            {param.type !== 'boolean' && (
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {param.label}
                    {param.required && <span className="text-danger"> *</span>}
                </label>
            )}
            {renderInput()}
        </div>
    )
}
