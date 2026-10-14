'use client'

type Props = {
  mensaje: string
  labelConfirmar?: string
  onCancelar: () => void
  onConfirmar: () => void
  cargando?: boolean
  variante?: 'peligro' | 'normal'
}

export default function ConfirmDialog({
  mensaje,
  labelConfirmar = 'Confirmar',
  onCancelar,
  onConfirmar,
  cargando = false,
  variante = 'normal',
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onCancelar()}
    >
      <div className="bg-superficie rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <p className="text-zeus text-base mb-6 leading-relaxed">{mensaje}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            disabled={cargando}
            className="flex-1 border border-borde rounded-xl py-3 text-zeus font-medium hover:bg-fondo transition-colors disabled:opacity-50 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={cargando}
            className={`flex-1 rounded-xl py-3 font-bold transition-all disabled:opacity-50 min-h-[44px] ${
              variante === 'peligro'
                ? 'bg-peligro text-white hover:brightness-90'
                : 'bg-rayo text-zeus hover:brightness-95'
            }`}
          >
            {cargando ? 'Procesando...' : labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
