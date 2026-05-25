// clients.ts — Server-only service layer for clients
// NAO importe este arquivo em Client Components.

// ─── TIPOS ────────────────────────────────────────────────────────────────────
export interface ClientJobSummary {
  id: string
  title: string
  type: string
  status: string
  totalValue: number
  paidValue: number
  pendingValue: number
  scheduledAt: string | null
  tags: string[]
  sdCount: number
  driveLink?: string | null
}

export interface ClientFull {
  id: string
  name: string
  phone: string
  email: string
  origem: string
  notes: string | null
  initials: string
  avatarBg: string
  avatarColor: string
  jobs: ClientJobSummary[]
  totalValue: number
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const AVATAR_PALETTES: [string, string][] = [
  ['#ede9fe', '#5b21b6'], ['#dbeafe', '#1e40af'], ['#dcfce7', '#166534'],
  ['#fef3c7', '#92400e'], ['#fce7f3', '#9d174d'], ['#ccfbf1', '#0f766e'],
]

function makeInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase()
}

// ─── INTERNAL: RESOLVE ORG ID ────────────────────────────────────────────────
async function getOrgId(): Promise<string | null> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()
    return (data as { org_id: string } | null)?.org_id ?? null
  } catch {
    return null
  }
}

// ─── MAIN QUERY ───────────────────────────────────────────────────────────────
export async function getClients(): Promise<ClientFull[]> {
  const orgId = await getOrgId()
  if (!orgId) return []

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('clients')
      .select(`
        id, full_name, email, phone, source, notes,
        jobs(id, title, type, status, total_value, paid_value, pending_value,
             scheduled_at, tags, sd_count, drive_link)
      `)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('full_name')

    if (error) throw error
    if (!data?.length) return []

    return (data as any[]).map((c, idx) => {
      const [avatarBg, avatarColor] = AVATAR_PALETTES[idx % AVATAR_PALETTES.length]
      const jobs: ClientJobSummary[] = (c.jobs ?? [])
        .sort((a: any, b: any) => (b.scheduled_at ?? '').localeCompare(a.scheduled_at ?? ''))
        .map((j: any) => ({
          id: j.id, title: j.title, type: j.type, status: j.status,
          totalValue: parseFloat(j.total_value ?? '0'),
          paidValue: parseFloat(j.paid_value ?? '0'),
          pendingValue: parseFloat(j.pending_value ?? '0'),
          scheduledAt: j.scheduled_at ?? null,
          tags: j.tags ?? [], sdCount: j.sd_count ?? 0,
          driveLink: j.drive_link ?? null,
        }))

      return {
        id: c.id,
        name: c.full_name,
        phone: c.phone ?? '',
        email: c.email ?? '',
        origem: c.source ?? 'outro',
        notes: c.notes ?? null,
        initials: makeInitials(c.full_name),
        avatarBg, avatarColor,
        jobs,
        totalValue: jobs.reduce((s, j) => s + j.totalValue, 0),
      } satisfies ClientFull
    })
  } catch {
    return []
  }
}
