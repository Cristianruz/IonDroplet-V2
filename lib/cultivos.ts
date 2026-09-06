// Catálogo de cultivos. El icono es emoji a propósito: la regla 10 permite
// emojis como icono de catálogo (cultivo, plaga, aparato) definidos aquí.
// Las claves 'id' son las mismas que usará lib/plagas.ts en la Fase 4.

export interface Cultivo {
  id: string
  nombre: string
  icono: string
}

export const CULTIVOS: Cultivo[] = [
  { id: 'chile', nombre: 'Chile', icono: '🌶️' },
  { id: 'nogal', nombre: 'Nogal', icono: '🌰' },
  { id: 'alfalfa', nombre: 'Alfalfa', icono: '🌿' },
  { id: 'maiz', nombre: 'Maíz', icono: '🌽' },
  { id: 'manzana', nombre: 'Manzana', icono: '🍎' },
  { id: 'frijol', nombre: 'Frijol', icono: '🫘' },
  { id: 'avena', nombre: 'Avena', icono: '🌾' },
  { id: 'algodon', nombre: 'Algodón', icono: '☁️' },
  { id: 'otro', nombre: 'Otro', icono: '🌱' },
]

// Se busca por id y también por nombre: las filas que ya están en la base
// guardan el nombre ("Nogal"), no el id.
export function cultivoPorId(valor: string | null | undefined): Cultivo | null {
  if (!valor) return null
  const buscado = valor.trim().toLowerCase()
  return CULTIVOS.find(c => c.id === buscado || c.nombre.toLowerCase() === buscado) ?? null
}

// La etapa nunca se enseña sola: siempre con lo que significa para el riego.
export interface Etapa {
  id: string
  nombre: string
  explicacion: string
}

export const ETAPAS: Etapa[] = [
  { id: 'siembra', nombre: 'Siembra', explicacion: 'apenas va empezando, pide agua seguido y poquita' },
  { id: 'crecimiento', nombre: 'Crecimiento', explicacion: 'está echando hoja, es cuando más crece' },
  { id: 'floracion', nombre: 'Floración', explicacion: 'es cuando más agua pide' },
  { id: 'fruto', nombre: 'Fruto', explicacion: 'está llenando el fruto, no la dejes secar' },
  { id: 'cosecha', nombre: 'Cosecha', explicacion: 'ya mero, se riega menos' },
  { id: 'descanso', nombre: 'Descanso', explicacion: 'no pide casi agua' },
]

export function etapaPorId(valor: string | null | undefined): Etapa | null {
  if (!valor) return null
  const buscado = valor.trim().toLowerCase()
  return ETAPAS.find(e => e.id === buscado || e.nombre.toLowerCase() === buscado) ?? null
}
