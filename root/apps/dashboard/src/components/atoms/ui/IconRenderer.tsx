/** @jsxImportSource react */
import React from 'react'
import * as Icons from 'lucide-react'
import type { LucideProps } from 'lucide-react'

export const IconRenderer: React.FC<{ name?: string } & LucideProps> = ({ name, ...props }) => {
    const allIcons = Icons as any
    const HelpCircle = allIcons['HelpCircle']

    if (!name || typeof name !== 'string') {
        return HelpCircle ? <HelpCircle {...props} /> : null
    }

    const Icon = allIcons[name]

    if (!Icon) {
        return HelpCircle ? <HelpCircle {...props} /> : null
    }

    return <Icon {...props} />
}
