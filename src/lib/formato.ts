export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumero(numero: number): string {
  return numero.toString().padStart(2, '0')
}

export function formatCelular(celular: string): string {
  const d = celular.replace(/\D/g, '')
  // EE. UU.: se guarda con el indicativo 1 al inicio
  if (d.length === 11 && d.startsWith('1')) {
    return `+1 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  }
  if (d.length === 10) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  }
  return celular
}

// Formato mientras se escribe: "317", "317 378", "317 378 0801"
export function formatCelularParcial(digits: string): string {
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join(' ')
}

// "07", "07 y 23", "07, 23 y 45"
export function listaNumeros(numeros: number[]): string {
  const f = numeros.map(formatNumero)
  return f.length <= 1 ? f.join('') : `${f.slice(0, -1).join(', ')} y ${f[f.length - 1]}`
}
