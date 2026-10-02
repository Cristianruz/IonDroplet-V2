'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, ChevronDown, CircleHelp } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useParcela } from '@/hooks/use-parcela'
import { useResumenAlertas } from '@/hooks/use-alertas'
import { TarjetaHoy } from '@/components/inicio/tarjeta-hoy'
import { ResumenSemana } from '@/components/inicio/resumen-semana'
import { Accesos } from '@/components/inicio/accesos'
import { ClimaCard } from '@/components/parcela/clima-card'
import { BalanceCard } from '@/components/riego/balance-card'
import { GraficaHumedad } from '@/components/riego/grafica-humedad'
import { Logo } from '@/components/ui/logo'
import { EVENTO_ABRIR_GUIA } from '@/components/ui/guia-inicio'
import { EsqueletoHumedad } from '@/components/ui/esqueletos'

// Inicio, de arriba abajo, en el orden en que el agricultor se pregunta las
// cosas: ¿cómo está mi cultivo?, ¿qué tiempo viene?, ¿qué más puedo hacer?
// Lo detallado (pronóstico de 7 días, cuentas del agua, gráfica de 24 h)
// queda guardado en "Ver más detalles": está, pero no estorba.

function saludo(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function Inicio() {
  const { parcela, umbralRiego, cargando } = useParcela()
  const {
    humedad, conectado, sensorActivo, ultimaLectura, estadoEsp, historial,
    regarAhora, terminarRiegoManual, volverAAutomatico, cambiarModo,
  } = useIonDroplet()
  const { resumen } = useResumenAlertas()
  const sinVer = resumen?.sinVer ?? 0
  const [detalles, setDetalles] = useState(false)

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4 pb-3 flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo tamano={40} />
          <div>
            <p className="text-sm texto-suave leading-tight" suppressHydrationWarning>{saludo()}</p>
            <h1 className="text-xl font-bold leading-tight" style={{ letterSpacing: '-.02em' }}>IonDroplet</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_GUIA))}
            className="boton boton-sutil flex items-center justify-center"
            style={{ width: 44, height: 44, minHeight: 44, padding: 0, borderRadius: 999 }}
            aria-label="Ver la guía rápida"
          >
            <CircleHelp size={23} aria-hidden />
          </button>
          <Link
            href="/alertas"
            aria-label={sinVer > 0 ? `Avisos, ${sinVer} sin ver` : 'Avisos'}
            className="boton boton-sutil relative flex items-center justify-center"
            style={{ width: 44, height: 44, minHeight: 44, padding: 0, borderRadius: 999 }}
          >
            <Bell size={23} aria-hidden />
            {sinVer > 0 && (
              <span
                aria-hidden
                className="absolute"
                style={{ top: 9, right: 10, width: 10, height: 10, borderRadius: 999, background: 'var(--alerta)', border: '2px solid var(--fondo)' }}
              />
            )}
          </Link>
        </div>
      </header>

      {cargando && humedad === null ? (
        <EsqueletoHumedad />
      ) : (
        <TarjetaHoy
            parcela={parcela}
            humedad={humedad}
            sensorActivo={sensorActivo}
            ultimaLectura={ultimaLectura}
            umbral={umbralRiego ?? 40}
            estadoEsp={estadoEsp}
            regarAhora={regarAhora}
            terminarRiegoManual={terminarRiegoManual}
            volverAAutomatico={volverAAutomatico}
            activarAutomatico={() => cambiarModo(true)}
          />
      )}

      {/* El clima sale del sistema; sin él quedaría un error que no ayuda. */}
      {conectado && <ResumenSemana parcelaId={parcela?.id ?? null} />}

      <Accesos avisosSinVer={sinVer} />

      {conectado && (
        <>
          <button
            type="button"
            onClick={() => setDetalles(d => !d)}
            aria-expanded={detalles}
            className="boton boton-sutil self-center"
          >
            {detalles ? 'Ocultar detalles' : 'Ver más detalles'}
            <ChevronDown size={18} aria-hidden style={{ transform: detalles ? 'rotate(180deg)' : 'none', transition: 'transform var(--normal) var(--curva)' }} />
          </button>
          {detalles && (
            <div className="flex flex-col gap-4">
              <GraficaHumedad historial={historial} />
              <ClimaCard parcelaId={parcela?.id ?? null} />
              <BalanceCard />
            </div>
          )}
        </>
      )}
    </main>
  )
}
