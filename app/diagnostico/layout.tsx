import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Diagnóstico por foto · IonDroplet',
  description: 'Qué le pasa a una planta a partir de hasta tres fotos: plagas, enfermedades, nutrientes, clima o agua',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
