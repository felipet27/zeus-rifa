import { RIFA } from '@/config/rifa'
import { formatNumero, formatCelular } from '@/lib/formato'
import type { Boleta } from '@/types/boleta'

// Colores idénticos a tailwind.config.ts
const C = {
  zeus: '#1F1F23',
  rayo: '#F4B400',
  buganvilla: '#C2185B',
  libre: '#E7E5E0',
  libreTexto: '#5F5F5F',
  blanco: '#FFFFFF',
} as const

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function generarImagenRifa(boletas: Boleta[]): Promise<Blob> {
  await document.fonts.ready

  const ANCHO = 1080
  const PADDING = 16
  const GRID_W = ANCHO - PADDING * 2
  const CELL_W = GRID_W / 10

  const img = await cargarImagen(RIFA.imagen)
  const IMG_W = img.naturalWidth
  const IMG_H = img.naturalHeight
  const CELL_H = Math.round(CELL_W * (IMG_H / IMG_W))
  const GRID_H = CELL_H * 10

  const HEADER_H = 190
  const FOOTER_H = 130
  const TOTAL_H = HEADER_H + GRID_H + FOOTER_H

  const canvas = document.createElement('canvas')
  canvas.width = ANCHO
  canvas.height = TOTAL_H
  const ctx = canvas.getContext('2d')!

  // Fondo blanco
  ctx.fillStyle = C.blanco
  ctx.fillRect(0, 0, ANCHO, TOTAL_H)

  // ── Encabezado ──────────────────────────────────────────────────
  ctx.fillStyle = C.zeus
  ctx.fillRect(0, 0, ANCHO, HEADER_H)

  ctx.textAlign = 'center'

  ctx.fillStyle = C.rayo
  ctx.font = 'bold 52px Inter, system-ui, sans-serif'
  ctx.fillText(`⚡ ${RIFA.titulo} ⚡`, ANCHO / 2, 62)

  ctx.fillStyle = C.buganvilla
  ctx.font = '28px Inter, system-ui, sans-serif'
  ctx.fillText(RIFA.causa, ANCHO / 2, 100)

  ctx.fillStyle = C.blanco
  ctx.font = 'bold 26px Inter, system-ui, sans-serif'
  ctx.fillText(`Premio ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(RIFA.premio)}  ·  Boleta ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(RIFA.valorBoleta)}`, ANCHO / 2, 138)

  ctx.font = '22px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText(`Juega ${RIFA.fechaSorteoTexto}  ·  ${RIFA.loteria}  ·  ${RIFA.mecanica}`, ANCHO / 2, 170)

  // ── Cuadrícula ──────────────────────────────────────────────────
  const GRID_Y = HEADER_H

  for (const boleta of boletas) {
    const row = Math.floor(boleta.numero / 10)
    const col = boleta.numero % 10
    const dx = PADDING + col * CELL_W
    const dy = GRID_Y + row * CELL_H

    if (boleta.estado === 'comprometida') {
      const sx = col * (IMG_W / 10)
      const sy = row * (IMG_H / 10)
      ctx.drawImage(img, sx, sy, IMG_W / 10, IMG_H / 10, dx, dy, CELL_W, CELL_H)
    } else {
      ctx.fillStyle = C.libre
      ctx.fillRect(dx, dy, CELL_W, CELL_H)

      ctx.fillStyle = C.libreTexto
      ctx.font = `bold ${Math.round(CELL_W * 0.38)}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(formatNumero(boleta.numero), dx + CELL_W / 2, dy + CELL_H / 2)
      ctx.textBaseline = 'alphabetic'
    }

    // Líneas blancas entre casillas
    ctx.strokeStyle = C.blanco
    ctx.lineWidth = 1.5
    ctx.strokeRect(dx, dy, CELL_W, CELL_H)
  }

  // ── Pie ─────────────────────────────────────────────────────────
  const FOOTER_Y = GRID_Y + GRID_H
  ctx.fillStyle = C.zeus
  ctx.fillRect(0, FOOTER_Y, ANCHO, FOOTER_H)

  const libres = boletas.filter((b) => b.estado === 'libre').length

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = C.rayo
  ctx.font = `bold 32px Inter, system-ui, sans-serif`
  ctx.fillText(
    libres === 0
      ? '¡Todas las boletas están vendidas!'
      : `Quedan ${libres} número${libres !== 1 ? 's' : ''} disponible${libres !== 1 ? 's' : ''}`,
    ANCHO / 2,
    FOOTER_Y + 44
  )

  ctx.fillStyle = C.blanco
  ctx.font = '26px Inter, system-ui, sans-serif'
  ctx.fillText(`Responsable: ${RIFA.responsable}`, ANCHO / 2, FOOTER_Y + 84)

  ctx.font = '24px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.80)'
  ctx.fillText(
    `Celular / WhatsApp: ${formatCelular(RIFA.celularResponsable)}`,
    ANCHO / 2,
    FOOTER_Y + 116
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob falló'))),
      'image/png'
    )
  })
}

export async function compartirODescargar(boletas: Boleta[]): Promise<void> {
  const blob = await generarImagenRifa(boletas)
  const ahora = new Date()
    .toISOString()
    .slice(0, 16)
    .replace('T', '-')
    .replace(':', '')
  const nombre = `rifa-zeus-${ahora}.png`
  const file = new File([blob], nombre, { type: 'image/png' })

  if (
    typeof navigator !== 'undefined' &&
    'share' in navigator &&
    navigator.canShare?.({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      title: RIFA.titulo,
      text: RIFA.causa,
    })
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
