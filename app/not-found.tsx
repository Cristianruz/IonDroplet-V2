import Link from 'next/link'
import { Sprout } from 'lucide-react'

// Una dirección que no existe: la de Next viene en inglés.
export default function NoEncontrada() {
  return (
    <main className="max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
      <Sprout size={36} style={{ color: 'var(--verde)' }} aria-hidden />
      <h1 className="titulo-pantalla">Esta pantalla no existe</h1>
      <p className="text-base texto-suave">
        Puede que el enlace esté mal escrito o que la pantalla haya cambiado de lugar.
      </p>
      <Link href="/" className="boton boton-primario">
        Ir al inicio
      </Link>
    </main>
  )
}
