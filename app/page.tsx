'use client'

import { useIonDroplet } from '@/hooks/use-iondroplet'
import { HumedadCard } from '@/components/humedad-card'
import { RiegoCard } from '@/components/riego-card'
import { GraficaHumedad } from '@/components/grafica-humedad'
import Link from 'next/link'
import { Sprout, Wifi, WifiOff, Bell } from 'lucide-react'
import { AvisoSinConexion } from '@/components/aviso-sin-conexion'
import { ClimaCard } from '@/components/clima-card'
import { BalanceCard } from '@/components/balance-card'
import { useParcela } from '@/hooks/use-parcela'
import { Aparece } from '@/components/aparece'
import { ConsejoIA } from '@/components/consejo-ia'
import { EsqueletoHumedad, EsqueletoGrafica } from '@/components/esqueletos'
import { useResumenAlertas } from '@/hooks/use-alertas'

export default function Dashboard() {
  const { parcela, umbralRiego, cargando } = useParcela()
  const {
    humedad,
    conectado,
    sensorActivo,
    ultimaLectura,
    estadoEsp,
    historial,
    regarAhora,
    terminarRiegoManual,
  } = useIonDroplet()
  const { resumen } = useResumenAlertas()
  const sinVer = resumen?.sinVer ?? 0
  const hayCriticas = (resumen?.porSeveridad.critica ?? 0) > 0

  return (
    <main className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-4">
      {/* Barra superior. El estado del sistema va como un punto y una
          palabra, no como un bloque de color: cuando todo está bien no
          tiene por qué llamar la atención. */}
      <header className="hero flex items-center justify-between gap-3 py-1">
        <div className="flex items-center gap-2">
          <Sprout size={20} style={{ color: 'var(--verde)' }} aria-hidden />
          <h1 className="titulo-pantalla">IonDroplet</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm texto-suave" role="status">
            {conectado ? <Wifi size={15} aria-hidden /> : <WifiOff size={15} aria-hidden />}
            <span
              className="punto"
              style={{ background: conectado ? 'var(--verde)' : 'var(--peligro)' }}
              aria-hidden
            />
            <span className="hidden sm:inline">{conectado ? 'Conectado' : 'Sin conexión'}</span>
          </span>

          {/* La campanita. Sólo lleva número cuando de verdad hay algo:
              un contador en cero que siempre está ahí deja de mirarse. */}
          <Link
            href="/alertas"
            aria-label={
              sinVer > 0 ? `Avisos, ${sinVer} sin ver` : 'Avisos'
            }
            className="relative flex items-center justify-center"
            style={{ width: 34, height: 34, color: 'var(--tinta-suave)' }}
          >
            <Bell size={19} aria-hidden />
            {sinVer > 0 && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 1,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 'var(--radio-pill)',
                  background: hayCriticas ? 'var(--peligro)' : 'var(--alerta)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: '16px',
                  textAlign: 'center',
                }}
              >
                {sinVer > 9 ? '9+' : sinVer}
              </span>
            )}
          </Link>
        </div>
      </header>

      {!conectado && <AvisoSinConexion />}

      <ConsejoIA pantalla="inicio" destacado />

      {cargando && humedad === null ? (
        <div className="grid md:grid-cols-2 gap-4">
          <EsqueletoHumedad />
          <EsqueletoHumedad />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <Aparece><HumedadCard humedad={humedad} sensorActivo={sensorActivo} ultimaLectura={ultimaLectura} /></Aparece>
          <Aparece retraso={80}><RiegoCard estadoEsp={estadoEsp} humedad={humedad} sensorActivo={sensorActivo} umbral={umbralRiego} regarAhora={regarAhora} terminarRiegoManual={terminarRiegoManual} /></Aparece>
        </div>
      )}

      <Aparece><ClimaCard parcelaId={parcela?.id ?? null} /></Aparece>

      <Aparece><BalanceCard /></Aparece>

      {cargando && historial.length === 0 ? (
        <EsqueletoGrafica />
      ) : (
        <Aparece><GraficaHumedad historial={historial} /></Aparece>
      )}

    </main>
  )
}
