'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { API_URL, parseTimestampUTC } from '@/lib/api'

// Contrato del backend existente (iondroplet-backend/server.js).
// Este hook SOLO consume endpoints que ya existen — el backend no se modifica.

export interface EstadoEsp {
  autoMode: boolean
  pumpState: 0 | 1
  espIp: string | null
}

export interface PuntoHistorial {
  humedad: number
  fecha: Date
}

export function useIonDroplet(intervaloMs = 3000) {
  const [humedad, setHumedad] = useState<number | null>(null)
  const [ultimaLectura, setUltimaLectura] = useState<Date | null>(null)
  const [conectado, setConectado] = useState(false)
  const [estadoEsp, setEstadoEsp] = useState<EstadoEsp>({ autoMode: true, pumpState: 0, espIp: null })
  const [historial, setHistorial] = useState<PuntoHistorial[]>([])
  const [ionizacion, setIonizacion] = useState(false)

  // Evita que una respuesta lenta pise el estado optimista de un clic reciente
  const ultimoComando = useRef(0)

  const leerSensores = useCallback(async () => {
    try {
      const [resLatest, resStatus] = await Promise.all([
        fetch(`${API_URL}/api/sensors/latest`),
        fetch(`${API_URL}/api/esp/status`),
      ])
      if (!resLatest.ok || !resStatus.ok) throw new Error()

      const latest = await resLatest.json()
      const status: EstadoEsp = await resStatus.json()

      if (latest && latest.humidity !== undefined && latest.humidity !== null) {
        setHumedad(Number(latest.humidity))
        if (latest.timestamp) setUltimaLectura(parseTimestampUTC(latest.timestamp))
      }
      if (Date.now() - ultimoComando.current > 2000) {
        setEstadoEsp(status)
      }
      setConectado(true)
    } catch {
      setConectado(false)
    }
  }, [])

  const leerHistorial = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/sensors/history?hours=24`)
      if (!res.ok) return
      const filas: Array<{ humidity: number | null; timestamp: string }> = await res.json()
      setHistorial(
        filas
          .filter(f => f.humidity !== null && f.humidity !== undefined)
          .map(f => ({ humedad: Number(f.humidity), fecha: parseTimestampUTC(f.timestamp) }))
      )
    } catch {}
  }, [])

  useEffect(() => {
    leerSensores()
    leerHistorial()
    const idSensores = setInterval(leerSensores, intervaloMs)
    const idHistorial = setInterval(leerHistorial, 60000)
    return () => {
      clearInterval(idSensores)
      clearInterval(idHistorial)
    }
  }, [leerSensores, leerHistorial, intervaloMs])

  // Misma llamada que usa la versión que funciona: POST /api/esp/control
  const cambiarModo = useCallback(async (automatico: boolean) => {
    ultimoComando.current = Date.now()
    setEstadoEsp(prev => ({ ...prev, autoMode: automatico }))
    try {
      const res = await fetch(`${API_URL}/api/esp/control`, {
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
      const res = await fetch(`${API_URL}/api/esp/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bomba: encender ? 1 : 0, autoMode: false }),
      })
      const json = await res.json()
      if (json.settings) setEstadoEsp(json.settings)
    } catch {}
  }, [])

  const cambiarIonizacion = useCallback(async () => {
    const nuevo = !ionizacion
    setIonizacion(nuevo)
    try {
      await fetch(`${API_URL}/api/ionization/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: nuevo }),
      })
    } catch {}
  }, [ionizacion])

  // Sensor "activo" = lectura de hace menos de 5 minutos
  const sensorActivo =
    ultimaLectura !== null && Date.now() - ultimaLectura.getTime() < 5 * 60 * 1000

  return {
    humedad,
    ultimaLectura,
    conectado,
    sensorActivo,
    estadoEsp,
    historial,
    ionizacion,
    cambiarModo,
    cambiarBomba,
    cambiarIonizacion,
  }
}
