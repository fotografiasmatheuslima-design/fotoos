'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, Users, HardDrive, DollarSign } from 'lucide-react'

const TABS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/',          exact: true },
  { icon: Briefcase,       label: 'Jobs',       href: '/jobs' },
  { icon: Users,           label: 'Clientes',   href: '/clientes' },
  { icon: HardDrive,       label: 'SD Cards',   href: '/sd-cards' },
  { icon: DollarSign,      label: 'Financeiro', href: '/financeiro' },
]

export function MobileBottomBar() {
  const pathname = usePathname()

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav
      className="md:hidden"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: '#0b0f1a',
        borderTop: '0.5px solid rgba(255,255,255,.08)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(tab => {
        const active = isActive(tab.href, tab.exact)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '8px 4px',
              textDecoration: 'none',
              color: active ? '#c4b5fd' : 'rgba(255,255,255,.35)',
              background: active ? 'rgba(124,58,237,.15)' : 'transparent',
            }}
          >
            <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize: 9, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
