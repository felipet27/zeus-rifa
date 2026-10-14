'use client'

import { useEffect, useRef, useState } from 'react'
import { formatNumero } from '@/lib/formato'
import { RIFA } from '@/config/rifa'
import type { Boleta } from '@/types/boleta'

type Props = {
  boletas: Boleta[]
  onLibreClick: (numero: number) => void
  onComprometidaClick: (boleta: Boleta) => void
  // Ajusta el tablero al alto del contenedor (sin scroll) respetando la proporción de la foto
  ajustarAlto?: boolean
}

export default function TableroGrid({ boletas, onLibreClick, onComprometidaClick, ajustarAlto = false }: Props) {
  // Proporción real de la foto (ancho / alto)
  const [imgRatio, setImgRatio] = useState(1336 / 2576)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setImgRatio(img.naturalWidth / img.naturalHeight)
    img.src = RIFA.imagen
  }, [])

  const contenedorRef = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState<number | null>(null)

  useEffect(() => {
    const el = contenedorRef.current
    if (!ajustarAlto || !el) return
    const medir = () => setAncho(Math.floor(Math.min(el.clientWidth, el.clientHeight * imgRatio)))
    medir()
    const observer = new ResizeObserver(medir)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ajustarAlto, imgRatio])

  const boletaMap = new Map(boletas.map((b) => [b.numero, b]))

  // Con el tablero ajustado, el número escala con el ancho real de la casilla
  const tamañoNumero = ajustarAlto && ancho
    ? `${Math.max(8, Math.min(15, (ancho / 10) * 0.4))}px`
    : 'clamp(7px, 1.8vw, 15px)'

  const tablero = (
    <div
      className="grid grid-cols-10 w-full rounded-xl overflow-hidden shadow-lg"
      style={ajustarAlto ? { width: ancho ?? 0, visibility: ancho ? 'visible' : 'hidden' } : undefined}
    >
      {Array.from({ length: 100 }, (_, n) => {
        const boleta = boletaMap.get(n)
        const row = Math.floor(n / 10)
        const col = n % 10
        const comprometida = boleta?.estado === 'comprometida'

        return (
          <button
            key={n}
            onClick={() =>
              comprometida && boleta
                ? onComprometidaClick(boleta)
                : onLibreClick(n)
            }
            className="relative focus:outline-none focus:z-10 focus:ring-2 focus:ring-inset focus:ring-rayo"
            style={{ aspectRatio: String(imgRatio) }}
          >
            {comprometida ? (
              <>
                {/*
                  La clave del rompecabezas:
                  - El div interior tiene overflow:hidden (funciona en todos los navegadores)
                  - La imagen ocupa 10× el ancho de la celda (1000%)
                  - transform: translate mueve la imagen para mostrar exactamente la porción correcta
                  - col 0 → translate(0,0), col 1 → translate(-10%,0), col 9 → translate(-90%,0)
                  - El 10% es relativo al tamaño de la imagen (que mide 10× la celda)
                */}
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={RIFA.imagen}
                    alt=""
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '1000%',
                      height: 'auto',
                      maxWidth: 'none',
                      transform: `translate(${-col * 10}%, ${-row * 10}%)`,
                    }}
                  />
                </div>

                {/* Línea blanca entre casillas (efecto rompecabezas) */}
                <div className="absolute inset-0 border border-white/30 pointer-events-none" />

                {/* Indicador de estado — solo visible en la app, no en el PNG */}
                <div
                  className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full shadow-sm ${
                    boleta?.pagada ? 'bg-pagada' : 'bg-debe'
                  }`}
                />
              </>
            ) : (
              /* Casilla libre: gris + número */
              <div className="absolute inset-0 bg-libre border border-white/50 flex items-center justify-center">
                <span
                  className="text-libre-texto font-bold tabular-nums select-none"
                  style={{ fontSize: tamañoNumero }}
                >
                  {formatNumero(n)}
                </span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )

  if (!ajustarAlto) return tablero

  return (
    <div ref={contenedorRef} className="flex-1 min-h-0 w-full flex justify-center items-start">
      {tablero}
    </div>
  )
}
