'use client'

import { useState } from 'react'
import { useBoletas } from '@/hooks/useBoletas'
import { formatNumero } from '@/lib/formato'
import ComprometerModal from '@/components/ComprometerModal'
import Toast from '@/components/Toast'

export default function LibresPage() {
  const { boletas, loading, error } = useBoletas()
  const [busqueda, setBusqueda]     = useState('')
  const [seleccionada, setSeleccionada] = useState<number | null>(null)
  const [toast, setToast]           = useState<string | null>(null)

  const libres    = boletas.filter((b) => b.estado === 'libre')
  const filtradas = busqueda
    ? libres.filter((b) => formatNumero(b.numero).includes(busqueda))
    : libres

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-12 bg-libre rounded-xl w-56 mb-4 animate-pulse" />
        <div className="h-12 bg-libre rounded-xl mb-4 animate-pulse" />
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-libre animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="p-4 text-peligro">Error al cargar las boletas: {error}</div>
  }

  return (
    <div className="p-4">
      {/* ── Encabezado de página ────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-zeus">🎟️ Boletas libres</h1>
          <p className="text-sm text-libre-texto">
            {libres.length > 0
              ? `${libres.length} disponibles · toca una para comprometer`
              : 'Sin boletas disponibles'}
          </p>
        </div>
      </div>

      <input
        type="text"
        inputMode="numeric"
        placeholder="Buscar número (ej. 07)..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value.replace(/\D/g, '').slice(0, 2))}
        className="w-full border border-borde rounded-xl px-4 py-3 mb-4 bg-superficie focus:outline-none focus:border-rayo text-zeus transition-colors"
      />

      {filtradas.length === 0 ? (
        <div className="text-center py-16">
          {libres.length === 0 ? (
            <>
              <span className="text-6xl block mb-3">🎉</span>
              <p className="text-xl font-bold text-zeus">¡Todo vendido!</p>
              <p className="text-libre-texto text-sm mt-1">
                Todas las boletas están comprometidas
              </p>
            </>
          ) : (
            <>
              <span className="text-5xl block mb-3">🔍</span>
              <p className="font-semibold text-zeus">Sin resultados</p>
              <p className="text-libre-texto text-sm mt-1">
                No hay boletas libres con ese número
              </p>
              <button
                onClick={() => setBusqueda('')}
                className="mt-4 text-sm text-rayo font-medium"
              >
                Limpiar búsqueda
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {filtradas.map((b) => (
            <button
              key={b.numero}
              onClick={() => setSeleccionada(b.numero)}
              className="aspect-square flex items-center justify-center rounded-xl bg-superficie border border-borde text-zeus font-bold text-lg tabular-nums hover:border-rayo hover:bg-rayo/10 active:scale-95 transition-all min-h-[44px]"
            >
              {formatNumero(b.numero)}
            </button>
          ))}
        </div>
      )}

      {seleccionada !== null && (
        <ComprometerModal
          numero={seleccionada}
          onClose={() => setSeleccionada(null)}
          onSuccess={(num) => {
            setSeleccionada(null)
            mostrarToast(`Boleta ${formatNumero(num)} comprometida ✓`)
          }}
        />
      )}

      <Toast mensaje={toast} />
    </div>
  )
}
