'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatNumero } from '@/lib/formato'
import { RIFA } from '@/config/rifa'
import ComprometerModal from './ComprometerModal'
import EditarBoletaModal from './EditarBoletaModal'
import ConfirmDialog from './ConfirmDialog'
import { celularWhatsApp } from '@/lib/validaciones'
import type { Boleta } from '@/types/boleta'

type Props = {
  boleta: Boleta
  onMensaje?: (msg: string) => void
}

function urlWhatsApp(boleta: Boleta): string {
  const msg = encodeURIComponent(
    `Hola ${boleta.nombre ?? ''} 😊, te quería recordar que tu boleta N.° ${formatNumero(boleta.numero)} de la rifa por Zeus juega el *Viernes 30 de Octubre* con la Lotería de Medellín 🎰. ¡Gracias por apoyar! ❤️🐾`
  )
  return `https://wa.me/${celularWhatsApp(boleta.celular ?? '')}?text=${msg}`
}

export default function AccionesBoleta({ boleta, onMensaje }: Props) {
  const [modalComprometer, setModalComprometer] = useState(false)
  const [modalEditar, setModalEditar]           = useState(false)
  const [dialogLiberar, setDialogLiberar]       = useState(false)
  const [cargandoPago, setCargandoPago]         = useState(false)
  const [cargandoLiberar, setCargandoLiberar]   = useState(false)

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
      onMensaje?.(`Boleta ${formatNumero(boleta.numero)} marcada como ${boleta.pagada ? 'Debe' : 'Pagada'}`)
    }
  }

  async function liberar() {
    setCargandoLiberar(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('liberar_boleta', { p_numero: boleta.numero })

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
          className="mt-3 w-full bg-rayo text-zeus font-bold rounded-xl py-2.5 hover:brightness-95 active:scale-95 transition-all min-h-[44px] text-sm"
        >
          Comprometer
        </button>
        {modalComprometer && (
          <ComprometerModal
            numeros={[boleta.numero]}
            onClose={() => setModalComprometer(false)}
            onSuccess={() => {
              setModalComprometer(false)
              onMensaje?.(`Boleta ${formatNumero(boleta.numero)} comprometida`)
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="flex gap-2 mt-3">
        {/* WhatsApp */}
        {boleta.celular && (
          <a
            href={urlWhatsApp(boleta)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 active:scale-95 transition-all min-h-[36px]"
          >
            {/* Ícono WhatsApp SVG */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </a>
        )}

        {/* Toggle pago */}
        <button
          onClick={togglePago}
          disabled={cargandoPago}
          className={`flex-1 text-xs font-semibold rounded-lg py-2 transition-all active:scale-95 min-h-[36px] disabled:opacity-50 ${
            boleta.pagada
              ? 'bg-pagada/10 text-pagada hover:bg-pagada/20'
              : 'bg-debe/10 text-debe hover:bg-debe/20'
          }`}
        >
          {cargandoPago ? '...' : boleta.pagada ? 'Pagada · marcar Debe' : 'Debe · marcar Pagada'}
        </button>

        {/* Editar */}
        <button
          onClick={() => setModalEditar(true)}
          className="px-3 py-2 text-xs font-medium rounded-lg border border-borde text-zeus hover:bg-fondo active:scale-95 transition-all min-h-[36px]"
        >
          Editar
        </button>

        {/* Liberar */}
        <button
          onClick={() => setDialogLiberar(true)}
          className="px-3 py-2 text-xs font-medium rounded-lg border border-peligro/40 text-peligro hover:bg-peligro/5 active:scale-95 transition-all min-h-[36px]"
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
