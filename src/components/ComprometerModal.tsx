'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatNumero, formatCOP, formatCelular, formatCelularParcial, listaNumeros } from '@/lib/formato'
import { esCelularColombia, normalizarCelular } from '@/lib/validaciones'
import { useViewportVisible } from '@/hooks/useViewportVisible'
import { RIFA } from '@/config/rifa'
import ConfirmDialog from '@/components/ConfirmDialog'

const EMAIL_A_NOMBRE: Record<string, string> = {
  'felipet27@gmail.com':      'Felipe',
  'profejohana109@gmail.com': 'Joha',
  'johanak109@gmail.com':     'Joha',
}

// Contact Picker API: solo existe en Chrome Android (no en Safari/iOS)
type ContactoElegido = { name?: string[]; tel?: string[] }
type SelectorContactos = {
  select: (props: string[], opts?: { multiple?: boolean }) => Promise<ContactoElegido[]>
}

type Props = {
  numeros: number[]
  onClose: () => void
  onSuccess: (numeros: number[]) => void
}

type Resultado = { guardadas: number[]; fallidas: number[] }

export default function ComprometerModal({ numeros, onClose, onSuccess }: Props) {
  const [nombre, setNombre]   = useState('')
  const [celular, setCelular] = useState('')   // solo dígitos
  const [celularTocado, setCelularTocado] = useState(false)
  const [notas, setNotas]     = useState('')
  const [pagada, setPagada]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [hayContactos, setHayContactos] = useState(false)

  const viewport   = useViewportVisible()
  const formRef    = useRef<HTMLFormElement>(null)
  const nombreRef  = useRef<HTMLInputElement>(null)
  const celularRef = useRef<HTMLInputElement>(null)
  const notasRef   = useRef<HTMLInputElement>(null)

  const varias        = numeros.length > 1
  const celularValido = esCelularColombia(celular)
  const errorCelular  =
    celular.length > 0 && !celular.startsWith('3')
      ? 'El celular debe empezar por 3'
      : celularTocado && !celularValido
        ? celular.length === 0
          ? 'Escribe el celular'
          : `Faltan ${10 - celular.length} ${10 - celular.length === 1 ? 'dígito' : 'dígitos'}`
        : null
  const conDatos = Boolean(nombre.trim() || celular || notas.trim() || pagada)

  useEffect(() => {
    setHayContactos('contacts' in navigator && 'ContactsManager' in window)

    // Evita que la página de fondo se desplace mientras el modal está abierto
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') intentarCerrar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function intentarCerrar() {
    if (loading) return
    if (resultado) return onSuccess(resultado.guardadas)
    if (conDatos) return setConfirmarDescarte(true)
    onClose()
  }

  // Al enfocar un campo, se espera a que el teclado termine de abrir y se lleva el campo a la vista
  function alEnfocar(e: React.FocusEvent<HTMLElement>) {
    const campo = e.currentTarget
    setTimeout(() => campo.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300)
  }

  // "Siguiente" en el teclado pasa al próximo campo en vez de enviar el formulario
  function pasarA(siguiente: React.RefObject<HTMLInputElement | null>) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      siguiente.current?.focus()
    }
  }

  async function elegirContacto() {
    const contactos = (navigator as Navigator & { contacts?: SelectorContactos }).contacts
    if (!contactos) return
    try {
      const [contacto] = await contactos.select(['name', 'tel'], { multiple: false })
      if (!contacto) return
      const nombreContacto = contacto.name?.[0]?.trim()
      if (nombreContacto) setNombre(nombreContacto)
      // Se prefiere el primer número que sea celular colombiano válido
      const tels = (contacto.tel ?? []).map(normalizarCelular)
      const tel  = tels.find(esCelularColombia) ?? tels[0]
      if (tel) {
        setCelular(tel)
        setCelularTocado(true)
      }
      notasRef.current?.focus()
    } catch {
      // el usuario cerró la agenda sin elegir
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nombre.trim()) {
      setError('Escribe el nombre del comprador')
      nombreRef.current?.focus()
      return
    }
    if (!celularValido) {
      setCelularTocado(true)
      celularRef.current?.focus()
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Obtener el nombre del usuario logueado
    const { data: { user } } = await supabase.auth.getUser()
    const responsable = EMAIL_A_NOMBRE[user?.email ?? ''] ?? null

    const guardadas: number[] = []
    const fallidas: number[]  = []
    let soloTomadas = true

    for (const numero of numeros) {
      const { error: rpcError } = await supabase.rpc('comprometer_boleta', {
        p_numero:  numero,
        p_nombre:  nombre.trim(),
        p_celular: celular,
        p_notas:   notas.trim() || null,
        p_pagada:  pagada,
      })

      if (rpcError) {
        fallidas.push(numero)
        if (!rpcError.message.includes('ya no está libre')) soloTomadas = false
        continue
      }
      guardadas.push(numero)

      // Guardar quién vendió la boleta
      if (responsable) {
        await supabase
          .from('boletas')
          .update({ responsable })
          .eq('numero', numero)
      }
    }

    setLoading(false)

    if (guardadas.length === 0) {
      setError(
        !soloTomadas
          ? 'Error al guardar. Intenta de nuevo.'
          : varias
            ? 'Estas boletas acaban de ser tomadas.'
            : 'Esta boleta acaba de ser tomada.',
      )
      return
    }

    setResultado({ guardadas, fallidas })
  }

  function mensajeWhatsApp(guardadas: number[]): string {
    const primerNombre = nombre.trim().split(/\s+/)[0]
    const n = guardadas.length
    const pago = pagada
      ? 'Tu pago ya quedó registrado ✅'
      : `El valor es ${formatCOP(n * RIFA.valorBoleta)}${n > 1 ? ` (${formatCOP(RIFA.valorBoleta)} c/u)` : ''}. ` +
        `Puedes pagar por Nequi al ${formatCelular(RIFA.celularResponsable)} y enviarnos el comprobante por aquí.`

    return [
      `¡Hola ${primerNombre}! 🐾 Gracias por apoyar a ${RIFA.nombrePerro}.`,
      '',
      `Quedaste con ${n === 1 ? 'el número' : 'los números'} *${listaNumeros(guardadas)}* en la rifa. ` +
        `Juega el ${RIFA.fechaSorteoTexto} con las ${RIFA.mecanica} de la ${RIFA.loteria} y el premio es de ${formatCOP(RIFA.premio)}.`,
      '',
      pago,
      '',
      '¡Mucha suerte! 🍀',
    ].join('\n')
  }

  function enviarWhatsApp(guardadas: number[]) {
    const url = `https://wa.me/57${celular}?text=${encodeURIComponent(mensajeWhatsApp(guardadas))}`
    window.open(url, '_blank', 'noopener')
  }

  const inputBase =
    'w-full border-2 rounded-xl px-4 py-3 text-base text-zeus bg-fondo focus:outline-none transition-colors'

  return (
    <>
      <div
        className={`fixed inset-x-0 top-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/40 backdrop-blur-sm overlay-in ${
          viewport ? '' : 'h-[100dvh]'
        }`}
        style={viewport ? { top: viewport.top, height: viewport.height } : undefined}
        onClick={(e) => e.target === e.currentTarget && intentarCerrar()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="comprometer-titulo"
          className="modal-up bg-superficie w-full md:max-w-sm rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[calc(100%-1rem)] md:max-h-full"
        >
          {/* Agarradera de la hoja inferior */}
          <div className="md:hidden flex justify-center pt-2.5">
            <span className="w-10 h-1.5 rounded-full bg-borde" />
          </div>

          {resultado ? (
            // ── Confirmación ───────────────────────────────────────────
            <div className="px-6 pt-4 overflow-y-auto" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
              <div className="text-center">
                <span className="text-5xl block mb-2">✅</span>
                <h2 id="comprometer-titulo" className="text-xl font-bold text-zeus">¡Listo!</h2>
                <p className="text-libre-texto mt-1">
                  {resultado.guardadas.length === 1 ? 'Boleta' : 'Boletas'}{' '}
                  <span className="font-bold text-zeus">{listaNumeros(resultado.guardadas)}</span>{' '}
                  para <span className="font-semibold text-zeus">{nombre.trim()}</span>
                </p>
                <p className={`text-sm mt-1 font-medium ${pagada ? 'text-pagada' : 'text-debe'}`}>
                  {pagada ? 'Pagada' : `Pendiente de pago · ${formatCOP(resultado.guardadas.length * RIFA.valorBoleta)}`}
                </p>
              </div>

              {resultado.fallidas.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 text-debe text-sm rounded-xl p-3 mt-4">
                  No se pudo apartar {listaNumeros(resultado.fallidas)}: alguien la tomó primero o hubo un error.
                </div>
              )}

              <div className="space-y-3 mt-6">
                <button
                  type="button"
                  onClick={() => enviarWhatsApp(resultado.guardadas)}
                  className="w-full bg-[#25D366] text-white font-bold rounded-xl py-3.5 hover:brightness-95 active:scale-[0.98] transition-all min-h-[48px]"
                >
                  💬 Enviar confirmación por WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => onSuccess(resultado.guardadas)}
                  className="w-full border border-borde rounded-xl py-3 text-zeus font-medium hover:bg-fondo active:scale-[0.98] transition-all min-h-[48px]"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : (
            // ── Formulario ─────────────────────────────────────────────
            <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col min-h-0 flex-1">
              <div className="px-6 pt-3 pb-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h2 id="comprometer-titulo" className="text-lg font-bold text-zeus">
                    {varias ? `Comprometer ${numeros.length} boletas` : `Comprometer boleta ${formatNumero(numeros[0])}`}
                  </h2>
                  {varias && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {numeros.map((n) => (
                        <span key={n} className="bg-rayo/20 text-zeus text-sm font-bold tabular-nums rounded-lg px-2 py-0.5">
                          {formatNumero(n)}
                        </span>
                      ))}
                      <span className="text-sm text-libre-texto self-center ml-1">
                        · {formatCOP(numeros.length * RIFA.valorBoleta)}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={intentarCerrar}
                  aria-label="Cerrar"
                  className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full text-libre-texto hover:bg-fondo text-xl"
                >
                  ×
                </button>
              </div>

              <div className="px-6 overflow-y-auto overscroll-contain space-y-4 flex-1 min-h-0 pb-2">
                <div>
                  <div className="flex items-end justify-between mb-1">
                    <label className="block text-sm font-medium text-zeus" htmlFor="nombre">
                      Nombre <span className="text-peligro">*</span>
                    </label>
                    {hayContactos && (
                      <button
                        type="button"
                        onClick={elegirContacto}
                        className="text-sm font-medium text-buganvilla px-2 py-1 -mr-2 rounded-lg hover:bg-fondo"
                      >
                        📇 Elegir contacto
                      </button>
                    )}
                  </div>
                  <input
                    ref={nombreRef}
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    onKeyDown={pasarA(celularRef)}
                    onFocus={alEnfocar}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    className={`${inputBase} border-borde focus:border-rayo`}
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zeus mb-1" htmlFor="celular">
                    Celular <span className="text-peligro">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={celularRef}
                      id="celular"
                      type="tel"
                      inputMode="numeric"
                      value={formatCelularParcial(celular)}
                      onChange={(e) => setCelular(normalizarCelular(e.target.value))}
                      onBlur={() => celular && setCelularTocado(true)}
                      onKeyDown={pasarA(notasRef)}
                      onFocus={alEnfocar}
                      autoComplete="off"
                      enterKeyHint="next"
                      aria-invalid={Boolean(errorCelular)}
                      aria-describedby={errorCelular ? 'celular-error' : undefined}
                      className={`${inputBase} pr-11 tabular-nums tracking-wide ${
                        errorCelular
                          ? 'border-peligro focus:border-peligro'
                          : celularValido
                            ? 'border-pagada focus:border-pagada'
                            : 'border-borde focus:border-rayo'
                      }`}
                      placeholder="317 378 0801"
                    />
                    {celularValido && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-pagada text-white text-sm flex items-center justify-center pointer-events-none">
                        ✓
                      </span>
                    )}
                  </div>
                  {errorCelular && (
                    <p id="celular-error" className="text-sm text-peligro mt-1">{errorCelular}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zeus mb-1" htmlFor="notas">
                    Notas{' '}
                    <span className="text-libre-texto font-normal">(opcional)</span>
                  </label>
                  <input
                    ref={notasRef}
                    id="notas"
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      formRef.current?.requestSubmit()
                    }}
                    onFocus={alEnfocar}
                    autoComplete="off"
                    enterKeyHint="done"
                    className={`${inputBase} border-borde focus:border-rayo`}
                    placeholder="Observaciones..."
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-zeus mb-1">¿Ya pagó?</p>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Estado del pago">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!pagada}
                      onClick={() => setPagada(false)}
                      className={`rounded-xl py-3 border-2 font-semibold transition-colors min-h-[48px] ${
                        !pagada ? 'border-debe bg-debe/10 text-debe' : 'border-borde text-libre-texto'
                      }`}
                    >
                      ⏳ Pendiente
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={pagada}
                      onClick={() => setPagada(true)}
                      className={`rounded-xl py-3 border-2 font-semibold transition-colors min-h-[48px] ${
                        pagada ? 'border-pagada bg-pagada/10 text-pagada' : 'border-borde text-libre-texto'
                      }`}
                    >
                      ✅ Pagada
                    </button>
                  </div>
                </div>
              </div>

              {/* Botones fijos: siempre visibles, aunque el teclado esté abierto */}
              <div
                className="px-6 pt-3 border-t border-borde bg-superficie md:rounded-b-2xl"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                {error && (
                  <div role="alert" className="bg-red-50 border border-red-200 text-peligro text-sm rounded-xl p-3 mb-3">
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={intentarCerrar}
                    disabled={loading}
                    className="flex-1 border border-borde rounded-xl py-3 text-zeus font-medium hover:bg-fondo active:scale-95 transition-all disabled:opacity-50 min-h-[48px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[1.4] bg-rayo text-zeus font-bold rounded-xl py-3 hover:brightness-95 active:scale-95 transition-all disabled:opacity-50 min-h-[48px]"
                  >
                    {loading ? 'Guardando...' : varias ? `Comprometer ${numeros.length}` : 'Comprometer'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {confirmarDescarte && (
        <ConfirmDialog
          mensaje="¿Descartar los datos escritos? Se perderá lo que llenaste."
          labelConfirmar="Descartar"
          variante="peligro"
          onCancelar={() => setConfirmarDescarte(false)}
          onConfirmar={onClose}
        />
      )}
    </>
  )
}
