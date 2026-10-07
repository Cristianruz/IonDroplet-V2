// La llamada a Claude de la demostración pública. Solo corre en el servidor
// (app/api/demo/ia): la llave vive en las variables de Vercel y nunca llega al
// teléfono.
//
// Va en streaming aunque aquí no se muestre letra por letra: una respuesta
// larga (el diagnóstico por foto) tarda más de lo que algunas redes aguantan
// una conexión callada. finalMessage() junta todo al final.

import Anthropic from '@anthropic-ai/sdk'
import { MODELO, type Pedido } from './instrucciones.ts'

export type FalloIA = 'sin_llave' | 'rechazada' | 'saturada' | 'api'
export type ResultadoIA = { texto: string } | { error: FalloIA }

let cliente: Anthropic | null = null

function obtenerCliente(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  // Un reintento basta: la persona está esperando con el celular en la mano.
  cliente ??= new Anthropic({ maxRetries: 1, timeout: 140_000 })
  return cliente
}

export function hayLlave(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export async function pedirAClaude(pedido: Pedido, signal?: AbortSignal): Promise<ResultadoIA> {
  const c = obtenerCliente()
  if (!c) return { error: 'sin_llave' }

  try {
    const flujo = c.beta.messages.stream(
      {
        model: MODELO,
        max_tokens: pedido.max_tokens,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: pedido.effort,
          ...(pedido.esquema ? { format: { type: 'json_schema' as const, schema: pedido.esquema } } : {}),
        },
        // Preguntas de plagas, hongos o venenos pueden frenar por error un
        // filtro de seguridad: la API reintenta sola con otro modelo.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: pedido.system,
        messages: pedido.messages as Anthropic.Beta.BetaMessageParam[],
      },
      { signal }
    )
    const mensaje = await flujo.finalMessage()
    if (mensaje.stop_reason === 'refusal') return { error: 'rechazada' }
    const texto = mensaje.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
    if (!texto.trim()) return { error: 'api' }
    return { texto }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error('IA de la demostración: la llave no sirve.', err.status)
      return { error: 'sin_llave' }
    }
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      console.error('IA de la demostración: la API está saturada.', err.status)
      return { error: 'saturada' }
    }
    if (err instanceof Anthropic.APIUserAbortError) return { error: 'api' }
    if (err instanceof Anthropic.APIError) {
      // Aquí cae también "credit balance is too low" (400): la cuenta se quedó sin crédito.
      console.error('IA de la demostración: error de la API.', err.status, err.message.slice(0, 200))
      return { error: 'api' }
    }
    console.error('IA de la demostración: falló la conexión.', err instanceof Error ? err.message : err)
    return { error: 'api' }
  }
}
