// ============================================
// BLOCO 01: HEADER E DOCUMENTAÇÃO
// ============================================
/**
 * BUFFER MEMORY - Cloudflare Workers + Queues
 *
 * Sistema de buffer de mensagens para LLMs usando Cloudflare Queues
 *
 * ARQUITETURA:
 * ┌─────────────┐
 * │   Cliente   │
 * └──────┬──────┘
 *        │ POST
 *        ▼
 * ┌─────────────────┐
 * │  PRODUCER       │ ← fetch() - Webhook HTTP
 * │  (handlers/     │   Recebe e adiciona na fila
 * │   producer.ts)  │
 * └──────┬──────────┘
 *        │ send()
 *        ▼
 * ┌─────────────────┐
 * │ CLOUDFLARE      │
 * │ QUEUE           │
 * │ (buffer-memory- │
 * │  queue)         │
 * └──────┬──────────┘
 *        │ batch (30s ou 50 msgs)
 *        ▼
 * ┌─────────────────┐
 * │  CONSUMER       │ ← queue() - Processador
 * │  (handlers/     │   Agrupa por chatId
 * │   consumer.ts)  │   Envia para webhook
 * └─────────────────┘
 *
 * CONFIGURAÇÕES:
 * - max_batch_size: 50 mensagens
 * - max_batch_timeout: 30 segundos
 * - Agrupamento: por chatId
 */

// ============================================
// BLOCO 02: IMPORTAÇÕES DE HANDLERS
// ============================================
import { handleProducer } from './handlers/producer'
import { handleConsumer } from './handlers/consumer'

// ============================================
// BLOCO 03: IMPORTAÇÕES DE TYPES
// ============================================
import type { Env, BufferMessage } from './types/buffer-memory'

// ============================================
// BLOCO 04: EXPORTAÇÃO DO WORKER
// ============================================
/**
 * Cloudflare Worker principal
 * Exporta handlers para HTTP (fetch) e Queue (queue)
 */
export default {
  /**
   * FETCH HANDLER (Producer/Webhook)
   *
   * Endpoint HTTP que recebe mensagens
   * URL: https://buffer-memory.syntifai.workers.dev
   *
   * @param request - Request HTTP
   * @param env - Environment com bindings (BUFFER_MEMORY_QUEUE)
   * @returns Response HTTP
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleProducer(request, env)
  },

  /**
   * QUEUE HANDLER (Consumer/Processador)
   *
   * Chamado automaticamente quando:
   * - 50 mensagens acumuladas OU
   * - 30 segundos desde última mensagem
   *
   * @param batch - Lote de mensagens da fila
   * @param env - Environment com bindings e variáveis
   */
  async queue(batch: MessageBatch<BufferMessage>, env: Env): Promise<void> {
    return handleConsumer(batch, env)
  }
}
