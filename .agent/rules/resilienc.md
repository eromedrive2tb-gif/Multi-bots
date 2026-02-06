---
trigger: always_on
---

# Regras de Resiliência e Zero-Downtime

1. **Safety First:** Toda interação com APIs externas (Telegram, Discord, DB) deve ter um bloco try/catch.
2. **Timeout:** Atoms que fazem fetch externo devem ter um timeout definido (ex: 5 segundos).
3. **Fallback:** Se uma Molecule falhar, ela deve retornar um estado de erro amigável, nunca "undefined" ou silêncio.
4. **KV-First:** Para leitura de Blueprints, priorize sempre o Cloudflare KV sobre o Banco de Dados SQL.
5. **Logs:** Use um átomo de log centralizado que envie erros críticos para um canal de monitoramento (Discord Webhook).