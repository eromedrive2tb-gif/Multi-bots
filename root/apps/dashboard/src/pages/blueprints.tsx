import type { FC } from 'hono/jsx'
import { DashboardLayout } from '../components/templates/DashboardLayout'
import { Alert } from '../components/atoms/Alert'
import { Button } from '../components/atoms/Button'
import type { BlueprintListItem } from '../lib/atoms/database/db-get-blueprints'

interface BlueprintsPageProps {
    user: {
        name: string
        email: string
    }
    blueprints: BlueprintListItem[]
    selectedBlueprint?: string  // JSON stringified blueprint for editor
    error?: string
    success?: string
}

export const BlueprintsPage: FC<BlueprintsPageProps> = ({
    user,
    blueprints,
    selectedBlueprint,
    error,
    success
}) => {
    return (
        <DashboardLayout
            title="Blueprints"
            currentPath="/dashboard/blueprints"
            user={user}
        >
            {/* Messages */}
            {error && (
                <div class="alert-container">
                    <Alert type="error" message={error} />
                </div>
            )}
            {success && (
                <div class="alert-container">
                    <Alert type="success" message={success} />
                </div>
            )}

            <div class="blueprints-container">
                {/* Blueprint List */}
                <div class="blueprints-list-section">
                    <div class="section-header">
                        <h2>📋 Seus Blueprints</h2>
                        <div class="header-actions">
                            <button
                                type="button"
                                class="btn btn-secondary"
                                onclick="openJsonModal()"
                            >
                                📤 Upload JSON
                            </button>
                            <a href="/dashboard/blueprints/new" class="btn btn-primary">
                                ➕ Novo Blueprint
                            </a>
                        </div>
                    </div>

                    {blueprints.length === 0 ? (
                        <div class="empty-state">
                            <span class="empty-icon">🔧</span>
                            <h3>Nenhum blueprint configurado</h3>
                            <p>Crie seu primeiro blueprint para automatizar fluxos do bot</p>
                            <button
                                type="button"
                                class="btn btn-primary"
                                style="margin-top: 16px;"
                                onclick="openJsonModal()"
                            >
                                📤 Importar JSON
                            </button>
                        </div>
                    ) : (
                        <div class="blueprints-table-wrapper">
                            <table class="blueprints-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Trigger</th>
                                        <th>Versão</th>
                                        <th>Status</th>
                                        <th>Atualizado</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {blueprints.map(bp => (
                                        <tr key={bp.id}>
                                            <td>
                                                <a href={`/dashboard/blueprints/${bp.id}`} class="blueprint-link">
                                                    {bp.name}
                                                </a>
                                            </td>
                                            <td>
                                                <code class="trigger-code">{bp.trigger}</code>
                                            </td>
                                            <td>{bp.version}</td>
                                            <td>
                                                <span class={`status-badge ${bp.isActive ? 'active' : 'inactive'}`}>
                                                    {bp.isActive ? '✅ Ativo' : '⏸️ Inativo'}
                                                </span>
                                            </td>
                                            <td>{new Date(bp.updatedAt).toLocaleDateString('pt-BR')}</td>
                                            <td>
                                                <div class="actions-row">
                                                    <a href={`/dashboard/blueprints/${bp.id}`} class="btn btn-sm btn-secondary">
                                                        ✏️ Visual
                                                    </a>
                                                    <button
                                                        type="button"
                                                        class="btn btn-sm btn-secondary"
                                                        onclick={`editBlueprintJson('${bp.id}')`}
                                                    >
                                                        📝 JSON
                                                    </button>
                                                    <form method="post" action={`/api/blueprints/${bp.id}/delete`} class="inline-form">
                                                        <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('Tem certeza?')">
                                                            🗑️
                                                        </button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Visual Editor Section */}
                <div class="editor-section">
                    <div class="section-header">
                        <h2>🎨 Editor Visual</h2>
                    </div>

                    {/* React Flow container - will be hydrated client-side */}
                    <div
                        id="blueprint-editor-root"
                        data-initial-blueprint={selectedBlueprint || ''}
                        class="editor-canvas-container"
                    >
                        <div class="editor-loading">
                            <span>Carregando editor...</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* JSON Upload/Edit Modal */}
            <div id="json-modal" class="modal-overlay" style="display: none;">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 id="modal-title">📤 Upload de Blueprint JSON</h3>
                        <button type="button" class="modal-close" onclick="closeJsonModal()">✕</button>
                    </div>

                    <div class="modal-body">
                        {/* File Upload Zone */}
                        <div class="upload-zone" id="upload-zone">
                            <input
                                type="file"
                                id="json-file-input"
                                accept=".json,application/json"
                                style="display: none;"
                            />
                            <div class="upload-content">
                                <span class="upload-icon">📁</span>
                                <p>Arraste um arquivo JSON ou <button type="button" class="link-btn" onclick="document.getElementById('json-file-input').click()">clique para selecionar</button></p>
                            </div>
                        </div>

                        {/* JSON Editor */}
                        <div class="json-editor-container">
                            <div class="editor-toolbar">
                                <span class="toolbar-label">Editor JSON</span>
                                <div class="toolbar-actions">
                                    <button type="button" class="btn btn-sm btn-secondary" onclick="formatJson()">
                                        🔧 Formatar
                                    </button>
                                    <button type="button" class="btn btn-sm btn-secondary" onclick="validateJson()">
                                        ✅ Validar
                                    </button>
                                    <button type="button" class="btn btn-sm btn-secondary" onclick="loadExample()">
                                        📋 Exemplo
                                    </button>
                                </div>
                            </div>
                            <textarea
                                id="json-editor"
                                class="json-textarea"
                                placeholder='{"id": "meu_fluxo", "name": "Meu Fluxo", "trigger": "/start", "steps": {...}}'
                                rows={20}
                            ></textarea>
                            <div id="json-validation" class="validation-message"></div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeJsonModal()">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" id="save-json-btn" onclick="saveJsonBlueprint()">
                            💾 Salvar Blueprint
                        </button>
                    </div>
                </div>
            </div>

            {/* Client-side React bundle */}
            <script type="module" src="/root/apps/dashboard/src/client/main.tsx"></script>

            {/* JSON Modal Scripts */}
            {/* JSON Modal Scripts */}
            <script dangerouslySetInnerHTML={{
                __html: `
                // State
                let editingBlueprintId = null;
                
                // Expose functions to global scope
                window.openJsonModal = function(blueprintData = null) {
                    console.log('Opening JSON Modal', blueprintData);
                    const modal = document.getElementById('json-modal');
                    const title = document.getElementById('modal-title');
                    const editor = document.getElementById('json-editor');
                    
                    if (!modal || !title || !editor) {
                        console.error('Modal elements not found');
                        return;
                    }
                    
                    if (blueprintData) {
                        title.textContent = '📝 Editar Blueprint JSON';
                        editor.value = JSON.stringify(blueprintData, null, 2);
                        editingBlueprintId = blueprintData.id;
                    } else {
                        title.textContent = '📤 Upload de Blueprint JSON';
                        editor.value = '';
                        editingBlueprintId = null;
                    }
                    
                    modal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                };
                
                window.closeJsonModal = function() {
                    console.log('Closing JSON Modal');
                    const modal = document.getElementById('json-modal');
                    if (modal) {
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                        editingBlueprintId = null;
                        
                        const validation = document.getElementById('json-validation');
                        if (validation) validation.innerHTML = '';
                    }
                };
                
                window.editBlueprintJson = async function(blueprintId) {
                    console.log('Editing Blueprint JSON', blueprintId);
                    try {
                        const response = await fetch('/api/blueprints/' + blueprintId);
                        const result = await response.json();
                        
                        if (result.success && result.data) {
                            window.openJsonModal(result.data);
                        } else {
                            alert('Erro ao carregar blueprint: ' + (result.error || 'Desconhecido'));
                        }
                    } catch (error) {
                        console.error('Error loading blueprint:', error);
                        alert('Erro ao carregar blueprint: ' + error.message);
                    }
                };
                
                window.formatJson = function() {
                    const editor = document.getElementById('json-editor');
                    try {
                        const parsed = JSON.parse(editor.value);
                        editor.value = JSON.stringify(parsed, null, 2);
                        window.showValidation('✅ JSON formatado com sucesso!', 'success');
                    } catch (e) {
                        window.showValidation('❌ JSON inválido: ' + e.message, 'error');
                    }
                };
                
                window.validateJson = function() {
                    const editor = document.getElementById('json-editor');
                    try {
                        const parsed = JSON.parse(editor.value);
                        
                        // Basic validation
                        const errors = [];
                        if (!parsed.id) errors.push('Campo "id" é obrigatório');
                        if (!parsed.name) errors.push('Campo "name" é obrigatório');
                        if (!parsed.trigger) errors.push('Campo "trigger" é obrigatório');
                        if (!parsed.entry_step) errors.push('Campo "entry_step" é obrigatório');
                        if (!parsed.steps || typeof parsed.steps !== 'object') errors.push('Campo "steps" é obrigatório e deve ser um objeto');
                        
                        if (errors.length > 0) {
                            window.showValidation('⚠️ Problemas encontrados:\\n• ' + errors.join('\\n• '), 'warning');
                        } else {
                            const stepCount = Object.keys(parsed.steps).length;
                            window.showValidation('✅ JSON válido! ' + stepCount + ' steps encontrados.', 'success');
                        }
                    } catch (e) {
                        window.showValidation('❌ JSON inválido: ' + e.message, 'error');
                    }
                };
                
                window.showValidation = function(message, type) {
                    const validation = document.getElementById('json-validation');
                    if (validation) {
                        validation.className = 'validation-message ' + type;
                        validation.innerHTML = message.replace(/\\n/g, '<br>');
                    }
                };
                
                window.loadExample = function() {
                    const example = {
                        id: "meu_fluxo",
                        name: "Meu Fluxo de Exemplo",
                        description: "Um fluxo simples de boas-vindas",
                        trigger: "/start",
                        version: "1.0.0",
                        entry_step: "welcome",
                        steps: {
                            welcome: {
                                type: "molecule",
                                action: "send_message",
                                params: {
                                    text: "👋 Olá! Bem-vindo ao nosso bot!\\n\\nDigite /ajuda para ver os comandos.",
                                    parse_mode: "markdown"
                                },
                                next_step: null
                            }
                        }
                    };
                    
                    const editor = document.getElementById('json-editor');
                    if (editor) {
                        editor.value = JSON.stringify(example, null, 2);
                        window.showValidation('📋 Exemplo carregado! Personalize e salve.', 'info');
                    }
                };
                
                window.saveJsonBlueprint = async function() {
                    const editor = document.getElementById('json-editor');
                    const saveBtn = document.getElementById('save-json-btn');
                    
                    try {
                        const blueprint = JSON.parse(editor.value);
                        
                        // Check if ID changed when editing (not allowed or handled as new?)
                        // dealing with ID persistence
                        
                        if (!blueprint.id || !blueprint.name || !blueprint.trigger || !blueprint.steps) {
                            window.showValidation('❌ Blueprint incompleto. Campos obrigatórios: id, name, trigger, steps', 'error');
                            return;
                        }
                        
                        if (saveBtn) {
                            saveBtn.disabled = true;
                            saveBtn.textContent = '⏳ Salvando...';
                        }
                        
                        const method = editingBlueprintId ? 'PUT' : 'POST';
                        const url = editingBlueprintId ? '/api/blueprints/' + editingBlueprintId : '/api/blueprints';
                        
                        const response = await fetch(url, {
                            method: method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(blueprint)
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            window.closeJsonModal();
                            window.location.reload();
                        } else {
                            window.showValidation('❌ Erro ao salvar: ' + (result.error || 'Desconhecido'), 'error');
                        }
                    } catch (e) {
                        window.showValidation('❌ JSON inválido: ' + e.message, 'error');
                    } finally {
                        if (saveBtn) {
                            saveBtn.disabled = false;
                            saveBtn.textContent = '💾 Salvar Blueprint';
                        }
                    }
                };
                
                // File upload handling
                document.addEventListener('DOMContentLoaded', function() {
                    console.log('Blueprint Page Loaded - Initializing Scripts');
                    
                    const fileInput = document.getElementById('json-file-input');
                    const uploadZone = document.getElementById('upload-zone');
                    
                    if (fileInput) {
                        fileInput.addEventListener('change', function(e) {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = function(e) {
                                    const editor = document.getElementById('json-editor');
                                    if (editor) {
                                        editor.value = e.target.result;
                                        window.validateJson();
                                    }
                                };
                                reader.readAsText(file);
                            }
                        });
                    }
                    
                    if (uploadZone) {
                        uploadZone.addEventListener('dragover', function(e) {
                            e.preventDefault();
                            uploadZone.classList.add('dragover');
                        });
                        
                        uploadZone.addEventListener('dragleave', function(e) {
                            e.preventDefault();
                            uploadZone.classList.remove('dragover');
                        });
                        
                        uploadZone.addEventListener('drop', function(e) {
                            e.preventDefault();
                            uploadZone.classList.remove('dragover');
                            
                            const file = e.dataTransfer.files[0];
                            if (file && file.type === 'application/json') {
                                const reader = new FileReader();
                                reader.onload = function(e) {
                                    const editor = document.getElementById('json-editor');
                                    if (editor) {
                                        editor.value = e.target.result;
                                        window.validateJson();
                                    }
                                };
                                reader.readAsText(file);
                            }
                        });
                    }
                    
                    // Close modal on overlay click
                    const modal = document.getElementById('json-modal');
                    if (modal) {
                        modal.addEventListener('click', function(e) {
                            if (e.target === modal) {
                                window.closeJsonModal();
                            }
                        });
                    }
                });
            ` }} />


            <style>{`
                .blueprints-container {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                
                .section-header h2 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: var(--text-primary);
                }
                
                .blueprints-list-section {
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 20px;
                    border: 1px solid var(--border-color);
                }
                
                .blueprints-table-wrapper {
                    overflow-x: auto;
                }
                
                .blueprints-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .blueprints-table th,
                .blueprints-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .blueprints-table th {
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
                
                .blueprint-link {
                    color: var(--primary);
                    text-decoration: none;
                    font-weight: 500;
                }
                
                .blueprint-link:hover {
                    text-decoration: underline;
                }
                
                .trigger-code {
                    background: var(--code-bg);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.875rem;
                }
                
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 8px;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }
                
                .status-badge.active {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                }
                
                .status-badge.inactive {
                    background: rgba(107, 114, 128, 0.1);
                    color: #6b7280;
                }
                
                .actions-row {
                    display: flex;
                    gap: 8px;
                }
                
                .inline-form {
                    display: inline;
                }
                
                .editor-section {
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 20px;
                    border: 1px solid var(--border-color);
                }
                
                .editor-canvas-container {
                    min-height: 600px;
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .editor-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 600px;
                    background: #1a1a2e;
                    color: white;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 40px;
                    color: var(--text-secondary);
                }
                
                .empty-icon {
                    font-size: 3rem;
                    display: block;
                    margin-bottom: 16px;
                }
                
                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 500;
                    text-decoration: none;
                    border: none;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }
                
                .btn-primary {
                    background: var(--primary);
                    color: white;
                }
                
                .btn-primary:hover {
                    background: var(--primary-dark);
                }
                
                .btn-secondary {
                    background: var(--border-color);
                    color: var(--text-primary);
                }
                
                .btn-danger {
                    background: #ef4444;
                    color: white;
                }
                
                .btn-sm {
                    padding: 4px 12px;
                    font-size: 0.75rem;
                }
                
                .alert-container {
                    margin-bottom: 16px;
                }
                
                .header-actions {
                    display: flex;
                    gap: 8px;
                }
                
                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                    backdrop-filter: blur(4px);
                }
                
                .modal-container {
                    background: var(--card-bg, #1a1a2e);
                    border-radius: 16px;
                    width: 100%;
                    max-width: 900px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid var(--border-color, #2d2d44);
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                }
                
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border-color, #2d2d44);
                }
                
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: var(--text-primary, white);
                }
                
                .modal-close {
                    background: transparent;
                    border: none;
                    font-size: 1.5rem;
                    color: var(--text-secondary, #888);
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                
                .modal-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                }
                
                .modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                }
                
                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    padding: 16px 24px;
                    border-top: 1px solid var(--border-color, #2d2d44);
                }
                
                /* Upload Zone */
                .upload-zone {
                    border: 2px dashed var(--border-color, #3d3d54);
                    border-radius: 12px;
                    padding: 32px;
                    text-align: center;
                    margin-bottom: 20px;
                    transition: all 0.3s;
                    background: rgba(255, 255, 255, 0.02);
                }
                
                .upload-zone:hover,
                .upload-zone.dragover {
                    border-color: var(--primary, #6366f1);
                    background: rgba(99, 102, 241, 0.05);
                }
                
                .upload-content {
                    color: var(--text-secondary, #888);
                }
                
                .upload-icon {
                    font-size: 3rem;
                    display: block;
                    margin-bottom: 12px;
                }
                
                .link-btn {
                    background: none;
                    border: none;
                    color: var(--primary, #6366f1);
                    cursor: pointer;
                    text-decoration: underline;
                    font-size: inherit;
                    padding: 0;
                }
                
                /* JSON Editor */
                .json-editor-container {
                    border: 1px solid var(--border-color, #2d2d44);
                    border-radius: 12px;
                    overflow: hidden;
                }
                
                .editor-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border-bottom: 1px solid var(--border-color, #2d2d44);
                }
                
                .toolbar-label {
                    font-weight: 500;
                    color: var(--text-secondary, #888);
                    font-size: 0.875rem;
                }
                
                .toolbar-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .json-textarea {
                    width: 100%;
                    min-height: 400px;
                    padding: 16px;
                    background: #0d0d14;
                    border: none;
                    color: #e0e0e0;
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                    font-size: 0.875rem;
                    line-height: 1.6;
                    resize: vertical;
                    outline: none;
                    box-sizing: border-box;
                }
                
                .json-textarea::placeholder {
                    color: #555;
                }
                
                /* Validation Messages */
                .validation-message {
                    padding: 12px 16px;
                    font-size: 0.875rem;
                    border-top: 1px solid var(--border-color, #2d2d44);
                    min-height: 20px;
                }
                
                .validation-message:empty {
                    display: none;
                }
                
                .validation-message.success {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                }
                
                .validation-message.error {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }
                
                .validation-message.warning {
                    background: rgba(245, 158, 11, 0.1);
                    color: #f59e0b;
                }
                
                .validation-message.info {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                }
                
                /* Responsive */
                @media (max-width: 768px) {
                    .modal-container {
                        max-height: 100vh;
                        border-radius: 0;
                    }
                    
                    .toolbar-actions {
                        flex-wrap: wrap;
                    }
                    
                    .header-actions {
                        flex-direction: column;
                    }
                }
            `}</style>
        </DashboardLayout>
    )
}
