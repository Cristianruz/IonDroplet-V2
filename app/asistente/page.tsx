'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useAsistente } from '@/hooks/use-asistente'

function Asistente() {
  const { conectado } = useIonDroplet({ conHistorial: false })
  const { burbujas, enviando, aviso, preguntar } = useAsistente()
  const [texto, setTexto] = useState('')
  const finLista = useRef<HTMLDivElement | null>(null)
  const yaPregunto = useRef(false)

  // Se puede llegar desde Plagas con la pregunta ya escrita.
  const parametros = useSearchParams()
  const preguntaInicial = parametros.get('pregunta')

  useEffect(() => {
    if (preguntaInicial && !yaPregunto.current) {
      yaPregunto.current = true
      preguntar(preguntaInicial)
    }
  }, [preguntaInicial, preguntar])

  useEffect(() => {
    finLista.current?.scrollIntoView({ behavior: 'smooth' })
  }, [burbujas, enviando])

  function enviar() {
    preguntar(texto)
    setTexto('')
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-semibold w-fit"
          style={{ color: 'var(--verde)' }}
        >
          <ArrowLeft size={26} aria-hidden />
          Inicio
        </Link>
        <h1 className="text-3xl font-bold leading-tight">Asistente</h1>
        <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
          Ve lo que miden tus aparatos. Pregúntale lo que necesites de tu riego.
        </p>
      </header>

      {!conectado && (
        <div
          className="rounded-2xl p-5 text-xl font-semibold"
          style={{ background: '#fdf3e3', color: 'var(--alerta)' }}
          role="status"
        >
          Sin conexión no puedo responder. <strong>El riego sigue funcionando igual</strong>: esto
          no lo detiene.
        </div>
      )}

      <section className="flex flex-col gap-4" aria-label="Conversación con el asistente">
        {burbujas.length === 0 && !enviando && (
          <div
            className="rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5"
            style={{ background: 'var(--tarjeta)' }}
          >
            <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
              Buenos días. Pregúntame lo que necesites de tu riego — por ejemplo, si conviene regar
              hoy o si aguanta hasta mañana.
            </p>
          </div>
        )}

        {burbujas.map(b => (
          <div
            key={b.id}
            className={b.de === 'agricultor' ? 'flex justify-end' : 'flex justify-start'}
          >
            <p
              className="rounded-3xl px-6 py-4 text-xl max-w-[85%] whitespace-pre-line"
              style={
                b.de === 'agricultor'
                  ? { background: 'var(--verde)', color: 'white' }
                  : { background: 'var(--tarjeta)', color: 'var(--tinta)', border: '1px solid rgba(0,0,0,.06)' }
              }
            >
              {b.texto}
            </p>
          </div>
        ))}

        {enviando && (
          <div className="flex justify-start">
            <p
              className="rounded-3xl px-6 py-4 text-xl"
              style={{ background: 'var(--tarjeta)', color: 'var(--tinta-suave)', border: '1px solid rgba(0,0,0,.06)' }}
              role="status"
            >
              Pensando…
            </p>
          </div>
        )}

        {aviso && (
          <div
            className="rounded-2xl p-5 text-xl font-semibold"
            style={{ background: '#fdf3e3', color: 'var(--alerta)' }}
            role="alert"
          >
            {aviso}
          </div>
        )}

        <div ref={finLista} />
      </section>

      {/* La entrada va fija abajo, encima de la barra de navegación. */}
      <div
        className="fixed left-0 right-0 z-40 px-4 py-3 flex gap-3"
        style={{
          bottom: 'calc(68px + env(safe-area-inset-bottom))',
          background: 'var(--fondo)',
          borderTop: '1px solid #e5e7e2',
        }}
      >
        <label htmlFor="pregunta" className="sr-only">Escribe tu pregunta</label>
        <input
          id="pregunta"
          type="text"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') enviar() }}
          disabled={enviando}
          placeholder="Escribe tu pregunta…"
          maxLength={500}
          className="flex-1 min-w-0 rounded-2xl px-5 py-4 text-xl border-4 outline-none disabled:opacity-60"
          style={{ borderColor: '#d6ddd6', background: 'white', color: 'var(--tinta)' }}
        />
        <button
          type="button"
          onClick={enviar}
          disabled={enviando || texto.trim() === ''}
          className="rounded-2xl flex items-center justify-center text-white disabled:opacity-40"
          style={{ width: 64, height: 60, flexShrink: 0, background: 'var(--verde)' }}
          aria-label="Enviar la pregunta"
        >
          <Send size={28} aria-hidden />
        </button>
      </div>

      {/* Hueco para que la entrada fija no tape la última burbuja */}
      <div style={{ height: 76 }} aria-hidden />
    </main>
  )
}

export default function PantallaAsistente() {
  return (
    <Suspense fallback={null}>
      <Asistente />
    </Suspense>
  )
}
