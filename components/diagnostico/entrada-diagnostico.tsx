import Link from 'next/link'
import { Camera, ChevronRight } from 'lucide-react'

// La puerta al diagnóstico por foto desde otras pantallas.
export function EntradaDiagnostico({ parcelaId }: { parcelaId?: number | null }) {
  return (
    <Link
      href={parcelaId ? `/diagnostico?parcela=${parcelaId}` : '/diagnostico'}
      className="tarjeta flex items-center gap-4"
      aria-label="Diagnóstico por foto"
    >
      <span
        className="flex items-center justify-center shrink-0"
        style={{ width: 48, height: 48, borderRadius: 'var(--radio-sm)', background: 'var(--acento-suave)', color: 'var(--acento)' }}
        aria-hidden
      >
        <Camera size={24} />
      </span>
      <span className="flex-1">
        <span className="block text-base font-bold">¿Ves algo raro en una planta?</span>
        <span className="block text-sm texto-suave">
          Tómale hasta 3 fotos y te digo qué puede ser, qué lo apoya y cómo confirmarlo.
        </span>
      </span>
      <ChevronRight size={20} aria-hidden className="texto-apagado" />
    </Link>
  )
}
