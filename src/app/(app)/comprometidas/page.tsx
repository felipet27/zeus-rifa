'use client'

import { useState } from 'react'
import { useBoletas } from '@/hooks/useBoletas'
import { formatNumero, formatCelular, formatCOP } from '@/lib/formato'
import { RIFA } from '@/config/rifa'
import AccionesBoleta from '@/components/AccionesBoleta'
import Toast from '@/components/Toast'

type Filtro = 'todas' | 'pagadas' | 'debe'

const CHIPS: { key: Filtro; label: string }[] = [
  { key: 'todas',   label: 'Todas'   },
  { key: 'pagadas', label: 'Pagadas' },
  { key: 'debe',    label: 'Debe'    },
]

export default function ComprometidasPage() {
  const { boletas, loading, error } = useBoletas()
  const [filtro, setFiltro]     = useState<Filtro>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [toast, setToast]       = useState<string | null>(null)

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-20 bg-libre rounded-2xl" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-9 w-24 bg-libre rounded-full" />)}
        </div>
        <div className="h-11 bg-libre rounded-xl" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-libre rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) return <div className="p-4 text-peligro">Error: {error}</div>

  const comprometidas = boletas.filter((b) => b.estado === 'comprometida')
  const pagadas       = comprometidas.filter((b) =>  b.pagada)
  const debe          = comprometidas.filter((b) => !b.pagada)
  const progreso      = (comprometidas.length / RIFA.totalBoletas) * 100

  const filtradas = comprometidas
    .filter((b) => {
      if (filtro === 'pagadas') return b.pagada
      if (filtro === 'debe')    return !b.pagada
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

      {/* ── Stats compactas ─────────────────────────────────────── */}
      <div className="bg-superficie border border-borde rounded-2xl px-4 pt-3 pb-3 mb-3">
        {/* Barra de progreso */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex-1 h-2.5 bg-libre rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progreso}%`,
                background: 'linear-gradient(to right, #F4B400, #FCD34D)',
                boxShadow: progreso > 0 ? '0 0 6px rgba(244,180,0,0.4)' : 'none',
              }}
            />
          </div>
          <span className="text-xs font-semibold text-zeus tabular-nums w-8 text-right">
            {progreso.toFixed(0)}%
          </span>
        </div>

        {/* Tres stats en una fila */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-xl font-black text-zeus tabular-nums leading-none">
              {comprometidas.length}
              <span className="text-libre-texto font-normal text-xs">/100</span>
            </p>
            <p className="text-xs text-libre-texto mt-0.5">Vendidas</p>
          </div>
          <div className="text-center border-x border-borde">
            <p className="text-xl font-black text-pagada tabular-nums leading-none">
              {pagadas.length}
            </p>
            <p className="text-xs text-pagada/70 mt-0.5">
              Pagadas · {formatCOP(pagadas.length * RIFA.valorBoleta)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-debe tabular-nums leading-none">
              {debe.length}
            </p>
            <p className="text-xs text-debe/70 mt-0.5">
              Deben · {formatCOP(debe.length * RIFA.valorBoleta)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filtros + búsqueda ──────────────────────────────────── */}
      <div className="flex gap-2 mb-2">
        {CHIPS.map((c) => {
          const count =
            c.key === 'todas'   ? comprometidas.length :
            c.key === 'pagadas' ? pagadas.length :
            debe.length

          return (
            <button
              key={c.key}
              onClick={() => setFiltro(c.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium active:scale-95 transition-all min-h-[36px] ${
                filtro === c.key
                  ? 'bg-zeus text-white'
                  : 'bg-superficie border border-borde text-zeus hover:bg-fondo'
              }`}
            >
              {c.label}
              <span
                className={`text-xs rounded-full px-1.5 py-0.5 font-bold tabular-nums ${
                  filtro === c.key
                    ? 'bg-white/20 text-white'
                    : 'bg-libre text-libre-texto'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <input
        type="text"
        placeholder="Buscar por número, nombre o celular..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full border border-borde rounded-xl px-4 py-3 mb-3 bg-superficie focus:outline-none focus:border-rayo text-zeus transition-colors"
      />

      {/* ── Lista ───────────────────────────────────────────────── */}
      {filtradas.length === 0 ? (
        <div className="text-center py-14">
          {comprometidas.length === 0 ? (
            <>
              <span className="text-6xl block mb-3">🎟️</span>
              <p className="font-semibold text-zeus">Aún no hay boletas comprometidas</p>
              <p className="text-libre-texto text-sm mt-1">
                Las boletas que se vendan aparecerán aquí
              </p>
            </>
          ) : (
            <>
              <span className="text-5xl block mb-3">🔍</span>
              <p className="font-semibold text-zeus">Sin resultados</p>
              <p className="text-libre-texto text-sm mt-1">
                Intenta con otro filtro o búsqueda
              </p>
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="mt-4 text-sm text-rayo font-medium"
                >
                  Limpiar búsqueda
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((b) => (
            <div
              key={b.numero}
              className={`bg-superficie border border-borde rounded-xl p-4 border-l-4 ${
                b.pagada ? 'border-l-pagada' : 'border-l-debe'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl font-bold tabular-nums text-zeus w-10 shrink-0">
                    {formatNumero(b.numero)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-zeus truncate">{b.nombre}</p>
                    <p className="text-sm text-libre-texto">{formatCelular(b.celular!)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                      b.pagada
                        ? 'bg-pagada/10 text-pagada'
                        : 'bg-debe/10 text-debe'
                    }`}
                  >
                    {b.pagada ? '✓ Pagada' : 'Debe'}
                  </span>
                  <div className="flex items-center gap-1">
                    {b.notas && (
                      <span className="text-xs text-libre-texto" title={b.notas}>📝</span>
                    )}
                    {b.responsable && (
                      <span
                        title={`Registrada por ${b.responsable}`}
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          b.responsable === 'Felipe'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {b.responsable}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <AccionesBoleta boleta={b} onMensaje={mostrarToast} />
            </div>
          ))}
        </div>
      )}

      <Toast mensaje={toast} />
    </div>
  )
}
