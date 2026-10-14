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
    <div className="px-4 py-3 md:py-4 flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100dvh-4rem)]">
      {/* ── Encabezado compacto: título, avance y descarga en una fila ── */}
      <div className="bg-zeus rounded-2xl pl-3.5 pr-2 py-2 mb-2 flex items-center gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-rayo font-bold text-base leading-tight truncate">⚡ {RIFA.titulo}</h1>
          <p className="text-white/50 text-[11px] leading-snug truncate">
            Premio {formatCOP(RIFA.premio)} · Boleta {formatCOP(RIFA.valorBoleta)} · 30 oct
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-black text-xl tabular-nums leading-none">
            {comprometidas}
            <span className="text-white/30 font-normal text-xs">/100</span>
          </p>
          <p className="text-white/40 text-[10px]">vendidas</p>
        </div>
        <button
          onClick={handleDescargar}
          disabled={generando}
          aria-label="Descargar imagen para compartir"
          className="shrink-0 bg-rayo text-zeus font-bold h-11 px-3 rounded-xl flex items-center gap-1.5 hover:brightness-95 active:scale-95 transition-all disabled:opacity-60 text-sm"
        >
          {generando ? <span className="animate-spin">⏳</span> : <>⬇️ <span className="hidden sm:inline">Descargar</span><span className="sm:hidden">Imagen</span></>}
        </button>
      </div>

      {/* ── Tablero rompecabezas: ocupa el alto restante sin scroll ── */}
      <TableroGrid
        boletas={boletas}
        onLibreClick={(n) => setLibreSeleccionada(n)}
        onComprometidaClick={(b) => setComprometidaSeleccionada(b)}
        ajustarAlto
      />

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-libre-texto shrink-0">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-pagada inline-block" /> Pagada
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-debe inline-block" /> Debe
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-libre inline-block border border-borde" /> Libre
        </span>
      </div>

      {/* ── Modal comprometer boleta libre ──────────────────────── */}
      {libreSeleccionada !== null && (
        <ComprometerModal
          numeros={[libreSeleccionada]}
          onClose={() => setLibreSeleccionada(null)}
          onSuccess={() => {
            setLibreSeleccionada(null)
            mostrarToast(`Boleta ${formatNumero(libreSeleccionada)} comprometida`)
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
