import React from 'react'
import * as Icons from 'lucide-react'
import type { LucideProps } from 'lucide-react'

export const IconRenderer: React.FC<{ name: string } & LucideProps> = ({ name, ...props }) => {
    const Icon = (Icons as any)[name]
    return Icon ? <Icon {...props} /> : null
}
