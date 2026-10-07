import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IonDroplet · Así riega',
  description: 'El recorrido del agua en IonDroplet: del depósito con las varillas de ionización hasta la raíz',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
