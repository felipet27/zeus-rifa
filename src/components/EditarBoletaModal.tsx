'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatNumero } from '@/lib/formato'
import { esCelularColombia, normalizarCelular } from '@/lib/validaciones'
import ConfirmDialog from '@/components/ConfirmDialog'
import HojaInferior, { PieHoja } from '@/components/HojaInferior'
import CamposComprador from '@/components/CamposComprador'
import type { Boleta } from '@/types/boleta'

type Props = {
  boleta: Boleta
  onClose: () => void
  onSuccess: () => void
}

export default function EditarBoletaModal({ boleta, onClose, onSuccess }: Props) {
  const inicial = {
    nombre:  boleta.nombre ?? '',
    celular: normalizarCelular(boleta.celular ?? ''),
    notas:   boleta.notas ?? '',
  }

  const [nombre, setNombre]   = useState(inicial.nombre)
  const [celular, setCelular] = useState(inicial.celular)   // solo dígitos
  const [celularTocado, setCelularTocado] = useState(true)
  const [notas, setNotas]     = useState(inicial.notas)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)

  const formRef    = useRef<HTMLFormElement>(null)
  const nombreRef  = useRef<HTMLInputElement>(null)
  const celularRef = useRef<HTMLInputElement>(null)

  const huboCambios =
    nombre.trim() !== inicial.nombre.trim() ||
    celular !== inicial.celular ||
    notas.trim() !== inicial.notas.trim()

  function intentarCerrar() {
    if (loading) return
    if (huboCambios) return setConfirmarDescarte(true)
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
    if (!esCelularColombia(celular)) {
      setCelularTocado(true)
      celularRef.current?.focus()
      return
    }
    if (!huboCambios) return onClose()

    setLoading(true)

    const supabase = createClient()
    const { error: dbError } = await supabase
      .from('boletas')
      .update({
        nombre:  nombre.trim(),
        celular,
        notas:   notas.trim() || null,
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
    <>
      <HojaInferior tituloId="editar-titulo" onIntentarCerrar={intentarCerrar}>
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col min-h-0 flex-1">
          <div className="px-6 pt-3 pb-4 flex items-start gap-3">
            <h2 id="editar-titulo" className="flex-1 min-w-0 text-lg font-bold text-zeus">
              Editar boleta {formatNumero(boleta.numero)}
            </h2>
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
              idPrefijo="e"
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
              onEnviar={() => formRef.current?.requestSubmit()}
            />
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
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </PieHoja>
        </form>
      </HojaInferior>

      {confirmarDescarte && (
        <ConfirmDialog
          mensaje="¿Descartar los cambios? Se perderá lo que modificaste."
          labelConfirmar="Descartar"
          variante="peligro"
          onCancelar={() => setConfirmarDescarte(false)}
          onConfirmar={onClose}
        />
      )}
    </>
  )
}
