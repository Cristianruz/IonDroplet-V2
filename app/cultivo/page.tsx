'use client'

import { useState } from 'react'
import { Bug, Camera, FlaskConical, Pencil, Sprout } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { useParcela, type DatosParcela } from '@/hooks/use-parcela'
import { apiFetch } from '@/lib/api'
import { VistaParcela } from '@/components/parcela/3d/vista-parcela'
import { ParcelaForm } from '@/components/parcela/parcela-form'
import { UmbralCard } from '@/components/riego/umbral-card'
import { PropuestaUmbral } from '@/components/riego/propuesta-umbral'
import { ListaEnlaces } from '@/components/ui/lista-enlaces'
import { ConsejoIA } from '@/components/ia/consejo-ia'
import { EsqueletoParcela, EsqueletoHumedad } from '@/components/ui/esqueletos'

export default function PantallaParcela() {
  const { humedad, sensorActivo } = useIonDroplet({ conHistorial: false })
  const { parcela, umbralRiego, cargando, conectado, guardando, guardarParcela, guardarUmbral } = useParcela()
  const [editando, setEditando] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [guardandoNueva, setGuardandoNueva] = useState(false)
  const [avisoNueva, setAvisoNueva] = useState<string | null>(null)

  // Una parcela más en el campo. Va directo al servidor y NO toca el punto de
  // riego: ese número es de la bomba (thresholds.hum_max) y lo manda la
  // parcela que ya existe.
  async function agregarParcela(datos: DatosParcela): Promise<boolean> {
    setGuardandoNueva(true)
    try {
      const res = await apiFetch('/api/parcelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datos, hum_min: umbralRiego ?? datos.hum_min }),
      })
      if (!res.ok) return false
      setAgregando(false)
      setAvisoNueva(`Listo: ${datos.nombre} quedó registrado. Lo ves en "Todos los cultivos".`)
      return true
    } catch {
      return false
    } finally {
      setGuardandoNueva(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4 pb-3 flex flex-col gap-4">
      {(cargando || editando || agregando || parcela === null) && (
        <h1 className="titulo-pantalla">Cultivo</h1>
      )}

      {(cargando || editando || agregando || parcela === null) && <ConsejoIA pantalla="parcela" />}

      {cargando ? (
        <>
          <EsqueletoParcela />
          <EsqueletoHumedad />
        </>
      ) : agregando ? (
        <ParcelaForm
          parcela={null}
          umbralActual={umbralRiego ?? 40}
          guardando={guardandoNueva}
          onGuardar={agregarParcela}
          onCancelar={() => setAgregando(false)}
        />
      ) : editando ? (
        <ParcelaForm
          parcela={parcela}
          umbralActual={umbralRiego ?? 40}
          guardando={guardando}
          onGuardar={async datos => {
            const listo = await guardarParcela(datos)
            if (listo) setEditando(false)
            return listo
          }}
          onCancelar={() => setEditando(false)}
        />
      ) : parcela === null ? (
        // Todavía no hay parcela: tarjeta vacía, no el formulario de golpe.
        <section
          className="tarjeta flex flex-col gap-4 items-center text-center"
          aria-label="Todavía no hay cultivo registrado"
        >
          <Sprout size={28} style={{ color: 'var(--acento)' }} aria-hidden />
          <p className="text-lg font-bold">Aún no hay cultivos registrados</p>
          <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
            Registra la especie, la etapa y la superficie para recibir recomendaciones de riego precisas.
          </p>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="boton boton-primario boton-ancho"
            >
            Registrar un cultivo
          </button>
        </section>
      ) : (
        <>
          <VistaParcela
            parcela={parcela}
            umbral={umbralRiego ?? 40}
            onEditar={() => setEditando(true)}
            onAgregar={() => { setAvisoNueva(null); setAgregando(true) }}
            consejo={<ConsejoIA pantalla="parcela" />}
          >
            {avisoNueva && <p className="aviso aviso-ok" role="status">{avisoNueva}</p>}

            <UmbralCard
              umbral={umbralRiego}
              // Una lectura vieja no se presenta como "tu tierra está en…".
              humedad={sensorActivo ? humedad : null}
              guardando={guardando}
              onGuardar={guardarUmbral}
            >
              <PropuestaUmbral umbralActual={umbralRiego} onAplicado={() => window.location.reload()} />
            </UmbralCard>

            {/* Lo que se puede hacer con este cultivo, en una sola lista. Las
                plagas y los nutrientes dependen del cultivo: por eso se llega
                desde aquí y no desde la barra de abajo. */}
            <ListaEnlaces
              etiqueta="Más sobre este cultivo"
              renglones={[
                { href: '/plagas', titulo: 'Plagas de la temporada', detalle: 'Cuáles vigilar y cómo reconocerlas', Icono: Bug },
                { href: `/diagnostico?parcela=${parcela.id}`, titulo: 'Revisar una planta', detalle: 'Diagnóstico con una foto', Icono: Camera },
                { href: '/fertirriego', titulo: 'Nutrientes aplicados', detalle: 'Registro de fertirriego', Icono: FlaskConical },
                { onClick: () => setEditando(true), titulo: 'Editar datos del cultivo', detalle: 'Nombre, etapa, superficie y caudal', Icono: Pencil },
              ]}
            />
          </VistaParcela>
        </>
      )}
    </main>
  )
}
