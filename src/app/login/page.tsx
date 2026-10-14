import Image from 'next/image'
import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex items-end md:items-center justify-center overflow-hidden">
      {/* Foto de Zeus como fondo */}
      <Image
        src="/perro.jpg"
        alt="Zeus"
        fill
        className="object-cover object-top"
        priority
      />
      {/* Gradiente: transparente arriba → zeus oscuro abajo */}
      <div className="absolute inset-0 bg-gradient-to-b from-zeus/20 via-zeus/65 to-zeus/97" />

      <div className="relative z-10 w-full max-w-sm mx-auto px-4 pb-10 md:py-10">
        {/* Hero sobre la foto */}
        <div className="text-center mb-6">
          <p className="text-rayo font-black text-6xl leading-none">⚡</p>
          <h1 className="text-white font-black text-3xl mt-2 tracking-tight">Rifa por Zeus</h1>
          <p className="text-white/55 text-sm mt-1">Ayúdanos a pagar su operación</p>
        </div>

        <Suspense
          fallback={
            <div className="h-72 rounded-2xl bg-white/10 animate-pulse" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
