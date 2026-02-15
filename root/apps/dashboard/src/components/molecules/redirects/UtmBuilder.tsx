/** @jsxImportSource react */
import React, { useState } from 'react'
import { Input } from '../../atoms/ui/Input'
import { Button } from '../../atoms/ui/Button'

export const UtmBuilder: React.FC = () => {
    const [utmForm, setUtmForm] = useState({ baseUrl: '', source: '', medium: '', campaign: '', term: '', content: '' })

    const generateUtmUrl = () => {
        if (!utmForm.baseUrl) return ''
        try {
            const u = new URL(utmForm.baseUrl)
            if (utmForm.source) u.searchParams.set('utm_source', utmForm.source)
            if (utmForm.medium) u.searchParams.set('utm_medium', utmForm.medium)
            if (utmForm.campaign) u.searchParams.set('utm_campaign', utmForm.campaign)
            if (utmForm.term) u.searchParams.set('utm_term', utmForm.term)
            if (utmForm.content) u.searchParams.set('utm_content', utmForm.content)
            return u.toString()
        } catch { return utmForm.baseUrl }
    }

    const url = generateUtmUrl()

    return (
        <div className="utm-builder">
            <h3 style={{ margin: 0 }}>🔧 Gerador de UTM</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Crie URLs com parâmetros UTM para rastrear suas campanhas</p>
            <div style={{ marginTop: 'var(--space-md)' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>URL Base</label>
                <Input name="baseUrl" placeholder="https://seusite.com" value={utmForm.baseUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUtmForm(f => ({ ...f, baseUrl: e.target.value }))} />
            </div>
            <div className="utm-fields">
                <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>utm_source *</label>
                    <Input name="source" placeholder="google, facebook, telegram" value={utmForm.source} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUtmForm(f => ({ ...f, source: e.target.value }))} />
                </div>
                <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>utm_medium *</label>
                    <Input name="medium" placeholder="cpc, email, social" value={utmForm.medium} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUtmForm(f => ({ ...f, medium: e.target.value }))} />
                </div>
                <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>utm_campaign</label>
                    <Input name="campaign" placeholder="black_friday_2024" value={utmForm.campaign} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUtmForm(f => ({ ...f, campaign: e.target.value }))} />
                </div>
                <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>utm_term</label>
                    <Input name="term" placeholder="bot+telegram" value={utmForm.term} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUtmForm(f => ({ ...f, term: e.target.value }))} />
                </div>
            </div>
            {url && (
                <div className="utm-result">
                    {url}
                    <div style={{ marginLeft: 8, display: 'inline-block' }}>
                        <Button size="sm" onClick={() => navigator.clipboard.writeText(url)}>📋 Copiar</Button>
                    </div>
                </div>
            )}
        </div>
    )
}
