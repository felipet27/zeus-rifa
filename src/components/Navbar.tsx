'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const tabs = [
  { href: '/libres', label: 'Libres' },
  { href: '/comprometidas', label: 'Comprometidas' },
  { href: '/tablero', label: 'Tablero' },
  { href: '/buscar', label: 'Buscar' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Barra superior — escritorio */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-zeus h-16 items-center px-6 gap-2">
        <span className="text-rayo font-bold text-lg mr-4">⚡ Zeus</span>
        {tabs.slice(0, 3).map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === tab.href
                ? 'bg-rayo text-zeus'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {tab.label}
          </Link>
        ))}
        <div className="flex-1" />
        <Link
          href="/buscar"
          className={`p-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/buscar' ? 'text-rayo' : 'text-white/70 hover:text-white'
          }`}
        >
          🔍 Buscar
        </Link>
        <button
          onClick={handleSignOut}
          className="text-white/50 hover:text-white text-sm transition-colors ml-4"
        >
          Salir
        </button>
      </nav>

      {/* Barra inferior — móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zeus flex border-t border-white/10">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-medium transition-colors ${
              pathname === tab.href ? 'text-rayo' : 'text-white/60'
            }`}
          >
            <span className="text-lg leading-tight">
              {tab.href === '/libres' && '🎟️'}
              {tab.href === '/comprometidas' && '✅'}
              {tab.href === '/tablero' && '🖼️'}
              {tab.href === '/buscar' && '🔍'}
            </span>
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
