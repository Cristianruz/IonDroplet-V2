'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { colorEstado } from '@/lib/estilo'

// Una lista de renglones que llevan a otra pantalla (o hacen algo), dentro de
// una sola tarjeta. Es la forma de ofrecer "lo que puedes hacer aquí" sin
// llenar la pantalla de cuadros iguales.
//
// Los renglones se separan con una raya recta y metida, aparte del renglón:
// si la raya fuera el borde del renglón (que tiene esquinas redondas para el
// fondo al pasar el dedo), se curvaría en las puntas y parecerían tarjetas
// apiladas dentro de otra tarjeta.

export interface Renglon {
  titulo: string
  detalle?: string
  Icono: LucideIcon
  href?: string
  onClick?: () => void
  /** Un numerito a la derecha (avisos sin ver). */
  contador?: number
  /** Lo que está pasando ahora por este renglón ("Regando"): lo marca y lo dice. */
  enCurso?: string
}

export function ListaEnlaces({ renglones, etiqueta }: { renglones: Renglon[]; etiqueta: string }) {
  return (
    <nav aria-label={etiqueta} className="tarjeta flex flex-col" style={{ padding: 6 }}>
      {renglones.map(({ titulo, detalle, Icono, href, onClick, contador, enCurso }, i) => {
        const contenido = (
          <>
            <span className="icono-redondo">
              <Icono size={20} aria-hidden />
            </span>
            <span className="flex-1 min-w-0 flex flex-col text-left">
              <span className="text-[16px] font-semibold leading-tight">{titulo}</span>
              {detalle && <span className="text-sm texto-apagado">{detalle}</span>}
            </span>
            {enCurso ? (
              <span className="capsula regando" style={colorEstado('var(--agua)')}>
                {enCurso}
              </span>
            ) : contador ? (
              <span
                className="text-xs font-bold flex items-center justify-center"
                style={{ minWidth: 24, height: 24, padding: '0 7px', borderRadius: 999, background: 'var(--alerta)', color: 'var(--sobre-estado)' }}
              >
                {contador > 9 ? '9+' : contador}
              </span>
            ) : null}
            {!enCurso && <ChevronRight size={18} aria-hidden className="texto-apagado" />}
          </>
        )
        const clase = 'lista-renglon flex items-center gap-4 rounded-[14px] px-3 py-3 w-full'
        const estilo = { minHeight: 64 }
        return (
          <Fragment key={titulo}>
            {i > 0 && <span aria-hidden className="lista-raya" />}
            {href ? (
              <Link href={href} className={clase} style={estilo}>{contenido}</Link>
            ) : (
              <button type="button" onClick={onClick} className={clase} style={estilo} data-en-curso={enCurso ? 'si' : undefined}>
                {contenido}
              </button>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
