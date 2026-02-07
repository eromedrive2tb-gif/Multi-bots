# Blueprint de Exemplo: Venda de Planos Mensal

Este é um blueprint avançado que demonstra um fluxo completo de auto-atendimento para venda de assinaturas mensais.

## 📋 Visão Geral

| Propriedade | Valor |
|-------------|-------|
| **Trigger** | `/planos` |
| **Total de Steps** | 28 |
| **Interações do Usuário** | 5 |
| **Dados Coletados** | Nome, Email, Telefone, Plano |
| **Complexidade** | Avançado |

## 🔄 Fluxo do Bot

```mermaid
flowchart TD
    A[/planos] --> B[Welcome Message]
    B --> C[Coleta Nome]
    C --> D[Coleta Email]
    D --> E[Coleta Telefone]
    E --> F[Mostra Planos]
    F --> G{Seleção do Plano}
    G -->|Básico| H1[Set Básico]
    G -->|Pro| H2[Set Pro]
    G -->|Enterprise| H3[Set Enterprise]
    H1 & H2 & H3 --> I[Confirmação]
    I --> J{Confirmar?}
    J -->|Sim| K[Gerar Pagamento]
    J -->|Não| L[Cancelar]
    J -->|Alterar| F
    K --> M[Link de Pagamento]
    L --> N[Fim]
    M --> O[Log Final + Fim]
```

## 📊 Steps Detalhados

### Interações do Usuário

| # | Step | Dado Coletado | Validação |
|---|------|---------------|-----------|
| 1 | `collect_name` | `customer_name` | Qualquer texto |
| 2 | `collect_email` | `customer_email` | Email válido |
| 3 | `collect_phone` | `customer_phone` | Telefone |
| 4 | `collect_plan_choice` | `selected_plan` | Callback buttons |
| 5 | `collect_confirmation` | `confirmation_choice` | Callback buttons |

### Logs de Monitoramento

Cada etapa importante gera um log para monitoramento:

```
📝 Nome coletado: João Silva
📧 Email coletado: joao@email.com | Cliente: João Silva
📱 Telefone coletado: 11999998888 | Cliente: João Silva
🛒 PEDIDO CRIADO | Plano: Pro | Preço: R$79,90 | Cliente: João Silva
💳 PAGAMENTO INICIADO | Plano: Pro | Valor: R$79,90
✅ FLUXO COMPLETO | Cliente: João Silva | Plano: Pro
```

### Tratamento de Erros

O blueprint inclui handlers para:

- **`error_handler`**: Captura erros genéricos
- **`timeout_handler`**: Usuário não responde a tempo

## 🎨 Técnicas Demonstradas

1. **Coleta Sequencial de Dados**
   - Nome → Email → Telefone (com validação)

2. **Botões Inline**
   - Seleção de planos com callbacks

3. **Lógica Condicional**
   - `condition` para rotear baseado na escolha

4. **Variáveis de Sessão**
   - `set_variable` para armazenar dados calculados

5. **Logging**
   - Registros em cada etapa crítica

6. **Loop de Re-seleção**
   - Usuário pode voltar e alterar o plano

## 🚀 Como Usar

1. Importe o JSON via API ou Dashboard
2. Configure o trigger `/planos` no bot
3. Personalize os textos e preços
4. Substitua o link de pagamento pela sua URL real

## 📁 Localização do Arquivo

```
src/blueprints/examples/venda_planos_mensal.json
```
