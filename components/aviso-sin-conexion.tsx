// Un solo lugar para el aviso de que no se encuentra el sistema. Antes estaba
// copiado en cuatro pantallas y se iban despegando entre sí.
export function AvisoSinConexion() {
  return (
    <div
      className="sobre-estado"
      style={{
        background: 'var(--peligro)',
        borderRadius: 16,
        padding: 15,
        fontSize: '14.5px',
        fontWeight: 700,
        lineHeight: 1.5,
        boxShadow: 'var(--brillo-capsula), 0 6px 18px color-mix(in srgb, var(--peligro) 28%, transparent)',
      }}
      role="alert"
    >
      No encuentro el sistema de riego. Revisa que la computadora del riego esté prendida
      (INICIAR_SISTEMA.bat) y vuelve a intentar.
    </div>
  )
}
