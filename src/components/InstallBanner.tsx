'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [mostrar, setMostrar]         = useState(false)
  const [esIOS, setEsIOS]             = useState(false)

  useEffect(() => {
    // No mostrar si ya está instalada como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // iOS: Safari no tiene beforeinstallprompt — mostramos instrucción manual
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream
    if (ios) {
      setEsIOS(true)
      setMostrar(true)
      return
    }

    // Chrome/Android: capturar el evento nativo
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
      setMostrar(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!mostrar) return null

  async function handleInstalar() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') setMostrar(false)
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-40 modal-up">
      <div className="bg-zeus rounded-2xl shadow-2xl p-4 flex items-center gap-3 border border-white/10">
        <span className="text-3xl shrink-0">⚡</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">
            Instala la app
          </p>
          {esIOS ? (
            <p className="text-white/55 text-xs mt-0.5 leading-snug">
              Toca <strong className="text-white/80">Compartir</strong> y luego{' '}
              <strong className="text-white/80">Añadir a inicio</strong>
            </p>
          ) : (
            <p className="text-white/55 text-xs mt-0.5">
              Accede más rápido desde tu celular
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {!esIOS && (
            <button
              onClick={handleInstalar}
              className="bg-rayo text-zeus text-xs font-bold px-3 py-2 rounded-xl hover:brightness-95 active:scale-95 transition-all"
            >
              Instalar
            </button>
          )}
          <button
            onClick={() => setMostrar(false)}
            className="text-white/40 hover:text-white/70 transition-colors p-1 text-lg leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
