import type { Metadata } from 'next'
import './globals.css'
import { NavInferior } from '@/components/nav-inferior'

export const metadata: Metadata = {
  title: 'IonDroplet — Riego Inteligente',
  description: 'Sistema de monitoreo y riego agrícola con ionización de agua',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {/* Hueco para que la barra fija de abajo no tape el final de la página */}
        <div style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
        <NavInferior />
      </body>
    </html>
  )
}
