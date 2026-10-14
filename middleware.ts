import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ALLOWED_EMAILS = ['felipet27@gmail.com', 'profejohana109@gmail.com']
const PUBLIC_PREFIXES = ['/login', '/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const { supabaseResponse, user } = await updateSession(request)

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const email = user.email?.toLowerCase() ?? ''
  if (!ALLOWED_EMAILS.includes(email)) {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'no-autorizado')
    const response = NextResponse.redirect(url)
    // Borrar cookies de sesión para forzar logout
    supabaseResponse.cookies.getAll().forEach((c) => {
      response.cookies.set(c.name, '', { maxAge: 0 })
    })
    return response
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|perro\\.jpg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
