'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const router       = useRouter()
  const searchParams = useSearchParams()

  const errorParam = searchParams.get('error')
  const errorMsg =
    errorParam === 'no-autorizado'
      ? 'Este correo no tiene acceso a la aplicación.'
      : errorParam === 'auth-error'
        ? 'Error de autenticación. Intenta de nuevo.'
        : formError

  async function handleGoogle() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setFormError('Error al iniciar sesión con Google')
      setLoading(false)
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFormError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setFormError('Correo o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/tablero')
      router.refresh()
    }
  }

  return (
    /* Tarjeta de cristal sobre la foto de Zeus */
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 w-full border border-white/30">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-peligro text-sm rounded-xl p-3 mb-5">
          {errorMsg}
        </div>
      )}

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 border border-borde rounded-xl py-3 px-4 text-zeus font-medium hover:bg-fondo active:scale-95 transition-all disabled:opacity-50 mb-5 min-h-[44px]"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
          <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
          <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
          <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
        </svg>
        Continuar con Google
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-borde" />
        <span className="text-libre-texto text-xs">o</span>
        <div className="flex-1 h-px bg-borde" />
      </div>

      <form onSubmit={handleEmail} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zeus mb-1" htmlFor="email">
            Correo
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-borde rounded-xl px-4 py-3 text-zeus bg-fondo focus:outline-none focus:border-rayo transition-colors"
            placeholder="tu@correo.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zeus mb-1" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-borde rounded-xl px-4 py-3 text-zeus bg-fondo focus:outline-none focus:border-rayo transition-colors"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-rayo text-zeus font-bold rounded-xl py-3 hover:brightness-95 active:scale-95 transition-all disabled:opacity-50 min-h-[44px]"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
