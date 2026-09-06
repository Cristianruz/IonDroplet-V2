import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aparatos — IonDroplet',
  description: 'Cómo va cada aparato del campo y qué hacer si alguno no responde',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
