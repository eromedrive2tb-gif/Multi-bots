---
name: provider-abstraction
description: Especialista em abstração de APIs de comunicação (Telegram, WhatsApp, Discord) para o padrão de Atoms e Molecules.
---

# Provider Abstraction Skill

Use esta habilidade ao criar integrações com novos provedores ou converter códigos "linguicão" para o padrão atômico.

## Check-list de Abstração:
1. **Identificação do SDK:** Use `grammY` para Telegram, `discord.js` para Discord e `axios/fetch` direto para a Meta API (WhatsApp).
2. **Normalização de Payload:** Converta os objetos específicos de cada plataforma para a nossa interface `GenericMessage` em `src/shared/types.ts`.
3. **Instanciação:** Certifique-se de que a criação da instância do bot/cliente passe pelo `TenantManager`.

## Exemplo de Conversão (Molecule):
Ao criar uma Molecule que envia mensagem, ela deve sempre tentar incluir o átomo de `db-log` por padrão, a menos que especificado o contrário no Blueprint.