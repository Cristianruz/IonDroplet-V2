import { MODO_DEMO } from '@/lib/modo'
import { pedirClimaReal } from '@/lib/ia-demo/clima-servidor'

// El clima real de la ciudad de Chihuahua para la demostración pública.
//
// En la computadora del riego no existe: ahí el clima lo da el backend con la
// ubicación del cultivo. Esta ruta es más específica que /api/[...ruta], así
// que Next la atiende aquí y no la manda al backend.

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!MODO_DEMO) return Response.json({ error: 'No disponible.' }, { status: 404 })

  const datos = await pedirClimaReal()
  if (!datos) return Response.json({ error: 'No se pudo consultar el clima.' }, { status: 502 })
  return Response.json(datos, {
    // La red de Vercel la guarda unos minutos: todos los celulares ven lo mismo y Open-Meteo no se satura.
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' },
  })
}
