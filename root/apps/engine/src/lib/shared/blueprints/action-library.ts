/**
 * Action Library - Catálogo de ações disponíveis para blueprints
 * Organizadas por categoria com schema de parâmetros
 */

export interface ActionParam {
    key: string
    label: string
    type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'json'
    placeholder?: string
    required?: boolean
    options?: { value: string; label: string }[]
    defaultValue?: string | number | boolean
}

export interface ActionDefinition {
    key: string
    label: string
    icon: string
    description: string
    category: 'messaging' | 'logic' | 'data' | 'http' | 'bot'
    params: ActionParam[]
}

// ============================================
// MESSAGING ACTIONS
// ============================================

const messagingActions: ActionDefinition[] = [
    {
        key: 'send_message',
        label: 'Enviar Mensagem',
        icon: '💬',
        description: 'Envia uma mensagem de texto',
        category: 'messaging',
        params: [
            {
                key: 'text',
                label: 'Texto da Mensagem',
                type: 'textarea',
                placeholder: 'Olá, {{user_name}}! Bem-vindo...',
                required: true,
            },
            {
                key: 'parse_mode',
                label: 'Formato',
                type: 'select',
                options: [
                    { value: 'text', label: 'Texto simples' },
                    { value: 'HTML', label: 'HTML' },
                    { value: 'Markdown', label: 'Markdown' },
                ],
                defaultValue: 'text',
            },
        ],
    },
    {
        key: 'send_photo',
        label: 'Enviar Foto',
        icon: '🖼️',
        description: 'Envia uma imagem',
        category: 'messaging',
        params: [
            {
                key: 'url',
                label: 'URL da Imagem',
                type: 'text',
                placeholder: 'https://exemplo.com/imagem.jpg',
                required: true,
            },
            {
                key: 'caption',
                label: 'Legenda',
                type: 'textarea',
                placeholder: 'Legenda opcional...',
            },
        ],
    },
    {
        key: 'send_voice',
        label: 'Enviar Áudio',
        icon: '🎤',
        description: 'Envia uma mensagem de voz',
        category: 'messaging',
        params: [
            {
                key: 'url',
                label: 'URL do Áudio',
                type: 'text',
                placeholder: 'https://exemplo.com/audio.ogg',
                required: true,
            },
        ],
    },
    {
        key: 'send_webapp',
        label: 'Enviar WebApp',
        icon: '📱',
        description: 'Envia um botão para abrir um WebApp dinâmico',
        category: 'messaging',
        params: [
            {
                key: 'text',
                label: 'Texto da Mensagem',
                type: 'textarea',
                placeholder: 'Clique no botão para abrir o app:',
                required: true,
            },
            {
                key: 'button_text',
                label: 'Texto do Botão',
                type: 'text',
                placeholder: 'Abrir App',
                required: true,
            },
            {
                key: 'page_id',
                label: 'ID da Página (WebApp)',
                type: 'text',
                placeholder: 'minha-pagina',
                required: true,
            },
            {
                key: 'parse_mode',
                label: 'Formato',
                type: 'select',
                options: [
                    { value: 'text', label: 'Texto simples' },
                    { value: 'HTML', label: 'HTML' },
                    { value: 'Markdown', label: 'Markdown' },
                ],
                defaultValue: 'text',
            },
        ],
    },
]

// ============================================
// LOGIC ACTIONS
// ============================================

const logicActions: ActionDefinition[] = [
    {
        key: 'condition',
        label: 'Condição (IF)',
        icon: '🔀',
        description: 'Executa lógica condicional',
        category: 'logic',
        params: [
            {
                key: 'expression',
                label: 'Expressão',
                type: 'text',
                placeholder: '{{session.opt_in}} == true',
                required: true,
            },
            {
                key: 'true_step',
                label: 'Se verdadeiro, ir para',
                type: 'text',
                placeholder: 'step_success',
            },
            {
                key: 'false_step',
                label: 'Se falso, ir para',
                type: 'text',
                placeholder: 'step_fallback',
            },
        ],
    },
    {
        key: 'wait',
        label: 'Aguardar',
        icon: '⏱️',
        description: 'Pausa a execução por segundos',
        category: 'logic',
        params: [
            {
                key: 'seconds',
                label: 'Segundos',
                type: 'number',
                placeholder: '3',
                required: true,
                defaultValue: 1,
            },
        ],
    },
    {
        key: 'log',
        label: 'Log',
        icon: '📝',
        description: 'Registra uma mensagem no console',
        category: 'logic',
        params: [
            {
                key: 'message',
                label: 'Mensagem',
                type: 'text',
                placeholder: 'Debug: usuário {{user_name}}',
                required: true,
            },
        ],
    },
]

// ============================================
// DATA ACTIONS
// ============================================

const dataActions: ActionDefinition[] = [
    {
        key: 'set_variable',
        label: 'Definir Variável',
        icon: '📦',
        description: 'Salva um valor na sessão',
        category: 'data',
        params: [
            {
                key: 'variable',
                label: 'Nome da Variável',
                type: 'text',
                placeholder: 'selected_plan',
                required: true,
            },
            {
                key: 'value',
                label: 'Valor',
                type: 'text',
                placeholder: 'premium',
                required: true,
            },
        ],
    },
    {
        key: 'collect_input',
        label: 'Coletar Resposta',
        icon: '📥',
        description: 'Aguarda e salva a próxima resposta do usuário',
        category: 'data',
        params: [
            {
                key: 'variable',
                label: 'Salvar em',
                type: 'text',
                placeholder: 'user_response',
                required: true,
            },
            {
                key: 'validation',
                label: 'Validação',
                type: 'select',
                options: [
                    { value: 'any', label: 'Qualquer texto' },
                    { value: 'email', label: 'Email válido' },
                    { value: 'number', label: 'Apenas números' },
                    { value: 'phone', label: 'Telefone' },
                ],
                defaultValue: 'any',
            },
        ],
    },
]

// ============================================
// HTTP ACTIONS
// ============================================

const httpActions: ActionDefinition[] = [
    {
        key: 'http_request',
        label: 'Requisição HTTP',
        icon: '🌐',
        description: 'Faz uma chamada HTTP externa',
        category: 'http',
        params: [
            {
                key: 'method',
                label: 'Método',
                type: 'select',
                options: [
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                    { value: 'PUT', label: 'PUT' },
                    { value: 'DELETE', label: 'DELETE' },
                ],
                required: true,
                defaultValue: 'GET',
            },
            {
                key: 'url',
                label: 'URL',
                type: 'text',
                placeholder: 'https://api.exemplo.com/data',
                required: true,
            },
            {
                key: 'headers',
                label: 'Headers (JSON)',
                type: 'json',
                placeholder: '{"Authorization": "Bearer ..."}',
            },
            {
                key: 'body',
                label: 'Body (JSON)',
                type: 'json',
                placeholder: '{"key": "value"}',
            },
            {
                key: 'save_to',
                label: 'Salvar resposta em',
                type: 'text',
                placeholder: 'api_response',
            },
        ],
    },
]

// ============================================
// BOT ACTIONS
// ============================================

const botActions: ActionDefinition[] = [
    {
        key: 'reply_keyboard',
        label: 'Teclado de Respostas',
        icon: '⌨️',
        description: 'Mostra botões de resposta rápida',
        category: 'bot',
        params: [
            {
                key: 'text',
                label: 'Texto da Mensagem',
                type: 'textarea',
                placeholder: 'Escolha uma opção:',
                required: true,
            },
            {
                key: 'buttons',
                label: 'Botões (um por linha)',
                type: 'textarea',
                placeholder: 'Opção 1\nOpção 2\nOpção 3',
                required: true,
            },
            {
                key: 'one_time',
                label: 'Esconder após clique',
                type: 'boolean',
                defaultValue: true,
            },
        ],
    },
    {
        key: 'inline_keyboard',
        label: 'Botões Inline',
        icon: '🔘',
        description: 'Mostra botões inline na mensagem',
        category: 'bot',
        params: [
            {
                key: 'text',
                label: 'Texto da Mensagem',
                type: 'textarea',
                placeholder: 'Selecione:',
                required: true,
            },
            {
                key: 'buttons',
                label: 'Botões (JSON array)',
                type: 'json',
                placeholder: '[{"text": "Sim", "callback": "yes"}, {"text": "Não", "callback": "no"}]',
                required: true,
            },
        ],
    },
]

// ============================================
// EXPORTS
// ============================================

export const ACTION_LIBRARY: ActionDefinition[] = [
    ...messagingActions,
    ...logicActions,
    ...dataActions,
    ...httpActions,
    ...botActions,
]

export const ACTION_CATEGORIES = {
    messaging: { label: 'Mensagens', icon: '💬', color: '#10b981' },
    logic: { label: 'Lógica', icon: '🔀', color: '#6366f1' },
    data: { label: 'Dados', icon: '📦', color: '#f59e0b' },
    http: { label: 'HTTP', icon: '🌐', color: '#ec4899' },
    bot: { label: 'Bot', icon: '🤖', color: '#8b5cf6' },
} as const

export function getActionByKey(key: string): ActionDefinition | undefined {
    return ACTION_LIBRARY.find((a) => a.key === key)
}

export function getActionsByCategory(category: ActionDefinition['category']): ActionDefinition[] {
    return ACTION_LIBRARY.filter((a) => a.category === category)
}

export function getCategoryColor(category: ActionDefinition['category']): string {
    return ACTION_CATEGORIES[category]?.color || '#666'
}
