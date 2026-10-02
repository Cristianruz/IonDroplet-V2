// La llave del dueño.
//
// El asistente y el análisis cuestan dinero, así que el backend solo se los
// da a quien traiga esta llave. Vive en el navegador de la computadora del
// dueño y en ningún otro lado: el teléfono de quien venga a ver el sistema
// no la tiene, y por eso no puede gastar créditos.

import { MODO_DEMO } from './modo'

const CLAVE = 'iondroplet.llave-dueno'

/** Operar desde internet sin aparato vinculado: la app ofrece vincularlo. */
export const EVENTO_PIDE_VINCULO = 'iondroplet:pide-vinculo'

export function pedirVinculo(): void {
  window.dispatchEvent(new Event(EVENTO_PIDE_VINCULO))
}

export function leerLlave(): string | null {
  // En la demostración no hay IA de verdad ni créditos que cuidar: cualquier
  // aparato cuenta como vinculado y nadie ve la ventana de vincular.
  if (MODO_DEMO) return 'demostracion'
  try {
    const v = localStorage.getItem(CLAVE)
    return v && v.trim() !== '' ? v : null
  } catch {
    return null
  }
}

export function guardarLlave(llave: string): void {
  try {
    if (llave.trim() === '') localStorage.removeItem(CLAVE)
    else localStorage.setItem(CLAVE, llave.trim())
  } catch {}
}
