// Cuántas veces se puede llamar a la IA desde la demostración pública.
//
// Cada respuesta de Claude cuesta dinero de la cuenta del equipo, y la página
// la abre cualquiera. Tres frenos, de adentro hacia afuera:
// 1. Por visita (un número al azar que guarda cada navegador): lo normal de una
//    persona explorando la app nunca llega al tope.
// 2. Por dirección IP, más holgado: en un evento todo el jurado sale a internet
//    por la misma IP del wifi, y no se le puede cortar a la mesa entera. Este
//    es el que detiene a un programa que cambia de "visita" en cada llamada.
// 3. Por día, para todo el servidor.
// El freno de verdad es el tope de gasto de la cuenta de Anthropic (se pone en
// console.anthropic.com). Esto solo evita llegar ahí por abuso.
//
// Vive en la memoria del servidor: si Vercel arranca otra instancia, empieza
// en cero. Por eso es un freno de abuso y no una contabilidad.

import type { TipoIA } from './instrucciones.ts'

const MINUTO = 60_000

/** Por visita: [llamadas, en tantos minutos]. */
export const POR_VISITA: Record<TipoIA, [number, number]> = {
  chat: [20, 10],
  consejo: [40, 10],
  analisis: [8, 10],
  umbral: [8, 10],
  agente: [8, 10],
  foto: [6, 30],
}

/** Por IP, en 10 minutos: alcanza para una sala de jurado con varios celulares. */
export const POR_IP_10_MIN = 250
/** Por día, todo el servidor. */
export const POR_DIA = 3000
export const FOTOS_POR_DIA = 400

export class Limitador {
  private golpes = new Map<string, number[]>()
  private dia = ''
  private delDia = 0
  private fotosDelDia = 0

  /** Devuelve null si pasa, o el mensaje para la pantalla si no. */
  revisar(tipo: TipoIA, visita: string, ip: string, ahora = Date.now()): string | null {
    const hoy = new Date(ahora).toISOString().slice(0, 10)
    if (hoy !== this.dia) {
      this.dia = hoy
      this.delDia = 0
      this.fotosDelDia = 0
      this.golpes.clear()
    }
    if (this.delDia >= POR_DIA || (tipo === 'foto' && this.fotosDelDia >= FOTOS_POR_DIA)) {
      return 'La demostración llegó a su límite de consultas a la IA por hoy. Vuelve a intentarlo mañana.'
    }

    const [cuantas, minutos] = POR_VISITA[tipo]
    const claveVisita = `v:${tipo}:${visita}`
    const claveIp = `ip:${ip}`
    if (this.contar(claveVisita, minutos * MINUTO, ahora) >= cuantas) {
      return 'Van muchas consultas seguidas. Espera un minuto y vuelve a intentar.'
    }
    if (this.contar(claveIp, 10 * MINUTO, ahora) >= POR_IP_10_MIN) {
      return 'Hay muchas consultas desde esta red. Espera un minuto y vuelve a intentar.'
    }

    this.golpes.get(claveVisita)!.push(ahora)
    this.golpes.get(claveIp)!.push(ahora)
    this.delDia++
    if (tipo === 'foto') this.fotosDelDia++
    this.limpiarDeVezEnCuando(ahora)
    return null
  }

  private contar(clave: string, ventana: number, ahora: number): number {
    const lista = (this.golpes.get(clave) ?? []).filter(t => t > ahora - ventana)
    this.golpes.set(clave, lista)
    return lista.length
  }

  // Para que la memoria no crezca con visitas que ya se fueron.
  private limpiarDeVezEnCuando(ahora: number): void {
    if (this.golpes.size < 5000) return
    for (const [clave, lista] of this.golpes) {
      if (lista.every(t => t < ahora - 30 * MINUTO)) this.golpes.delete(clave)
    }
  }
}
