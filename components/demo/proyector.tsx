'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  CloudRain,
  Droplets,
  Maximize,
  Pause,
  Play,
  Sprout,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { colorEstado } from '@/lib/estilo'
import { Diorama3D, type AtributosDiorama, type ControlDiorama } from '@/components/parcela/3d/diorama-3d'
import {
  capitulosDelCiclo,
  momento,
  saltarCapitulo,
  textoHora,
  textoHumedad,
  type Momento,
} from '@/lib/demo/guion-proyector'
import { CodigoQR } from './codigo-qr'
import { direccionParaQR, pantallaCompleta, usePantallaSola } from './pantalla-sola'

// La pantalla del proyector: la demostración corriendo sola atrás de quien
// presenta, en bucle y sin que nadie la toque.
//
// A la derecha, el cultivo en 3D regando de verdad en la escena; a la
// izquierda, lo que está pasando contado en grande para leerse desde lejos, la
// humedad con su punto de riego y el código para abrirla en el celular. El
// guion (lib/demo/guion-proyector.ts) decide cada cuadro a partir del segundo.
//
// Teclas: espacio pausa, flechas cambian de capítulo, F pantalla completa.

function estadoDe(m: Momento): { texto: string; color: string; Icono: LucideIcon } {
  if (!m.sensor) return { texto: 'Sin lecturas', color: 'var(--alerta)', Icono: CircleAlert }
  if (m.regando) return { texto: 'Regando', color: 'var(--agua)', Icono: Droplets }
  if (m.lluvia > 0) return { texto: 'Lloviendo', color: 'var(--agua)', Icono: CloudRain }
  return { texto: 'Humedad bien', color: 'var(--ok)', Icono: Sprout }
}

/** Cada cuánto da un pulso el sensor en la escena. */
const CADA_LECTURA_S = 3
/**
 * Cuánto se acerca la cámara mientras riega. El goteo es lo más chiquito de
 * ver desde lejos (una gota por gotero y su mancha), así que se acerca más.
 */
const ACERCAMIENTO_RIEGO: Record<Momento['sistema'], number> = { goteo: 1.5, aspersion: 1.28, gravedad: 1.22 }

export function Proyector() {
  const { segundo, pausado, alternarPausa, controles, mostrarControles, anterior, siguiente } =
    usePantallaSola({ saltar: saltarCapitulo })
  const [direccion, setDireccion] = useState<string | null>(null)
  const escena = useRef<ControlDiorama>(null)
  const marcaLectura = useRef('0')

  useEffect(() => setDireccion(direccionParaQR()), [])

  const m = momento(segundo)
  const estado = estadoDe(m)
  const capitulos = capitulosDelCiclo(m.ciclo)

  // La cámara se mece despacio de un lado a otro y se acerca cuando riega.
  // Se manda la posición completa cada vez (no un giro sobre la anterior):
  // así no se pierde nada cuando la escena se vuelve a armar con otro cultivo.
  useEffect(() => {
    const control = escena.current
    if (!control) return
    const regandoCerca = m.capitulo === 'decide' || m.capitulo === 'riega'
    control.reiniciar()
    control.girar(0.42 * Math.sin((segundo / 46) * Math.PI * 2))
    if (regandoCerca) control.acercar(ACERCAMIENTO_RIEGO[m.sistema])
  })

  if (m.sensor) marcaLectura.current = String(Math.floor(segundo / CADA_LECTURA_S))

  const atributos: AtributosDiorama = {
    cultivo: m.cultivo,
    etapa: m.fase,
    preview: '',
    humedad: m.humedad,
    umbral: m.umbral,
    sistema: m.sistema,
    regando: m.regando,
    // Un solo relé prende la bomba y las varillas del ionizador.
    ionizando: m.regando,
    clima: m.lluvia > 0 ? 'lluvia' : 'soleado',
    codigo: m.codigo,
    lluvia: m.lluvia,
    viento: 9,
    sensorActivo: m.sensor,
    capturada: true,
    superficie: true,
    hileras: null,
    modo: 'parcela',
    vecinas: [],
    lectura: marcaLectura.current,
    hora: m.hora,
  }

  const sitio = direccion ? direccion.replace(/^https?:\/\//, '') : ''

  return (
    <main
      className="proyector"
      data-cursor={controles ? 'si' : 'no'}
      onPointerMove={mostrarControles}
      onPointerDown={mostrarControles}
    >
      <section className="proyector-panel" aria-label="Lo que está pasando">
        <header className="proyector-marca">
          <Logo tamano={48} />
          <span className="proyector-nombre">IonDroplet</span>
        </header>
        <h1 className="proyector-lema">Agua exacta, en el momento exacto.</h1>

        <div className="proyector-relato" key={`${m.inicioCiclo}-${m.capitulo}`}>
          <p className="proyector-cultivo">
            {m.nombreCultivo} con {m.nombreSistema}
          </p>
          <h2 className="proyector-titulo">{m.titulo}</h2>
          {m.respuesta ? (
            <div className="proyector-chat">
              <p className="proyector-globo globo-mio">¿Por qué regó?</p>
              <p className="proyector-globo globo">{m.respuesta}</p>
            </div>
          ) : (
            <p className="proyector-detalle">{m.detalle}</p>
          )}
          <ol className="proyector-pasos" aria-label={`Paso ${m.indice + 1} de ${capitulos.length}`}>
            {capitulos.map((c, i) => (
              <li key={c} data-paso={i < m.indice ? 'hecho' : i === m.indice ? 'ahora' : 'falta'} />
            ))}
          </ol>
        </div>

        <div className="proyector-medidor">
          <div className="proyector-lectura">
            <span className="proyector-cifra">
              {textoHumedad(m.humedad)}
              <small>%</small>
            </span>
            <span className={`capsula${m.regando ? ' regando' : ''}`} style={colorEstado(estado.color)}>
              {estado.texto}
            </span>
          </div>
          <div className="proyector-barra" style={colorEstado(estado.color)} aria-hidden>
            <div className="proyector-barra-relleno" style={{ width: `${m.humedad}%` }} />
            <div className="proyector-barra-punto" style={{ left: `${m.umbral}%` }} />
          </div>
          <p className="proyector-medidor-pie">
            <span>Humedad de la tierra</span>
            <span>Punto de riego: {m.umbral}%</span>
          </p>
        </div>

        <footer className="proyector-qr">
          {direccion && <CodigoQR texto={direccion} tamano={280} />}
          <div className="flex flex-col gap-1 min-w-0">
            <p className="proyector-qr-titulo">Pruébala en tu celular</p>
            <p className="proyector-qr-sitio">{sitio}</p>
            <p className="proyector-qr-nota">Simulación con datos de ejemplo: aquí nada riega de verdad.</p>
          </div>
        </footer>
      </section>

      <section className="proyector-escena-caja" aria-label={`${m.nombreCultivo} en 3D`}>
        {/* Cada cultivo arma su escena desde cero: sin el agua del anterior. */}
        <div className="proyector-escena" key={m.inicioCiclo}>
          <Diorama3D ref={escena} atributos={atributos} />
        </div>

        <div className="proyector-chips">
          <span className="chip-escena proyector-chip" style={{ color: '#13283d' }}>
            <Clock size={18} aria-hidden />
            <span className="tabular-nums">{textoHora(m.hora)}</span>
          </span>
          <span className="chip-escena proyector-chip" style={{ color: '#7a5004' }}>Simulación: el tiempo va acelerado</span>
          {pausado && <span className="chip-escena proyector-chip" style={{ color: '#13283d' }}>En pausa</span>}
        </div>

        {m.regando && (
          <div className="banda-riego proyector-banda" role="status">
            <Droplets aria-hidden />
            Regando solo: bomba e ionizador encendidos
          </div>
        )}
        {!m.regando && m.lluvia > 0 && (
          <div className="banda-riego proyector-banda proyector-banda-lluvia" role="status">
            <CloudRain aria-hidden />
            Lloviendo: la tierra se moja sola y el riego no entra
          </div>
        )}

        {/* Al cerrar cada cultivo, el código en grande para escanearlo desde lejos. */}
        {m.capitulo === 'pruebala' && direccion && (
          <div className="proyector-velo">
            <div className="proyector-tarjeta-qr">
              <CodigoQR texto={direccion} tamano={420} />
              <p className="proyector-tarjeta-qr-titulo">Escanéala y riega tú</p>
              <p className="proyector-qr-sitio">{sitio}</p>
            </div>
          </div>
        )}
        {!m.sensor && (
          <div className="proyector-aviso" role="status">
            <CircleAlert aria-hidden />
            El sensor dejó de reportar. Revisa el cable y la corriente.
          </div>
        )}

        <div className="proyector-controles" data-visible={controles ? 'si' : 'no'}>
          <button type="button" className="proyector-control" onClick={anterior} aria-label="Capítulo anterior">
            <ChevronLeft size={22} aria-hidden />
          </button>
          <button type="button" className="proyector-control" onClick={alternarPausa} aria-label={pausado ? 'Seguir' : 'Pausar'}>
            {pausado ? <Play size={20} aria-hidden /> : <Pause size={20} aria-hidden />}
          </button>
          <button type="button" className="proyector-control" onClick={siguiente} aria-label="Capítulo siguiente">
            <ChevronRight size={22} aria-hidden />
          </button>
          <button type="button" className="proyector-control proyector-control-texto" onClick={pantallaCompleta}>
            <Maximize size={18} aria-hidden />
            Pantalla completa (F)
          </button>
        </div>
      </section>
    </main>
  )
}
