# CLAUDE.md - Instruções Técnicas para IA

Este arquivo contém instruções específicas para Claude (IA) ao trabalhar neste projeto.

## 📊 Metodologia de Blocos Construtivos

Este projeto segue a **Metodologia de Blocos Construtivos** para organização do código.

### Estrutura de Arquivos e Blocos

#### Types (5 blocos) - `src/types/buffer-memory.ts`

```
BLOCO 01: Documentação
BLOCO 02: Interfaces de dados (BufferMessage, CreateBufferMessageData)
BLOCO 03: Interfaces de resposta (API e Webhook)
BLOCO 04: Ambiente Cloudflare (Env)
```

#### Producer (3 blocos) - `src/handlers/producer.ts`

```
BLOCO 01: Documentação
BLOCO 02: Funções auxiliares
  - jsonResponse() - Helper para respostas JSON padronizadas
  - validateAuthentication() - Valida API Key no header Authorization
  - validateMessageData() - Validação de campos obrigatórios
BLOCO 03: Handler principal (handleProducer)
```

#### Consumer (3 blocos) - `src/handlers/consumer.ts`

```
BLOCO 01: Documentação
BLOCO 02: Funções auxiliares
  - groupMessagesByChat() - Agrupa mensagens por chatId
  - preparePayload() - Prepara dados para envio ao webhook
  - sendToExternalWebhook() - Envia para webhook externo
BLOCO 03: Handler principal (handleConsumer)
```

#### Index (4 blocos) - `src/index.ts`

```
BLOCO 01: Header e documentação (inclui diagrama ASCII da arquitetura)
BLOCO 02: Importações de handlers
BLOCO 03: Importações de types
BLOCO 04: Exportação do Worker (fetch e queue handlers)
```

## 🎯 Pontos Importantes para Edição

### 1. Mudança no Parâmetro de Agrupamento

**Atualmente**: Mensagens são agrupadas por `chatId`

**Localização**: `src/handlers/consumer.ts` linha 34 (função `groupMessagesByChat`)

**Para alterar:**
1. Editar interface `BufferMessage` em `src/types/buffer-memory.ts` (BLOCO 02)
2. Atualizar função `groupMessagesByChat()` em `src/handlers/consumer.ts` (BLOCO 02)
3. Atualizar validações no `producer.ts` se necessário

### 2. Webhook Externo

**Configuração**: Variável de ambiente `EXTERNAL_WEBHOOK_URL`

**Localizações:**
- **Desenvolvimento local**: `.dev.vars` (não commitar)
- **Produção**: Cloudflare Dashboard ou `wrangler secret put`
- **Tipo**: Definido em `src/types/buffer-memory.ts` interface `Env`

**Para alterar:**
- Local: Editar `.dev.vars`
- Produção: `wrangler secret put EXTERNAL_WEBHOOK_URL`

### 3. Configurações de Batching

**Localização**: `wrangler.toml`

```toml
[[queues.consumers]]
queue = "buffer-memory-queue"
max_batch_size = 50      # Processa quando atingir 50 mensagens
max_batch_timeout = 30   # OU quando passar 30 segundos
max_retries = 3          # Tentativas antes de enviar para DLQ
dead_letter_queue = "buffer-memory-dlq"
```

**Lógica**: O que acontecer **primeiro** (50 msgs OU 30s) dispara o processamento.

### 4. Autenticação

**Método**: API Key via header `Authorization`

**Formatos aceitos:**
- `Authorization: Bearer SUA_API_KEY`
- `Authorization: SUA_API_KEY`

**Configuração:**
- **Desenvolvimento local**: `.dev.vars` → `API_KEY=sua_chave`
- **Produção**: `wrangler secret put API_KEY`

**Validação**: `src/handlers/producer.ts` função `validateAuthentication()`

## 🏗️ Arquitetura do Sistema

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ POST + API Key
       ▼
┌─────────────────┐
│  PRODUCER       │ ← fetch() - Webhook HTTP
│  (handlers/     │   - Valida autenticação
│   producer.ts)  │   - Valida payload
│                 │   - Envia para fila
└──────┬──────────┘
       │ send()
       ▼
┌─────────────────┐
│ CLOUDFLARE      │
│ QUEUE           │
│ (buffer-memory- │
│  queue)         │
└──────┬──────────┘
       │ batch (30s ou 50 msgs)
       ▼
┌─────────────────┐
│  CONSUMER       │ ← queue() - Processador
│  (handlers/     │   - Agrupa por chatId
│   consumer.ts)  │   - Ordena por timestamp
│                 │   - Envia para webhook
└──────┬──────────┘
       │ POST
       ▼
┌─────────────────┐
│ WEBHOOK EXTERNO │ ← env.EXTERNAL_WEBHOOK_URL
└─────────────────┘
       │ (se falhar após 3 retries)
       ▼
┌─────────────────┐
│ DEAD LETTER     │
│ QUEUE (DLQ)     │
└─────────────────┘
```

## 📝 Estrutura de Dados

### BufferMessage (entrada via Producer)

```typescript
{
  chatId: string       // ✅ Obrigatório - ID do chat (para agrupamento)
  content: string      // ✅ Obrigatório - Conteúdo da mensagem
  messageType: string  // ❌ Opcional - Padrão: "text"
  messageId: string    // ❌ Opcional - Auto-gerado se não fornecido
  timestamp: number    // ❌ Opcional - Auto-gerado se não fornecido
}
```

### ProcessedChatPayload (saída para webhook externo)

```typescript
{
  chatId: string              // ID do chat
  totalMessages: number       // Quantidade de mensagens agrupadas
  conversation: string        // Todas as mensagens concatenadas com \n
  messages: [                 // Array de mensagens processadas
    {
      messageId: string
      content: string
      messageType: string
      timestamp: number
      timestampISO: string    // ISO 8601
    }
  ],
  processedAt: string         // ISO timestamp do processamento
}
```

## 🔧 Comandos Úteis

```bash
# Deploy
wrangler deploy

# Desenvolvimento local
wrangler dev

# Ver logs em tempo real
wrangler tail

# Criar fila
wrangler queues create <nome-da-fila>

# Listar filas
wrangler queues list

# Configurar secret
wrangler secret put <NOME_DA_VARIAVEL>

# Configurar variável de ambiente (não-secreta)
# Editar wrangler.toml [vars] ou usar Dashboard
```

## 🚨 Regras de Edição

### SEMPRE:
- ✅ Manter a metodologia de blocos
- ✅ Preservar comentários de bloco existentes
- ✅ Atualizar documentação inline quando mudar lógica
- ✅ Testar após mudanças significativas
- ✅ Verificar tipos TypeScript
- ✅ Manter validações de segurança (autenticação)

### NUNCA:
- ❌ Remover comentários de blocos (// BLOCO XX)
- ❌ Commitar arquivo `.dev.vars`
- ❌ Expor API Keys em logs ou código
- ❌ Quebrar a estrutura de blocos existente
- ❌ Remover validações de autenticação
- ❌ Alterar tipos sem atualizar handlers

## 🔄 Fluxo de Trabalho para Mudanças

### Adicionar novo campo à mensagem:

1. Editar `src/types/buffer-memory.ts` (BLOCO 02) - adicionar campo em `BufferMessage`
2. Atualizar validação em `src/handlers/producer.ts` (BLOCO 02) - `validateMessageData()`
3. Se necessário, atualizar `preparePayload()` em `src/handlers/consumer.ts` (BLOCO 02)
4. Atualizar interface `ProcessedMessage` se o campo for enviado ao webhook
5. Fazer deploy: `wrangler deploy`

### Mudar critério de agrupamento:

1. Editar `src/handlers/consumer.ts` (BLOCO 02)
2. Modificar função `groupMessagesByChat()` para usar outro campo
3. Atualizar nome da função se necessário (ex: `groupMessagesByUserId()`)
4. Atualizar comentários e documentação
5. Fazer deploy: `wrangler deploy`

### Adicionar nova validação:

1. Criar função helper em `src/handlers/producer.ts` (BLOCO 02)
2. Chamar a função no handler principal (BLOCO 03)
3. Adicionar teste se aplicável
4. Fazer deploy: `wrangler deploy`

## 📊 Limites do Cloudflare Queues

| Recurso | Limite |
|---------|--------|
| Taxa de envio | 5.000 msgs/segundo por fila |
| Tamanho da mensagem | 128 KB |
| Batch size máximo | 100 mensagens |
| Batch timeout máximo | 60 segundos |
| Backlog | 25 GB |
| Retenção DLQ | 4 dias |

## 🐛 Debugging

### Verificar se mensagem chegou na fila:
```bash
wrangler tail
# Procure por: [PRODUCER] Mensagem enviada para fila
```

### Verificar processamento do consumer:
```bash
wrangler tail
# Procure por: [CONSUMER] === PROCESSANDO LOTE ===
```

### Verificar envio para webhook externo:
```bash
wrangler tail
# Procure por: [CONSUMER] 🌐 Enviando X mensagens do chat Y
# Sucesso: [CONSUMER] ✅ Webhook respondeu com sucesso
# Erro: [CONSUMER] ❌ Webhook falhou
```

### Mensagens indo para DLQ:
```bash
wrangler queues list
# Verificar se buffer-memory-dlq tem mensagens
```

## 🔐 Segurança

### Variáveis Sensíveis:
- `API_KEY` - **SEMPRE** usar secrets (nunca em código)
- `EXTERNAL_WEBHOOK_URL` - Pode usar vars ou secrets dependendo da sensibilidade

### Arquivos que NÃO devem ir para git:
- `.dev.vars` - Contém API Keys locais
- `node_modules/` - Dependências
- `.wrangler/` - Cache do Wrangler

### Arquivos que DEVEM ir para git:
- `.dev.vars.example` - Template sem valores sensíveis
- `wrangler.toml` - Configuração (sem secrets)
- Todo código em `src/`

## 📚 Referências Rápidas

- **Cloudflare Queues**: https://developers.cloudflare.com/queues/
- **Workers TypeScript**: https://developers.cloudflare.com/workers/languages/typescript/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **Dead Letter Queues**: https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
