import { Suspense } from 'react'
import BuscarContent from './BuscarContent'

export default function BuscarPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 space-y-3 animate-pulse">
          <div className="h-12 bg-libre rounded-xl" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 w-24 bg-libre rounded-full" />)}
          </div>
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-libre rounded-xl" />)}
        </div>
      }
    >
      <BuscarContent />
    </Suspense>
  )
}
