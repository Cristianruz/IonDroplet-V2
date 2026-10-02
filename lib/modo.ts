// ¿Esta copia de la app es la demostración pública?
//
// Se decide al construir: en Vercel está NEXT_PUBLIC_DEMO=si y la app contesta
// desde un sistema simulado en el navegador, sin tocar la computadora del
// riego. En la computadora del riego la variable no existe y todo es real.
export const MODO_DEMO = process.env.NEXT_PUBLIC_DEMO === 'si'

/**
 * Un escenario de la demostración cambió el sistema de golpe: los datos se
 * vuelven a leer ya, sin esperar la siguiente vuelta del sondeo. En el
 * sistema real nadie lo manda.
 */
export const EVENTO_REFRESCAR = 'iondroplet:refrescar'

/** "Ver al sistema regar" de la bienvenida abre la hoja de Pruébalo. */
export const EVENTO_ABRIR_PRUEBAS = 'iondroplet:abrir-pruebas'
