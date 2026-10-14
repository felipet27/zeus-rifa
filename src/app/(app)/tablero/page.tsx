'use client'

import { useState, useMemo } from 'react'
import { useBoletas } from '@/hooks/useBoletas'
import { formatNumero, formatCelular } from '@/lib/formato'
import { compartirODescargar } from '@/lib/generarImagen'
import TableroGrid from '@/components/TableroGrid'
import ComprometerModal from '@/components/ComprometerModal'
import AccionesBoleta from '@/components/AccionesBoleta'
import type { Boleta } from '@/types/boleta'

export default function TableroPage() {
  const { boletas, loading, error } = useBoletas()
  const [libreSeleccionada, setLibreSeleccionada] = useState<number | null>(null)
  const [comprometidaSeleccionada, setComprometidaSeleccionada] = useState<Boleta | null>(null)
  const [generando, setGenerando] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Sincronizar el detalle con actualizaciones de Realtime
  const boletaDetalle = useMemo(() => {
    if (!comprometidaSeleccionada) return null
    return boletas.find((b) => b.numero === comprometidaSeleccionada.numero) ?? null
  }, [comprometidaSeleccionada, boletas])

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleDescargar() {
    setGenerando(true)
    try {
      await compartirODescargar(boletas)
    } catch (e) {
      mostrarToast('Error al generar la imagen')
      console.error(e)
    } finally {
      setGenerando(false)
    }
  }

  const libres = boletas.filter((b) => b.estado === 'libre').length

  if (loading) {
    return (
      <div className="p-4">
        <div className="w-full aspect-[10/19] bg-libre rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error) return <div className="p-4 text-peligro">Error: {error}</div>

  return (
    <div className="p-4">
      {/* Contador rápido */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-libre-texto">
          <span className="font-bold text-zeus">{100 - libres}</span>/100 comprometidas
          {' · '}
          <span className="font-bold text-zeus">{libres}</span> libres
        </p>
        <button
          onClick={handleDescargar}
          disabled={generando}
          className="flex items-center gap-1.5 bg-rayo text-zeus font-bold text-sm px-4 py-2 rounded-xl hover:brightness-95 transition-all disabled:opacity-60 min-h-[40px]"
        >
          {generando ? (
            <>
              <span className="animate-spin text-base">⏳</span> Generando…
            </>
          ) : (
            <>⬇️ Descargar</>
          )}
        </button>
      </div>

      {/* Tablero */}
      <TableroGrid
        boletas={boletas}
        onLibreClick={(n) => setLibreSeleccionada(n)}
        onComprometidaClick={(b) => setComprometidaSeleccionada(b)}
      />

      {/* Leyenda */}
      <div className="flex items-center gap-4 mt-3 text-xs text-libre-texto">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-pagada inline-block" /> Pagada
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-debe inline-block" /> Debe
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-libre inline-block border border-borde" /> Libre
        </span>
      </div>

      {/* Modal comprometer boleta libre */}
      {libreSeleccionada !== null && (
        <ComprometerModal
          numero={libreSeleccionada}
          onClose={() => setLibreSeleccionada(null)}
          onSuccess={(num) => {
            setLibreSeleccionada(null)
            mostrarToast(`Boleta ${formatNumero(num)} comprometida ✓`)
          }}
        />
      )}

      {/* Sheet de detalle para boleta comprometida */}
      {boletaDetalle && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setComprometidaSeleccionada(null)}
        >
          <div className="bg-superficie rounded-2xl w-full max-w-sm p-6 shadow-xl">
            {/* Encabezado del detalle */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-libre-texto mb-0.5">Boleta</p>
                <p className="text-3xl font-bold tabular-nums text-zeus">
                  {formatNumero(boletaDetalle.numero)}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                    boletaDetalle.pagada
                      ? 'bg-pagada/10 text-pagada'
                      : 'bg-debe/10 text-debe'
                  }`}
                >
                  {boletaDetalle.pagada ? 'Pagada' : 'Debe'}
                </span>
              </div>
            </div>

            <div className="space-y-1 mb-2">
              <p className="font-semibold text-zeus">{boletaDetalle.nombre}</p>
              <p className="text-sm text-libre-texto">
                {formatCelular(boletaDetalle.celular!)}
              </p>
              {boletaDetalle.notas && (
                <p className="text-xs text-libre-texto mt-1">📝 {boletaDetalle.notas}</p>
              )}
            </div>

            <AccionesBoleta
              boleta={boletaDetalle}
              onMensaje={(msg) => {
                mostrarToast(msg)
                // Si la boleta fue liberada, cerrar el sheet
                if (msg.includes('liberada')) setComprometidaSeleccionada(null)
              }}
            />

            <button
              onClick={() => setComprometidaSeleccionada(null)}
              className="mt-3 w-full text-center text-xs text-libre-texto py-2"
            >
              Cerrar
            </button>
          </div>
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
