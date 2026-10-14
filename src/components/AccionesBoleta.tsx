'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatNumero } from '@/lib/formato'
import ComprometerModal from './ComprometerModal'
import EditarBoletaModal from './EditarBoletaModal'
import ConfirmDialog from './ConfirmDialog'
import type { Boleta } from '@/types/boleta'

type Props = {
  boleta: Boleta
  onMensaje?: (msg: string) => void
}

export default function AccionesBoleta({ boleta, onMensaje }: Props) {
  const [modalComprometer, setModalComprometer] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [dialogLiberar, setDialogLiberar] = useState(false)
  const [cargandoPago, setCargandoPago] = useState(false)
  const [cargandoLiberar, setCargandoLiberar] = useState(false)

  async function togglePago() {
    setCargandoPago(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('boletas')
      .update({ pagada: !boleta.pagada })
      .eq('numero', boleta.numero)

    setCargandoPago(false)
    if (error) {
      onMensaje?.('Error al cambiar el estado de pago')
    } else {
      const etiqueta = boleta.pagada ? 'Debe' : 'Pagada'
      onMensaje?.(`Boleta ${formatNumero(boleta.numero)} marcada como ${etiqueta}`)
    }
  }

  async function liberar() {
    setCargandoLiberar(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('liberar_boleta', {
      p_numero: boleta.numero,
    })

    setCargandoLiberar(false)
    setDialogLiberar(false)
    if (error) {
      onMensaje?.('Error al liberar la boleta')
    } else {
      onMensaje?.(`Boleta ${formatNumero(boleta.numero)} liberada`)
    }
  }

  if (boleta.estado === 'libre') {
    return (
      <>
        <button
          onClick={() => setModalComprometer(true)}
          className="mt-3 w-full bg-rayo text-zeus font-bold rounded-xl py-2.5 hover:brightness-95 transition-all min-h-[44px] text-sm"
        >
          Comprometer
        </button>
        {modalComprometer && (
          <ComprometerModal
            numero={boleta.numero}
            onClose={() => setModalComprometer(false)}
            onSuccess={(num) => {
              setModalComprometer(false)
              onMensaje?.(`Boleta ${formatNumero(num)} comprometida ✓`)
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="flex gap-2 mt-3">
        <button
          onClick={togglePago}
          disabled={cargandoPago}
          className={`flex-1 text-xs font-semibold rounded-lg py-2 transition-colors min-h-[36px] disabled:opacity-50 ${
            boleta.pagada
              ? 'bg-pagada/10 text-pagada hover:bg-pagada/20'
              : 'bg-debe/10 text-debe hover:bg-debe/20'
          }`}
        >
          {cargandoPago ? '...' : boleta.pagada ? 'Pagada · marcar Debe' : 'Debe · marcar Pagada'}
        </button>
        <button
          onClick={() => setModalEditar(true)}
          className="px-3 py-2 text-xs font-medium rounded-lg border border-borde text-zeus hover:bg-fondo transition-colors min-h-[36px]"
        >
          Editar
        </button>
        <button
          onClick={() => setDialogLiberar(true)}
          className="px-3 py-2 text-xs font-medium rounded-lg border border-peligro/40 text-peligro hover:bg-peligro/5 transition-colors min-h-[36px]"
        >
          Liberar
        </button>
      </div>

      {modalEditar && (
        <EditarBoletaModal
          boleta={boleta}
          onClose={() => setModalEditar(false)}
          onSuccess={() => {
            setModalEditar(false)
            onMensaje?.(`Boleta ${formatNumero(boleta.numero)} actualizada ✓`)
          }}
        />
      )}

      {dialogLiberar && (
        <ConfirmDialog
          mensaje={`¿Liberar la boleta ${formatNumero(boleta.numero)} de ${boleta.nombre}? Se borrarán sus datos.`}
          labelConfirmar="Liberar"
          onCancelar={() => setDialogLiberar(false)}
          onConfirmar={liberar}
          cargando={cargandoLiberar}
          variante="peligro"
        />
      )}
    </>
  )
}
