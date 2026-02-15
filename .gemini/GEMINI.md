1. Meu stack é Vite (Frontend), Hono (Backend), grammY (Telegram) e Bun (Runtime).
2. Siga sempre o padrão de Design Atômico de Backend (Atoms, Molecules, Organisms).
3. Todo fluxo de bot deve ser orientado a dados (JSON Blueprints).
4. O sistema é Multi-tenant: separe dados e instâncias por `tenantId`.
5. Use Zod para todas as validações de input no Hono.
6. O Projeto sempre deve ser otimizado para estar em produção na edge do cloudflared
7. Não faça deploy do projeto para produção sem o usuario pedir explicitamente , foque no ambiente de desenvolvimento.
8. Regra de Ouro: O Teste do "Headless"
Para decidir se uma funcionalidade pertence à Engine ou ao Front, faça a seguinte pergunta para si mesmo:

"Se eu deletasse todo o meu Frontend (Dashboard) hoje e interagisse com minha aplicação apenas via cURL ou Postman, essa funcionalidade ainda precisaria existir para o pagamento ser processado?"

Sim: É responsabilidade da Engine.

Não: É responsabilidade do Frontend (ou de um cliente consumidor).