import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileBottomBar } from '@/components/layout/mobile-bottom-bar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden" style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
        {/* Padding inferior no mobile para não sobrepor a bottom bar */}
        <div className="flex-1 flex flex-col overflow-hidden pb-[60px] md:pb-0" style={{ overflowX: 'hidden' }}>
          {children}
        </div>
      </main>
      <MobileBottomBar />
    </div>
  )
}
