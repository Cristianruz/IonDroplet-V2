// Esqueletos de carga: en vez de un "Buscando…" en texto, se enseña la forma
// de lo que va a llegar. El agricultor entiende que ya viene, y cuando llega
// no le brinca la pantalla porque el hueco ya estaba reservado.

function Barra({ ancho, alto = 22 }: { ancho: string; alto?: number }) {
  return <div className="esqueleto" style={{ width: ancho, height: alto }} aria-hidden />
}

function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-4 sm:p-5 border flex flex-col gap-4"
      style={{ background: 'var(--tarjeta)', boxShadow: 'var(--sombra-tarjeta)' }}
    >
      {children}
    </div>
  )
}

/** Mientras llega la humedad y el estado del riego. */
export function EsqueletoHumedad() {
  return (
    <Tarjeta>
      <Barra ancho="60%" alto={26} />
      <Barra ancho="45%" alto={72} />
      <Barra ancho="35%" />
      <Barra ancho="100%" alto={24} />
    </Tarjeta>
  )
}

/** Mientras llegan los datos de la parcela. */
export function EsqueletoParcela() {
  return (
    <Tarjeta>
      <div className="flex items-center gap-4">
        <Barra ancho="48px" alto={48} />
        <div className="flex-1 flex flex-col gap-2">
          <Barra ancho="70%" alto={30} />
          <Barra ancho="40%" />
        </div>
      </div>
      <Barra ancho="90%" />
      <Barra ancho="100%" alto={56} />
    </Tarjeta>
  )
}

/** Mientras llega la gráfica y sus cifras. */
export function EsqueletoGrafica() {
  return (
    <Tarjeta>
      <Barra ancho="55%" alto={26} />
      <Barra ancho="100%" alto={180} />
    </Tarjeta>
  )
}

export function EsqueletoCifras() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[0, 1, 2].map(i => (
        <Tarjeta key={i}>
          <Barra ancho="50%" alto={44} />
          <Barra ancho="70%" />
        </Tarjeta>
      ))}
    </div>
  )
}

/** Una lista, para la bitácora y las plagas. */
export function EsqueletoLista({ filas = 3 }: { filas?: number }) {
  return (
    <Tarjeta>
      <Barra ancho="45%" alto={26} />
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Barra ancho="34px" alto={34} />
          <div className="flex-1 flex flex-col gap-2">
            <Barra ancho="65%" />
            <Barra ancho="40%" alto={18} />
          </div>
        </div>
      ))}
    </Tarjeta>
  )
}
