import { RIFA } from '@/config/rifa'
import { formatCOP } from '@/lib/formato'
import type { Boleta } from '@/types/boleta'

type Props = {
  boletas: Boleta[]
}

export default function Totales({ boletas }: Props) {
  const comprometidas = boletas.filter((b) => b.estado === 'comprometida')
  const pagadas       = comprometidas.filter((b) => b.pagada)
  const debe          = comprometidas.filter((b) => !b.pagada)
  const libres        = boletas.filter((b) => b.estado === 'libre')

  const recaudado    = pagadas.length * RIFA.valorBoleta
  const paraZeus     = recaudado - RIFA.premio
  const potencialZeus = RIFA.totalBoletas * RIFA.valorBoleta - RIFA.premio
  const progreso     = (comprometidas.length / RIFA.totalBoletas) * 100

  return (
    <div className="bg-superficie border border-borde rounded-2xl p-4 mb-4">
      {/* Barra de progreso */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-zeus">
            {comprometidas.length} de {RIFA.totalBoletas} vendidas
          </span>
          <span className="text-libre-texto">{libres.length} libres</span>
        </div>
        <div className="h-5 bg-libre rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progreso}%`,
              background: 'linear-gradient(to right, #F4B400, #FCD34D)',
              boxShadow: progreso > 0 ? '0 0 10px rgba(244,180,0,0.45)' : 'none',
            }}
          />
        </div>
        <p className="text-right text-xs text-libre-texto mt-1">
          {progreso.toFixed(0)}%
        </p>
      </div>

      {/* Pagadas / Debe */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-pagada/10 rounded-xl p-3">
          <p className="text-xs font-medium text-pagada/70">Pagadas</p>
          <p className="font-bold text-pagada text-sm mt-0.5">
            {pagadas.length} · {formatCOP(pagadas.length * RIFA.valorBoleta)}
          </p>
        </div>
        <div className="bg-debe/10 rounded-xl p-3">
          <p className="text-xs font-medium text-debe/70">Debe</p>
          <p className="font-bold text-debe text-sm mt-0.5">
            {debe.length} · {formatCOP(debe.length * RIFA.valorBoleta)}
          </p>
        </div>
      </div>

      {/* Recaudado + Zeus */}
      <div className="border-t border-borde pt-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-libre-texto">Recaudado</span>
          <span className="font-bold text-zeus">{formatCOP(recaudado)}</span>
        </div>

        <div
          className={`rounded-xl p-3 ${
            paraZeus >= 0 ? 'bg-buganvilla/10' : 'bg-libre'
          }`}
        >
          {paraZeus >= 0 ? (
            <p className="text-buganvilla font-bold text-sm">
              ❤️ {formatCOP(paraZeus)} para la operación de Zeus
            </p>
          ) : (
            <p className="text-libre-texto text-sm">
              Faltan {formatCOP(Math.abs(paraZeus))} para cubrir el premio
            </p>
          )}
          <p className="text-xs text-libre-texto mt-0.5">
            Potencial si se venden todas: {formatCOP(potencialZeus)}
          </p>
        </div>
      </div>
    </div>
  )
}
