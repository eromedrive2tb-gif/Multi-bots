---
description: # Gerar Novo Átomo de Provedor
---

# Gerar Novo Átomo de Provedor
1. Identifique o provedor (Telegram, WhatsApp ou Discord).
2. Crie um arquivo em `src/lib/atoms/[provedor]/[nome-da-acao].ts`.
3. Implemente a função seguindo o SRP.
4. Exporte uma interface `Props` para os argumentos.
5. Adicione o export no `index.ts` da pasta do provedor.