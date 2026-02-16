/** @jsxImportSource react */
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../components/templates'
import { Button } from '../components/atoms/ui/Button'
import { Spinner } from '../components/atoms/ui/Spinner'
import { Modal } from '../components/molecules/ui/Modal'
import { Input } from '../components/atoms/ui/Input'

interface Plan {
    id: string;
    name: string;
    description: string | null;
    price: number; // centavos
    currency: string;
    type: 'one_time' | 'subscription';
    intervalDays: number | null;
    isActive: boolean;
    createdAt: string;
}

export const PlanosPage: React.FC = () => {
    const qc = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [form, setForm] = useState({
        name: '',
        description: '',
        priceStr: '', // string para input, converter para centavos
        type: 'subscription' as 'one_time' | 'subscription',
        intervalDays: 30
    })

    const { data: plans, isLoading } = useQuery<Plan[]>({
        queryKey: ['plans'],
        queryFn: async () => {
            const res = await fetch('/api/payments/plans')
            const result = await res.json() as any
            if (!result.success) throw new Error(result.error)
            return result.data || []
        },
    })

    const saveMut = useMutation({
        mutationFn: async () => {
            const priceCents = Math.round(parseFloat(form.priceStr.replace(',', '.')) * 100)
            const res = await fetch('/api/payments/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    description: form.description,
                    price: priceCents,
                    type: form.type,
                    intervalDays: form.type === 'subscription' ? form.intervalDays : null,
                }),
            })
            const result = await res.json() as any
            if (!result.success) throw new Error(result.error)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['plans'] })
            setIsModalOpen(false)
            setForm({ name: '', description: '', priceStr: '', type: 'subscription', intervalDays: 30 })
        },
    })

    const deleteMut = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/payments/plans/${id}/delete`, { method: 'POST' })
            const result = await res.json() as any
            if (!result.success) throw new Error(result.error)
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
    })

    const fmt = (v: number) => `R$ ${(v / 100).toFixed(2).replace('.', ',')}`

    return (
        <DashboardLayout title="Gerenciamento de Planos" currentPath="/dashboard/planos">
            <style>{`
                .plans-page { display: flex; flex-direction: column; gap: var(--space-xl); }
                
                .plans-header { 
                    display: flex; justify-content: space-between; align-items: center; 
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                }
                .plans-header-text h3 { margin: 0; font-size: 1rem; }
                .plans-header-text p { margin: 4px 0 0; font-size: 0.8rem; color: var(--color-text-muted); }

                .plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-md); }

                .plan-card {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                    display: flex; flex-direction: column; gap: var(--space-md);
                    transition: all var(--transition-fast); position: relative;
                }
                .plan-card:hover { border-color: var(--color-primary); transform: translateY(-2px); }
                .plan-card.inactive { opacity: 0.6; }

                .plan-badge {
                    position: absolute; top: 12px; right: 12px;
                    font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full);
                    background: rgba(16,185,129,.1); color: #10b981;
                }
                .plan-badge.recorrente { background: rgba(139,92,246,.1); color: #8b5cf6; }

                .plan-name { font-weight: 600; font-size: 1.1rem; margin: 0; }
                .plan-price { font-size: 1.5rem; font-weight: 700; color: var(--color-text-primary); }
                .plan-price span { font-size: 0.8rem; font-weight: 400; color: var(--color-text-muted); }

                .plan-desc { font-size: 0.85rem; color: var(--color-text-muted); min-height: 40px; }

                .plan-footer { 
                    margin-top: auto; padding-top: var(--space-md); border-top: 1px solid var(--color-border);
                    display: flex; justify-content: space-between; align-items: center;
                }

                .config-form { display: flex; flex-direction: column; gap: var(--space-lg); }
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
                
                .radio-group { display: flex; gap: var(--space-md); }
                .radio-option {
                    flex: 1; padding: var(--space-md); border: 2px solid var(--color-border);
                    border-radius: var(--radius-lg); text-align: center; cursor: pointer;
                    transition: all var(--transition-fast); background: transparent;
                }
                .radio-option:hover { border-color: var(--color-primary); }
                .radio-option.active { border-color: var(--color-primary); background: var(--color-primary-light); }
                .radio-option h4 { margin: 0; font-size: 0.85rem; }

                .loading-center { display: flex; justify-content: center; padding: var(--space-2xl); }
            `}</style>

            <div className="plans-page">
                <div className="plans-header">
                    <div className="plans-header-text">
                        <h3>📦 Meus Planos</h3>
                        <p>Crie e gerencie os planos oferecidos nos seus robôs.</p>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)}>+ Novo Plano</Button>
                </div>

                {isLoading ? (
                    <div className="loading-center"><Spinner size="lg" /></div>
                ) : (
                    <div className="plans-grid">
                        {plans?.map(plan => (
                            <div key={plan.id} className={`plan-card ${!plan.isActive ? 'inactive' : ''}`}>
                                <span className={`plan-badge ${plan.type === 'subscription' ? 'recorrente' : ''}`}>
                                    {plan.type === 'subscription' ? '🔄 RECORRENTE' : '💰 ÚNICO'}
                                </span>
                                <h4 className="plan-name">{plan.name}</h4>
                                <div className="plan-price">
                                    {fmt(plan.price)}
                                    <span>{plan.type === 'subscription' ? ` / ${plan.intervalDays} dias` : ''}</span>
                                </div>
                                <p className="plan-desc">{plan.description || 'Sem descrição.'}</p>
                                <div className="plan-footer">
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                        Criado em {new Date(plan.createdAt).toLocaleDateString()}
                                    </span>
                                    {plan.isActive && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => confirm('Desativar este plano?') && deleteMut.mutate(plan.id)}
                                        >
                                            🗑️ Remover
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {plans?.length === 0 && (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                                <p>Nenhum plano cadastrado. Comece criando seu primeiro plano!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Novo Plano de Venda"
            >
                <div className="config-form">
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Nome do Plano</label>
                        <Input
                            placeholder="Ex: Plano Master"
                            value={form.name}
                            onChange={(e: any) => setForm(f => ({ ...f, name: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Descrição (opcional)</label>
                        <Input
                            placeholder="O que este plano oferece?"
                            value={form.description}
                            onChange={(e: any) => setForm(f => ({ ...f, description: e.target.value }))}
                        />
                    </div>
                    <div className="form-row">
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Preço (R$)</label>
                            <Input
                                placeholder="29,90"
                                value={form.priceStr}
                                onChange={(e: any) => setForm(f => ({ ...f, priceStr: e.target.value }))}
                            />
                        </div>
                        {form.type === 'subscription' && (
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Intervalo (Dias)</label>
                                <Input
                                    type="number"
                                    value={form.intervalDays}
                                    onChange={(e: any) => setForm(f => ({ ...f, intervalDays: parseInt(e.target.value) }))}
                                />
                            </div>
                        )}
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '10px' }}>Tipo de Cobrança</label>
                        <div className="radio-group">
                            <button
                                className={`radio-option ${form.type === 'subscription' ? 'active' : ''}`}
                                onClick={() => setForm(f => ({ ...f, type: 'subscription' }))}
                            >
                                <h4>🔄 Assinatura</h4>
                            </button>
                            <button
                                className={`radio-option ${form.type === 'one_time' ? 'active' : ''}`}
                                onClick={() => setForm(f => ({ ...f, type: 'one_time' }))}
                            >
                                <h4>💰 Pagamento Único</h4>
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => saveMut.mutate()}
                            disabled={saveMut.isPending || !form.name || !form.priceStr}
                        >
                            {saveMut.isPending ? 'Salvando...' : '✓ Criar Plano'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
