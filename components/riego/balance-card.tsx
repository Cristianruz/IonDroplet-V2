'use client'

import { CloudRain, Droplets, Info } from 'lucide-react'
import { useBalance } from '@/hooks/use-balance'

// Cuánta agua va a pedir el cultivo esta semana. En Modo Campo se dice en
// palabras, sin la palabra "evapotranspiración" ni "coeficiente".
//
// LO QUE NO SE DICE AQUÍ: cuántos litros le tocan a ESTA parcela. Para eso
// harían falta el caudal de la bomba y la superficie, y ninguno está
// capturado. En vez de estimarlos, se dice que faltan.

const DIA_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

function nombreDia(fecha: string, indice: number): string {
  if (indice === 0) return 'Hoy'
  if (indice === 1) return 'Mañana'
  // La fecha viene como YYYY-MM-DD. Se parte a mano para que el navegador no
  // la corra un día por zona horaria.
  const [a, m, d] = fecha.split('-').map(Number)
  return DIA_CORTO[new Date(a, m - 1, d).getDay()]
}

export function BalanceCard() {
  const { balance, estado } = useBalance(7)

  if (estado === 'cargando') {
    return (
      <div
        className="tarjeta flex flex-col gap-3"
      >
        <div className="esqueleto" style={{ width: '55%', height: 22 }} aria-hidden />
        <div className="esqueleto" style={{ width: '100%', height: 64 }} aria-hidden />
      </div>
    )
  }

  // Sin ubicación o sin conexión al clima, la pantalla no enseña un hueco:
  // simplemente no aparece. La tarjeta del clima ya pide la ubicación.
  if (estado !== 'listo' || !balance) return null

  const { totales, dias, faltantes } = balance
  const sinCultivo = totales.deficit_mm === null

  const faltaEtapa = faltantes.some(f => f.dato === 'etapa')
  const maximo = Math.max(...dias.map(d => Math.max(d.etc_mm ?? 0, d.lluvia_mm)), 1)

  return (
    <section
      className="tarjeta flex flex-col gap-4"
      aria-label="Agua que va a pedir el cultivo"
    >
      <div className="flex items-center gap-2">
        <Droplets size={16} style={{ color: 'var(--agua)' }} aria-hidden />
        <h2 className="text-[14.5px] font-bold">Lo que va a pedir esta semana</h2>
      </div>

      {sinCultivo ? (
        <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
          Falta registrar la especie, así que no se puede calcular cuánta agua requiere.
          Captúrala en la pantalla Cultivo.
        </p>
      ) : (
        <>
          {/* Redondeado a propósito: los dos decimales son precisión de
              ingeniero y aquí estorban. El detalle exacto está en el panel
              de operación. */}
          <p className="text-base leading-snug">
            Tu cultivo va a pedir{' '}
            <strong style={{ color: 'var(--agua)' }}>{Math.round(totales.etc_mm!)} mm</strong> en
            los próximos 7 días.{' '}
            {totales.lluvia_mm >= 1 ? (
              <>Se esperan <strong>{Math.round(totales.lluvia_mm)} mm</strong> de lluvia.</>
            ) : (
              <>No se espera lluvia que ayude.</>
            )}
          </p>

          <div
            className="flex items-baseline gap-2 flex-wrap"
            style={{
              padding: '11px 14px',
              borderRadius: 'var(--radio-sm)',
              background: 'var(--fondo-alerta)',
              border: '1px solid color-mix(in srgb, var(--alerta) 22%, transparent)',
            }}
          >
            <span className="text-[13.5px] texto-suave">
              Le vas a tener que reponer
            </span>
            <strong style={{ fontSize: 20, color: 'var(--alerta-texto)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(totales.deficit_mm!)} mm
            </strong>
          </div>

          {/* Conversión de unidades, no una estimación: 1 mm sobre 1 hectárea
              son 10,000 litros. Se dice "por hectárea" porque no sabemos la
              superficie de esta parcela. */}
          {totales.deficit_litros_por_ha !== null && (
            <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
              Son{' '}
              <strong style={{ color: 'var(--tinta)' }}>
                {totales.deficit_litros_por_ha.toLocaleString('es-MX')} litros
              </strong>{' '}
              por cada hectárea.
            </p>
          )}

          {/* Barras por día: agua que pide contra agua que cae. Sin librería. */}
          <div className="flex items-end gap-1.5" style={{ height: 92 }} aria-hidden>
            {dias.map((d, i) => (
              <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-0.5" style={{ height: 64 }}>
                  <div
                    style={{
                      width: '42%',
                      height: `${((d.etc_mm ?? 0) / maximo) * 100}%`,
                      background: 'var(--agua)',
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                  <div
                    style={{
                      width: '42%',
                      height: `${(d.lluvia_mm / maximo) * 100}%`,
                      minHeight: d.lluvia_mm > 0 ? 3 : 0,
                      background: 'var(--acento)',
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                </div>
                <span className="text-xs" style={{ color: 'var(--tinta-suave)' }}>
                  {nombreDia(d.fecha, i)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--tinta-suave)' }}>
            <span className="flex items-center gap-1.5">
              <span style={{ width: 12, height: 12, background: 'var(--agua)', borderRadius: 3 }} />
              Lo que pide
            </span>
            <span className="flex items-center gap-1.5">
              <span style={{ width: 12, height: 12, background: 'var(--acento)', borderRadius: 3 }} />
              Lluvia esperada
            </span>
          </div>
        </>
      )}

      {faltaEtapa && (
        <p
          className="text-sm flex items-start gap-2 pt-1"
          style={{ color: 'var(--tinta-suave)', borderTop: '1px solid var(--borde)', paddingTop: 11 }}
        >
          <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
          No me has dicho en qué etapa va el cultivo, así que usé la de en medio. Si me la pones,
          el número se afina.
        </p>
      )}

      {/* Honestidad de la que no se negocia: los minutos de riego SÍ se
          midieron, los litros NO se pueden saber. Se dicen las dos cosas. */}
      {balance.riego.eventos > 0 && (
        <p
          className="text-sm flex items-start gap-2 pt-1"
          style={{ color: 'var(--tinta-suave)', borderTop: '1px solid var(--borde)', paddingTop: 11 }}
        >
          <CloudRain size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
          Estos días regaste {balance.riego.minutos} minutos en {balance.riego.eventos}{' '}
          {balance.riego.eventos === 1 ? 'vez' : 'veces'}. Cuántos litros fueron no lo sé todavía:
          falta medir cuánta agua echa tu bomba por minuto.
        </p>
      )}
    </section>
  )
}
