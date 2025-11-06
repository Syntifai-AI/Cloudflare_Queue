// ============================================
// BLOCO 01: DOCUMENTAÇÃO
// ============================================
/**
 * CONSUMER (Processador de Fila)
 *
 * Responsabilidades:
 * - Receber lotes de mensagens da fila (batch)
 * - Agrupar mensagens por chatId
 * - Processar cada grupo de mensagens
 * - Enviar dados processados para webhook externo
 *
 * Chamado automaticamente pelo Cloudflare Queues quando:
 * - Acumular 50 mensagens (max_batch_size) OU
 * - Passar 30 segundos (max_batch_timeout)
 */

import type {
  BufferMessage,
  ProcessedChatPayload,
  ProcessedMessage,
  Env
} from '../types/buffer-memory'

// ============================================
// BLOCO 02: FUNÇÕES AUXILIARES
// ============================================
/**
 * Agrupa mensagens por chatId
 */
function groupMessagesByChat(
  messages: readonly Message<BufferMessage>[]
): Map<string, BufferMessage[]> {
  const messagesByChat = new Map<string, BufferMessage[]>()

  for (const msg of messages) {
    const message = msg.body

    if (!messagesByChat.has(message.chatId)) {
      messagesByChat.set(message.chatId, [])
    }

    messagesByChat.get(message.chatId)!.push(message)
  }

  return messagesByChat
}

/**
 * Prepara o payload para enviar ao webhook externo
 */
function preparePayload(
  chatId: string,
  messages: BufferMessage[]
): ProcessedChatPayload {
  // Ordena mensagens por timestamp
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp)

  // Concatena todas as mensagens em uma conversa
  const conversation = sortedMessages.map(m => m.content).join('\n')

  // Formata mensagens com dados adicionais
  const processedMessages: ProcessedMessage[] = sortedMessages.map(m => ({
    messageId: m.messageId,
    content: m.content,
    messageType: m.messageType,
    timestamp: m.timestamp,
    timestampISO: new Date(m.timestamp).toISOString(),
    account_id: m.account_id,
    conversation_id: m.conversation_id
  }))

  return {
    chatId,
    account_id: sortedMessages[0].account_id,
    conversation_id: sortedMessages[0].conversation_id,
    totalMessages: messages.length,
    conversation,
    messages: processedMessages,
    processedAt: new Date().toISOString()
  }
}

/**
 * Envia dados processados para o webhook externo
 * Lança exceção se falhar (para acionar retry do Cloudflare + DLQ)
 */
async function sendToExternalWebhook(
  payload: ProcessedChatPayload,
  webhookUrl: string
): Promise<void> {
  console.log(`[CONSUMER] 🌐 Enviando ${payload.totalMessages} mensagens do chat ${payload.chatId} para webhook...`)

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorMsg = `Webhook falhou: ${response.status} ${response.statusText}`
    console.error(`[CONSUMER] ❌ ${errorMsg}`)
    throw new Error(errorMsg)
  }

  const responseText = await response.text()
  console.log(`[CONSUMER] ✅ Webhook respondeu com sucesso: ${response.status}`)
  console.log(`[CONSUMER] Resposta: ${responseText}`)
}

// ============================================
// BLOCO 03: HANDLER PRINCIPAL
// ============================================
/**
 * Handler que processa lotes de mensagens da fila
 */
export async function handleConsumer(
  batch: MessageBatch<BufferMessage>,
  env: Env
): Promise<void> {
  console.log(`\n[CONSUMER] === PROCESSANDO LOTE ===`)
  console.log(`[CONSUMER] Total de mensagens no lote: ${batch.messages.length}`)

  // Agrupar mensagens por chatId
  const messagesByChat = groupMessagesByChat(batch.messages)
  console.log(`[CONSUMER] Número de chats únicos: ${messagesByChat.size}`)

  // Processar cada chat
  for (const [chatId, messages] of messagesByChat.entries()) {
    console.log(`\n[CONSUMER] --- Chat: ${chatId} ---`)
    console.log(`[CONSUMER] Mensagens agrupadas: ${messages.length}`)

    // Preparar payload
    const payload = preparePayload(chatId, messages)
    console.log(`[CONSUMER] Conversa completa: ${payload.conversation.length} caracteres`)

    // Enviar para webhook externo (lança exceção se falhar)
    await sendToExternalWebhook(payload, env.EXTERNAL_WEBHOOK_URL)
    console.log(`[CONSUMER] ✅ Chat ${chatId} processado e enviado com sucesso`)
  }

  console.log(`\n[CONSUMER] === LOTE PROCESSADO COM SUCESSO ===\n`)
}
