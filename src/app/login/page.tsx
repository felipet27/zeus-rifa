import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-fondo flex items-center justify-center p-4">
      <Suspense fallback={<div className="bg-superficie rounded-2xl shadow-lg p-8 w-full max-w-sm h-96 animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
