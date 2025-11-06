# ✅ Como Adicionar Novos Parâmetros

Tutorial passo a passo para adicionar novos campos ao sistema de buffer.

## 📋 Checklist Completo

### 1️⃣ Atualizar Types (`src/types/buffer-memory.ts`)

- [ ] **BLOCO 02**: Adicionar campo na interface `BufferMessage`
  ```typescript
  export interface BufferMessage {
    // ... campos existentes
    novo_campo: string    // Descrição do campo
  }
  ```

- [ ] **BLOCO 02**: Adicionar campo no tipo `CreateBufferMessageData`
  ```typescript
  export type CreateBufferMessageData = Partial<BufferMessage> & {
    chatId: string
    content: string
    // ... outros obrigatórios
    novo_campo: string
  }
  ```

- [ ] **BLOCO 03**: Adicionar campo na interface `ProcessedChatPayload`
  ```typescript
  export interface ProcessedChatPayload {
    chatId: string
    // ... campos existentes
    novo_campo: string
    // ...
  }
  ```

- [ ] **BLOCO 03**: Adicionar campo na interface `ProcessedMessage`
  ```typescript
  export interface ProcessedMessage {
    messageId: string
    // ... campos existentes
    novo_campo: string
  }
  ```

### 2️⃣ Atualizar Producer (`src/handlers/producer.ts`)

- [ ] **BLOCO 02**: Adicionar validação em `validateMessageData()`
  ```typescript
  function validateMessageData(data: any): data is CreateBufferMessageData {
    return (
      // ... validações existentes &&
      typeof data.novo_campo === 'string' &&
      data.novo_campo.trim() !== ''
    )
  }
  ```

- [ ] **BLOCO 03**: Atualizar mensagem de erro de validação
  ```typescript
  message: 'Campos obrigatórios: chatId, content, ... e novo_campo'
  ```

- [ ] **BLOCO 03**: Adicionar campo ao objeto `message`
  ```typescript
  const message: BufferMessage = {
    chatId: messageData.chatId.trim(),
    // ... outros campos
    novo_campo: messageData.novo_campo.trim()
  }
  ```

### 3️⃣ Atualizar Consumer (`src/handlers/consumer.ts`)

- [ ] **BLOCO 02**: Adicionar campo em `preparePayload()` - array `processedMessages`
  ```typescript
  const processedMessages: ProcessedMessage[] = sortedMessages.map(m => ({
    messageId: m.messageId,
    // ... campos existentes
    novo_campo: m.novo_campo
  }))
  ```

- [ ] **BLOCO 02**: Adicionar campo no retorno de `preparePayload()`
  ```typescript
  return {
    chatId,
    // ... campos existentes
    novo_campo: sortedMessages[0].novo_campo,
    // ...
  }
  ```

### 4️⃣ Atualizar Documentação (`README.md`)

- [ ] Atualizar exemplo de teste (seção "4. Testar")
  ```json
  {
    "chatId": "chat-001",
    "content": "Olá, tudo bem?",
    "novo_campo": "valor-exemplo",
    // ...
  }
  ```

- [ ] Atualizar seção "API Reference" - Body
  ```json
  {
    "chatId": "chat-001",
    "content": "Mensagem aqui",
    "novo_campo": "valor",  // ✅ Obrigatório - Descrição
    // ...
  }
  ```

- [ ] Atualizar mensagem de erro 400
  ```json
  "message": "Campos obrigatórios: chatId, content, ... e novo_campo"
  ```

- [ ] Atualizar seção "Webhook Externo" - payload de exemplo
  ```json
  {
    "chatId": "chat-001",
    "novo_campo": "valor",
    "messages": [
      {
        "messageId": "msg-001",
        "novo_campo": "valor",
        // ...
      }
    ]
  }
  ```

### 5️⃣ Deploy e Commit

- [ ] Verificar se não há erros de TypeScript
  ```bash
  npm run build  # ou verificar IDE
  ```

- [ ] Fazer deploy para produção
  ```bash
  wrangler deploy
  ```

- [ ] Adicionar arquivos ao git
  ```bash
  git add -A
  ```

- [ ] Criar commit descritivo
  ```bash
  git commit -m "feat: Adicionar campo novo_campo ao sistema"
  ```

- [ ] Fazer push para o repositório
  ```bash
  git push origin main
  ```

## 📝 Exemplo Completo: Adicionando `user_id`

### 1. Types
```typescript
// src/types/buffer-memory.ts
export interface BufferMessage {
  chatId: string
  messageId: string
  content: string
  messageType: string
  timestamp: number
  user_id: string    // ✅ NOVO CAMPO
}

export type CreateBufferMessageData = Partial<BufferMessage> & {
  chatId: string
  content: string
  user_id: string    // ✅ NOVO CAMPO OBRIGATÓRIO
}

export interface ProcessedChatPayload {
  chatId: string
  user_id: string    // ✅ NOVO CAMPO
  totalMessages: number
  // ...
}

export interface ProcessedMessage {
  messageId: string
  content: string
  user_id: string    // ✅ NOVO CAMPO
  // ...
}
```

### 2. Producer
```typescript
// src/handlers/producer.ts
function validateMessageData(data: any): data is CreateBufferMessageData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.chatId === 'string' &&
    data.chatId.trim() !== '' &&
    typeof data.content === 'string' &&
    data.content.trim() !== '' &&
    typeof data.user_id === 'string' &&    // ✅ VALIDAÇÃO
    data.user_id.trim() !== ''             // ✅ VALIDAÇÃO
  )
}

// Atualizar mensagem de erro
message: 'Campos obrigatórios: chatId, content e user_id'

// Adicionar ao objeto message
const message: BufferMessage = {
  chatId: messageData.chatId.trim(),
  messageId: messageData.messageId || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  content: messageData.content.trim(),
  messageType: messageData.messageType?.trim() || 'text',
  timestamp: messageData.timestamp || Date.now(),
  user_id: messageData.user_id.trim()    // ✅ NOVO CAMPO
}
```

### 3. Consumer
```typescript
// src/handlers/consumer.ts
const processedMessages: ProcessedMessage[] = sortedMessages.map(m => ({
  messageId: m.messageId,
  content: m.content,
  messageType: m.messageType,
  timestamp: m.timestamp,
  timestampISO: new Date(m.timestamp).toISOString(),
  user_id: m.user_id    // ✅ NOVO CAMPO
}))

return {
  chatId,
  user_id: sortedMessages[0].user_id,    // ✅ NOVO CAMPO
  totalMessages: messages.length,
  conversation,
  messages: processedMessages,
  processedAt: new Date().toISOString()
}
```

### 4. README
```markdown
**Body:**
```json
{
  "chatId": "chat-001",
  "content": "Mensagem aqui",
  "user_id": "user-123",    // ✅ Obrigatório - ID do usuário
  "messageType": "text"
}
```

## 🎯 Dicas Importantes

### ✅ Boas Práticas
- Sempre use nomes descritivos para os campos
- Mantenha a consistência: `snake_case` ou `camelCase`
- Adicione comentários explicativos nos tipos
- Atualize a documentação junto com o código

### ⚠️ Cuidados
- NUNCA remova comentários de blocos (// BLOCO XX)
- SEMPRE faça deploy após mudanças nos tipos
- SEMPRE atualize o README.md
- Teste localmente com `wrangler dev` antes do deploy

### 🔍 Verificação
Antes de fazer commit, verifique:
- ✅ TypeScript compila sem erros
- ✅ Todos os 4 arquivos foram atualizados
- ✅ README.md reflete as mudanças
- ✅ Deploy foi feito com sucesso

## 📚 Referências

- Veja `CLAUDE.md` para metodologia de blocos
- Veja `README.md` para documentação completa
- Veja histórico de commits para exemplos reais
