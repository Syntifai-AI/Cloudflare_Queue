// ============================================
// BLOCO 01: DOCUMENTAÇÃO
// ============================================
/**
 * PRODUCER (Webhook HTTP)
 *
 * Responsabilidades:
 * - Receber mensagens via HTTP POST
 * - Validar payload recebido
 * - Enviar mensagens para a fila do Cloudflare Queues
 * - Retornar resposta rápida ao cliente
 *
 * NÃO processa as mensagens - apenas adiciona na fila
 */

import type {
  Env,
  BufferMessage,
  CreateBufferMessageData,
  BufferApiResponse
} from '../types/buffer-memory'

// ============================================
// BLOCO 02: FUNÇÕES AUXILIARES
// ============================================
/**
 * Helper para criar respostas JSON padronizadas
 */
function jsonResponse(data: BufferApiResponse, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * Valida autenticação via API Key no header Authorization
 */
function validateAuthentication(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return false
  }

  // Suporta formato: "Bearer YOUR_API_KEY" ou apenas "YOUR_API_KEY"
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader

  return token === env.API_KEY
}

/**
 * Valida se os campos obrigatórios estão presentes
 */
function validateMessageData(data: any): data is CreateBufferMessageData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.chatId === 'string' &&
    data.chatId.trim() !== '' &&
    typeof data.content === 'string' &&
    data.content.trim() !== ''
  )
}

// ============================================
// BLOCO 03: HANDLER PRINCIPAL
// ============================================
/**
 * Handler HTTP que recebe mensagens e envia para a fila
 */
export async function handleProducer(
  request: Request,
  env: Env
): Promise<Response> {
  // Validar método HTTP
  if (request.method !== 'POST') {
    return jsonResponse({
      success: false,
      message: 'Método não permitido. Use POST para enviar mensagens.',
      error: 'METHOD_NOT_ALLOWED'
    }, 405)
  }

  // Validar autenticação
  if (!validateAuthentication(request, env)) {
    return jsonResponse({
      success: false,
      message: 'Autenticação inválida. Forneça API Key válida no header Authorization.',
      error: 'UNAUTHORIZED'
    }, 401)
  }

  try {
    // Parsear JSON do body
    let messageData: CreateBufferMessageData
    try {
      messageData = await request.json()
    } catch (error) {
      return jsonResponse({
        success: false,
        message: 'JSON inválido no body da requisição',
        error: 'INVALID_JSON'
      }, 400)
    }

    // Validar campos obrigatórios
    if (!validateMessageData(messageData)) {
      return jsonResponse({
        success: false,
        message: 'Campos obrigatórios: chatId e content',
        error: 'VALIDATION_ERROR'
      }, 400)
    }

    // Preparar mensagem para a fila
    const message: BufferMessage = {
      chatId: messageData.chatId.trim(),
      messageId: messageData.messageId || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      content: messageData.content.trim(),
      messageType: messageData.messageType?.trim() || 'text',
      timestamp: messageData.timestamp || Date.now()
    }

    // Enviar para a fila
    await env.BUFFER_MEMORY_QUEUE.send(message)

    console.log(`[PRODUCER] Mensagem enviada para fila - chatId: ${message.chatId}, messageId: ${message.messageId}`)

    // Retornar sucesso
    return jsonResponse({
      success: true,
      message: 'Mensagem adicionada à fila com sucesso',
      chatId: message.chatId
    }, 200)

  } catch (error) {
    // Tratar erros inesperados
    console.error('[PRODUCER] Erro inesperado:', error)

    return jsonResponse({
      success: false,
      message: 'Erro interno ao processar mensagem',
      error: 'INTERNAL_ERROR'
    }, 500)
  }
}
