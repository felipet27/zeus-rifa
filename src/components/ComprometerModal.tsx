'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatNumero } from '@/lib/formato'
import { esCelularColombia } from '@/lib/validaciones'

const EMAIL_A_NOMBRE: Record<string, string> = {
  'felipet27@gmail.com':      'Felipe',
  'profejohana109@gmail.com': 'Joha',
  'johanak109@gmail.com':     'Joha',
}

type Props = {
  numero: number
  onClose: () => void
  onSuccess: (numero: number) => void
}

export default function ComprometerModal({ numero, onClose, onSuccess }: Props) {
  const [nombre, setNombre]   = useState('')
  const [celular, setCelular] = useState('')
  const [notas, setNotas]     = useState('')
  const [pagada, setPagada]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!esCelularColombia(celular)) {
      setError('El celular debe tener 10 dígitos y empezar por 3 (ej. 317 378 0801)')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Obtener el nombre del usuario logueado
    const { data: { user } } = await supabase.auth.getUser()
    const responsable = EMAIL_A_NOMBRE[user?.email ?? ''] ?? null

    const { error: rpcError } = await supabase.rpc('comprometer_boleta', {
      p_numero:  numero,
      p_nombre:  nombre.trim(),
      p_celular: celular.replace(/\D/g, ''),
      p_notas:   notas.trim() || null,
      p_pagada:  pagada,
    })

    if (rpcError) {
      const msg = rpcError.message.includes('ya no está libre')
        ? 'Esta boleta acaba de ser tomada.'
        : 'Error al guardar. Intenta de nuevo.'
      setError(msg)
      setLoading(false)
      return
    }

    // Guardar quién vendió la boleta
    if (responsable) {
      await supabase
        .from('boletas')
        .update({ responsable })
        .eq('numero', numero)
    }

    onSuccess(numero)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm overlay-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-up bg-superficie rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-zeus mb-5">
          Comprometer boleta {formatNumero(numero)}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-peligro text-sm rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zeus mb-1" htmlFor="nombre">
              Nombre <span className="text-peligro">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoFocus
              className="w-full border border-borde rounded-xl px-4 py-3 text-zeus bg-fondo focus:outline-none focus:border-rayo transition-colors"
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zeus mb-1" htmlFor="celular">
              Celular <span className="text-peligro">*</span>
            </label>
            <input
              id="celular"
              type="tel"
              inputMode="numeric"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              required
              className="w-full border border-borde rounded-xl px-4 py-3 text-zeus bg-fondo focus:outline-none focus:border-rayo transition-colors"
              placeholder="317 378 0801"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zeus mb-1" htmlFor="notas">
              Notas{' '}
              <span className="text-libre-texto font-normal">(opcional)</span>
            </label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full border border-borde rounded-xl px-4 py-3 text-zeus bg-fondo focus:outline-none focus:border-rayo transition-colors resize-none"
              placeholder="Observaciones..."
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-zeus">¿Ya pagó?</p>
              <p className="text-xs text-libre-texto">{pagada ? 'Pagada ✓' : 'Pendiente de pago'}</p>
            </div>
            <button
              type="button"
              onClick={() => setPagada(!pagada)}
              aria-checked={pagada}
              role="switch"
              className={`relative w-12 h-6 rounded-full transition-colors ${
                pagada ? 'bg-pagada' : 'bg-libre'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  pagada ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-borde rounded-xl py-3 text-zeus font-medium hover:bg-fondo active:scale-95 transition-all disabled:opacity-50 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-rayo text-zeus font-bold rounded-xl py-3 hover:brightness-95 active:scale-95 transition-all disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Guardando...' : 'Comprometer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
