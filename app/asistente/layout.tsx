import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Asistente — IonDroplet',
  description: 'Pregúntale al asistente sobre tu riego, con los datos que miden tus aparatos',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
