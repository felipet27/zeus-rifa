'use client'

import { useState } from 'react'
import { useBoletas } from '@/hooks/useBoletas'
import { formatNumero } from '@/lib/formato'
import ComprometerModal from '@/components/ComprometerModal'

export default function LibresPage() {
  const { boletas, loading, error } = useBoletas()
  const [busqueda, setBusqueda] = useState('')
  const [seleccionada, setSeleccionada] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const libres = boletas.filter((b) => b.estado === 'libre')
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
        <div className="h-8 bg-libre rounded-xl w-48 mb-4 animate-pulse" />
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-libre animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-peligro">
        Error al cargar las boletas: {error}
      </div>
    )
  }

  return (
    <div className="p-4">
      <p className="text-2xl font-bold text-zeus mb-4">
        {libres.length} boletas libres
      </p>

      <input
        type="text"
        inputMode="numeric"
        placeholder="Buscar número (ej. 07)..."
        value={busqueda}
        onChange={(e) =>
          setBusqueda(e.target.value.replace(/\D/g, '').slice(0, 2))
        }
        className="w-full border border-borde rounded-xl px-4 py-3 mb-4 bg-superficie focus:outline-none focus:border-rayo text-zeus transition-colors"
      />

      {filtradas.length === 0 ? (
        <p className="text-center text-libre-texto py-12">
          {busqueda
            ? 'No hay boletas libres con ese número'
            : '¡Todas las boletas están comprometidas! 🎉'}
        </p>
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

      {toast && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-zeus text-white px-5 py-3 rounded-xl shadow-lg text-sm z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
