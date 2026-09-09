import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lo que le he puesto — IonDroplet',
  description: 'Registro de nutrientes aplicados a la parcela, con su etapa y su fecha.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
