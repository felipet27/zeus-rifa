'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const tabs = [
  { href: '/libres',        label: 'Libres',         icon: '🎟️' },
  { href: '/comprometidas', label: 'Comprometidas',   icon: '✅' },
  { href: '/tablero',       label: 'Tablero',         icon: '🖼️' },
  { href: '/buscar',        label: 'Buscar',          icon: '🔍' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Barra superior — escritorio ─────────────────────────── */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-zeus h-16 items-center px-6 gap-1">
        <span className="text-rayo font-bold text-lg mr-4">⚡ Zeus</span>

        {tabs.slice(0, 3).map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-rayo text-zeus'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </Link>
          )
        })}

        <div className="flex-1" />

        <Link
          href="/buscar"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            pathname === '/buscar'
              ? 'text-rayo'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          🔍 Buscar
        </Link>

        <button
          onClick={handleSignOut}
          className="text-white/40 hover:text-white/80 text-sm transition-colors ml-4 px-2 py-1"
        >
          Salir
        </button>
      </nav>

      {/* ── Barra inferior — móvil ───────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zeus flex border-t border-white/10">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center pt-2 pb-3 gap-0.5 text-xs font-medium transition-colors relative ${
                active ? 'text-rayo' : 'text-white/55'
              }`}
            >
              {/* Indicador activo: línea amarilla en la parte superior */}
              {active && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-rayo rounded-full" />
              )}
              <span className="text-xl leading-tight">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
