'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight, Gauge, LogOut, RadioTower, Sparkles } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useParcela } from '@/hooks/use-parcela'
import { UmbralCard } from '@/components/umbral-card'
import { SelectorTema } from '@/components/selector-tema'
import { API_URL } from '@/lib/api'
import { cerrarSesion, leerSesion } from '@/lib/sesion'
import { guardarLlave, leerLlave } from '@/lib/dueno'

export default function PantallaAjustes() {
  const { conectado, humedad } = useIonDroplet({ conHistorial: false })
  const { umbralRiego, guardando, guardarUmbral } = useParcela()
  // Se lee después de montar: en el servidor no hay localStorage.
  const [correo, setCorreo] = useState<string | null>(null)
  const [llave, setLlave] = useState('')
  const [llaveGuardada, setLlaveGuardada] = useState(false)
  const [avisoLlave, setAvisoLlave] = useState<string | null>(null)
  useEffect(() => {
    setCorreo(leerSesion()?.email ?? null)
    setLlaveGuardada(leerLlave() !== null)
  }, [])

  return (
    <main className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-4">
      <h1 className="text-xl font-bold leading-tight">Ajustes</h1>

      {/* Conexión — solo lectura en esta versión */}
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

        <p
          className="text-base rounded-lg px-3.5 py-2.5 break-all"
          style={{ background: 'var(--pista)', color: 'var(--tinta)' }}
        >
          {API_URL || 'La misma dirección de la app (la reenvía al backend)'}
        </p>
        <p className="text-sm" style={{ color: 'var(--tinta-suave)' }}>
          El backend se cambia con <code>BACKEND_URL</code> al construir la aplicación. Aquí solo se
          muestra.
        </p>
      </section>

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

      {/* La vista técnica vive aparte a propósito: esta pantalla y las demás
          están calibradas para el campo, y el panel de operación es para
          quien tiene que auditar de dónde salió cada número. */}
      <Link
        href="/operacion"
        className="fila-enlace"
      >
        <span className="flex items-center gap-3">
          <Gauge size={18} style={{ color: 'var(--agua)' }} aria-hidden />
          <span className="flex flex-col">
            Panel de operación
            <span className="text-base font-normal" style={{ color: 'var(--tinta-suave)' }}>
              Vista técnica, para revisar el sistema a detalle
            </span>
          </span>
        </span>
        <ChevronRight size={18} style={{ color: 'var(--tinta-suave)' }} aria-hidden />
      </Link>

      <SelectorTema />

      <UmbralCard
        umbral={umbralRiego}
        humedad={humedad}
        guardando={guardando}
        onGuardar={guardarUmbral}
      />

      {/* La llave del asistente. Vive SOLO en este navegador: por eso el
          teléfono de quien viene a ver el sistema no puede gastar créditos. */}
      <section className="tarjeta flex flex-col gap-3" aria-label="Asistente con IA">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Sparkles size={17} style={{ color: 'var(--verde)' }} aria-hidden />
          Asistente con IA
        </h2>

        <p className="text-base texto-suave">
          El asistente y el análisis los usa solo quien tenga la llave del dueño, que está en el
          archivo <code>.env</code> de la computadora del riego. Se pega una vez en cada
          computadora tuya; quien entre a ver el sistema no la tiene y no puede gastar créditos.
        </p>

        {llaveGuardada ? (
          <>
            <p className="text-base font-semibold" style={{ color: 'var(--verde)' }} role="status">
              Esta computadora sí puede usar el asistente.
            </p>
            <button
              type="button"
              onClick={() => {
                guardarLlave('')
                setLlaveGuardada(false)
                setLlave('')
                setAvisoLlave('Llave quitada de este navegador.')
              }}
              className="boton boton-secundario"
            >
              Quitar la llave de esta computadora
            </button>
          </>
        ) : (
          <>
            <label htmlFor="llave-dueno" className="text-base texto-suave">
              Pega aquí la llave (<code>CLAVE_DUENO</code>)
            </label>
            <input
              id="llave-dueno"
              type="password"
              value={llave}
              onChange={e => setLlave(e.target.value)}
              autoComplete="off"
              className="campo"
              placeholder="la llave del .env"
            />
            <button
              type="button"
              disabled={llave.trim() === ''}
              onClick={() => {
                guardarLlave(llave)
                setLlaveGuardada(true)
                setAvisoLlave('Guardada. Vuelve a abrir Análisis o el asistente.')
              }}
              className="boton boton-primario"
            >
              Guardar la llave aquí
            </button>
          </>
        )}

        {avisoLlave && <p className="text-sm texto-suave" role="status">{avisoLlave}</p>}
      </section>

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
    </main>
  )
}
