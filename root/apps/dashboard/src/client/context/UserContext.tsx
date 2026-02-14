import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

interface User {
    id: string
    name: string
    email: string
}

interface UserContextType {
    user: User | null
    tenantId: string | null
    isLoading: boolean
    error: any
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['auth-me'],
        queryFn: async () => {
            const res = await fetch('/api/auth/me')
            console.log('[UserContext] /api/auth/me status:', res.status)
            if (!res.ok) {
                console.error('[UserContext] Not authenticated')
                throw new Error('Not authenticated')
            }
            const result = await res.json() as any
            console.log('[UserContext] /api/auth/me result:', result)
            return result.data
        },
        retry: false,
    })

    const value = {
        user: data?.user || null,
        tenantId: data?.tenantId || null,
        isLoading,
        error
    }

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    )
}

export const useUser = () => {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider')
    }
    return context
}
