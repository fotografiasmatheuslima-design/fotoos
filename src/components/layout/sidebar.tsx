'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Briefcase, Users, FileText,
  DollarSign, UserCheck, LogOut, Aperture, Settings,
  HardDrive, ChevronDown, ChevronRight, Calendar, Menu, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── ESTRUTURA DO MENU ────────────────────────────────────────────────────────
interface NavSep   { sep: string }
interface NavItem  { id: string; icon: any; label: string; href: string; badge?: string; exact?: boolean }
interface NavGroup {
  id: string; icon: any; label: string; badge?: string
  children: { label: string; href: string }[]
}
type NavEntry = NavSep | NavItem | NavGroup

function isNavSep(e: NavEntry): e is NavSep     { return 'sep' in e }
function isNavGroup(e: NavEntry): e is NavGroup { return 'children' in e }

const NAV: NavEntry[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/', exact: true },

  { sep: 'OPERAÇÃO' },
  {
    id: 'jobs', icon: Briefcase, label: 'Jobs', badge: 'novo',
    children: [
      { label: 'Todos os jobs',  href: '/jobs' },
      { label: 'Novo evento',    href: '/jobs?new=evento' },
      { label: 'Novo ensaio',    href: '/jobs?new=ensaio' },
      { label: 'Nova diária',    href: '/jobs?new=diaria' },
    ],
  },
  { id: 'clientes',  icon: Users,      label: 'Clientes',    href: '/clientes' },
  { id: 'agenda',    icon: Calendar,   label: 'Agenda',      href: '/#agenda' },

  { sep: 'EQUIPAMENTO' },
  {
    id: 'sd-cards', icon: HardDrive, label: 'SD Cards & HDs',
    children: [
      { label: 'Inventário & Backups', href: '/sd-cards' },
      { label: 'Registrar uso',        href: '/sd-cards?action=use' },
    ],
  },

  { sep: 'GESTÃO' },
  {
    id: 'contratos', icon: FileText, label: 'Contratos',
    children: [
      { label: 'Ver contratos',   href: '/contratos' },
      { label: 'Gerar contrato',  href: '/contratos/gerar' },
    ],
  },
  { id: 'financeiro',    icon: DollarSign, label: 'Financeiro',    href: '/financeiro' },
  { id: 'equipe',        icon: UserCheck,  label: 'Equipe',        href: '/equipe' },

  { sep: 'SISTEMA' },
  { id: 'configuracoes', icon: Settings,   label: 'Configurações', href: '/configuracoes' },
]

// ─── HOOK MOBILE ─────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

// ─── CONTEÚDO DA SIDEBAR ─────────────────────────────────────────────────────
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [openGroups, setOpenGroups] = useState<string[]>(['jobs'])

  function toggleGroup(id: string) {
    setOpenGroups(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/') || pathname.startsWith(href + '?')
  }

  function isGroupActive(group: NavGroup) {
    return group.children.some(c => pathname === c.href || pathname.startsWith(c.href.split('?')[0]))
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0b0f1a' }}>
      {/* Logo */}
      <div style={{ padding: '13px 12px', borderBottom: '0.5px solid rgba(255,255,255,.06)' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Aperture size={15} color="#fff" />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, letterSpacing: '-.2px' }}>FotoOS</div>
            <div style={{ color: 'rgba(255,255,255,.25)', fontSize: 10 }}>v4 · job-centric</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '8px 7px' }}>
        {NAV.map((entry, i) => {

          if (isNavSep(entry)) {
            return (
              <div key={i} style={{ color: 'rgba(255,255,255,.2)', fontSize: 9, padding: '12px 9px 4px', textTransform: 'uppercase', letterSpacing: '.9px', fontWeight: 600 }}>
                {entry.sep}
              </div>
            )
          }

          if (isNavGroup(entry)) {
            const active = isGroupActive(entry)
            const open   = openGroups.includes(entry.id)
            const Icon   = entry.icon
            return (
              <div key={entry.id}>
                <button
                  onClick={() => toggleGroup(entry.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 7, fontSize: 12, marginBottom: 1,
                    color: active ? '#fff' : 'rgba(255,255,255,.45)',
                    background: active && !open ? '#7c3aed' : open ? 'rgba(255,255,255,.07)' : 'transparent',
                    fontWeight: active ? 600 : 400,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Icon size={14} />
                  <span style={{ flex: 1 }}>{entry.label}</span>
                  {entry.badge && (
                    <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#059669', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginRight: 4 }}>
                      {entry.badge}
                    </span>
                  )}
                  {open
                    ? <ChevronDown size={11} color="rgba(255,255,255,.3)" />
                    : <ChevronRight size={11} color="rgba(255,255,255,.3)" />
                  }
                </button>
                {open && (
                  <div style={{ marginLeft: 14, marginBottom: 4, borderLeft: '1px solid rgba(255,255,255,.08)', paddingLeft: 8 }}>
                    {entry.children.map(child => {
                      const childActive = pathname === child.href || pathname === child.href.split('?')[0]
                      return (
                        <Link key={child.href} href={child.href}
                          onClick={onNavigate}
                          style={{
                            display: 'block', padding: '5px 8px', borderRadius: 5, fontSize: 11, marginBottom: 1,
                            color: childActive ? '#c4b5fd' : 'rgba(255,255,255,.35)',
                            background: childActive ? 'rgba(124,58,237,.25)' : 'transparent',
                            fontWeight: childActive ? 600 : 400,
                            textDecoration: 'none',
                          }}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const navItem = entry as NavItem
          const active  = isActive(navItem.href, navItem.exact)
          const Icon    = navItem.icon
          return (
            <Link key={navItem.href} href={navItem.href}
              onClick={onNavigate}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 7, fontSize: 12, marginBottom: 1,
                color: active ? '#fff' : 'rgba(255,255,255,.45)',
                background: active ? '#7c3aed' : 'transparent',
                fontWeight: active ? 600 : 400,
                textDecoration: 'none',
              }}
            >
              <Icon size={14} />
              <span style={{ flex: 1 }}>{navItem.label}</span>
              {navItem.badge && (
                <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#059669', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  {navItem.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Atalhos rápidos */}
      <div style={{ padding: '8px 9px', borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.2)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 6, paddingLeft: 2 }}>Atalhos</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {[
            { icon: '📸', label: 'Novo job',   href: '/jobs?new=evento' },
            { icon: '📄', label: 'Contrato',   href: '/contratos/gerar' },
            { icon: '💾', label: 'SD Cards',   href: '/sd-cards' },
            { icon: '💰', label: 'Financeiro', href: '/financeiro' },
          ].map(a => (
            <Link key={a.href} href={a.href} onClick={onNavigate}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 7px', borderRadius: 6, fontSize: 10,
                color: 'rgba(255,255,255,.5)', background: 'rgba(255,255,255,.04)',
                textDecoration: 'none', border: '0.5px solid rgba(255,255,255,.06)',
              }}
            >
              <span style={{ fontSize: 12 }}>{a.icon}</span>
              <span style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* User */}
      <div style={{ padding: '10px 12px', borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7c3aed', fontSize: 10, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>ML</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 11, fontWeight: 500 }}>Matheus Lima</div>
            <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 10 }}>Fotógrafo · Admin</div>
          </div>
          <button onClick={handleLogout} title="Sair"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)', padding: 4 }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export function Sidebar() {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  // Fecha ao mudar de rota no mobile
  const pathname = usePathname()
  useEffect(() => { setOpen(false) }, [pathname])

  if (!isMobile) {
    return (
      <aside style={{ width: 200, flexShrink: 0, borderRight: '0.5px solid rgba(255,255,255,.05)' }}>
        <SidebarContent />
      </aside>
    )
  }

  // Mobile: botão hamburguer + drawer
  return (
    <>
      {/* Botão hamburguer fixo */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 10, left: 10, zIndex: 50,
          width: 36, height: 36, borderRadius: 8,
          background: '#0b0f1a', border: '0.5px solid rgba(255,255,255,.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Menu size={18} color="#fff" />
      </button>

      {/* Overlay escuro */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,.6)',
          }}
        />
      )}

      {/* Drawer */}
      <aside
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 45,
          width: 240,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          borderRight: '0.5px solid rgba(255,255,255,.05)',
        }}
      >
        {/* Botão fechar */}
        <button
          onClick={() => setOpen(false)}
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 1,
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(255,255,255,.08)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={14} color="rgba(255,255,255,.6)" />
        </button>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </aside>
    </>
  )
}
