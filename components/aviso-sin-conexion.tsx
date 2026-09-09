// Un solo lugar para el aviso de que no se encuentra el sistema. Antes estaba
// copiado en cuatro pantallas y se iban despegando entre sí.
export function AvisoSinConexion() {
  return (
    <div
      className="rounded-lg p-4 text-base font-semibold text-white"
      style={{ background: 'var(--peligro)' }}
      role="alert"
    >
      No encuentro el sistema de riego. Revisa que la computadora del riego esté prendida
      (INICIAR_SISTEMA.bat) y vuelve a intentar.
    </div>
  )
}
