'use client'

import { useEffect, useState } from 'react'
import { formatNumero } from '@/lib/formato'
import { RIFA } from '@/config/rifa'
import type { Boleta } from '@/types/boleta'

type Props = {
  boletas: Boleta[]
  onLibreClick: (numero: number) => void
  onComprometidaClick: (boleta: Boleta) => void
}

export default function TableroGrid({ boletas, onLibreClick, onComprometidaClick }: Props) {
  const [imgRatio, setImgRatio] = useState(1336 / 2576) // ratio especificado: w/h

  useEffect(() => {
    const img = new Image()
    img.onload = () => setImgRatio(img.naturalWidth / img.naturalHeight)
    img.src = RIFA.imagen
  }, [])

  const boletaMap = new Map(boletas.map((b) => [b.numero, b]))

  return (
    <div className="grid grid-cols-10 gap-0 w-full border border-white/20 overflow-hidden rounded-xl">
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
            className="relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-rayo focus:z-10"
            style={{ aspectRatio: `${imgRatio}` }}
            aria-label={`Boleta ${formatNumero(n)}${comprometida ? ` — ${boleta?.nombre}` : ' — libre'}`}
          >
            {comprometida ? (
              <>
                {/* Porción de la foto del perro */}
                <img
                  src={RIFA.imagen}
                  alt=""
                  aria-hidden="true"
                  className="absolute"
                  style={{
                    width: '1000%',
                    height: 'auto',
                    top: `-${row * 100}%`,
                    left: `-${col * 100}%`,
                  }}
                />
                {/* Borde blanco (efecto rompecabezas) */}
                <div className="absolute inset-0 border border-white/30 pointer-events-none" />
                {/* Indicador de estado (solo en la app, no en la imagen descargable) */}
                <div
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-1 ring-white/40 ${
                    boleta?.pagada ? 'bg-pagada' : 'bg-debe'
                  }`}
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-libre border border-white/40 flex items-center justify-center">
                <span className="text-libre-texto font-bold tabular-nums text-[clamp(8px,2vw,16px)] leading-none">
                  {formatNumero(n)}
                </span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
