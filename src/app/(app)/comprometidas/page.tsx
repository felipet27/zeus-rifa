'use client'

import { useState } from 'react'
import { useBoletas } from '@/hooks/useBoletas'
import { formatNumero, formatCelular } from '@/lib/formato'
import Totales from '@/components/Totales'
import AccionesBoleta from '@/components/AccionesBoleta'

type Filtro = 'todas' | 'pagadas' | 'debe'

const CHIPS: { key: Filtro; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'pagadas', label: 'Pagadas' },
  { key: 'debe', label: 'Debe' },
]

export default function ComprometidasPage() {
  const { boletas, loading, error } = useBoletas()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-40 bg-libre rounded-2xl" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-9 w-24 bg-libre rounded-full" />)}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 bg-libre rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) return <div className="p-4 text-peligro">Error: {error}</div>

  const comprometidas = boletas.filter((b) => b.estado === 'comprometida')

  const filtradas = comprometidas
    .filter((b) => {
      if (filtro === 'pagadas') return b.pagada
      if (filtro === 'debe') return !b.pagada
      return true
    })
    .filter((b) => {
      if (!busqueda) return true
      const q = busqueda.toLowerCase()
      return (
        formatNumero(b.numero).includes(q) ||
        (b.nombre?.toLowerCase().includes(q) ?? false) ||
        (b.celular?.includes(busqueda.replace(/\D/g, '')) ?? false)
      )
    })

  return (
    <div className="p-4">
      <Totales boletas={boletas} />

      {/* Chips */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            onClick={() => setFiltro(c.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
              filtro === c.key
                ? 'bg-zeus text-white'
                : 'bg-superficie border border-borde text-zeus hover:bg-fondo'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <input
        type="text"
        placeholder="Buscar por número, nombre o celular..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full border border-borde rounded-xl px-4 py-3 mb-4 bg-superficie focus:outline-none focus:border-rayo text-zeus transition-colors"
      />

      {/* Lista */}
      {filtradas.length === 0 ? (
        <p className="text-center text-libre-texto py-12">
          {comprometidas.length === 0
            ? 'Aún no hay boletas comprometidas'
            : 'Sin resultados para este filtro'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtradas.map((b) => (
            <div
              key={b.numero}
              className="bg-superficie border border-borde rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl font-bold tabular-nums text-zeus w-10 shrink-0">
                    {formatNumero(b.numero)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-zeus truncate">{b.nombre}</p>
                    <p className="text-sm text-libre-texto">
                      {formatCelular(b.celular!)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                      b.pagada
                        ? 'bg-pagada/10 text-pagada'
                        : 'bg-debe/10 text-debe'
                    }`}
                  >
                    {b.pagada ? 'Pagada' : 'Debe'}
                  </span>
                  {b.notas && (
                    <span className="text-xs text-libre-texto" title={b.notas}>
                      📝
                    </span>
                  )}
                </div>
              </div>
              <AccionesBoleta boleta={b} onMensaje={mostrarToast} />
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-zeus text-white px-5 py-3 rounded-xl shadow-lg text-sm z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
