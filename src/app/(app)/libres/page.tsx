'use client'

import { useState } from 'react'
import { useBoletas } from '@/hooks/useBoletas'
import { formatNumero, formatCOP, listaNumeros } from '@/lib/formato'
import { RIFA } from '@/config/rifa'
import ComprometerModal from '@/components/ComprometerModal'
import Toast from '@/components/Toast'
import CampoBusqueda from '@/components/CampoBusqueda'

export default function LibresPage() {
  const { boletas, loading, error } = useBoletas()
  const [busqueda, setBusqueda]     = useState('')
  const [abiertas, setAbiertas]     = useState<number[] | null>(null)
  const [modoVarios, setModoVarios] = useState(false)
  const [marcadas, setMarcadas]     = useState<number[]>([])
  const [toast, setToast]           = useState<string | null>(null)

  const libres    = boletas.filter((b) => b.estado === 'libre')
  const filtradas = busqueda
    ? libres.filter((b) => formatNumero(b.numero).includes(busqueda))
    : libres

  // Si buscan un número exacto que ya se vendió, se dice de quién es
  const tomada = busqueda.length === 2
    ? boletas.find((b) => b.numero === Number(busqueda) && b.estado === 'comprometida')
    : undefined

  // Si otra persona compromete una boleta marcada, deja de contar en la selección
  const seleccion = marcadas.filter((n) => libres.some((b) => b.numero === n))

  function tocarBoleta(numero: number) {
    if (!modoVarios) return setAbiertas([numero])
    setMarcadas((prev) =>
      prev.includes(numero) ? prev.filter((n) => n !== numero) : [...prev, numero].sort((a, b) => a - b),
    )
  }

  function salirModoVarios() {
    setModoVarios(false)
    setMarcadas([])
  }

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
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zeus">🎟️ Boletas libres</h1>
          <p className="text-sm text-libre-texto">
            {libres.length === 0
              ? 'Sin boletas disponibles'
              : modoVarios
                ? 'Toca los números que quieres apartar'
                : `${libres.length} disponibles · toca una para comprometer`}
          </p>
        </div>
        {libres.length > 1 && (
          <button
            onClick={() => (modoVarios ? salirModoVarios() : setModoVarios(true))}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold border-2 transition-colors min-h-[44px] ${
              modoVarios ? 'border-zeus bg-zeus text-white' : 'border-borde bg-superficie text-zeus hover:border-rayo'
            }`}
          >
            {modoVarios ? 'Cancelar' : '☑️ Varios'}
          </button>
        )}
      </div>

      <CampoBusqueda
        value={busqueda}
        onChange={(v) => setBusqueda(v.replace(/\D/g, '').slice(0, 2))}
        placeholder="Buscar número (ej. 07)..."
        inputMode="numeric"
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
                {tomada
                  ? `La ${formatNumero(tomada.numero)} ya es de ${tomada.nombre}`
                  : 'No hay boletas libres con ese número'}
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
        <div className={`grid grid-cols-5 md:grid-cols-10 gap-2 ${modoVarios ? 'pb-24' : ''}`}>
          {filtradas.map((b) => {
            const marcada = seleccion.includes(b.numero)
            return (
              <button
                key={b.numero}
                onClick={() => tocarBoleta(b.numero)}
                aria-pressed={modoVarios ? marcada : undefined}
                className={`relative aspect-square flex items-center justify-center rounded-xl border-2 font-bold text-lg tabular-nums active:scale-95 transition-all min-h-[44px] ${
                  marcada
                    ? 'bg-rayo border-rayo text-zeus shadow-md'
                    : 'bg-superficie border-borde text-zeus hover:border-rayo hover:bg-rayo/10'
                }`}
              >
                {formatNumero(b.numero)}
                {marcada && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zeus text-rayo text-[11px] flex items-center justify-center">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Barra de selección múltiple ─────────────────────────── */}
      {modoVarios && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-md z-40 modal-up">
          <div className="bg-zeus text-white rounded-2xl shadow-2xl p-3 pl-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {seleccion.length === 0
                  ? 'Ningún número marcado'
                  : `${seleccion.length} ${seleccion.length === 1 ? 'número' : 'números'} · ${formatCOP(seleccion.length * RIFA.valorBoleta)}`}
              </p>
              {seleccion.length > 0 && (
                <p className="text-sm text-white/60 truncate tabular-nums">{listaNumeros(seleccion)}</p>
              )}
            </div>
            <button
              onClick={() => setAbiertas(seleccion)}
              disabled={seleccion.length === 0}
              className="shrink-0 bg-rayo text-zeus font-bold rounded-xl px-4 py-2.5 active:scale-95 transition-all disabled:opacity-40 min-h-[44px]"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {abiertas !== null && (
        <ComprometerModal
          numeros={abiertas}
          onClose={() => setAbiertas(null)}
          onSuccess={(guardadas) => {
            setAbiertas(null)
            salirModoVarios()
            mostrarToast(
              guardadas.length === 1
                ? `Boleta ${formatNumero(guardadas[0])} comprometida`
                : `Boletas ${listaNumeros(guardadas)} comprometidas`,
            )
          }}
        />
      )}

      <Toast mensaje={toast} />
    </div>
  )
}
