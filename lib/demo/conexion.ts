// Lo único que la demostración pide a la red: el clima real y la IA real, a
// su propio servidor (app/api/demo). Nunca al backend de la computadora del
// riego, que en la demostración no existe.

import { climaValido, type ClimaReal } from './clima-real.ts'

const CLAVE_VISITA = 'iondroplet.demo.visita'
const CLAVE_CLIMA = 'iondroplet.demo.clima'

/** Un número al azar por pestaña: el servidor cuenta las consultas de cada visita. */
function visita(): string {
  try {
    let v = sessionStorage.getItem(CLAVE_VISITA)
    if (!v) {
      // randomUUID no existe sin https (la app abierta por la IP de la red local).
      v = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem(CLAVE_VISITA, v)
    }
    return v
  } catch {
    return 'sin-almacen'
  }
}

/** El último clima que llegó, para que al recargar la página no se espere. */
export function climaGuardado(maximoMs: number): ClimaReal | null {
  try {
    const c = JSON.parse(sessionStorage.getItem(CLAVE_CLIMA) ?? 'null')
    if (climaValido(c) && Date.now() - new Date(c.consultado).getTime() < maximoMs) return c
  } catch {}
  return null
}

export async function traerClimaReal(): Promise<ClimaReal | null> {
  try {
    const res = await fetch('/api/demo/clima')
    if (!res.ok) return null
    const c = await res.json()
    if (!climaValido(c)) return null
    try {
      sessionStorage.setItem(CLAVE_CLIMA, JSON.stringify(c))
    } catch {}
    return c
  } catch {
    return null
  }
}

export type RespuestaIA = { ok: true; datos: unknown } | { ok: false; status: number; error: string }

/**
 * Le pregunta a la IA por el servidor de la demostración. status 0 es que no
 * hubo conexión. Si la página cancela (signal), la promesa se rechaza como
 * cualquier fetch cancelado.
 */
export async function preguntarALaIA(cuerpo: object, signal?: AbortSignal | null): Promise<RespuestaIA> {
  let res: Response
  try {
    res = await fetch('/api/demo/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-iondroplet-visita': visita() },
      body: JSON.stringify(cuerpo),
      signal: signal ?? undefined,
    })
  } catch (err) {
    if (signal?.aborted) throw err
    return { ok: false, status: 0, error: 'Sin conexión con la IA.' }
  }
  let datos: { ok?: boolean; datos?: unknown; status?: number; error?: string } | null = null
  try {
    datos = await res.json()
  } catch (err) {
    if (signal?.aborted) throw err
  }
  if (!res.ok) return { ok: false, status: res.status, error: datos?.error ?? 'La IA no está disponible en este momento.' }
  if (datos?.ok === true) return { ok: true, datos: datos.datos }
  return { ok: false, status: datos?.status ?? 502, error: datos?.error ?? 'La IA no pudo responder en este momento.' }
}
