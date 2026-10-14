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
  if (d.length === 10) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  }
  return celular
}
