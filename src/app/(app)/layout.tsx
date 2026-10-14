import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import InstallBanner from '@/components/InstallBanner'

const ALLOWED_EMAILS = ['felipet27@gmail.com', 'profejohana109@gmail.com']

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !ALLOWED_EMAILS.includes(user.email?.toLowerCase() ?? '')) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-fondo">
      <Navbar />
      <main className="pb-20 md:pb-0 md:pt-16 max-w-5xl mx-auto">
        {children}
      </main>
      <InstallBanner />
    </div>
  )
}
