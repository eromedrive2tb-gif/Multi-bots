import type { FC } from 'hono/jsx'

export const ClearMetricsButton: FC = () => {
    // Generate a reasonably unique ID for this instance
    const uniqueId = 'cm-' + Math.random().toString(36).substr(2, 5)

    const script = `
        (function() {
            const modal = document.getElementById('modal-${uniqueId}');
            const btnOpen = document.getElementById('btn-open-${uniqueId}');
            const btnCancel = document.getElementById('btn-cancel-${uniqueId}');
            const btnConfirm = document.getElementById('btn-confirm-${uniqueId}');
            
            if (!modal || !btnOpen || !btnCancel || !btnConfirm) return;

            btnOpen.onclick = function() {
                modal.classList.add('open');
            };

            btnCancel.onclick = function() {
                modal.classList.remove('open');
            };

            // Close when clicking outside content
            modal.onclick = function(e) {
                if (e.target === modal) {
                    modal.classList.remove('open');
                }
            };

            btnConfirm.onclick = async function() {
                const originalText = btnConfirm.innerHTML;
                btnConfirm.disabled = true;
                btnConfirm.innerHTML = 'Limpando...';
                
                try {
                    const res = await fetch('/api/analytics', { method: 'DELETE' });
                    if (res.ok) {
                        window.location.reload();
                    } else {
                        const data = await res.json();
                        alert('Erro ao limpar métricas: ' + (data.error || 'Erro desconhecido'));
                        btnConfirm.disabled = false;
                        btnConfirm.innerHTML = originalText;
                    }
                } catch (e) {
                    console.error(e);
                    alert('Erro de conexão com o servidor');
                    btnConfirm.disabled = false;
                    btnConfirm.innerHTML = originalText;
                }
            };
        })();
    `

    return (
        <>
            <button
                id={`btn-open-${uniqueId}`}
                type="button"
                class="btn btn-sm btn-clear-metrics"
                title="Limpar Métricas"
            >
                🗑️ Limpar
            </button>

            {/* Modal */}
            <div
                id={`modal-${uniqueId}`}
                class="modal-overlay"
            >
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-icon-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" class="modal-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div class="flex-1">
                            <h3 class="modal-title">
                                Limpar todas as métricas?
                            </h3>
                            <div class="modal-description">
                                <p>Esta ação removerá permanentemente <strong>todos os dados</strong> de analytics (fluxos, conversões, erros) deste tenant.</p>
                                <span class="modal-warning-text">Esta ação não pode ser desfeita.</span>
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button
                            id={`btn-cancel-${uniqueId}`}
                            type="button"
                            class="btn btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            id={`btn-confirm-${uniqueId}`}
                            type="button"
                            class="btn btn-danger"
                        >
                            Confirmar Limpeza
                        </button>
                    </div>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{ __html: script }} />
        </>
    )
}
