---
trigger: always_on
---

# Regras de Fronteira de Workspace

1. **Camada de Apps (apps/*):** - Devem ser "thin layers" (camadas finas). 
   - Não devem conter lógica de manipulação de mensagens. 
   - Devem apenas importar Organisms de `@projeto/messaging`.

2. **Camada de Messaging (packages/messaging):**
   - É estritamente SERVER-SIDE. Proibido qualquer import de `@projeto/dashboard` ou bibliotecas de UI.
   - Deve ser agnóstica ao framework de servidor (não dependa de tipos do Hono aqui, use tipos genéricos).

3. **Camada Shared (packages/shared):**
   - Apenas código "isomórfico" (que roda no Node e no Browser). 
   - Ideal para Schemas Zod e Interfaces de Tipos.

4. **Circular Dependencies:**
   - Proibido circularidade entre packages. O fluxo é sempre: 
     App -> Core -> Messaging -> Shared.