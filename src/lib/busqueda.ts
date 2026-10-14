import type { Boleta } from '@/types/boleta'

export type FiltroEstado = 'todas' | 'libres' | 'comprometidas' | 'pagadas' | 'debe'
export type Orden = 'numero' | 'nombre' | 'recientes'

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function detectarTipo(query: string): 'numero' | 'celular' | 'texto' {
  const soloDigitos = /^\d+$/.test(query.trim())
  if (soloDigitos) {
    return query.trim().length <= 2 ? 'numero' : 'celular'
  }
  return 'texto'
}

export function filtrarBoletas(
  boletas: Boleta[],
  query: string,
  filtroEstado: FiltroEstado,
  orden: Orden
): Boleta[] {
  let resultado = [...boletas]

  if (query.trim()) {
    const tipo = detectarTipo(query)
    const q = query.trim()

    if (tipo === 'numero') {
      const num = parseInt(q, 10)
      resultado = resultado.filter((b) => b.numero === num)
    } else if (tipo === 'celular') {
      const digits = q.replace(/\D/g, '')
      resultado = resultado.filter((b) => b.celular?.includes(digits))
    } else {
      const qNorm = normalizar(q)
      resultado = resultado.filter(
        (b) =>
          normalizar(b.nombre ?? '').includes(qNorm) ||
          normalizar(b.notas ?? '').includes(qNorm)
      )
    }
  }

  switch (filtroEstado) {
    case 'libres':
      resultado = resultado.filter((b) => b.estado === 'libre')
      break
    case 'comprometidas':
      resultado = resultado.filter((b) => b.estado === 'comprometida')
      break
    case 'pagadas':
      resultado = resultado.filter((b) => b.pagada)
      break
    case 'debe':
      resultado = resultado.filter((b) => b.estado === 'comprometida' && !b.pagada)
      break
  }

  switch (orden) {
    case 'numero':
      resultado.sort((a, b) => a.numero - b.numero)
      break
    case 'nombre':
      resultado.sort((a, b) =>
        (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es')
      )
      break
    case 'recientes':
      resultado.sort((a, b) => {
        const dA = a.comprometida_en ? new Date(a.comprometida_en).getTime() : 0
        const dB = b.comprometida_en ? new Date(b.comprometida_en).getTime() : 0
        return dB - dA
      })
      break
  }

  return resultado
}
