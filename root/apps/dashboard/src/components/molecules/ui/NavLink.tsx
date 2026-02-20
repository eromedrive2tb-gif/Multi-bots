/** @jsxImportSource react */
import React, { FC, ReactNode, memo } from 'react'

import { Link } from 'react-router-dom'

interface NavLinkProps {
    href: string
    icon?: ReactNode
    active?: boolean
    className?: string
    children: ReactNode
}

export const NavLink: FC<NavLinkProps> = memo(({
    href,
    icon,
    active = false,
    className = '',
    children,
}) => {
    return (
        <Link
            to={href}
            className={`nav-link ${active ? 'nav-link-active' : ''} ${className}`}
        >
            {icon && <span className="nav-icon">{icon}</span>}
            <span className="nav-text">{children}</span>
        </Link>
    )
})

