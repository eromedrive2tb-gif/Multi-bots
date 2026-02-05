1. Meu stack é Vite (Frontend), Hono (Backend), grammY (Telegram) e Bun (Runtime).
2. Siga sempre o padrão de Design Atômico de Backend (Atoms, Molecules, Organisms).
3. Todo fluxo de bot deve ser orientado a dados (JSON Blueprints).
4. O sistema é Multi-tenant: separe dados e instâncias por `tenantId`.
5. Use Zod para todas as validações de input no Hono.