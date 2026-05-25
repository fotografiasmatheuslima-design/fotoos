// sd.ts — Server-only service layer for SD cards and storage (HDs/NAS/SSDs)
// NAO importe este arquivo em Client Components.

// ─── TIPOS ────────────────────────────────────────────────────────────────────
export interface SdCardData {
  id: string
  label: string
  capacity: string
  type: 'SD' | 'CFexpress' | 'CF'
  camera: string
  status: 'disponivel' | 'em_uso' | 'pendente_backup' | 'seguro_formatar'
  currentJobId?: string
  currentJobTitle?: string
  currentJobClient?: string
  photosCount?: number
  usedGb?: number
}

export interface HdJobEntry {
  jobId: string
  jobTitle: string
  clientName: string
  eventDate: string
  backedUpAt: string
  sizeGb: number
  photosCount: number
  jobType: 'evento' | 'ensaio' | 'diaria'
}

export interface HdBackupData {
  id: string
  name: string
  capacity: string
  usedGb: number
  type: 'SSD' | 'HD' | 'NAS'
  purpose: 'edicao' | 'arquivo' | 'ambos'
  jobs: HdJobEntry[]
}

export interface SdPageData {
  cards: SdCardData[]
  hds: HdBackupData[]
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
export async function getSdPageData(): Promise<SdPageData> {
  const orgId = await getOrgId()
  if (!orgId) return { cards: [], hds: [] }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // ── SD Cards inventory with latest active usage ──────────────────────────
    const { data: cardsData, error: cardsErr } = await supabase
      .from('sd_cards')
      .select(`
        id, label, brand, capacity_gb, camera,
        sd_card_usages(
          id, status, safe_to_format, photos_count, raw_size_gb,
          jobs(id, title, type, clients(full_name))
        )
      `)
      .eq('org_id', orgId)
      .order('label')

    if (cardsErr) throw cardsErr

    // ── Storage Locations with backed-up jobs ────────────────────────────────
    const { data: locsData, error: locsErr } = await supabase
      .from('storage_locations')
      .select(`
        id, name, type, capacity_gb, notes,
        primary_usages:sd_card_usages!backup_primary_id(
          id, raw_size_gb, photos_count, backup_primary_at,
          jobs(id, title, type, scheduled_at, clients(full_name))
        ),
        secondary_usages:sd_card_usages!backup_secondary_id(
          id, raw_size_gb, photos_count, backup_secondary_at,
          jobs(id, title, type, scheduled_at, clients(full_name))
        )
      `)
      .eq('org_id', orgId)
      .order('name')

    if (locsErr) throw locsErr

    // ── Map SD cards ─────────────────────────────────────────────────────────
    const cards: SdCardData[] = (cardsData as any[] ?? []).map(c => {
      const usages: any[] = c.sd_card_usages ?? []
      // Find the most recent active usage (not formatado)
      const activeUsage = usages
        .filter((u: any) => u.status !== 'formatado')
        .sort((a: any, b: any) => b.id.localeCompare(a.id))[0]

      let status: SdCardData['status'] = 'disponivel'
      if (activeUsage) {
        if (activeUsage.safe_to_format) status = 'seguro_formatar'
        else if (activeUsage.status === 'backup_realizado') status = 'pendente_backup'
        else status = 'em_uso'
      }

      const capGb: number = c.capacity_gb ?? 64
      const capacity = capGb >= 1024 ? `${capGb / 1024}TB` : `${capGb}GB`

      return {
        id: c.id,
        label: c.label,
        capacity,
        type: c.brand?.includes('CF') ? 'CFexpress' : 'SD',
        camera: c.camera ?? '',
        status,
        currentJobId: activeUsage?.jobs?.id,
        currentJobTitle: activeUsage?.jobs?.title,
        currentJobClient: activeUsage?.jobs?.clients?.full_name,
        photosCount: activeUsage?.photos_count ?? undefined,
        usedGb: activeUsage?.raw_size_gb ? parseFloat(activeUsage.raw_size_gb) : undefined,
      } satisfies SdCardData
    })

    // ── Map Storage Locations → HdBackupData ─────────────────────────────────
    const hds: HdBackupData[] = (locsData as any[] ?? []).map(loc => {
      // Collect all jobs backed up here (primary or secondary)
      const jobMap = new Map<string, HdJobEntry>()

      const addUsage = (u: any, backedUpAt: string | null) => {
        const job = u.jobs
        if (!job) return
        const existing = jobMap.get(job.id)
        if (existing) return // already added via primary
        jobMap.set(job.id, {
          jobId: job.id,
          jobTitle: job.title,
          clientName: job.clients?.full_name ?? '—',
          eventDate: job.scheduled_at ? job.scheduled_at.split('T')[0] : '2000-01-01',
          backedUpAt: backedUpAt ?? new Date().toISOString(),
          sizeGb: u.raw_size_gb ? parseFloat(u.raw_size_gb) : 0,
          photosCount: u.photos_count ?? 0,
          jobType: (job.type ?? 'evento') as HdJobEntry['jobType'],
        })
      }

      for (const u of (loc.primary_usages ?? [])) addUsage(u, u.backup_primary_at)
      for (const u of (loc.secondary_usages ?? [])) addUsage(u, u.backup_secondary_at)

      const jobsList = Array.from(jobMap.values())
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate))

      // Compute usedGb from sum of all usages
      const usedGb = Math.round(jobsList.reduce((s, j) => s + j.sizeGb, 0))

      // Map storage type
      const typeMap: Record<string, HdBackupData['type']> = {
        ssd_externo: 'SSD', hd_externo: 'HD', nas: 'NAS', nuvem: 'NAS', outro: 'HD',
      }
      const hdType: HdBackupData['type'] = typeMap[loc.type] ?? 'HD'

      // Derive purpose from name (heuristic)
      const nameLow = (loc.name ?? '').toLowerCase()
      let purpose: HdBackupData['purpose'] = 'ambos'
      if (nameLow.includes('edicao') || nameLow.includes('edição') || hdType === 'SSD') purpose = 'edicao'
      else if (nameLow.includes('arquivo') || nameLow.includes('backup')) purpose = 'arquivo'

      const capGb: number = loc.capacity_gb ? parseFloat(loc.capacity_gb) : 0
      const capacity = capGb >= 1024 ? `${Math.round(capGb / 1024)}TB` : `${capGb}GB`

      return {
        id: loc.id,
        name: loc.name,
        capacity,
        usedGb,
        type: hdType,
        purpose,
        jobs: jobsList,
      } satisfies HdBackupData
    })

    return { cards, hds }
  } catch {
    return { cards: [], hds: [] }
  }
}
