import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Panel de operación · IonDroplet',
  description: 'Vista técnica: balance hídrico, series de humedad y procedencia de cada dato.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
