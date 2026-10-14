'use client'

import { useEffect } from 'react'
import { useViewportVisible } from '@/hooks/useViewportVisible'

type Props = {
  tituloId: string
  onIntentarCerrar: () => void
  children: React.ReactNode
}

// Hoja inferior en celular (modal centrado en escritorio) que se ajusta al espacio
// visible encima del teclado. El contenido decide su propio scroll y pie fijo.
export default function HojaInferior({ tituloId, onIntentarCerrar, children }: Props) {
  const viewport = useViewportVisible()

  useEffect(() => {
    // Evita que la página de fondo se desplace mientras la hoja está abierta
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onIntentarCerrar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onIntentarCerrar])

  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm overlay-in ${
        viewport ? '' : 'h-[100dvh]'
      }`}
      style={viewport ? { top: viewport.top, height: viewport.height } : undefined}
      onClick={(e) => e.target === e.currentTarget && onIntentarCerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="modal-up bg-superficie w-full md:max-w-sm rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[calc(100%-1rem)] md:max-h-full"
      >
        {/* Agarradera de la hoja inferior */}
        <div className="md:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1.5 rounded-full bg-borde" />
        </div>
        {children}
      </div>
    </div>
  )
}

// Botones fijos al pie de la hoja: siempre visibles, aunque el teclado esté abierto
export function PieHoja({ error, children }: { error?: string | null; children: React.ReactNode }) {
  return (
    <div
      className="px-6 pt-3 border-t border-borde bg-superficie md:rounded-b-2xl"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-peligro text-sm rounded-xl p-3 mb-3">
          {error}
        </div>
      )}
      <div className="flex gap-3">{children}</div>
    </div>
  )
}
