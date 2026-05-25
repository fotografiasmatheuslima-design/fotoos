'use server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { sdCards, sdCardUsages, storageLocations, jobs } from '@/lib/db/schema'
import { eq, and, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  if (!data) throw new Error('Perfil não encontrado')
  return { userId: user.id, orgId: data.org_id as string }
}

// ─── CRIAR SD CARD ───────────────────────────────────────────────────────────
export async function createSdCardAction(data: {
  label:    string
  type:     'SD' | 'CFexpress' | 'CF'
  capacity: string
  camera?:  string
}): Promise<{ id: string; error?: string }> {
  try {
    const { orgId } = await getContext()
    // DB schema: brand stores the card type (SD/CFexpress/CF), capacityGb stores numeric capacity
    const capacityNum = parseFloat(data.capacity.replace('TB','').replace('GB','')) * (data.capacity.includes('TB') ? 1024 : 1)
    const [card] = await db.insert(sdCards).values({
      orgId,
      label:      data.label,
      brand:      data.type,                            // store card type in brand field
      capacityGb: isNaN(capacityNum) ? null : String(capacityNum),
      camera:     data.camera || null,
    }).returning()
    revalidatePath('/sd-cards')
    return { id: card.id }
  } catch (e: any) {
    return { id: '', error: e?.message ?? 'Erro ao cadastrar cartão.' }
  }
}

// ─── EXCLUIR SD CARD ──────────────────────────────────────────────────────────
export async function deleteSdCardAction(cardId: string): Promise<{ error?: string }> {
  try {
    const { orgId } = await getContext()

    // Guard: não excluir se tiver usos ativos
    const activeUsages = await db.select({ id: sdCardUsages.id, status: sdCardUsages.status })
      .from(sdCardUsages)
      .where(and(eq(sdCardUsages.sdCardId, cardId), eq(sdCardUsages.orgId, orgId)))

    const hasActive = activeUsages.some(u => u.status === 'pendente' || u.status === 'backup_realizado')
    if (hasActive) {
      return { error: 'Este cartão não pode ser excluído pois possui backup pendente. Confirme o backup antes de excluir.' }
    }

    await db.delete(sdCards).where(and(eq(sdCards.id, cardId), eq(sdCards.orgId, orgId)))
    revalidatePath('/sd-cards')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Erro ao excluir cartão.' }
  }
}

// ─── EXCLUIR STORAGE LOCATION (HD) ────────────────────────────────────────────
export async function deleteStorageLocationAction(locationId: string): Promise<{ error?: string }> {
  try {
    const { orgId } = await getContext()

    // Guard: não excluir HD que já recebeu backups
    const hasBackups = await db.select({ id: sdCardUsages.id })
      .from(sdCardUsages)
      .where(and(
        eq(sdCardUsages.orgId, orgId),
        or(
          eq(sdCardUsages.backupPrimaryId, locationId),
          eq(sdCardUsages.backupSecondaryId, locationId)
        )
      ))
      .limit(1)

    if (hasBackups.length > 0) {
      return { error: 'Este HD não pode ser excluído pois possui backups registrados. Remova primeiro os registros de backup associados.' }
    }

    await db.delete(storageLocations).where(and(eq(storageLocations.id, locationId), eq(storageLocations.orgId, orgId)))
    revalidatePath('/sd-cards')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Erro ao excluir local de armazenamento.' }
  }
}

// ─── SD CARDS ────────────────────────────────────────────────────────────────
export async function registerSdUsageAction(jobId: string, data: {
  sdCardId:    string
  photosCount?: number
  rawSizeGb?:  string
  notes?:      string
}) {
  const { orgId } = await getContext()

  const [usage] = await db.insert(sdCardUsages).values({
    orgId,
    jobId,
    sdCardId:    data.sdCardId,
    photosCount: data.photosCount || null,
    rawSizeGb:   data.rawSizeGb   || null,
    notes:       data.notes       || null,
    status:      'pendente',
  }).returning()

  // Incrementar contador no job
  await db.execute(
    `UPDATE jobs SET sd_count = sd_count + 1, updated_at = NOW() WHERE id = '${jobId}' AND org_id = '${orgId}'`
  )

  revalidatePath('/jobs')
  return usage
}

export async function confirmBackupAction(usageId: string, data: {
  storageLocationId: string
  isPrimary:         boolean
}) {
  const { orgId } = await getContext()

  const now = new Date()
  const updateFields = data.isPrimary
    ? { backupPrimaryId: data.storageLocationId, backupPrimaryAt: now, status: 'backup_realizado' as const }
    : { backupSecondaryId: data.storageLocationId, backupSecondaryAt: now }

  await db.update(sdCardUsages)
    .set({ ...updateFields, updatedAt: now })
    .where(and(eq(sdCardUsages.id, usageId), eq(sdCardUsages.orgId, orgId)))

  revalidatePath('/jobs')
}

export async function formatSdCardAction(usageId: string) {
  const { orgId } = await getContext()

  const [usage] = await db.select()
    .from(sdCardUsages)
    .where(and(eq(sdCardUsages.id, usageId), eq(sdCardUsages.orgId, orgId)))
    .limit(1)

  if (!usage) throw new Error('Registro não encontrado')
  if (!usage.safeToFormat) {
    throw new Error('SD não liberado para formatação. O job precisa estar finalizado com backup confirmado.')
  }

  await db.update(sdCardUsages)
    .set({ status: 'formatado', formattedAt: new Date() })
    .where(eq(sdCardUsages.id, usageId))

  revalidatePath('/jobs')
}

// ─── STORAGE LOCATIONS ───────────────────────────────────────────────────────
export async function createStorageLocationAction(data: {
  name:        string
  type:        'hd_externo' | 'ssd_externo' | 'nas' | 'nuvem' | 'outro'
  capacityGb?: string
  notes?:      string
}) {
  const { orgId } = await getContext()

  const [loc] = await db.insert(storageLocations).values({
    orgId,
    name:       data.name,
    type:       data.type,
    capacityGb: data.capacityGb || null,
    notes:      data.notes      || null,
  }).returning()

  revalidatePath('/jobs')
  return loc
}
