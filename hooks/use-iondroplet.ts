'use client'

import { useEffect } from 'react'
import { useDatos } from './datos-provider'

// Contrato del backend existente (iondroplet-backend/server.js).
// Este hook SOLO consume endpoints que ya existen.
//
// Desde la optimización, quien pide los datos es <ProveedorDatos>: aquí solo
// se leen. La interfaz no cambió, así que las pantallas siguen igual.

export interface EstadoEsp {
  autoMode: boolean
  pumpState: 0 | 1
  espIp: string | null
}

export interface PuntoHistorial {
  humedad: number
  fecha: Date
}

interface Opciones {
  /**
   * La gráfica de 24 h solo la enseña el panel de inicio. Las demás pantallas
   * pasan false y nadie la pide: en un día de operación son más de 23,000
   * lecturas del otro lado.
   */
  conHistorial?: boolean
}

export function useIonDroplet(opciones: Opciones = {}) {
  const { conHistorial = true } = opciones
  const datos = useDatos()
  const { registrarHistorial } = datos

  // Mientras esta pantalla esté montada y quiera la gráfica, el proveedor la
  // mantiene al día. Al desmontarse, deja de pedirla.
  useEffect(() => {
    if (!conHistorial) return
    registrarHistorial(true)
    return () => registrarHistorial(false)
  }, [conHistorial, registrarHistorial])

  return {
    humedad: datos.humedad,
    ultimaLectura: datos.ultimaLectura,
    conectado: datos.conectado,
    sensorActivo: datos.sensorActivo,
    estadoEsp: datos.estadoEsp,
    historial: datos.historial,
    ionizacion: datos.ionizacion,
    cambiarModo: datos.cambiarModo,
    cambiarBomba: datos.cambiarBomba,
    cambiarIonizacion: datos.cambiarIonizacion,
  }
}
