'use client'

import { useEffect } from 'react'

// Registra el service worker que hace que la app abra sin señal.
//
// Va como componente y no en el layout directamente porque el registro tiene
// que correr en el navegador, después de pintar, y sin bloquear nada.

export function RegistrarSW() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    // Se espera a que la página cargue: registrar antes compite con la
    // descarga de lo que el agricultor está esperando ver.
    const registrar = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Si falla, la app sigue funcionando igual, sólo que sin modo sin
        // señal. No se le enseña un error por algo que no le toca arreglar.
      })
    }

    if (document.readyState === 'complete') registrar()
    else {
      window.addEventListener('load', registrar)
      return () => window.removeEventListener('load', registrar)
    }
  }, [])

  return null
}
