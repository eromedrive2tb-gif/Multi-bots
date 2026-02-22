-- [HOTFIX] Adiciona a coluna 'status' retroativamente na tabela de idempotência.
-- Necessário para o Queue Consumer transitar as mensagens ('processing', 'completed', 'failed')
-- evitando processamento infinito ou duplo de retries.

ALTER TABLE processed_webhooks ADD COLUMN status TEXT DEFAULT 'completed';
