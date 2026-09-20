// La llave del dueño.
//
// El asistente y el análisis cuestan dinero, así que el backend solo se los
// da a quien traiga esta llave. Vive en el navegador de la computadora del
// dueño y en ningún otro lado: el teléfono de quien venga a ver el sistema
// no la tiene, y por eso no puede gastar créditos.

const CLAVE = 'iondroplet.llave-dueno'

export function leerLlave(): string | null {
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
