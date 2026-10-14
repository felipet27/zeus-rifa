'use client'

import { useState, useDeferredValue } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useBoletas } from '@/hooks/useBoletas'
import { formatNumero, formatCelular, formatCOP } from '@/lib/formato'
import { filtrarBoletas, type FiltroEstado, type Orden } from '@/lib/busqueda'
import { RIFA } from '@/config/rifa'
import AccionesBoleta from '@/components/AccionesBoleta'

const ESTADOS: { key: FiltroEstado; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'libres', label: 'Libres' },
  { key: 'comprometidas', label: 'Comprometidas' },
  { key: 'pagadas', label: 'Pagadas' },
  { key: 'debe', label: 'Debe' },
]

const ORDENES: { key: Orden; label: string }[] = [
  { key: 'numero', label: 'Número ↑' },
  { key: 'nombre', label: 'Nombre A–Z' },
  { key: 'recientes', label: 'Más recientes' },
]

export default function BuscarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { boletas, loading, error } = useBoletas()
  const [toast, setToast] = useState<string | null>(null)

  const q = searchParams.get('q') ?? ''
  const estado = (searchParams.get('estado') ?? 'todas') as FiltroEstado
  const orden = (searchParams.get('orden') ?? 'numero') as Orden

  const debouncedQ = useDeferredValue(q)

  function setParam(key: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (valor && !(key === 'estado' && valor === 'todas') && !(key === 'orden' && valor === 'numero')) {
      params.set(key, valor)
    } else {
      params.delete(key)
    }
    router.replace(`/buscar?${params.toString()}`, { scroll: false })
  }

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const resultados = loading
    ? []
    : filtrarBoletas(boletas, debouncedQ, estado, orden)

  // Resumen por persona: si alguien tiene varias boletas en los resultados
  const resumenPersona = (() => {
    if (!debouncedQ || resultados.length < 2) return null
    const comprometidas = resultados.filter((b) => b.estado === 'comprometida')
    if (comprometidas.length < 2) return null
    // Agrupar por celular
    const grupos = new Map<string, typeof comprometidas>()
    comprometidas.forEach((b) => {
      const k = b.celular ?? ''
      if (!grupos.has(k)) grupos.set(k, [])
      grupos.get(k)!.push(b)
    })
    const multiGroup = [...grupos.values()].filter((g) => g.length > 1)
    if (multiGroup.length === 0) return null
    return multiGroup.map((g) => {
      const debeTotal = g.filter((b) => !b.pagada).length * RIFA.valorBoleta
      return `${g[0].nombre} — ${g.length} boletas${debeTotal > 0 ? ` · debe ${formatCOP(debeTotal)}` : ' · al día'}`
    })
  })()

  const hayFiltros = q || estado !== 'todas' || orden !== 'numero'

  return (
    <div className="p-4">
      {/* Campo de búsqueda */}
      <input
        type="search"
        placeholder="Número, nombre o celular..."
        value={q}
        onChange={(e) => setParam('q', e.target.value)}
        autoFocus
        className="w-full border border-borde rounded-xl px-4 py-3 mb-3 bg-superficie focus:outline-none focus:border-rayo text-zeus transition-colors"
      />

      {/* Chips de estado */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
        {ESTADOS.map((op) => (
          <button
            key={op.key}
            onClick={() => setParam('estado', op.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
              estado === op.key
                ? 'bg-zeus text-white'
                : 'bg-superficie border border-borde text-zeus hover:bg-fondo'
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {/* Chips de orden */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {ORDENES.map((op) => (
          <button
            key={op.key}
            onClick={() => setParam('orden', op.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
              orden === op.key
                ? 'bg-rayo text-zeus'
                : 'bg-superficie border border-borde text-zeus hover:bg-fondo'
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {hayFiltros && (
        <button
          onClick={() => router.replace('/buscar', { scroll: false })}
          className="text-xs text-libre-texto underline mb-3 block"
        >
          Limpiar filtros
        </button>
      )}

      {/* Resumen por persona */}
      {resumenPersona && (
        <div className="bg-buganvilla/10 rounded-xl p-3 mb-3 space-y-1">
          {resumenPersona.map((r, i) => (
            <p key={i} className="text-xs text-buganvilla font-medium">
              {r}
            </p>
          ))}
        </div>
      )}

      {/* Resultados */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-libre rounded-xl" />
          ))}
        </div>
      ) : resultados.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-libre-texto">No hay boletas que coincidan</p>
          {hayFiltros && (
            <button
              onClick={() => router.replace('/buscar', { scroll: false })}
              className="mt-3 text-sm text-rayo font-medium"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-libre-texto mb-3">
            {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2">
            {resultados.map((b) => (
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
                      {b.nombre ? (
                        <>
                          <p className="font-semibold text-zeus truncate">
                            {b.nombre}
                          </p>
                          <p className="text-sm text-libre-texto">
                            {formatCelular(b.celular!)}
                          </p>
                        </>
                      ) : (
                        <p className="text-libre-texto text-sm">Libre</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg ${
                      b.estado === 'libre'
                        ? 'bg-libre text-libre-texto'
                        : b.pagada
                          ? 'bg-pagada/10 text-pagada'
                          : 'bg-debe/10 text-debe'
                    }`}
                  >
                    {b.estado === 'libre' ? 'Libre' : b.pagada ? 'Pagada' : 'Debe'}
                  </span>
                </div>
                {b.notas && (
                  <p className="text-xs text-libre-texto mt-2 ml-13 line-clamp-2">
                    📝 {b.notas}
                  </p>
                )}
                <AccionesBoleta boleta={b} onMensaje={mostrarToast} />
              </div>
            ))}
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-zeus text-white px-5 py-3 rounded-xl shadow-lg text-sm z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
