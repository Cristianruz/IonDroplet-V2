import { redirect } from 'next/navigation'

// La ionización dejó de tener pantalla propia: era una pestaña entera para un
// solo botón que además no confirma nada. Ahora vive dentro de Análisis, que
// es donde el sistema dice si conviene encenderla y por qué.
//
// La ruta se queda redirigiendo para no romper un enlace guardado ni el
// historial del navegador de quien ya la tenía a la mano.
export default function IonizacionMudada() {
  redirect('/analisis')
}
