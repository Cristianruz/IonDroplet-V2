'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, RotateCcw } from 'lucide-react'
import { useAsistente, SUGERENCIAS } from '@/hooks/use-asistente'
import { BotonAccionChat, VincularEnChat } from '@/components/ia/acciones-chat'

// El asistente, siempre a la mano.
//
// Antes vivía al fondo de la pantalla de Inicio, así que para preguntarle algo
// había que estar en Inicio y bajar hasta abajo. Ahora es un botón que flota
// sobre cualquier pantalla, como el chat de una aplicación de uso diario: se
// abre encima, se responde y se cierra sin perder dónde estabas.
//
// La pantalla /asistente sigue existiendo: a ella se llega desde Plagas con la
// pregunta ya escrita, y ahí la conversación tiene toda la pantalla.

export function BurbujaAsistente() {
  const ruta = usePathname()
  const [abierto, setAbierto] = useState(false)
  const { burbujas, enviando, aviso, pendiente, preguntar, nuevaConversacion, recargar, marcarAccionHecha } = useAsistente()
  const [texto, setTexto] = useState('')
  const finLista = useRef<HTMLDivElement | null>(null)
  const campo = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (abierto) finLista.current?.scrollIntoView({ behavior: 'smooth' })
  }, [burbujas, enviando, abierto])

  // Al abrir, el cursor ya está en el campo, y la plática se trae de la
  // sesión por si siguió en la pantalla del asistente.
  useEffect(() => {
    if (!abierto) return
    recargar()
    campo.current?.focus()
  }, [abierto, recargar])

  // Cerrar con Escape, que es lo que espera cualquiera que use teclado.
  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierto])

  function enviar() {
    if (texto.trim() === '') return
    preguntar(texto)
    setTexto('')
  }

  // En /asistente la conversación ya tiene toda la pantalla.
  if (ruta?.startsWith('/asistente')) return null

  return (
    <>
      {/* --- El botón --- */}
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Preguntarle al asistente"
          className="fixed z-40 flex items-center justify-center"
          style={{
            // Arriba de la barra de abajo, del lado en que cae el pulgar.
            right: 16,
            bottom: 'calc(76px + env(safe-area-inset-bottom))',
            width: 52,
            height: 52,
            borderRadius: 'var(--radio-pill)',
            background: 'var(--acento)',
            color: 'var(--sobre-estado)',
            boxShadow: 'var(--sombra-elevada)',
          }}
        >
          <MessageCircle size={22} aria-hidden />
        </button>
      )}

      {/* --- El panel --- */}
      {abierto && (
        <>
          {/* Fondo que apaga lo de atrás y cierra al tocarlo. */}
          {/* Por encima de la barra de abajo (z-50): antes la barra tapaba el
              campo para escribir y en el celular no se podía preguntar nada. */}
          <div
            className="fixed inset-0 z-[55] hoja-velo"
            onClick={() => setAbierto(false)}
            aria-hidden
          />

          <section
            role="dialog"
            aria-label="Asistente"
            aria-modal="true"
            className="fixed z-[60] flex flex-col panel-vidrio"
            style={{
              right: 0,
              left: 0,
              bottom: 0,
              maxWidth: 420,
              marginLeft: 'auto',
              marginRight: 'auto',
              // dvh: el alto real que se ve, sin la barra del navegador del celular.
              height: 'min(75dvh, 560px)',
              borderRadius: 'var(--radio) var(--radio) 0 0',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <header
              className="flex items-center justify-between gap-2 px-4 py-3"
              style={{ borderBottom: '1px solid var(--borde)' }}
            >
              <span className="flex flex-col">
                <span className="titulo-bloque">Asistente</span>
                <span className="text-xs texto-apagado">Chat de IonDroplet</span>
              </span>
              <span className="flex items-center gap-1">
              {burbujas.length > 0 && (
                <button
                  type="button"
                  onClick={nuevaConversacion}
                  aria-label="Empezar otra conversación"
                  title="Empezar otra conversación"
                  className="boton boton-sutil"
                  style={{ minHeight: 32, padding: '0 8px' }}
                >
                  <RotateCcw size={16} aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar el asistente"
                className="boton boton-sutil"
                style={{ minHeight: 32, padding: '0 8px' }}
              >
                <X size={16} aria-hidden />
              </button>
              </span>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
              {burbujas.length === 0 && !enviando && (
                <>
                  <p className="text-sm texto-suave">
                    Pregúntame lo que quieras de tu riego, tu cultivo, el clima o las plagas.
                    Contesto con lo que el sistema está midiendo; si me falta un dato, te lo digo.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGERENCIAS.map(s => (
                      <button key={s} type="button" className="pastilla text-left" onClick={() => preguntar(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {burbujas.map(b => (
                <div
                  key={b.id}
                  className="text-sm whitespace-pre-line"
                  style={{
                    alignSelf: b.de === 'agricultor' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radio)',
                    background: b.de === 'agricultor' ? 'var(--acento)' : 'var(--pista)',
                    color: b.de === 'agricultor' ? 'var(--sobre-estado)' : 'var(--tinta)',
                    lineHeight: 1.5,
                  }}
                >
                  {b.texto}
                  {b.accion && (
                    <div className="mt-2">
                      <BotonAccionChat accion={b.accion} hecha={!!b.accionHecha} onHecha={() => marcarAccionHecha(b.id)} />
                    </div>
                  )}
                </div>
              ))}

              {pendiente && !enviando && (
                <VincularEnChat pendiente={pendiente} onVinculado={() => preguntar(pendiente)} />
              )}

              {enviando && (
                <div
                  className="text-sm texto-suave"
                  style={{ alignSelf: 'flex-start', padding: '8px 12px' }}
                  role="status"
                >
                  Pensando…
                </div>
              )}

              {aviso && (
                <p className="aviso aviso-peligro" role="alert">
                  {aviso}
                </p>
              )}

              <div ref={finLista} />
            </div>

            <div className="flex items-center gap-2 px-3 py-3" style={{ borderTop: '1px solid var(--borde)' }}>
              <input
                ref={campo}
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') enviar()
                }}
                placeholder="Escribe tu pregunta"
                aria-label="Tu pregunta"
                className="campo"
                maxLength={1000}
              />
              <button
                type="button"
                onClick={enviar}
                disabled={enviando || texto.trim() === ''}
                aria-label="Enviar"
                className="boton boton-primario"
                style={{ padding: '0 12px', flexShrink: 0 }}
              >
                <Send size={16} aria-hidden />
              </button>
            </div>
          </section>
        </>
      )}
    </>
  )
}
