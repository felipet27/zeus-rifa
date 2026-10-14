'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatNumero } from '@/lib/formato'
import { esCelularColombia } from '@/lib/validaciones'
import type { Boleta } from '@/types/boleta'

type Props = {
  boleta: Boleta
  onClose: () => void
  onSuccess: () => void
}

export default function EditarBoletaModal({ boleta, onClose, onSuccess }: Props) {
  const [nombre, setNombre] = useState(boleta.nombre ?? '')
  const [celular, setCelular] = useState(boleta.celular ?? '')
  const [notas, setNotas] = useState(boleta.notas ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!esCelularColombia(celular)) {
      setError('El celular debe tener 10 dígitos y empezar por 3 (ej. 317 378 0801)')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: dbError } = await supabase
      .from('boletas')
      .update({
        nombre: nombre.trim(),
        celular: celular.replace(/\D/g, ''),
        notas: notas.trim() || null,
      })
      .eq('numero', boleta.numero)

    if (dbError) {
      setError('Error al guardar. Intenta de nuevo.')
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-superficie rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <h2 className="text-lg font-bold text-zeus mb-5">
          Editar boleta {formatNumero(boleta.numero)}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-peligro text-sm rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zeus mb-1" htmlFor="e-nombre">
              Nombre <span className="text-peligro">*</span>
            </label>
            <input
              id="e-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoFocus
              className="w-full border border-borde rounded-xl px-4 py-3 text-zeus bg-fondo focus:outline-none focus:border-rayo transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zeus mb-1" htmlFor="e-celular">
              Celular <span className="text-peligro">*</span>
            </label>
            <input
              id="e-celular"
              type="tel"
              inputMode="numeric"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              required
              className="w-full border border-borde rounded-xl px-4 py-3 text-zeus bg-fondo focus:outline-none focus:border-rayo transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zeus mb-1" htmlFor="e-notas">
              Notas{' '}
              <span className="text-libre-texto font-normal">(opcional)</span>
            </label>
            <textarea
              id="e-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full border border-borde rounded-xl px-4 py-3 text-zeus bg-fondo focus:outline-none focus:border-rayo transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-borde rounded-xl py-3 text-zeus font-medium hover:bg-fondo transition-colors disabled:opacity-50 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-rayo text-zeus font-bold rounded-xl py-3 hover:brightness-95 transition-all disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
