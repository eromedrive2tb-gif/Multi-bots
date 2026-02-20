/** @jsxImportSource react */
import React from 'react'
import { DashboardLayout } from '../components/templates'
import { StatCard } from '../components/molecules/general/StatCard'
import { Button } from '../components/atoms/ui/Button'
import { RedirectList } from '../components/organisms/redirects/RedirectList'
import { CreateRedirectModal } from '../components/organisms/redirects/CreateRedirectModal'
import { UtmBuilder } from '../components/molecules/redirects/UtmBuilder'
import { DomainSetup } from '../components/molecules/redirects/DomainSetup'

import { useRedirectsController } from '../client/hooks/useRedirectsController'
import { useRedirectsUI } from '../client/hooks/useRedirectsUI'
import { Link as LinkIcon, MousePointerClick, Zap, Plus, Globe } from 'lucide-react'

export const RedirecionadoresPage: React.FC = () => {
    // Logic Controller
    const {
        redirects,
        stats,
        bots,
        isLoading,
        isCreating,
        isUpdating,
        createRedirect,
        updateRedirect,
        deleteRedirect,
        fetchBotBlueprints
    } = useRedirectsController()

    // UI State
    const {
        tab, setTab,
        showCreate, openCreateModal, openEditModal, closeCreateModal,
        createStep, setCreateStep,
        editingId,
        form, updateForm
    } = useRedirectsUI()

    const handleCreate = async () => {
        try {
            let finalDestinationUrl = form.destinationUrl

            if (form.destinationType === 'bot' && form.botId) {
                const selectedBot = bots.find(b => b.id === form.botId)
                if (selectedBot) {
                    const botUser = (selectedBot as any).username || 'bot'
                    const trigger = (form.flowId || 'start').replace(/^\//, '')
                    finalDestinationUrl = `https://t.me/${botUser}?start=${trigger}`
                }
            }

            const data = {
                slug: form.slugType === 'random' && !editingId ? crypto.randomUUID().slice(0, 8) : form.slug,
                destinationUrl: finalDestinationUrl,
                destinationType: form.destinationType,
                botId: form.botId,
                flowId: form.flowId,
                domain: form.domain,
                cloakerEnabled: form.cloakerEnabled,
                cloakerMethod: form.cloakerMethod,
                cloakerSafeUrl: form.cloakerSafeUrl || undefined,
                mode: form.mode
            }

            if (editingId) {
                await updateRedirect({ id: editingId, data })
            } else {
                await createRedirect(data)
            }
            closeCreateModal()
        } catch (error) {
            alert('Erro ao salvar redirecionador')
            console.error(error)
        }
    }

    const tabs = [
        { key: 'links', label: 'Links', icon: <LinkIcon size={14} /> },
        { key: 'codigos', label: 'Códigos de Vendas', icon: <Zap size={14} /> },
        { key: 'utm', label: 'Gerador UTM', icon: <LinkIcon size={14} /> },
        { key: 'dominio', label: 'Domínio Próprio', icon: <Globe size={14} /> },
    ]

    return (
        <DashboardLayout title="Redirecionadores" currentPath="/dashboard/redirecionadores">
            <style>{`
                .redir-page { display: flex; flex-direction: column; gap: var(--space-xl); }
                .redir-header { display: flex; justify-content: space-between; align-items: flex-start; }
                .redir-header h1 { margin: 0; font-size: 1.5rem; }
                .redir-header p { margin: 4px 0 0; font-size: 0.85rem; color: var(--color-text-muted); }

                .redir-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); }
                
                .redir-tabs { display: flex; gap: var(--space-xs); margin-bottom: var(--space-md); }
                .redir-tab {
                    padding: 8px 16px; border-radius: var(--radius-md); font-size: 0.8rem;
                    font-weight: 500; border: 1px solid var(--color-border); background: transparent;
                    color: var(--color-text-secondary); cursor: pointer;
                    transition: all var(--transition-fast);
                }
                .redir-tab:hover { border-color: var(--color-primary); color: var(--color-primary); }
                .redir-tab.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }

                /* Specific styles for organisms that might rely on page context if not encapsulated */
                .redir-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: var(--space-md); }
                
                /* Keeping necessary global styles or those shared by components if they don't have their own CSS files */
                .redir-card {
                    background: var(--color-bg-card); border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg); padding: var(--space-lg);
                    display: flex; flex-direction: column; gap: var(--space-md);
                    transition: all var(--transition-fast);
                }
                .redir-card:hover { border-color: var(--color-primary); }
                .redir-card-url { display: flex; align-items: center; gap: var(--space-sm); font-family: monospace; font-size: 0.85rem; color: var(--color-primary); }
                .redir-card-shortcode { font-size: 0.75rem; color: var(--color-text-muted); font-family: monospace; }
                .redir-card-badges { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
                .redir-badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: 0.7rem; font-weight: 600; }
                .redir-badge-random { background: rgba(6,182,212,.15); color: #06b6d4; }
                .redir-badge-custom { background: rgba(139,92,246,.15); color: #8b5cf6; }
                .redir-badge-active { background: rgba(16,185,129,.15); color: #10b981; }
                .redir-badge-inactive { background: rgba(239,68,68,.15); color: #ef4444; }
                .redir-badge-cloaker { background: rgba(234,179,8,.15); color: #eab308; }
                .redir-card-clicks { font-size: 0.8rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 4px; }
                .redir-cloaker-stats { background: rgba(239,68,68,.08); border-radius: var(--radius-md); padding: 6px 12px; font-size: 0.75rem; display: flex; gap: var(--space-md); }
                .redir-cloaker-stats .blocked { color: #ef4444; }
                .redir-cloaker-stats .allowed { color: #10b981; }
                .redir-card-actions { display: flex; gap: var(--space-sm); flex-wrap: wrap; }

                /* Create Modal Styles - moved to global for now or kept here if components use them */
                .redir-create { display: flex; flex-direction: column; gap: var(--space-lg); }
                .redir-domain-options { display: flex; flex-direction: column; gap: var(--space-md); }
                .redir-domain-option { padding: var(--space-lg); border: 2px solid var(--color-border); border-radius: var(--radius-lg); cursor: pointer; display: flex; align-items: center; gap: var(--space-md); transition: all var(--transition-fast); }
                .redir-domain-option:hover { border-color: var(--color-primary); }
                .redir-domain-option h4 { margin: 0; font-size: 0.9rem; }
                .redir-domain-option p { margin: 2px 0 0; font-size: 0.75rem; color: var(--color-text-muted); }
                .redir-slug-type { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); margin-bottom: var(--space-md); }
                .redir-slug-btn { padding: 10px; text-align: center; border: 2px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; font-size: 0.8rem; background: transparent; color: var(--color-text-secondary); transition: all var(--transition-fast); }
                .redir-slug-btn.active { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary); }
                .redir-slug-row { display: flex; gap: var(--space-sm); align-items: center; }
                .redir-toggles { display: flex; gap: var(--space-xl); align-items: center; }
                .redir-toggle-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
                .redir-dest-select { width: 100%; padding: 10px 12px; border-radius: var(--radius-md); background: var(--color-bg-tertiary); border: 1px solid var(--color-border); color: var(--color-text-primary); font-size: 0.85rem; }
                .redir-cloaker-methods { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-sm); }
                .redir-cloaker-method { padding: var(--space-md); text-align: center; border: 2px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; font-size: 0.75rem; background: transparent; transition: all var(--transition-fast); }
                .redir-cloaker-method:hover { border-color: var(--color-primary); }
                .redir-cloaker-method.active { border-color: var(--color-primary); background: var(--color-primary-light); }
                .redir-cloaker-method h5 { margin: 0 0 4px; font-size: 0.8rem; }

                /* UTM & Domain specific styles */
                .utm-builder { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-xl); }
                .utm-fields { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-top: var(--space-md); }
                .utm-result { margin-top: var(--space-lg); padding: var(--space-md); background: var(--color-bg-tertiary); border-radius: var(--radius-md); font-family: monospace; font-size: 0.8rem; word-break: break-all; color: var(--color-primary); }
                .domain-setup { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-xl); }
                .domain-steps { display: flex; flex-direction: column; gap: var(--space-lg); margin-top: var(--space-lg); }
                .domain-step { display: flex; gap: var(--space-md); }
                .domain-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--color-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
                .domain-step-content h4 { margin: 0; font-size: 0.9rem; }
                .domain-step-content p { margin: 4px 0 0; font-size: 0.8rem; color: var(--color-text-muted); }
                .domain-cname { margin-top: 8px; padding: 8px 12px; background: var(--color-bg-tertiary); border-radius: var(--radius-md); font-family: monospace; font-size: 0.8rem; }
                
                .section-title { display: flex; align-items: center; gap: var(--space-sm); font-size: 1rem; font-weight: 600; margin-bottom: var(--space-md); }
                .loading-center { display: flex; justify-content: center; padding: var(--space-2xl); }
            `}</style>

            <div className="redir-page">
                <div className="redir-header">
                    <div>
                        <h1>Redirecionadores</h1>
                        <p>Configure seus links de redirecionamento</p>
                    </div>
                    <Button onClick={openCreateModal}><Plus size={16} /> Criar Link</Button>
                </div>

                {/* Stats */}
                <div className="redir-stats">
                    <StatCard
                        label="TOTAL LINKS"
                        value={stats?.totalLinks || 0}
                        icon={<LinkIcon size={24} />}
                        iconBg="rgba(6,182,212,.15)"
                    />
                    <StatCard
                        label="TOTAL CLIQUES"
                        value={stats?.totalClicks || 0}
                        icon={<MousePointerClick size={24} />}
                        iconBg="rgba(139,92,246,.15)"
                    />
                    <StatCard
                        label="COM CLOAKER"
                        value={stats?.withCloaker || 0}
                        icon={<Zap size={24} />}
                        iconBg="rgba(234,179,8,.15)"
                    />
                </div>

                {/* Tabs */}
                <div className="redir-tabs">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            className={`redir-tab flex items-center gap-2 ${tab === t.key ? 'active' : ''}`}
                            onClick={() => setTab(t.key as any)}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {tab === 'links' && (
                    <>
                        <div className="section-title"><LinkIcon size={16} className="text-cyan-neon" /> Meus Redirecionadores ({redirects?.length || 0})</div>
                        <RedirectList
                            redirects={redirects}
                            isLoading={isLoading}
                            onEdit={openEditModal}
                            onDelete={(id) => deleteRedirect(id)}
                        />
                    </>
                )}

                {tab === 'codigos' && (
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <div className="flex justify-center mb-4 text-cyan-neon"><Zap size={48} /></div>
                        <h3 style={{ margin: 0 }}>Códigos de Vendas</h3>
                        <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Gerencie seus códigos de rastreamento de vendas aqui.</p>
                    </div>
                )}

                {tab === 'utm' && <UtmBuilder />}

                {tab === 'dominio' && <DomainSetup />}

            </div>

            <CreateRedirectModal
                isOpen={showCreate}
                onClose={closeCreateModal}
                form={form}
                updateForm={updateForm}
                step={createStep}
                setStep={setCreateStep}
                bots={bots}
                fetchBlueprints={fetchBotBlueprints}
                onSubmit={handleCreate}
                isSubmitting={isCreating || isUpdating}
            />
        </DashboardLayout>
    )
}

