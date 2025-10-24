// ============================================
// BLOCO 01: DOCUMENTAÇÃO
// ============================================
/**
 * Types para Buffer Memory
 * Define as interfaces e types usados no sistema de buffer de mensagens para LLMs
 */

// ============================================
// BLOCO 02: INTERFACES DE DADOS
// ============================================
/**
 * Estrutura de uma mensagem no Buffer Memory
 */
export interface BufferMessage {
  chatId: string        // Identificador único do chat (usado para agrupamento)
  messageId: string     // ID único da mensagem
  content: string       // Conteúdo/texto da mensagem (pode ser texto transcrito se for áudio/imagem)
  messageType: string   // Tipo da mensagem (ex: text, audio, image, video, etc)
  timestamp: number     // Unix timestamp (milissegundos)
}

/**
 * Dados para criação de mensagem (campos opcionais)
 * messageId e timestamp são gerados automaticamente se não fornecidos
 */
export type CreateBufferMessageData = Partial<BufferMessage> & {
  chatId: string
  content: string
}

// ============================================
// BLOCO 03: INTERFACES DE RESPOSTA
// ============================================
/**
 * Resposta padrão do webhook producer
 */
export interface BufferApiResponse {
  success: boolean
  message: string
  chatId?: string
  error?: string
}

/**
 * Payload enviado ao webhook externo após processamento
 */
export interface ProcessedChatPayload {
  chatId: string
  totalMessages: number
  conversation: string  // Todas as mensagens concatenadas
  messages: ProcessedMessage[]
  processedAt: string  // ISO timestamp
}

/**
 * Mensagem processada com dados adicionais
 */
export interface ProcessedMessage {
  messageId: string
  content: string
  messageType: string
  timestamp: number
  timestampISO: string
}

// ============================================
// BLOCO 04: AMBIENTE CLOUDFLARE
// ============================================
/**
 * Ambiente do Cloudflare Workers com bindings necessários
 */
export interface Env {
  BUFFER_MEMORY_QUEUE: Queue<BufferMessage>
  API_KEY: string  // Chave de autenticação para o Producer
  EXTERNAL_WEBHOOK_URL: string  // URL do webhook externo para enviar dados processados
}
