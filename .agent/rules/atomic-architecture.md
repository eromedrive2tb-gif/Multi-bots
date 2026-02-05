---
trigger: always_on
---

# Diretrizes de Arquitetura Atômica e Multi-tenant

Você deve seguir rigorosamente a estrutura de Design Atômico para o Backend:

1. Hierarchy & Dependency Graph (Strict)
Atoms: A base da pirâmide.

Proibido: Importar outros Atoms, Molecules ou Organisms.

Obrigatório: Receber a instância do provider (ex: bot: Bot ou client: WhatsAppClient) e as Props.

Retorno: Devem retornar tipos primitivos ou interfaces padronizadas em src/shared/types.ts.

Molecules: O tecido conector.

Permitido: Importar e orquestrar múltiplos Atoms.

Proibido: Conter lógica de decisão complexa (if/else de negócio). Elas são composições técnicas (ex: send + log).

Organisms: O cérebro.

Permitido: Chamar Atoms, Molecules e outros Organisms. É aqui que o tenantId é usado para buscar configurações no banco.

2. File Naming & Location Convention
Para facilitar a busca do Agente e a organização:

Atoms: src/lib/atoms/[provider]/[action-name].ts (ex: tg-send-voice.ts).

Molecules: src/lib/molecules/[logic-name].ts (ex: broadcast-alert.ts).

Blueprints: src/blueprints/flows/[tenant-id | global]/[flow-name].json.

3. Multi-tenancy & Context Injection
Context Object: Toda função de nível Molecule ou Organism deve receber um Context que contenha: { tenantId: string, botInstance: any, user: SessionUser }.

Statelessness: Atoms devem ser puramente funcionais. Não armazene estado global em variáveis fora das funções.

4. JSON Blueprint Integration
Field Mapping: No JSON, o campo perform refere-se a uma Molecule, e o campo action refere-se a um Organismo.

Validation: Todo código gerado para interagir com o JSON deve validar as chaves usando o Schema Zod definido em src/core/types.ts.

5. Error Handling Pattern
Atoms: Não silenciam erros. Devem lançar exceções tipadas (ex: TelegramProviderError).

Molecules: Podem implementar retentativas (retry) simples.

Organisms: Devem capturar erros e decidir qual "nó de erro" do JSON o bot deve seguir (ex: next_step: "error_handler").