'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Gauge, LogOut, RadioTower, Sparkles } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useParcela } from '@/hooks/use-parcela'
import { UmbralCard } from '@/components/riego/umbral-card'
import { SelectorTema } from '@/components/ui/selector-tema'
import { cerrarSesion, leerSesion } from '@/lib/sesion'
import { guardarLlave, leerLlave } from '@/lib/dueno'
import { VincularAparato } from '@/components/ia/vincular-aparato'

export default function PantallaAjustes() {
  const { conectado, humedad, sensorActivo } = useIonDroplet({ conHistorial: false })
  const { umbralRiego, guardando, guardarUmbral } = useParcela()
  // Se lee después de montar: en el servidor no hay localStorage.
  const [correo, setCorreo] = useState<string | null>(null)
  const [llave, setLlave] = useState('')
  const [llaveGuardada, setLlaveGuardada] = useState(false)
  const [avisoLlave, setAvisoLlave] = useState<string | null>(null)
  // #tecnico abre lo del técnico (a eso lleva el aviso de la llave). Se abre
  // tocando el elemento, no con estado de React: así no pelea con el clic.
  const tecnico = useRef<HTMLDetailsElement | null>(null)
  useEffect(() => {
    const abrir = () => {
      if (window.location.hash === '#tecnico' && tecnico.current) {
        tecnico.current.open = true
        tecnico.current.scrollIntoView({ block: 'start' })
      }
    }
    abrir()
    window.addEventListener('hashchange', abrir)
    return () => window.removeEventListener('hashchange', abrir)
  }, [])
  useEffect(() => {
    setCorreo(leerSesion()?.email ?? null)
    setLlaveGuardada(leerLlave() !== null)
  }, [])

  return (
    <main className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-4">
      <h1 className="text-xl font-bold leading-tight">Ajustes</h1>

      {/* Ajustes es del agricultor: aquí va solo lo que él usa. Lo técnico
          (panel de operación, llave de la IA) vive plegado al final. */}
      <section
        className="tarjeta flex flex-col gap-4"
        aria-label="Conexión con la computadora del riego"
      >
        <h2 className="text-base font-semibold">Conexión</h2>

        <div className="flex items-center gap-3" role="status">
          <span
            className="rounded-full"
            style={{
              width: 20,
              height: 20,
              background: conectado ? 'var(--verde)' : 'var(--peligro)',
              flexShrink: 0,
            }}
            aria-hidden
          />
          <p className="text-base font-semibold" style={{ color: conectado ? 'var(--verde)' : 'var(--peligro)' }}>
            {conectado ? 'Conectado a la computadora del riego' : 'Sin conexión con la computadora del riego'}
          </p>
        </div>

      </section>

      <UmbralCard
        umbral={umbralRiego}
        // Una lectura vieja no se presenta como "tu tierra está en…".
        humedad={sensorActivo ? humedad : null}
        guardando={guardando}
        onGuardar={guardarUmbral}
      />

      {/* Los wireframes dicen que a Dispositivos se llega desde aquí, no
          desde la barra de abajo. */}
      <Link
        href="/dispositivos"
        className="fila-enlace"
      >
        <span className="flex items-center gap-3">
          <RadioTower size={18} style={{ color: 'var(--tinta-suave)' }} aria-hidden />
          Aparatos del campo
        </span>
        <ChevronRight size={18} style={{ color: 'var(--tinta-suave)' }} aria-hidden />
      </Link>

      <SelectorTema />

      {/* Sin login no hay cuenta que enseñar; solo aparece si alguien entró. */}
      {correo && (
      <section className="tarjeta flex flex-col gap-3" aria-label="Tu cuenta">
        <h2 className="text-base font-semibold">Tu cuenta</h2>
        {correo && (
          <p className="text-base break-all" style={{ color: 'var(--tinta-suave)' }}>
            {correo}
          </p>
        )}
        <button
          type="button"
          onClick={() => cerrarSesion()}
          className="boton boton-secundario"
          style={{ color: 'var(--peligro)' }}
        >
          <LogOut size={18} aria-hidden />
          Cerrar sesión
        </button>
      </section>
      )}
      {/* Lo del técnico, plegado: al agricultor no le estorba y el jurado o
          quien revise el sistema lo encuentra aquí. #tecnico lo abre. */}
      <details id="tecnico" ref={tecnico} className="tarjeta">
        <summary className="text-base font-semibold cursor-pointer select-none">
          Opciones del técnico
        </summary>
        <div className="flex flex-col gap-4 mt-4">
          <Link href="/operacion" className="fila-enlace">
            <span className="flex items-center gap-3">
              <Gauge size={18} style={{ color: 'var(--agua)' }} aria-hidden />
              <span className="flex flex-col">
                Panel de operación
                <span className="text-sm font-normal texto-suave">
                  Vista técnica, para revisar el sistema a detalle
                </span>
              </span>
            </span>
            <ChevronRight size={18} style={{ color: 'var(--tinta-suave)' }} aria-hidden />
          </Link>

          {/* La llave del asistente. Vive SOLO en este navegador: por eso el
              teléfono de quien viene a ver el sistema no puede gastar créditos. */}
          <section className="flex flex-col gap-3" aria-label="Llave del dueño">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Sparkles size={17} style={{ color: 'var(--verde)' }} aria-hidden />
              Llave del dueño
            </h2>

            <p className="text-base texto-suave">
              El asistente, el análisis y el diagnóstico por foto solo funcionan en los teléfonos o
              computadoras vinculados con la llave del dueño. Así, quien entre a ver el sistema no gasta
              créditos.
            </p>

            {llaveGuardada ? (
              <>
                <p className="text-base font-semibold" style={{ color: 'var(--verde)' }} role="status">
                  Este aparato ya puede usar el asistente.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    guardarLlave('')
                    setLlaveGuardada(false)
                    setLlave('')
                    setAvisoLlave('Llave quitada de este aparato.')
                  }}
                  className="boton boton-secundario"
                >
                  Quitar la llave de este aparato
                </button>
              </>
            ) : (
              <>
                <VincularAparato
                  onVinculado={() => {
                    setLlaveGuardada(true)
                    setAvisoLlave('Vinculado. Ya puedes usar el asistente en este aparato.')
                  }}
                />
                <label htmlFor="llave-dueno" className="text-sm texto-suave mt-2">
                  O, si la tienes a la mano, pega la llave del dueño:
                </label>
                <input
                  id="llave-dueno"
                  type="password"
                  value={llave}
                  onChange={e => setLlave(e.target.value)}
                  autoComplete="off"
                  className="campo"
                  placeholder="Llave del dueño"
                />
                <button
                  type="button"
                  disabled={llave.trim() === ''}
                  onClick={() => {
                    guardarLlave(llave)
                    setLlaveGuardada(true)
                    setAvisoLlave('Guardada. Vuelve a abrir Análisis o el asistente.')
                  }}
                  className="boton boton-secundario"
                >
                  Guardar la llave aquí
                </button>
              </>
            )}

            {avisoLlave && <p className="text-sm texto-suave" role="status">{avisoLlave}</p>}
          </section>

        </div>
      </details>
    </main>
  )
}
