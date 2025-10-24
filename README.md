# 📨 Buffer Memory

Sistema de buffer de mensagens para LLMs usando **Cloudflare Workers + Queues**.

## 🚀 Deploy Rápido

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Syntifai-AI/Fila_Cloudflare)

Clique no botão acima para fazer deploy automático em sua conta Cloudflare. O processo irá:
- Clonar o repositório para sua conta GitHub
- Criar automaticamente as filas (buffer-memory-queue e buffer-memory-dlq)
- Provisionar todos os recursos necessários
- Fazer build e deploy do Worker
- Solicitar as variáveis de ambiente (API_KEY e EXTERNAL_WEBHOOK_URL)

## 🏗️ Arquitetura

```
Cliente → Producer (webhook) → Queue → Consumer → Webhook Externo
                                 ↓
                               (falha)
                                 ↓
                           Dead Letter Queue (DLQ)
```

### Fluxo Completo

1. **Cliente** envia mensagem via POST
2. **Producer** recebe e adiciona na fila
3. **Queue** acumula mensagens (30s OU 50 msgs)
4. **Consumer** agrupa por chatId e envia para webhook externo
5. **DLQ** armazena mensagens com erro após 3 tentativas

## 🚀 Quick Start

### 1. Instalação

```bash
# Clonar o repositório
git clone https://github.com/Syntifai-AI/Fila_Cloudflare.git
cd Fila_Cloudflare/buffer-memory

# Instalar dependências
npm install

# Fazer login no Cloudflare
wrangler login
```

### 2. Configuração

```bash
# Criar filas no Cloudflare
wrangler queues create buffer-memory-queue
wrangler queues create buffer-memory-dlq

# Configurar variáveis de ambiente
cp .dev.vars.example .dev.vars

# Editar .dev.vars e adicionar suas credenciais:
# - API_KEY: Gere com: openssl rand -hex 32
# - EXTERNAL_WEBHOOK_URL: URL do seu webhook
```

### 3. Deploy

```bash
# Deploy para produção
wrangler deploy

# Configurar secrets em produção
wrangler secret put API_KEY
wrangler secret put EXTERNAL_WEBHOOK_URL
```

### 4. Testar

```bash
# Enviar mensagem de teste
curl -X POST https://buffer-memory.syntifai.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_API_KEY" \
  -d '{
    "chatId": "chat-001",
    "content": "Olá, tudo bem?",
    "messageType": "text"
  }'
```

## 📝 API Reference

### Endpoint: POST /

Envia uma mensagem para o buffer.

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer SUA_API_KEY`

**Body:**
```json
{
  "chatId": "chat-001",        // ✅ Obrigatório - ID do chat
  "content": "Mensagem aqui",  // ✅ Obrigatório - Conteúdo
  "messageType": "text",       // ❌ Opcional - Padrão: "text"
  "messageId": "msg-001",      // ❌ Opcional - Auto-gerado
  "timestamp": 1729726514129   // ❌ Opcional - Auto-gerado
}
```

**Respostas:**

✅ **200 OK** - Mensagem aceita
```json
{
  "success": true,
  "message": "Mensagem adicionada à fila com sucesso",
  "chatId": "chat-001"
}
```

❌ **401 Unauthorized** - API Key inválida
```json
{
  "success": false,
  "message": "Autenticação inválida. Forneça API Key válida no header Authorization.",
  "error": "UNAUTHORIZED"
}
```

❌ **400 Bad Request** - Payload inválido
```json
{
  "success": false,
  "message": "Campos obrigatórios: chatId e content",
  "error": "VALIDATION_ERROR"
}
```

## 📤 Webhook Externo

O sistema envia dados processados para seu webhook externo no seguinte formato:

```json
{
  "chatId": "chat-001",
  "totalMessages": 5,
  "conversation": "Oi\nTudo bem?\nPreciso de ajuda",
  "messages": [
    {
      "messageId": "msg-001",
      "content": "Oi",
      "messageType": "text",
      "timestamp": 1729726514129,
      "timestampISO": "2025-10-23T23:15:14.129Z"
    }
  ],
  "processedAt": "2025-10-23T23:15:44.000Z"
}
```

## 🔧 Configuração

### Variáveis de Ambiente

#### Desenvolvimento Local (`.dev.vars`)

```bash
API_KEY=sua_api_key_aqui
EXTERNAL_WEBHOOK_URL=https://seu-webhook.com/endpoint
```

#### Produção (Cloudflare Secrets)

```bash
# Configurar API Key
wrangler secret put API_KEY

# Configurar Webhook URL
wrangler secret put EXTERNAL_WEBHOOK_URL
```

### Configurações da Fila (`wrangler.toml`)

```toml
[[queues.consumers]]
queue = "buffer-memory-queue"
max_batch_size = 50           # Processa quando atingir 50 mensagens
max_batch_timeout = 30        # OU quando passar 30 segundos
max_retries = 3               # Tentativas antes de enviar para DLQ
dead_letter_queue = "buffer-memory-dlq"
```

## 🛡️ Dead Letter Queue (DLQ)

O sistema possui proteção contra perda de mensagens:

- ✅ Webhook offline/indisponível → DLQ
- ✅ Webhook retorna erro (4xx, 5xx) → DLQ
- ✅ Timeout na chamada → DLQ
- ✅ Mensagens armazenadas por **4 dias**

### Verificar mensagens na DLQ

```bash
wrangler queues list
```

## 📊 Limites e Escalabilidade

| Recurso | Limite |
|---------|--------|
| Taxa de envio | 5.000 msgs/segundo |
| Tamanho da mensagem | 128 KB |
| Batch size máximo | 100 mensagens |
| Batch timeout máximo | 60 segundos |
| Backlog | 25 GB |

## 💰 Custo Estimado

| Volume/dia | Custo/mês |
|------------|-----------|
| < 11k msgs | $5 |
| 100k msgs  | $8.20 |
| 1M msgs    | $40.60 |

## 🛠️ Desenvolvimento

```bash
# Desenvolvimento local
wrangler dev

# Ver logs em tempo real
wrangler tail

# Deploy
wrangler deploy
```

## 🔍 Troubleshooting

### Mensagens não são processadas

**Verificar:**
```bash
# Ver logs
wrangler tail

# Verificar filas
wrangler queues list
```

**Causas comuns:**
- Webhook externo offline
- URL do webhook incorreta
- Timeout nas requisições

### Erro 401 Unauthorized

**Solução:**
- Verificar se API Key está configurada
- Verificar se o header `Authorization` está correto
- Formato: `Authorization: Bearer SUA_API_KEY`

### Mensagens na DLQ

**Causas:**
- Webhook retornando erro
- Webhook offline
- Timeout na requisição

**Verificar:**
```bash
wrangler tail  # Ver logs de erro
```

## 📁 Estrutura do Projeto

```
buffer-memory/
├── src/
│   ├── index.ts                 # Entry point
│   ├── types/
│   │   └── buffer-memory.ts     # Types e interfaces
│   └── handlers/
│       ├── producer.ts          # Webhook HTTP
│       └── consumer.ts          # Processador de fila
├── wrangler.toml                # Configuração Cloudflare
├── .dev.vars.example            # Template de variáveis
├── test-messages.sh             # Script de testes
├── README.md                    # Esta documentação
└── CLAUDE.md                    # Instruções técnicas para IA
```

## 🔐 Segurança

⚠️ **IMPORTANTE:**
- **NUNCA** commite o arquivo `.dev.vars`
- **NUNCA** exponha sua API Key em código
- Use `wrangler secret` para produção
- Gere API Keys longas e aleatórias (mínimo 32 bytes)

## 🔄 Migração de Conta Cloudflare

```bash
# 1. Logout da conta atual
wrangler logout

# 2. Login na nova conta
wrangler login

# 3. Criar filas
wrangler queues create buffer-memory-queue
wrangler queues create buffer-memory-dlq

# 4. Configurar secrets
wrangler secret put API_KEY
wrangler secret put EXTERNAL_WEBHOOK_URL

# 5. Deploy
wrangler deploy
```

## 📚 Referências

- [Cloudflare Queues Docs](https://developers.cloudflare.com/queues/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## 📝 Licença

MIT

---

**Dúvidas técnicas para desenvolvimento?** Veja [CLAUDE.md](CLAUDE.md) para instruções detalhadas.
