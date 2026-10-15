// Celulares aceptados. Cómo se guardan en la base de datos (solo dígitos):
//   Colombia → 10 dígitos sin indicativo:  3173780801
//   EE. UU.  → "1" + 10 dígitos:           13055550123
export type Pais = 'CO' | 'US'

export const PAISES: Record<Pais, { bandera: string; indicativo: string; ejemplo: string }> = {
  CO: { bandera: '🇨🇴', indicativo: '57', ejemplo: '317 378 0801' },
  US: { bandera: '🇺🇸', indicativo: '1',  ejemplo: '305 555 0123' },
}

export function paisDeCelular(guardado: string): Pais {
  return guardado.length === 11 && guardado.startsWith('1') ? 'US' : 'CO'
}

// Los 10 dígitos locales, sin indicativo
export function localDeCelular(guardado: string): string {
  return paisDeCelular(guardado) === 'US' ? guardado.slice(1) : guardado
}

export function celularGuardado(pais: Pais, local: string): string {
  return pais === 'US' && local ? `1${local}` : local
}

export function esLocalValido(pais: Pais, local: string): boolean {
  if (!/^\d{10}$/.test(local)) return false
  // Colombia: celulares empiezan por 3. EE. UU.: el código de área no empieza por 0 ni 1.
  return pais === 'CO' ? local.startsWith('3') : /^[2-9]/.test(local)
}

// Valida el celular tal como se guarda (colombiano o estadounidense)
export function esCelularValido(guardado: string): boolean {
  const digits = guardado.replace(/\D/g, '')
  return esLocalValido(paisDeCelular(digits), localDeCelular(digits))
}

// Interpreta lo que se escribe, pega o llega de la agenda: quita espacios y guiones,
// y reconoce el indicativo +57 o +1 para elegir el país automáticamente.
export function interpretarCelular(valor: string, paisActual: Pais): { pais: Pais; local: string } {
  const digits = valor.replace(/\D/g, '')
  if (valor.trim().startsWith('+1') || (digits.length === 11 && digits.startsWith('1'))) {
    return { pais: 'US', local: digits.slice(1, 11) }
  }
  if (digits.length > 10 && digits.startsWith('57')) {
    return { pais: 'CO', local: digits.slice(2, 12) }
  }
  return { pais: paisActual, local: digits.slice(0, 10) }
}

// Número completo con indicativo para enlaces wa.me
export function celularWhatsApp(guardado: string): string {
  const digits = guardado.replace(/\D/g, '')
  return paisDeCelular(digits) === 'US' ? digits : `57${digits}`
}
