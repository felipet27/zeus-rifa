import { RIFA } from '@/config/rifa'
import { formatNumero, formatCelular } from '@/lib/formato'
import type { Boleta } from '@/types/boleta'

const C = {
  zeus:       '#1F1F23',
  rayo:       '#F4B400',
  rosa:       '#F0628F',
  libre:      '#E7E5E0',
  libreTexto: '#5F5F5F',
  blanco:     '#FFFFFF',
  tarjeta:    'rgba(255,255,255,0.07)',
  tenue:      'rgba(255,255,255,0.6)',
} as const

// Lienzo lógico 9:16 — el formato exacto de estados de WhatsApp e historias de Instagram.
// Todo se dibuja en estas coordenadas y se exporta al doble (2160×3840) para máxima nitidez.
const ANCHO = 1080
const ALTO  = 1920
const ESCALA = 2

// Zonas seguras: Instagram/WhatsApp tapan ~250px arriba (perfil) y ~250px abajo (responder).
const MARGEN = 60

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

// next/font registra Inter con un nombre interno (p. ej. "__Inter_abc123"),
// así que se toma la familia real que usa el body para que el canvas no caiga a otra fuente.
function familiaFuente(): string {
  const body = getComputedStyle(document.body).fontFamily
  return body ? `${body}, system-ui, sans-serif` : 'system-ui, sans-serif'
}

function fechaCorta(): string {
  const d = new Date(`${RIFA.fechaSorteo}T12:00:00`)
  const dia    = new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(d)
  const numero = d.getDate()
  const mes    = new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(d).replace('.', '')
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${numero} ${mes}`
}

export async function generarImagenRifa(boletas: Boleta[]): Promise<Blob> {
  await document.fonts.ready
  const FUENTE = familiaFuente()
  const font = (peso: string, px: number) => `${peso} ${px}px ${FUENTE}`

  const perro = await cargarImagenParaCanvas(RIFA.imagen)
  const IMG_W = perro.naturalWidth
  const IMG_H = perro.naturalHeight

  const canvas  = document.createElement('canvas')
  canvas.width  = ANCHO * ESCALA
  canvas.height = ALTO * ESCALA
  const ctx = canvas.getContext('2d')!
  ctx.scale(ESCALA, ESCALA)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Escribe texto reduciendo el tamaño si no cabe en el ancho disponible
  function texto(
    t: string, x: number, y: number,
    peso: string, px: number, color: string,
    maxW: number, align: CanvasTextAlign = 'center',
  ) {
    ctx.textAlign = align
    ctx.fillStyle = color
    let size = px
    ctx.font = font(peso, size)
    while (size > 10 && ctx.measureText(t).width > maxW) {
      size -= 1
      ctx.font = font(peso, size)
    }
    ctx.fillText(t, x, y)
  }

  // ─── Fondo ──────────────────────────────────────────────────────
  ctx.fillStyle = C.zeus
  ctx.fillRect(0, 0, ANCHO, ALTO)

  const brillo = ctx.createRadialGradient(ANCHO / 2, 0, 0, ANCHO / 2, 0, ALTO * 0.6)
  brillo.addColorStop(0, 'rgba(244,180,0,0.16)')
  brillo.addColorStop(1, 'rgba(244,180,0,0)')
  ctx.fillStyle = brillo
  ctx.fillRect(0, 0, ANCHO, ALTO)

  // ══════════════════════════════════════════════════════════════════
  // ENCABEZADO
  // ══════════════════════════════════════════════════════════════════
  ctx.textBaseline = 'alphabetic'
  texto(`⚡ ${RIFA.titulo} ⚡`, ANCHO / 2, 272, 'bold', 78, C.rayo, ANCHO - MARGEN * 2)
  texto(`${RIFA.nombrePerro} necesita ser operado 🐾`, ANCHO / 2, 328, '600', 36, C.rosa, ANCHO - MARGEN * 2)

  // ══════════════════════════════════════════════════════════════════
  // TABLERO (rompecabezas) — columna izquierda
  // ══════════════════════════════════════════════════════════════════
  const BX = MARGEN
  const BY = 372
  const BW = 560
  const BH = Math.round(BW * (IMG_H / IMG_W))   // misma proporción que la foto
  const CELL_W = BW / 10
  const CELL_H = BH / 10
  const SRC_W  = IMG_W / 10
  const SRC_H  = IMG_H / 10

  const boletaMap = new Map(boletas.map((b) => [b.numero, b]))

  ctx.save()
  ctx.beginPath()
  roundRect(ctx, BX, BY, BW, BH, 22)
  ctx.clip()

  for (let n = 0; n < 100; n++) {
    const boleta = boletaMap.get(n)
    const row = Math.floor(n / 10)
    const col = n % 10
    const dx  = BX + col * CELL_W
    const dy  = BY + row * CELL_H

    if (boleta?.estado === 'comprometida') {
      ctx.drawImage(perro, col * SRC_W, row * SRC_H, SRC_W, SRC_H, dx, dy, CELL_W, CELL_H)
    } else {
      ctx.fillStyle = C.libre
      ctx.fillRect(dx, dy, CELL_W, CELL_H)

      ctx.textBaseline = 'middle'
      texto(formatNumero(n), dx + CELL_W / 2, dy + CELL_H / 2, 'bold', 24, C.libreTexto, CELL_W - 6)
      ctx.textBaseline = 'alphabetic'
    }
  }

  // Líneas del rompecabezas
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth   = 1
  ctx.beginPath()
  for (let i = 1; i < 10; i++) {
    ctx.moveTo(BX + i * CELL_W, BY)
    ctx.lineTo(BX + i * CELL_W, BY + BH)
    ctx.moveTo(BX, BY + i * CELL_H)
    ctx.lineTo(BX + BW, BY + i * CELL_H)
  }
  ctx.stroke()
  ctx.restore()

  // Marco del tablero
  ctx.strokeStyle = C.rayo
  ctx.lineWidth   = 4
  ctx.beginPath()
  roundRect(ctx, BX - 2, BY - 2, BW + 4, BH + 4, 24)
  ctx.stroke()

  // ══════════════════════════════════════════════════════════════════
  // TARJETAS DE DATOS — columna derecha
  // ══════════════════════════════════════════════════════════════════
  const libres = 100 - boletas.filter((b) => b.estado === 'comprometida').length

  const CX   = BX + BW + 30
  const CW   = ANCHO - MARGEN - CX
  const GAP  = 20
  const CH   = (BH - GAP * 3) / 4
  const MID  = CX + CW / 2
  const INNER = CW - 36

  const tarjetas: ((y: number) => void)[] = [
    (y) => {
      texto('🏆  PREMIO', MID, y + 62, 'bold', 24, C.tenue, INNER)
      texto(COP(RIFA.premio), MID, y + 140, '800', 62, C.rayo, INNER)
      texto(`${RIFA.mecanica.charAt(0).toUpperCase()}${RIFA.mecanica.slice(1)} de la`, MID, y + 186, '500', 22, C.tenue, INNER)
      texto(RIFA.loteria, MID, y + 216, '500', 22, C.tenue, INNER)
    },
    (y) => {
      texto('🎟️  VALOR BOLETA', MID, y + 62, 'bold', 24, C.tenue, INNER)
      texto(COP(RIFA.valorBoleta), MID, y + 140, '800', 62, C.blanco, INNER)
      texto('Paga por Nequi', MID, y + 196, '500', 22, C.tenue, INNER)
    },
    (y) => {
      texto('📅  JUEGA', MID, y + 62, 'bold', 24, C.tenue, INNER)
      texto(fechaCorta(), MID, y + 136, '800', 48, C.blanco, INNER)
      texto(RIFA.loteria, MID, y + 190, '500', 22, C.tenue, INNER)
    },
    (y) => {
      if (libres === 0) {
        texto('🎉', MID, y + 100, 'normal', 56, C.blanco, INNER)
        texto('¡Rifa agotada!', MID, y + 170, '800', 40, C.rayo, INNER)
        return
      }
      texto('🔥  ¡QUEDAN!', MID, y + 62, 'bold', 24, C.tenue, INNER)
      texto(`${libres} ${libres === 1 ? 'número' : 'números'}`, MID, y + 130, '800', 50, C.rayo, INNER)

      // Barra de progreso
      const PX = CX + 24
      const PW = CW - 48
      const PY = y + 158
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.beginPath()
      roundRect(ctx, PX, PY, PW, 14, 7)
      ctx.fill()
      const avance = (100 - libres) / 100
      if (avance > 0) {
        ctx.fillStyle = C.rayo
        ctx.beginPath()
        roundRect(ctx, PX, PY, Math.max(14, PW * avance), 14, 7)
        ctx.fill()
      }
      texto('Los grises están disponibles', MID, y + 212, '500', 20, C.tenue, INNER)
    },
  ]

  tarjetas.forEach((dibujar, i) => {
    const y = BY + i * (CH + GAP)
    ctx.fillStyle = C.tarjeta
    ctx.beginPath()
    roundRect(ctx, CX, y, CW, CH, 22)
    ctx.fill()
    dibujar(y)
  })

  // ══════════════════════════════════════════════════════════════════
  // FRANJA DE PAGO / CONTACTO
  // ══════════════════════════════════════════════════════════════════
  const FY = BY + BH + 32
  const FH = 168
  ctx.fillStyle = C.rayo
  ctx.beginPath()
  roundRect(ctx, MARGEN, FY, ANCHO - MARGEN * 2, FH, 26)
  ctx.fill()

  texto(`💳 Nequi ${formatCelular(RIFA.celularResponsable)}`, ANCHO / 2, FY + 76, '800', 52, C.zeus, ANCHO - MARGEN * 2 - 48)
  texto('Escríbenos al WhatsApp y recibe tu número ❤️', ANCHO / 2, FY + 128, '600', 30, C.zeus, ANCHO - MARGEN * 2 - 48)

  // ─── Exportar ───────────────────────────────────────────────────
  // JPEG de alta calidad: pesa una fracción del PNG con la foto y WhatsApp/Instagram
  // lo recomprimen menos agresivamente.
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob devolvió null'))),
      'image/jpeg',
      0.95,
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
  const nombre = `rifa-zeus-${ahora}.jpg`

  const file = new File([blob], nombre, { type: 'image/jpeg' })

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
