import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IonDroplet · Proyector',
  description: 'La demostración de IonDroplet corriendo sola, para dejarla en el proyector',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
