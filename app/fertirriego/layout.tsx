import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nutrientes aplicados · IonDroplet',
  description: 'Registro de nutrientes aplicados al cultivo, con su etapa y su fecha.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
