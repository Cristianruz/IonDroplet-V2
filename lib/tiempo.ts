// "hace 1 min" — cada dato dice cuándo se midió.
export function haceCuanto(fecha: Date | null): string | null {
  if (fecha === null) return null
  const segundos = Math.floor((Date.now() - fecha.getTime()) / 1000)
  if (segundos < 0) return 'hace un momento'
  if (segundos < 10) return 'hace un momento'
  if (segundos < 60) return `hace ${segundos} segundos`
  const minutos = Math.floor(segundos / 60)
  if (minutos === 1) return 'hace 1 min'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas === 1) return 'hace 1 hora'
  if (horas < 24) return `hace ${horas} horas`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`
}

// "Hoy 7:02" · "Ayer 20:14" · "3 sep 19:10"
export function fechaCorta(fecha: Date): string {
  const hora = fecha.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const dia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const hoy = new Date()
  const diaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const diferencia = Math.round((diaHoy.getTime() - dia.getTime()) / 86400000)

  if (diferencia === 0) return `Hoy ${hora}`
  if (diferencia === 1) return `Ayer ${hora}`
  return `${fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} ${hora}`
}

// Tiempo acumulado para las cifras del historial: "45 min", "2 h 10 min".
export function duracionLarga(segundos: number): string {
  if (segundos <= 0) return '0 min'
  if (segundos < 60) return 'menos de 1 min'
  const minutos = Math.round(segundos / 60)
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}
