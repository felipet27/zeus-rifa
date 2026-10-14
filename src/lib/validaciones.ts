export function esCelularColombia(valor: string): boolean {
  const digits = valor.replace(/\D/g, '')
  return digits.length === 10 && digits.startsWith('3')
}
