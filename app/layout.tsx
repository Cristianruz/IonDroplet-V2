import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IonDroplet — Riego Inteligente',
  description: 'Sistema de monitoreo y riego agrícola con ionización de agua',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
