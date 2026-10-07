import type { NextRequest } from 'next/server'
import { MODO_DEMO } from '@/lib/modo'
import { armarPedido, leerRespuesta, validarPeticion } from '@/lib/ia-demo/instrucciones'
import { Limitador } from '@/lib/ia-demo/limites'
import { hayLlave, pedirAClaude, type FalloIA } from '@/lib/ia-demo/claude'
import { pedirClimaReal } from '@/lib/ia-demo/clima-servidor'
import { fechaEnChihuahua, pronosticoEnTexto } from '@/lib/demo/clima-real'

// La IA de verdad para la demostración pública.
//
// El teléfono manda lo que muestra su cultivo simulado; aquí se le agregan el
// clima real de Chihuahua (lo pide este servidor, no el teléfono) y las
// instrucciones, y se le pregunta a Claude con la llave de Vercel. La llave
// nunca sale de aquí.
//
// Mientras Claude piensa se manda un espacio cada 2 segundos. Algunas redes
// (la de la laptop del equipo, por ejemplo) cortan una conexión que lleva 5
// segundos callada, y el diagnóstico por foto tarda más que eso. El JSON del
// final se lee igual: los espacios de adelante no le estorban.
//
// En la computadora del riego esta ruta no existe: ahí la IA la da el backend.

export const dynamic = 'force-dynamic'
// El diagnóstico por foto, con razonamiento alto, puede tardar más de un minuto.
export const maxDuration = 150

const limitador = new Limitador()

const MENSAJE: Record<FalloIA, { status: number; error: string }> = {
  sin_llave: { status: 503, error: 'La IA no está configurada en este servidor.' },
  rechazada: { status: 422, error: 'El asistente no puede contestar eso.' },
  saturada: { status: 503, error: 'La IA está muy ocupada en este momento. Intenta en un minuto.' },
  api: { status: 502, error: 'La IA no pudo responder en este momento.' },
}

/** Mismo sitio: que otra página no use esta ruta con el crédito del equipo. */
function vieneDeAqui(req: NextRequest): boolean {
  const origen = req.headers.get('origin')
  if (!origen) return true
  try {
    return new URL(origen).host === req.headers.get('host')
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!MODO_DEMO) return Response.json({ error: 'No disponible.' }, { status: 404 })
  if (!vieneDeAqui(req)) return Response.json({ error: 'No permitido.' }, { status: 403 })

  // Vercel no deja pasar más de 4.5 MB; las fotos de la app son de 1600 px y pesan mucho menos.
  if (Number(req.headers.get('content-length') ?? 0) > 4_400_000) {
    return Response.json({ error: 'Las fotos pesan demasiado. Quita una e intenta de nuevo.' }, { status: 413 })
  }

  let cuerpo: unknown
  try {
    cuerpo = await req.json()
  } catch {
    return Response.json({ error: 'La consulta llegó incompleta.' }, { status: 400 })
  }
  const peticion = validarPeticion(cuerpo)
  if ('error' in peticion) return Response.json({ error: peticion.error }, { status: 400 })

  if (!hayLlave()) return Response.json(MENSAJE.sin_llave, { status: 503 })

  const visita = (req.headers.get('x-iondroplet-visita') ?? '').slice(0, 64) || 'sin-visita'
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'sin-ip'
  const freno = limitador.revisar(peticion.tipo, visita, ip)
  if (freno) return Response.json({ error: freno }, { status: 429 })

  const ahora = Date.now()
  const clima = await pedirClimaReal()
  const textoClima = clima
    ? pronosticoEnTexto(clima, ahora)
    : 'CLIMA: no se pudo consultar el clima real en este momento. No lo supongas: di que no está disponible.'
  const pedido = armarPedido(peticion, textoClima, fechaEnChihuahua(ahora))

  const codificador = new TextEncoder()
  const flujo = new ReadableStream<Uint8Array>({
    async start(control) {
      const mandar = (texto: string) => {
        try {
          control.enqueue(codificador.encode(texto))
        } catch {
          // El teléfono ya se fue.
        }
      }
      mandar(' ')
      const latido = setInterval(() => mandar(' '), 2000)
      let final: object
      try {
        const r = await pedirAClaude(pedido, req.signal)
        if ('error' in r) {
          final = { ok: false, ...MENSAJE[r.error] }
        } else {
          const leido = leerRespuesta(peticion.tipo, r.texto)
          final = 'error' in leido ? { ok: false, status: 502, error: leido.error } : { ok: true, datos: leido.datos }
        }
      } catch {
        final = { ok: false, ...MENSAJE.api }
      } finally {
        clearInterval(latido)
      }
      mandar(JSON.stringify(final))
      try {
        control.close()
      } catch {}
    },
  })

  return new Response(flujo, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
