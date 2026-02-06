import type { FC } from 'hono/jsx'

interface NavLinkProps {
    href: string
    icon?: string
    active?: boolean
    class?: string
    children: any
}

export const NavLink: FC<NavLinkProps> = ({
    href,
    icon,
    active = false,
    class: className = '',
    children,
}) => {
    return (
        <a
            href={href}
            class={`nav-link ${active ? 'nav-link-active' : ''} ${className}`}
        >
            {icon && <span class="nav-icon">{icon}</span>}
            <span class="nav-text">{children}</span>
        </a>
    )
}
