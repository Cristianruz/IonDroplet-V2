// La gota de IonDroplet: el agua del riego con el cultivo adentro. La misma
// de app/icon.svg, sin el fondo, para ponerla en la app.

export function Logo({ tamano = 32 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#13283d" />
      <path d="M32 9c0 0 15 16.5 15 26.5a15 15 0 0 1-30 0C17 25.5 32 9 32 9z" fill="#2cb5d6" />
      <path d="M32 46c0-7 4-11.5 10-12.5-.6 6.6-4.6 11.6-10 12.5z" fill="#fff" />
      <path d="M32 46c0-5-3-8.6-7.6-9.4.5 5 3.5 8.6 7.6 9.4z" fill="#fff" opacity=".8" />
      <path d="M24.5 30.5a8.5 8.5 0 0 1 3.2-6" stroke="#bfeaf5" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  )
}
