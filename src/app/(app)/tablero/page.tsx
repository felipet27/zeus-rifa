'use client'

import { useState, useMemo } from 'react'
import { useBoletas } from '@/hooks/useBoletas'
import { formatNumero, formatCelular, formatCOP } from '@/lib/formato'
import { compartirODescargar } from '@/lib/generarImagen'
import { RIFA } from '@/config/rifa'
import TableroGrid from '@/components/TableroGrid'
import ComprometerModal from '@/components/ComprometerModal'
import AccionesBoleta from '@/components/AccionesBoleta'
import Toast from '@/components/Toast'
import type { Boleta } from '@/types/boleta'

export default function TableroPage() {
  const { boletas, loading, error } = useBoletas()
  const [libreSeleccionada, setLibreSeleccionada]             = useState<number | null>(null)
  const [comprometidaSeleccionada, setComprometidaSeleccionada] = useState<Boleta | null>(null)
  const [generando, setGenerando] = useState(false)
  const [toast, setToast]         = useState<string | null>(null)

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

  const libres       = boletas.filter((b) => b.estado === 'libre').length
  const comprometidas = 100 - libres

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-28 bg-libre rounded-2xl animate-pulse mb-4" />
        <div className="h-10 bg-libre rounded-xl animate-pulse mb-4" />
        <div className="w-full aspect-square bg-libre rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error) return <div className="p-4 text-peligro">Error: {error}</div>

  return (
    <div className="p-4">
      {/* ── Banner del tablero ───────────────────────────────────── */}
      <div className="bg-zeus rounded-2xl px-4 pt-4 pb-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-rayo font-bold text-lg leading-tight">⚡ {RIFA.titulo}</h1>
            <p className="text-white/50 text-xs mt-0.5">
              Premio {formatCOP(RIFA.premio)} · Valor Boleta {formatCOP(RIFA.valorBoleta)} · Viernes 30 oct
            </p>
          </div>
          <div className="text-right">
            <p className="text-white font-black text-2xl tabular-nums leading-none">
              {comprometidas}
              <span className="text-white/30 font-normal text-sm">/100</span>
            </p>
            <p className="text-white/40 text-xs">comprometidas</p>
          </div>
        </div>

        {/* Botón descarga — prominente, ancho completo */}
        <button
          onClick={handleDescargar}
          disabled={generando}
          className="w-full bg-rayo text-zeus font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-60 text-sm"
        >
          {generando ? (
            <><span className="animate-spin text-base">⏳</span> Generando imagen…</>
          ) : (
            <>⬇️ Descargar imagen para compartir</>
          )}
        </button>
      </div>

      {/* ── Tablero rompecabezas ─────────────────────────────────── */}
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

      {/* ── Modal comprometer boleta libre ──────────────────────── */}
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

      {/* ── Sheet de detalle para boleta comprometida ───────────── */}
      {boletaDetalle && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm overlay-in"
          onClick={(e) => e.target === e.currentTarget && setComprometidaSeleccionada(null)}
        >
          <div className="modal-up bg-superficie rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-libre-texto mb-0.5">Boleta</p>
                <p className="text-3xl font-bold tabular-nums text-zeus">
                  {formatNumero(boletaDetalle.numero)}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                  boletaDetalle.pagada
                    ? 'bg-pagada/10 text-pagada'
                    : 'bg-debe/10 text-debe'
                }`}
              >
                {boletaDetalle.pagada ? '✓ Pagada' : 'Debe'}
              </span>
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
                if (msg.includes('liberada')) setComprometidaSeleccionada(null)
              }}
            />

            <button
              onClick={() => setComprometidaSeleccionada(null)}
              className="mt-3 w-full text-center text-xs text-libre-texto py-2 hover:text-zeus transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <Toast mensaje={toast} />
    </div>
  )
}
