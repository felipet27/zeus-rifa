'use client'

type Props = {
  mensaje: string | null
}

export default function Toast({ mensaje }: Props) {
  if (!mensaje) return null

  const esError = /error/i.test(mensaje)

  return (
    <div className="fixed bottom-24 md:bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div
        className={`toast-up pointer-events-auto flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-xl text-sm whitespace-nowrap ${
          esError
            ? 'bg-peligro text-white'
            : 'bg-zeus text-white'
        }`}
      >
        <span className="text-base leading-none">{esError ? '❌' : '✅'}</span>
        <span>{mensaje}</span>
      </div>
    </div>
  )
}
