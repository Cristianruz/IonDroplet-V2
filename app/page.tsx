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
    <main className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4">
      <header className="hero flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Sprout size={32} style={{ color: 'var(--verde)' }} aria-hidden />
          <div>
            <h1 className="text-3xl font-bold leading-tight">IonDroplet</h1>
            <p className="text-lg" style={{ color: 'var(--tinta-suave)' }}>Tu riego, vigilado día y noche</p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 rounded-full px-5 py-2.5 text-lg font-semibold text-white"
          style={{ background: conectado ? 'var(--verde)' : 'var(--peligro)' }}
          role="status"
        >
          {conectado ? <Wifi size={22} aria-hidden /> : <WifiOff size={22} aria-hidden />}
          {conectado ? 'Sistema conectado' : 'Sin conexión'}
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

      <Aparece><Link
        href="/asistente"
        className="rounded-2xl px-6 py-5 text-xl font-bold border-4 flex items-center justify-between"
        style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta)' }}
      >
        <span className="flex items-center gap-3">
          <MessageCircle size={28} style={{ color: 'var(--verde)' }} aria-hidden />
          Preguntarle al asistente
        </span>
        <ChevronRight size={28} style={{ color: 'var(--tinta-suave)' }} aria-hidden />
      </Link></Aparece>
    </main>
  )
}
