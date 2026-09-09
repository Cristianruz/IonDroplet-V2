// Catálogo de nutrientes. Los 'id' son los mismos que valida el backend en
// NUTRIENTES de server.js: si se agrega uno aquí, hay que agregarlo allá o
// la captura rebota.
//
// El nombre completo va primero porque el agricultor dice "nitrógeno", no
// "N". El símbolo se enseña chiquito al lado, para quien sí lo usa.

export interface Nutriente {
  id: string
  nombre: string
  /** Los tres que se aplican casi siempre van arriba y sin desplegar. */
  principal?: boolean
}

export const NUTRIENTES: Nutriente[] = [
  { id: 'N', nombre: 'Nitrógeno', principal: true },
  { id: 'P', nombre: 'Fósforo', principal: true },
  { id: 'K', nombre: 'Potasio', principal: true },
  { id: 'Ca', nombre: 'Calcio' },
  { id: 'Mg', nombre: 'Magnesio' },
  { id: 'S', nombre: 'Azufre' },
  { id: 'Fe', nombre: 'Hierro' },
  { id: 'Zn', nombre: 'Zinc' },
  { id: 'Mn', nombre: 'Manganeso' },
  { id: 'B', nombre: 'Boro' },
  { id: 'Cu', nombre: 'Cobre' },
  { id: 'Mo', nombre: 'Molibdeno' },
  { id: 'otro', nombre: 'Otro' },
]

export const UNIDADES = ['kg', 'g', 'L', 'ml'] as const
export type Unidad = (typeof UNIDADES)[number]

export function nutrientePorId(id: string | null | undefined): Nutriente | null {
  if (!id) return null
  return NUTRIENTES.find(n => n.id === id) ?? null
}

/** "Nitrógeno" para enseñar; cae al propio id si llegara uno desconocido. */
export function nombreNutriente(id: string): string {
  return nutrientePorId(id)?.nombre ?? id
}
