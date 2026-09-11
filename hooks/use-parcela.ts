'use client'

import { useDatos } from './datos-provider'

// Todo lo de la parcela y el punto de riego. Los datos vienen del proveedor,
// que es quien los pide una sola vez para toda la app.

export interface Parcela {
  id: number
  nombre: string | null
  cultivo: string | null
  etapa: string | null
  area_ha: number | null
  /** Litros por minuto de la bomba. null mientras el agricultor no lo mida. */
  caudal_lpm: number | null
  num_hileras: number | null
  tipo_sistema: string | null
  hum_min: number | null
  hum_max: number | null
  device_id: string | null
  creado: string | null
}

// Lo que el formulario puede cambiar. El resto de columnas no se toca:
// PUT /api/parcelas/:id solo actualiza los campos que se le mandan.
export interface DatosParcela {
  nombre: string
  cultivo: string
  etapa: string | null
  area_ha: number | null
  caudal_lpm: number | null
  hum_min: number
}

export interface Umbrales {
  temp_max: number | null
  hum_max: number | null
  volt_min: number | null
  volt_max: number | null
  curr_max: number | null
}

// OJO: el número que enciende la bomba es thresholds.hum_max, aunque funcione
// como mínimo (el nombre viene de antes y no se cambia sin migración).
// parcelas.hum_min es la copia que vive con la parcela; se guardan las dos
// para que la pantalla no prometa algo que la bomba no obedece.

export function useParcela() {
  const datos = useDatos()
  return {
    parcela: datos.parcela,
    umbralRiego: datos.umbralRiego,
    cargando: datos.cargandoParcela,
    conectado: datos.conectado,
    guardando: datos.guardando,
    guardarParcela: datos.guardarParcela,
    guardarUmbral: datos.guardarUmbral,
  }
}
