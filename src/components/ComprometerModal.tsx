'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatNumero, formatCOP, formatCelular, listaNumeros } from '@/lib/formato'
import { esCelularColombia } from '@/lib/validaciones'
import { RIFA } from '@/config/rifa'
import ConfirmDialog from '@/components/ConfirmDialog'
import HojaInferior, { PieHoja } from '@/components/HojaInferior'
import CamposComprador from '@/components/CamposComprador'

const EMAIL_A_NOMBRE: Record<string, string> = {
  'felipet27@gmail.com':      'Felipe',
  'profejohana109@gmail.com': 'Joha',
  'johanak109@gmail.com':     'Joha',
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

  const formRef    = useRef<HTMLFormElement>(null)
  const nombreRef  = useRef<HTMLInputElement>(null)
  const celularRef = useRef<HTMLInputElement>(null)

  const varias        = numeros.length > 1
  const celularValido = esCelularColombia(celular)
  const conDatos = Boolean(nombre.trim() || celular || notas.trim() || pagada)

  function intentarCerrar() {
    if (loading) return
    if (resultado) return onSuccess(resultado.guardadas)
    if (conDatos) return setConfirmarDescarte(true)
    onClose()
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

  return (
    <>
      <HojaInferior tituloId="comprometer-titulo" onIntentarCerrar={intentarCerrar}>
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
                <CamposComprador
                  idPrefijo="c"
                  nombre={nombre}
                  setNombre={setNombre}
                  celular={celular}
                  setCelular={setCelular}
                  celularTocado={celularTocado}
                  setCelularTocado={setCelularTocado}
                  notas={notas}
                  setNotas={setNotas}
                  nombreRef={nombreRef}
                  celularRef={celularRef}
                  enfocarNombre
                  onEnviar={() => formRef.current?.requestSubmit()}
                />

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

              <PieHoja error={error}>
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
              </PieHoja>
            </form>
          )}
      </HojaInferior>

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
