'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Boleta } from '@/types/boleta'

export function useBoletas() {
  const [boletas, setBoletas] = useState<Boleta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function cargar() {
      const { data, error } = await supabase
        .from('boletas')
        .select('*')
        .order('numero')

      if (error) {
        setError(error.message)
      } else {
        setBoletas(data ?? [])
      }
      setLoading(false)
    }

    cargar()

    const channel = supabase
      .channel('boletas-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'boletas' },
        (payload) => {
          const updated = payload.new as Boleta
          setBoletas((prev) =>
            prev.map((b) => (b.numero === updated.numero ? updated : b))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { boletas, loading, error }
}
