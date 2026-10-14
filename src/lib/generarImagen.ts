import { RIFA } from '@/config/rifa'
import { formatNumero, formatCelular } from '@/lib/formato'
import type { Boleta } from '@/types/boleta'

const C = {
  zeus:       '#1F1F23',
  rayo:       '#F4B400',
  buganvilla: '#C2185B',
  libre:      '#E7E5E0',
  libreTexto: '#5F5F5F',
  blanco:     '#FFFFFF',
  fondo:      '#FAF8F3',
  verde:      '#2E8B57',
} as const

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

async function cargarImagenParaCanvas(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = src.startsWith('http') ? src : `${window.location.origin}${src}`
  await img.decode()
  return img
}

export async function generarImagenRifa(boletas: Boleta[]): Promise<Blob> {
  await document.fonts.ready

  const ANCHO  = 1080
  const CELL_W = 108           // 1080 / 10 — entero exacto
  const PAD    = 32

  const perro = await cargarImagenParaCanvas(RIFA.imagen)
  const IMG_W = perro.naturalWidth
  const IMG_H = perro.naturalHeight
  const CELL_H = Math.round(CELL_W * (IMG_H / IMG_W))
  const GRID_H = CELL_H * 10

  const HEADER_H = 200
  const PROMO_H  = 280
  const TOTAL_H  = HEADER_H + GRID_H + PROMO_H

  const canvas  = document.createElement('canvas')
  canvas.width  = ANCHO
  canvas.height = TOTAL_H
  const ctx = canvas.getContext('2d')!

  // ─── Fondo ──────────────────────────────────────────────────────
  ctx.fillStyle = C.blanco
  ctx.fillRect(0, 0, ANCHO, TOTAL_H)

  // ══════════════════════════════════════════════════════════════════
  // ENCABEZADO
  // ══════════════════════════════════════════════════════════════════
  ctx.fillStyle = C.zeus
  ctx.fillRect(0, 0, ANCHO, HEADER_H)
  ctx.textAlign = 'center'

  ctx.fillStyle = C.rayo
  ctx.font = 'bold 54px Inter, system-ui, sans-serif'
  ctx.fillText(`⚡ ${RIFA.titulo} ⚡`, ANCHO / 2, 62)

  ctx.fillStyle = C.buganvilla
  ctx.font = '30px Inter, system-ui, sans-serif'
  ctx.fillText(RIFA.causa, ANCHO / 2, 104)

  ctx.fillStyle = C.blanco
  ctx.font = 'bold 27px Inter, system-ui, sans-serif'
  ctx.fillText(
    `Premio ${COP(RIFA.premio)}  ·  Valor Boleta ${COP(RIFA.valorBoleta)}`,
    ANCHO / 2, 144,
  )

  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = '21px Inter, system-ui, sans-serif'
  ctx.fillText(
    `Juega el Viernes 30 de Octubre por las 2 últimas cifras de la ${RIFA.loteria}`,
    ANCHO / 2, 178,
  )

  // ══════════════════════════════════════════════════════════════════
  // CUADRÍCULA (rompecabezas)
  // ══════════════════════════════════════════════════════════════════
  const boletaMap = new Map(boletas.map((b) => [b.numero, b]))
  const GRID_Y    = HEADER_H
  const SRC_W     = IMG_W / 10
  const SRC_H     = IMG_H / 10

  ctx.save()
  for (let n = 0; n < 100; n++) {
    const boleta = boletaMap.get(n)
    const row = Math.floor(n / 10)
    const col = n % 10
    const dx  = col * CELL_W
    const dy  = GRID_Y + row * CELL_H

    if (boleta?.estado === 'comprometida') {
      ctx.drawImage(
        perro,
        Math.floor(col * SRC_W),
        Math.floor(row * SRC_H),
        Math.ceil(SRC_W),
        Math.ceil(SRC_H),
        dx, dy,
        CELL_W, CELL_H,
      )
    } else {
      ctx.fillStyle = C.libre
      ctx.fillRect(dx, dy, CELL_W, CELL_H)

      ctx.fillStyle    = C.libreTexto
      ctx.font         = `bold ${Math.round(CELL_W * 0.38)}px Inter, system-ui, sans-serif`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(formatNumero(n), dx + CELL_W / 2, dy + CELL_H / 2)
      ctx.textBaseline = 'alphabetic'
    }

    ctx.strokeStyle = C.blanco
    ctx.lineWidth   = 1
    ctx.strokeRect(dx + 0.5, dy + 0.5, CELL_W - 1, CELL_H - 1)
  }
  ctx.restore()

  // ══════════════════════════════════════════════════════════════════
  // SECCIÓN FLYER — para publicar en redes sociales
  // ══════════════════════════════════════════════════════════════════
  const PROMO_Y = GRID_Y + GRID_H

  // Fondo cálido
  ctx.fillStyle = C.fondo
  ctx.fillRect(0, PROMO_Y, ANCHO, PROMO_H)

  // Línea separadora rayo
  ctx.fillStyle = C.rayo
  ctx.fillRect(0, PROMO_Y, ANCHO, 5)

  // Título CTA
  ctx.fillStyle    = C.zeus
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font         = 'bold 42px Inter, system-ui, sans-serif'
  ctx.fillText('Zeus necesita ser operado 🐾', ANCHO / 2, PROMO_Y + 62)

  // Subtexto causa
  ctx.fillStyle = C.buganvilla
  ctx.font      = '26px Inter, system-ui, sans-serif'
  ctx.fillText(RIFA.causa, ANCHO / 2, PROMO_Y + 100)

  // Tarjetas de datos — 3 columnas
  const tarjetas = [
    { emoji: '💰', label: 'Valor Boleta',        valor: COP(RIFA.valorBoleta) },
    { emoji: '🏆', label: 'Premio',               valor: COP(RIFA.premio)      },
    { emoji: '📅', label: 'Lotería de Medellín', valor: 'Viernes 30 oct' },
  ]
  const CARD_W   = 290
  const CARD_H   = 90
  const CARD_GAP = (ANCHO - tarjetas.length * CARD_W) / (tarjetas.length + 1)
  const CARD_Y   = PROMO_Y + 116

  tarjetas.forEach((t, i) => {
    const cx = CARD_GAP + i * (CARD_W + CARD_GAP)

    // Sombra / tarjeta
    ctx.fillStyle = C.blanco
    ctx.beginPath()
    roundRect(ctx, cx, CARD_Y, CARD_W, CARD_H, 16)
    ctx.fill()

    ctx.strokeStyle = 'rgba(0,0,0,0.07)'
    ctx.lineWidth   = 1.5
    ctx.beginPath()
    roundRect(ctx, cx, CARD_Y, CARD_W, CARD_H, 16)
    ctx.stroke()

    ctx.textAlign = 'center'

    ctx.font      = '28px Inter, system-ui, sans-serif'
    ctx.fillStyle = C.zeus
    ctx.fillText(t.emoji, cx + CARD_W / 2, CARD_Y + 33)

    ctx.font      = 'bold 20px Inter, system-ui, sans-serif'
    ctx.fillStyle = C.zeus
    ctx.fillText(t.valor, cx + CARD_W / 2, CARD_Y + 60)

    ctx.font      = '16px Inter, system-ui, sans-serif'
    ctx.fillStyle = C.libreTexto
    ctx.fillText(t.label, cx + CARD_W / 2, CARD_Y + 80)
  })

  // Línea de contacto
  const CONTACT_Y = CARD_Y + CARD_H + 28
  ctx.textAlign = 'center'

  ctx.font      = 'bold 28px Inter, system-ui, sans-serif'
  ctx.fillStyle = C.zeus
  ctx.fillText(
    `💳 Se reciben los pagos a Nequi ${formatCelular(RIFA.celularResponsable)}`,
    ANCHO / 2, CONTACT_Y,
  )

  ctx.font      = '22px Inter, system-ui, sans-serif'
  ctx.fillStyle = C.libreTexto
  ctx.fillText(
    `Escríbenos al WhatsApp y recibe tu número ❤️`,
    ANCHO / 2, CONTACT_Y + 34,
  )

  // ─── Exportar ───────────────────────────────────────────────────
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob devolvió null'))),
      'image/png',
    )
  })
}

// Helper: rectángulo con bordes redondeados (no existe como nativo en Canvas 2D)
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export async function compartirODescargar(boletas: Boleta[]): Promise<void> {
  const blob  = await generarImagenRifa(boletas)
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
    try {
      await navigator.share({ files: [file], title: RIFA.titulo, text: RIFA.causa })
      return
    } catch {
      // usuario canceló el share — caemos al download normal
    }
  }

  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
