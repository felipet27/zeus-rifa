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
  tarjeta:    '#2B2B30',
  borde:      'rgba(255,255,255,0.10)',
  tenue:      'rgba(255,255,255,0.78)',
} as const

// Lienzo lógico 9:16 — el formato exacto de estados de WhatsApp e historias de Instagram.
// Todo se dibuja en estas coordenadas y se exporta al doble (2160×3840) para máxima nitidez.
const ANCHO = 1080
const ALTO  = 1920
const ESCALA = 2

// Margen lateral generoso: visores y vistas previas recortan los costados de la imagen.
const MARGEN = 80
const CONTENIDO = ANCHO - MARGEN * 2

type Pintura = string | CanvasGradient
type Icono = 'rayo' | 'trofeo' | 'ticket' | 'calendario' | 'llama' | 'huella' | 'corazon' | 'celular'

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

function fechaSorteo(): { dia: string; fecha: string } {
  const d = new Date(`${RIFA.fechaSorteo}T12:00:00`)
  const dia = new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(d)
  const mes = new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(d).replace('.', '')
  return { dia: `${dia.charAt(0).toUpperCase()}${dia.slice(1)}`, fecha: `${d.getDate()} ${mes}` }
}

// Generador pseudoaleatorio con semilla: la textura de fondo sale idéntica en cada descarga
function aleatorio(semilla: number) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
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

  // Las sombras de canvas no se escalan con la transformación: van en píxeles reales
  function sombra(color: string, blur: number, offsetY = 0) {
    ctx.shadowColor   = color
    ctx.shadowBlur    = blur * ESCALA
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = offsetY * ESCALA
  }
  function sinSombra() {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur  = 0
    ctx.shadowOffsetY = 0
  }

  // Escribe texto reduciendo el tamaño si no cabe en el ancho disponible
  function texto(
    t: string, x: number, y: number,
    peso: string, px: number, color: Pintura,
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

  // Íconos vectoriales en una caja unitaria: se ven igual en cualquier dispositivo,
  // a diferencia de los emojis, que dependen de las fuentes del sistema.
  function icono(tipo: Icono, cx: number, cy: number, s: number, color: Pintura) {
    ctx.save()
    ctx.translate(cx - s / 2, cy - s / 2)
    ctx.scale(s, s)
    ctx.fillStyle   = color
    ctx.strokeStyle = color
    ctx.lineWidth   = 0.09
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.beginPath()

    switch (tipo) {
      case 'rayo':
        ctx.moveTo(0.45, 0)
        ctx.lineTo(0.78, 0)
        ctx.lineTo(0.58, 0.38)
        ctx.lineTo(0.86, 0.38)
        ctx.lineTo(0.3, 1)
        ctx.lineTo(0.42, 0.54)
        ctx.lineTo(0.14, 0.54)
        ctx.closePath()
        ctx.fill()
        break

      case 'trofeo':
        ctx.moveTo(0.24, 0.1)
        ctx.lineTo(0.76, 0.1)
        ctx.lineTo(0.76, 0.34)
        ctx.quadraticCurveTo(0.76, 0.6, 0.5, 0.62)
        ctx.quadraticCurveTo(0.24, 0.6, 0.24, 0.34)
        ctx.closePath()
        ctx.fill()
        ctx.fillRect(0.44, 0.6, 0.12, 0.17)
        ctx.beginPath()
        roundRect(ctx, 0.28, 0.76, 0.44, 0.13, 0.04)
        ctx.fill()
        ctx.lineWidth = 0.08
        ctx.beginPath()
        ctx.arc(0.24, 0.3, 0.13, Math.PI / 2, Math.PI * 1.5)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0.76, 0.3, 0.13, -Math.PI / 2, Math.PI / 2)
        ctx.stroke()
        break

      case 'ticket':
        ctx.moveTo(0.04, 0.22)
        ctx.lineTo(0.96, 0.22)
        ctx.lineTo(0.96, 0.4)
        ctx.arc(0.96, 0.5, 0.1, -Math.PI / 2, Math.PI / 2, true)
        ctx.lineTo(0.96, 0.78)
        ctx.lineTo(0.04, 0.78)
        ctx.lineTo(0.04, 0.6)
        ctx.arc(0.04, 0.5, 0.1, Math.PI / 2, -Math.PI / 2, true)
        ctx.closePath()
        ctx.fill()
        break

      case 'calendario':
        roundRect(ctx, 0.1, 0.18, 0.8, 0.72, 0.1)
        ctx.stroke()
        ctx.fillRect(0.1, 0.18, 0.8, 0.2)
        ctx.beginPath()
        ctx.moveTo(0.32, 0.07)
        ctx.lineTo(0.32, 0.26)
        ctx.moveTo(0.68, 0.07)
        ctx.lineTo(0.68, 0.26)
        ctx.stroke()
        for (const [x, y] of [[0.24, 0.5], [0.44, 0.5], [0.64, 0.5], [0.24, 0.68], [0.44, 0.68]]) {
          ctx.fillRect(x, y, 0.12, 0.11)
        }
        break

      case 'llama':
        ctx.moveTo(0.5, 0)
        ctx.quadraticCurveTo(0.92, 0.4, 0.82, 0.7)
        ctx.quadraticCurveTo(0.75, 1, 0.5, 1)
        ctx.quadraticCurveTo(0.25, 1, 0.18, 0.7)
        ctx.quadraticCurveTo(0.12, 0.45, 0.34, 0.28)
        ctx.quadraticCurveTo(0.36, 0.5, 0.5, 0.52)
        ctx.quadraticCurveTo(0.38, 0.26, 0.5, 0)
        ctx.closePath()
        ctx.fill()
        break

      case 'huella':
        ctx.ellipse(0.5, 0.7, 0.24, 0.2, 0, 0, Math.PI * 2)
        ctx.fill()
        for (const [x, y, rot] of [[0.17, 0.42, -0.4], [0.37, 0.2, -0.15], [0.63, 0.2, 0.15], [0.83, 0.42, 0.4]]) {
          ctx.beginPath()
          ctx.ellipse(x, y, 0.09, 0.12, rot, 0, Math.PI * 2)
          ctx.fill()
        }
        break

      case 'corazon':
        ctx.moveTo(0.5, 0.9)
        ctx.bezierCurveTo(0.1, 0.62, 0, 0.38, 0.18, 0.2)
        ctx.bezierCurveTo(0.32, 0.07, 0.48, 0.14, 0.5, 0.3)
        ctx.bezierCurveTo(0.52, 0.14, 0.68, 0.07, 0.82, 0.2)
        ctx.bezierCurveTo(1, 0.38, 0.9, 0.62, 0.5, 0.9)
        ctx.closePath()
        ctx.fill()
        break

      case 'celular':
        roundRect(ctx, 0.27, 0.05, 0.46, 0.9, 0.1)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0.43, 0.16)
        ctx.lineTo(0.57, 0.16)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0.5, 0.8, 0.05, 0, Math.PI * 2)
        ctx.fill()
        break
    }
    ctx.restore()
  }

  // Texto con ícono a la izquierda, a la derecha o a ambos lados; el conjunto queda centrado
  // y se reduce completo si no cabe en maxW.
  function textoConIcono(
    tipo: Icono, lado: 'izq' | 'der' | 'ambos',
    t: string, cx: number, y: number,
    peso: string, px: number, color: Pintura, maxW: number,
    colorIcono: Pintura = color,
  ) {
    const n = lado === 'ambos' ? 2 : 1
    let size = px
    let ancho = 0
    for (;;) {
      ctx.font = font(peso, size)
      ancho = ctx.measureText(t).width + n * size * 1.2
      if (ancho <= maxW || size <= 10) break
      size -= 1
    }
    const s   = size * 0.9
    const gap = size * 0.3
    const iy  = y - size * 0.36
    let x = cx - ancho / 2

    if (lado !== 'der') {
      icono(tipo, x + s / 2, iy, s, colorIcono)
      x += s + gap
    }
    ctx.textAlign = 'left'
    ctx.fillStyle = color
    ctx.fillText(t, x, y)
    x += ctx.measureText(t).width + gap
    if (lado !== 'izq') icono(tipo, x + s / 2, iy, s, colorIcono)
  }

  // Sticker circular inclinado, como una calcomanía pegada sobre la imagen
  function sello(
    cx: number, cy: number, r: number, grados: number,
    fondo: string, tinta: string, simbolo: Icono, lineas: string[],
  ) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((grados * Math.PI) / 180)

    sombra('rgba(0,0,0,0.45)', 24, 10)
    ctx.fillStyle = fondo
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    sinSombra()

    ctx.strokeStyle = tinta
    ctx.globalAlpha = 0.5
    ctx.lineWidth   = 3
    ctx.setLineDash([7, 7])
    ctx.beginPath()
    ctx.arc(0, 0, r - 11, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    const px  = r * 0.32
    const alto = px * 1.05
    const y0 = -((lineas.length - 1) * alto) / 2 + px * 0.55
    icono(simbolo, 0, y0 - px * 1.25, px * 0.85, tinta)
    lineas.forEach((l, i) => texto(l, 0, y0 + i * alto, '800', px, tinta, r * 1.5))
    ctx.restore()
  }

  // ─── Fondo ──────────────────────────────────────────────────────
  ctx.fillStyle = C.zeus
  ctx.fillRect(0, 0, ANCHO, ALTO)

  const brillo = ctx.createRadialGradient(ANCHO / 2, 0, 0, ANCHO / 2, 0, ALTO * 0.6)
  brillo.addColorStop(0, 'rgba(244,180,0,0.18)')
  brillo.addColorStop(1, 'rgba(244,180,0,0)')
  ctx.fillStyle = brillo
  ctx.fillRect(0, 0, ANCHO, ALTO)

  const brilloRosa = ctx.createRadialGradient(ANCHO / 2, ALTO, 0, ANCHO / 2, ALTO, ALTO * 0.45)
  brilloRosa.addColorStop(0, 'rgba(240,98,143,0.12)')
  brilloRosa.addColorStop(1, 'rgba(240,98,143,0)')
  ctx.fillStyle = brilloRosa
  ctx.fillRect(0, 0, ANCHO, ALTO)

  // Textura: huellitas y rayos dispersos, casi invisibles
  const azar = aleatorio(30)
  for (let i = 0; i < 48; i++) {
    const x = azar() * ANCHO
    const y = azar() * ALTO
    const s = 34 + azar() * 46
    const rot = azar() * Math.PI * 2
    const esRayo = i % 3 === 0
    ctx.save()
    ctx.globalAlpha = esRayo ? 0.07 : 0.05
    ctx.translate(x, y)
    ctx.rotate(rot)
    icono(esRayo ? 'rayo' : 'huella', 0, 0, s, esRayo ? C.rayo : C.blanco)
    ctx.restore()
  }

  // ══════════════════════════════════════════════════════════════════
  // ENCABEZADO
  // ══════════════════════════════════════════════════════════════════
  ctx.textBaseline = 'alphabetic'
  const dorado = ctx.createLinearGradient(0, 180, 0, 250)
  dorado.addColorStop(0, '#FFE27A')
  dorado.addColorStop(1, C.rayo)
  sombra('rgba(244,180,0,0.45)', 30)
  textoConIcono('rayo', 'ambos', RIFA.titulo, ANCHO / 2, 250, '800', 88, dorado, CONTENIDO, C.rayo)
  sinSombra()
  textoConIcono('huella', 'izq', `${RIFA.nombrePerro} necesita ser operado`, ANCHO / 2, 312, '600', 38, C.rosa, CONTENIDO)

  // ══════════════════════════════════════════════════════════════════
  // TABLERO (rompecabezas) — centrado
  // ══════════════════════════════════════════════════════════════════
  // La foto es vertical: el tablero se ajusta al alto disponible respetando su proporción,
  // para que cada número coincida con su pieza del tablero de la app.
  const ZONA_Y = 352
  const ZONA_H = 1010
  let BW = Math.round(ZONA_H * (IMG_W / IMG_H))
  let BH = ZONA_H
  if (BW > CONTENIDO) {
    BW = CONTENIDO
    BH = Math.round(BW * (IMG_H / IMG_W))
  }
  const BX = Math.round((ANCHO - BW) / 2)
  const BY = ZONA_Y + Math.round((ZONA_H - BH) / 2)
  const CELL_W = BW / 10
  const CELL_H = BH / 10
  const SRC_W  = IMG_W / 10
  const SRC_H  = IMG_H / 10

  const boletaMap = new Map(boletas.map((b) => [b.numero, b]))

  // Sombra profunda + resplandor dorado detrás del tablero
  ctx.fillStyle = C.zeus
  sombra('rgba(0,0,0,0.6)', 50, 22)
  ctx.beginPath()
  roundRect(ctx, BX, BY, BW, BH, 24)
  ctx.fill()
  sombra('rgba(244,180,0,0.35)', 60)
  ctx.fill()
  sinSombra()

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
      texto(formatNumero(n), dx + CELL_W / 2, dy + CELL_H / 2, 'bold', 26, C.libreTexto, CELL_W - 8)
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

  // Marco dorado con degradado metálico
  const marco = ctx.createLinearGradient(BX, BY, BX + BW, BY + BH)
  marco.addColorStop(0,    '#FFE680')
  marco.addColorStop(0.35, C.rayo)
  marco.addColorStop(0.65, '#B9800A')
  marco.addColorStop(1,    '#FFD54A')
  ctx.strokeStyle = marco
  ctx.lineWidth   = 6
  ctx.beginPath()
  roundRect(ctx, BX - 3, BY - 3, BW + 6, BH + 6, 26)
  ctx.stroke()

  // Sellos en los costados del tablero
  const MARGEN_SELLO = 44
  const radioSello = Math.min(98, (BX - MARGEN_SELLO) / 2 - 8)
  if (radioSello >= 60) {
    sello(
      BX + BW + (BX - MARGEN_SELLO) / 2, BY + 190, radioSello, 12,
      C.rayo, C.zeus, 'rayo', ['¡AYUDA', `A ${RIFA.nombrePerro.toUpperCase()}!`],
    )
    sello(
      (MARGEN_SELLO + BX) / 2, BY + BH - 230, radioSello, -10,
      C.rosa, C.blanco, 'corazon', ['Cada', 'número', 'cuenta'],
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // PÍLDORAS DE DATOS
  // ══════════════════════════════════════════════════════════════════
  const { dia, fecha } = fechaSorteo()
  const PY  = ZONA_Y + ZONA_H + 30
  const PH  = 176
  const PG  = 18
  const PW  = (CONTENIDO - PG * 2) / 3

  const pildoras: {
    icono: Icono; titulo: string; valor: string; color: string; lineas: string[]; destacada?: boolean
  }[] = [
    {
      icono: 'trofeo', titulo: 'PREMIO', valor: COP(RIFA.premio), color: C.rayo, destacada: true,
      lineas: [`${RIFA.mecanica.charAt(0).toUpperCase()}${RIFA.mecanica.slice(1)}`, RIFA.loteria],
    },
    { icono: 'ticket', titulo: 'BOLETA', valor: COP(RIFA.valorBoleta), color: C.blanco, lineas: ['Paga por Nequi'] },
    { icono: 'calendario', titulo: 'JUEGA', valor: fecha, color: C.blanco, lineas: [dia, RIFA.loteria] },
  ]

  pildoras.forEach((p, i) => {
    const x   = MARGEN + i * (PW + PG)
    const mid = x + PW / 2
    const maxW = PW - 32

    ctx.fillStyle = p.destacada ? '#3A3324' : C.tarjeta
    ctx.beginPath()
    roundRect(ctx, x, PY, PW, PH, 24)
    ctx.fill()
    ctx.strokeStyle = p.destacada ? marco : C.borde
    ctx.lineWidth   = p.destacada ? 3 : 2
    ctx.stroke()

    textoConIcono(p.icono, 'izq', p.titulo, mid, PY + 44, 'bold', 22, C.tenue, maxW, p.destacada ? C.rayo : C.tenue)
    texto(p.valor, mid, PY + 104, '800', 48, p.color, maxW)
    const y0 = p.lineas.length === 1 ? PY + 146 : PY + 136
    p.lineas.forEach((l, j) => texto(l, mid, y0 + j * 24, '500', 20, C.tenue, maxW))
  })

  // ══════════════════════════════════════════════════════════════════
  // CONTADOR DE URGENCIA
  // ══════════════════════════════════════════════════════════════════
  const libres = 100 - boletas.filter((b) => b.estado === 'comprometida').length
  const QY = PY + PH + 54

  if (libres === 0) {
    textoConIcono('corazon', 'der', '¡Rifa agotada! Gracias por ayudar', ANCHO / 2, QY, '800', 36, C.rayo, CONTENIDO, C.rosa)
  } else {
    textoConIcono('llama', 'izq', `¡Quedan ${libres} ${libres === 1 ? 'número' : 'números'}!`, ANCHO / 2, QY, '800', 36, C.rayo, CONTENIDO)
  }

  const BAR_Y = QY + 20
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.beginPath()
  roundRect(ctx, MARGEN, BAR_Y, CONTENIDO, 16, 8)
  ctx.fill()
  const avance = (100 - libres) / 100
  if (avance > 0) {
    const relleno = ctx.createLinearGradient(MARGEN, 0, MARGEN + CONTENIDO, 0)
    relleno.addColorStop(0, C.rosa)
    relleno.addColorStop(1, C.rayo)
    ctx.fillStyle = relleno
    ctx.beginPath()
    roundRect(ctx, MARGEN, BAR_Y, Math.max(16, CONTENIDO * avance), 16, 8)
    ctx.fill()
  }

  // ══════════════════════════════════════════════════════════════════
  // FRANJA DE PAGO / CONTACTO
  // ══════════════════════════════════════════════════════════════════
  const FY = BAR_Y + 40
  const FH = 128
  const franja = ctx.createLinearGradient(MARGEN, 0, MARGEN + CONTENIDO, 0)
  franja.addColorStop(0, '#FFD54A')
  franja.addColorStop(0.5, C.rayo)
  franja.addColorStop(1, '#E9A400')
  sombra('rgba(244,180,0,0.35)', 30, 6)
  ctx.fillStyle = franja
  ctx.beginPath()
  roundRect(ctx, MARGEN, FY, CONTENIDO, FH, 26)
  ctx.fill()
  sinSombra()

  textoConIcono('celular', 'izq', `Nequi ${formatCelular(RIFA.celularResponsable)}`, ANCHO / 2, FY + 66, '800', 54, C.zeus, CONTENIDO - 60)
  textoConIcono('corazon', 'der', 'Escríbenos al WhatsApp y recibe tu número', ANCHO / 2, FY + 106, '600', 27, C.zeus, CONTENIDO - 60, '#C2185B')

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
      await navigator.share({ files: [file], title: RIFA.titulo, text: RIFA.mensajeCompartir })
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
