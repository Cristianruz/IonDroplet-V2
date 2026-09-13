'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { apiFetch, parseTimestampUTC } from '@/lib/api'
import type { EstadoEsp, PuntoHistorial } from './use-iondroplet'
import type { Parcela, Umbrales } from './use-parcela'

// Una sola fuente de datos para toda la app.
//
// Antes cada pantalla montaba su propio hook con su propio temporizador: al
// cambiar de pestaña se tiraba todo y se volvía a pedir de cero, y el
// agricultor veía "Buscando…" cada vez. Ahora el sondeo vive aquí arriba y las
// pantallas solo leen. Tres cosas más que importan en el campo:
//
//   - Con la pantalla apagada o la app en segundo plano no se pide nada.
//     El celular del agricultor no gasta datos ni batería de a gratis.
//   - Si el sistema no responde, el sondeo se espacia en vez de insistir cada
//     3 segundos contra un servidor que no está.
//   - Cada ciclo cancela el anterior: no quedan peticiones colgadas.

const INTERVALO_NORMAL = 3000
// Sin conexión no tiene caso insistir tan seguido.
const INTERVALO_SIN_CONEXION = 15000
const INTERVALO_PARCELA = 30000
const PUNTOS_GRAFICA = 240

interface ValorDatos {
  // Sensores y ESP32
  humedad: number | null
  ultimaLectura: Date | null
  conectado: boolean
  sensorActivo: boolean
  estadoEsp: EstadoEsp
  historial: PuntoHistorial[]
  ionizacion: boolean
  cambiarModo: (automatico: boolean) => Promise<void>
  cambiarBomba: (encender: boolean) => Promise<void>
  regarAhora: () => Promise<void>
  terminarRiegoManual: () => Promise<void>
  cambiarIonizacion: () => Promise<void>
  // Parcela y punto de riego
  parcela: Parcela | null
  umbralRiego: number | null
  cargandoParcela: boolean
  guardando: boolean
  guardarParcela: (datos: DatosParcelaProvider) => Promise<boolean>
  guardarUmbral: (nuevo: number) => Promise<boolean>
  // Registro de interés en la gráfica de 24 h
  registrarHistorial: (quiere: boolean) => void
}

export interface DatosParcelaProvider {
  nombre: string
  cultivo: string
  etapa: string | null
  area_ha: number | null
  hum_min: number
}

const UMBRAL_POR_OMISION = 40

const Contexto = createContext<ValorDatos | null>(null)

export function useDatos(): ValorDatos {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useDatos se usó fuera de <ProveedorDatos>')
  return valor
}

export function ProveedorDatos({ children }: { children: ReactNode }) {
  const [humedad, setHumedad] = useState<number | null>(null)
  const [ultimaLectura, setUltimaLectura] = useState<Date | null>(null)
  const [conectado, setConectado] = useState(false)
  const [estadoEsp, setEstadoEsp] = useState<EstadoEsp>({ autoMode: true, pumpState: 0, espIp: null })
  const [historial, setHistorial] = useState<PuntoHistorial[]>([])
  const [ionizacion, setIonizacion] = useState(false)

  const [parcela, setParcela] = useState<Parcela | null>(null)
  const [umbralRiego, setUmbralRiego] = useState<number | null>(null)
  const [cargandoParcela, setCargandoParcela] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Cuántas pantallas montadas quieren la gráfica de 24 h. Si ninguna, no se pide.
  const [quierenHistorial, setQuierenHistorial] = useState(0)

  const ultimoComando = useRef(0)
  const umbralesCompletos = useRef<Umbrales | null>(null)
  const idParcela = useRef<number | null>(null)
  const abortar = useRef<AbortController | null>(null)
  // El ritmo se lee al momento de programar la siguiente vuelta. Va en una
  // referencia para que perder o recuperar la conexión no reinicie el ciclo:
  // si reiniciara, volvería a pedir la parcela y la gráfica sin necesidad.
  const conectadoRef = useRef(false)
  conectadoRef.current = conectado
  // Lo mismo con el interés en la gráfica: entrar y salir de Inicio no debe
  // reiniciar el ciclo ni volver a pedir la parcela.
  const quierenHistorialRef = useRef(0)
  quierenHistorialRef.current = quierenHistorial

  const registrarHistorial = useCallback((quiere: boolean) => {
    setQuierenHistorial(n => Math.max(0, n + (quiere ? 1 : -1)))
  }, [])

  // --- Lectura de sensores y estado del ESP32 ---
  const leerSensores = useCallback(async (signal?: AbortSignal) => {
    // Van por separado a propósito. Sin señal, el service worker puede
    // devolver la ÚLTIMA LECTURA guardada (que trae su propia fecha, así que
    // la pantalla la enseña con su antigüedad y no engaña a nadie), pero el
    // estado de la bomba NO se guarda nunca: servirlo viejo haría creer que
    // está regando cuando no. Si fueran juntas en un Promise.all, la caída de
    // una tiraría a la otra y se perdería el último dato conocido.
    const lectura = apiFetch(`/api/sensors/latest`, { signal })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)

    const estado = apiFetch(`/api/esp/status`, { signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error())))
      .catch(() => null)

    const [latest, status] = await Promise.all([lectura, estado])

    if (signal?.aborted) return

    if (latest && latest.humidity !== undefined && latest.humidity !== null) {
      setHumedad(Number(latest.humidity))
      if (latest.timestamp) setUltimaLectura(parseTimestampUTC(latest.timestamp))
    }

    // La conexión la manda el estado del ESP, que nunca sale del caché. Si no
    // llegó, estamos sin señal aunque se haya podido pintar la última lectura.
    if (status) {
      if (Date.now() - ultimoComando.current > 2000) setEstadoEsp(status as EstadoEsp)
      setConectado(true)
    } else {
      setConectado(false)
    }
  }, [])

  const leerHistorial = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiFetch(
        `/api/sensors/history?hours=24&max=${PUNTOS_GRAFICA}`,
        { signal }
      )
      if (!res.ok) return
      const filas: Array<{ humidity: number | null; timestamp: string }> = await res.json()
      setHistorial(
        filas
          .filter(f => f.humidity !== null && f.humidity !== undefined)
          .map(f => ({ humedad: Number(f.humidity), fecha: parseTimestampUTC(f.timestamp) }))
      )
    } catch {}
  }, [])

  const leerParcela = useCallback(async (signal?: AbortSignal) => {
    try {
      const [resParcelas, resUmbrales] = await Promise.all([
        apiFetch(
          idParcela.current !== null
            ? `/api/parcelas/${idParcela.current}`
            : `/api/parcelas`,
          { signal }
        ),
        apiFetch(`/api/thresholds`, { signal }),
      ])
      if (!resUmbrales.ok) throw new Error()

      const umbrales: Umbrales = await resUmbrales.json()
      umbralesCompletos.current = umbrales

      if (resParcelas.ok) {
        const cuerpo = await resParcelas.json()
        const encontrada: Parcela | null = Array.isArray(cuerpo)
          ? cuerpo.length > 0 ? cuerpo[0] : null
          : cuerpo
        idParcela.current = encontrada ? encontrada.id : null
        setParcela(encontrada)
      } else if (resParcelas.status === 404) {
        idParcela.current = null
        setParcela(null)
      }

      if (Date.now() - ultimoComando.current > 2000) {
        setUmbralRiego(
          umbrales.hum_max !== null && umbrales.hum_max !== undefined
            ? Number(umbrales.hum_max)
            : UMBRAL_POR_OMISION
        )
      }

      // Lo último que se le pidió al ionizador. Antes esto vivía solo en el
      // navegador y se perdía al recargar la página.
      try {
        const resIon = await apiFetch(`/api/ionization/estado`, { signal })
        if (resIon.ok && Date.now() - ultimoComando.current > 2000) {
          const estado: { encendida: boolean } = await resIon.json()
          setIonizacion(estado.encendida)
        }
      } catch {}
    } catch {
    } finally {
      setCargandoParcela(false)
    }
  }, [])

  // --- El único temporizador de la app ---
  useEffect(() => {
    let vivo = true
    let temporizador: ReturnType<typeof setTimeout> | null = null
    let ciclos = 0

    async function ciclo() {
      if (!vivo) return
      // Con la app en segundo plano no se pide nada: se reanuda al volver.
      // Pero la PRIMERA vuelta siempre corre, aunque la pantalla esté oculta:
      // si no, la app diría "no responde" sin haber preguntado nunca, que es
      // afirmar algo que no sabe.
      if (ciclos > 0 && typeof document !== 'undefined' && document.hidden) {
        temporizador = setTimeout(ciclo, INTERVALO_NORMAL)
        return
      }

      abortar.current?.abort()
      const control = new AbortController()
      abortar.current = control

      await leerSensores(control.signal)
      if (!vivo) return

      // La parcela y la gráfica cambian despacio: no van en cada vuelta.
      const cadaParcela = Math.round(INTERVALO_PARCELA / INTERVALO_NORMAL)
      const cadaHistorial = Math.round(60000 / INTERVALO_NORMAL)
      if (ciclos === 0 || ciclos % cadaParcela === 0) await leerParcela(control.signal)
      if (quierenHistorialRef.current > 0 && (ciclos === 0 || ciclos % cadaHistorial === 0)) {
        await leerHistorial(control.signal)
      }
      ciclos++

      if (!vivo) return
      temporizador = setTimeout(
        ciclo,
        conectadoRef.current ? INTERVALO_NORMAL : INTERVALO_SIN_CONEXION
      )
    }

    ciclo()

    function alVolver() {
      if (!document.hidden) {
        if (temporizador) clearTimeout(temporizador)
        ciclo()
      }
    }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      vivo = false
      if (temporizador) clearTimeout(temporizador)
      document.removeEventListener('visibilitychange', alVolver)
      abortar.current?.abort()
    }
  }, [leerSensores, leerParcela, leerHistorial])

  // Al entrar a una pantalla que sí quiere la gráfica, se trae de inmediato en
  // vez de esperar a que le toque su vuelta.
  useEffect(() => {
    if (quierenHistorial > 0) leerHistorial()
  }, [quierenHistorial, leerHistorial])

  // --- Acciones ---
  const cambiarModo = useCallback(async (automatico: boolean) => {
    ultimoComando.current = Date.now()
    setEstadoEsp(prev => ({ ...prev, autoMode: automatico }))
    try {
      const res = await apiFetch(`/api/esp/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoMode: automatico }),
      })
      const json = await res.json()
      if (json.settings) setEstadoEsp(json.settings)
    } catch {}
  }, [])

  const cambiarBomba = useCallback(async (encender: boolean) => {
    ultimoComando.current = Date.now()
    setEstadoEsp(prev => ({ ...prev, autoMode: false, pumpState: encender ? 1 : 0 }))
    try {
      const res = await apiFetch(`/api/esp/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bomba: encender ? 1 : 0, autoMode: false }),
      })
      const json = await res.json()
      if (json.settings) setEstadoEsp(json.settings)
    } catch {}
  }, [])

  // Riego a mano, como excepción. El backend solo obedece `bomba` cuando
  // autoMode es false, así que hay que pasar a manual y encender en la misma
  // llamada.
  const regarAhora = useCallback(async () => {
    await cambiarBomba(true)
  }, [cambiarBomba])

  // Y al terminar, el sistema retoma el control. OJO CON EL ORDEN: si se
  // mandara { bomba: 0, autoMode: true } de una sola vez, el backend pondría
  // autoMode en true primero y luego ignoraría el bomba:0 — la bomba se
  // quedaría encendida. Por eso son dos llamadas.
  const terminarRiegoManual = useCallback(async () => {
    ultimoComando.current = Date.now()
    setEstadoEsp(prev => ({ ...prev, autoMode: true, pumpState: 0 }))
    try {
      await apiFetch(`/api/esp/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bomba: 0 }),
      })
      const res = await apiFetch(`/api/esp/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoMode: true }),
      })
      const json = await res.json()
      if (json.settings) setEstadoEsp(json.settings)
    } catch {}
  }, [])

  const cambiarIonizacion = useCallback(async () => {
    const nuevo = !ionizacion
    ultimoComando.current = Date.now()
    setIonizacion(nuevo)
    try {
      await apiFetch(`/api/ionization/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: nuevo }),
      })
    } catch {}
  }, [ionizacion])

  const escribirUmbralDeRiego = useCallback(async (nuevo: number): Promise<boolean> => {
    const previos = umbralesCompletos.current ?? {
      temp_max: null, hum_max: null, volt_min: null, volt_max: null, curr_max: null,
    }
    const res = await apiFetch(`/api/thresholds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...previos, hum_max: nuevo }),
    })
    if (!res.ok) return false
    umbralesCompletos.current = { ...previos, hum_max: nuevo }
    return true
  }, [])

  const guardarParcela = useCallback(
    async (datos: DatosParcelaProvider): Promise<boolean> => {
      setGuardando(true)
      ultimoComando.current = Date.now()
      try {
        const nueva = parcela === null
        const res = await apiFetch(
          nueva ? `/api/parcelas` : `/api/parcelas/${parcela.id}`,
          {
            method: nueva ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
          }
        )
        if (!res.ok) return false
        const guardada: Parcela = await res.json()
        idParcela.current = guardada.id
        setParcela(guardada)

        if (datos.hum_min !== umbralRiego) {
          if (await escribirUmbralDeRiego(datos.hum_min)) setUmbralRiego(datos.hum_min)
        }
        return true
      } catch {
        return false
      } finally {
        setGuardando(false)
      }
    },
    [parcela, umbralRiego, escribirUmbralDeRiego]
  )

  const guardarUmbral = useCallback(
    async (nuevo: number): Promise<boolean> => {
      ultimoComando.current = Date.now()
      setUmbralRiego(nuevo)
      setGuardando(true)
      try {
        if (!(await escribirUmbralDeRiego(nuevo))) return false
        if (parcela !== null) {
          const res = await apiFetch(`/api/parcelas/${parcela.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hum_min: nuevo }),
          })
          if (res.ok) setParcela(await res.json())
        }
        return true
      } catch {
        return false
      } finally {
        setGuardando(false)
      }
    },
    [parcela, escribirUmbralDeRiego]
  )

  const sensorActivo =
    ultimaLectura !== null && Date.now() - ultimaLectura.getTime() < 5 * 60 * 1000

  return (
    <Contexto.Provider
      value={{
        humedad,
        ultimaLectura,
        conectado,
        sensorActivo,
        estadoEsp,
        historial,
        ionizacion,
        cambiarModo,
        cambiarBomba,
        regarAhora,
        terminarRiegoManual,
        cambiarIonizacion,
        parcela,
        umbralRiego,
        cargandoParcela,
        guardando,
        guardarParcela,
        guardarUmbral,
        registrarHistorial,
      }}
    >
      {children}
    </Contexto.Provider>
  )
}
