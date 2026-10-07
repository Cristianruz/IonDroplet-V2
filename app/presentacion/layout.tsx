import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IonDroplet',
  description: 'La app de riego de IonDroplet en un celular, con escenarios para verla trabajar',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
