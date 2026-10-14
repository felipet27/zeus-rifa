'use client'

import { useEffect, useState } from 'react'

type Area = { top: number; height: number }

// Área de pantalla que realmente se ve. En iOS (y Chrome Android reciente) el teclado
// no encoge la página: tapa los elementos fijos. Con esto un modal puede ajustarse
// al espacio libre encima del teclado.
export function useViewportVisible(): Area | null {
  const [area, setArea] = useState<Area | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const actualizar = () => setArea({ top: vv.offsetTop, height: vv.height })
    actualizar()
    vv.addEventListener('resize', actualizar)
    vv.addEventListener('scroll', actualizar)
    return () => {
      vv.removeEventListener('resize', actualizar)
      vv.removeEventListener('scroll', actualizar)
    }
  }, [])

  return area
}
