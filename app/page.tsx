'use client'

import { useIonDroplet } from '@/hooks/use-iondroplet'
import { HumedadCard } from '@/components/humedad-card'
import { RiegoCard } from '@/components/riego-card'
import { GraficaHumedad } from '@/components/grafica-humedad'
import Link from 'next/link'
import { Sprout, Wifi, WifiOff, MessageCircle, ChevronRight } from 'lucide-react'
import { AvisoSinConexion } from '@/components/aviso-sin-conexion'
import { ClimaCard } from '@/components/clima-card'
import { BalanceCard } from '@/components/balance-card'
import { useParcela } from '@/hooks/use-parcela'
import { Aparece } from '@/components/aparece'
import { ConsejoIA } from '@/components/consejo-ia'
import { EsqueletoHumedad, EsqueletoGrafica } from '@/components/esqueletos'

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

        <span className="flex items-center gap-1.5 text-sm texto-suave" role="status">
          {conectado ? <Wifi size={15} aria-hidden /> : <WifiOff size={15} aria-hidden />}
          <span
            className="punto"
            style={{ background: conectado ? 'var(--verde)' : 'var(--peligro)' }}
            aria-hidden
          />
          {conectado ? 'Conectado' : 'Sin conexión'}
        </span>
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

      <Aparece><Link
        href="/asistente"
        className="rounded-lg px-4 py-3 text-base font-bold border flex items-center justify-between"
        style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta)' }}
      >
        <span className="flex items-center gap-3">
          <MessageCircle size={18} style={{ color: 'var(--verde)' }} aria-hidden />
          Preguntarle al asistente
        </span>
        <ChevronRight size={18} style={{ color: 'var(--tinta-suave)' }} aria-hidden />
      </Link></Aparece>
    </main>
  )
}
