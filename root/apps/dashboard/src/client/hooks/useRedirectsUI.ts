import { useState } from 'react'
import { Redirect } from '../../../../engine/src/core/types'

export type TabKey = 'links' | 'codigos' | 'utm' | 'dominio'
export type CreateStep = 'domain' | 'config'

export interface RedirectFormState {
    slugType: 'random' | 'custom'
    slug: string
    mode: string
    domain: string
    isActive: boolean
    cloakerEnabled: boolean
    cloakerMethod: 'redirect' | 'safe_page' | 'mirror'
    cloakerSafeUrl: string
    destinationType: 'bot' | 'url'
    destinationUrl: string
    flowId: string
    botId: string
    pixelId: string
}

const initialFormState: RedirectFormState = {
    slugType: 'random',
    slug: '',
    mode: 'random',
    domain: typeof window !== 'undefined' ? window.location.host : '',
    isActive: true,
    cloakerEnabled: false,
    cloakerMethod: 'redirect',
    cloakerSafeUrl: '',
    destinationType: 'url',
    destinationUrl: '',
    flowId: '',
    botId: '',
    pixelId: '',
}

export const useRedirectsUI = () => {
    const [tab, setTab] = useState<TabKey>('links')
    const [showCreate, setShowCreate] = useState(false)
    const [createStep, setCreateStep] = useState<CreateStep>('domain')
    const [editingId, setEditingId] = useState<string | null>(null)

    const [form, setForm] = useState<RedirectFormState>(initialFormState)

    const resetForm = () => {
        setForm({
            ...initialFormState,
            domain: typeof window !== 'undefined' ? window.location.host : ''
        })
        setCreateStep('domain')
        setEditingId(null)
    }

    const openCreateModal = () => {
        resetForm()
        setShowCreate(true)
    }

    const openEditModal = (r: Redirect) => {
        setEditingId(r.id)
        setForm({
            slugType: (r as any).slugType === 'random' ? 'random' : 'custom',
            slug: r.slug,
            mode: r.mode,
            domain: r.domain,
            isActive: r.isActive,
            cloakerEnabled: r.cloakerEnabled,
            cloakerMethod: r.cloakerMethod,
            cloakerSafeUrl: r.cloakerSafeUrl || '',
            destinationType: r.destinationType,
            destinationUrl: r.destinationUrl,
            flowId: r.flowId || '',
            botId: r.botId || '',
            pixelId: r.pixelId || '',
        })
        setCreateStep('config')
        setShowCreate(true)
    }

    const closeCreateModal = () => {
        setShowCreate(false)
        resetForm()
    }

    // Helper to update form fields
    const updateForm = (updates: Partial<RedirectFormState>) => {
        setForm(prev => ({ ...prev, ...updates }))
    }

    return {
        tab,
        setTab,
        showCreate,
        openCreateModal,
        openEditModal,
        closeCreateModal,
        createStep,
        setCreateStep,
        editingId,
        form,
        updateForm, // flexible updater
        resetForm
    }
}
