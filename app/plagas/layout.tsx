import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Plagas — IonDroplet',
  description: 'A qué plagas estar atento según el cultivo, la humedad y la temporada',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
