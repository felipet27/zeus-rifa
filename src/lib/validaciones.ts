export function esCelularColombia(valor: string): boolean {
  const digits = valor.replace(/\D/g, '')
  return digits.length === 10 && digits.startsWith('3')
}

// Deja solo los 10 dígitos de un celular colombiano: quita espacios, guiones y el indicativo +57
// (útil al pegar o al elegir un contacto de la agenda).
export function normalizarCelular(valor: string): string {
  let digits = valor.replace(/\D/g, '')
  if (digits.length > 10 && digits.startsWith('57')) digits = digits.slice(2)
  return digits.slice(0, 10)
}
