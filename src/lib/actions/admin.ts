'use server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  sdCardUsages, sdCards, storageLocations,
  jobTasks, jobContracts, jobHistory, jobs,
  payments, clients, profiles,
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// Lê o userId direto do JWT no cookie — sem chamar o Supabase Auth API.
// O @supabase/ssr pode armazenar a sessão em chunks: sb-<ref>-auth-token.0, .1, ...
// Remontamos os pedaços, decodificamos o JWT localmente e extraímos o sub (userId).
async function getContext() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  // Pega todos os pedaços do cookie de auth, ordenados (base + .0 .1 .2 ...)
  const authChunks = allCookies
    .filter(c => c.name.match(/^sb-.+-auth-token(\.\d+)?$/))
    .sort((a, b) => a.name.localeCompare(b.name))

  let userId: string | null = null

  if (authChunks.length > 0) {
    try {
      // Remonta os pedaços
      const assembled = authChunks.map(c => decodeURIComponent(c.value)).join('')

      // @supabase/ssr pode prefixar o valor com "base64-" seguido de base64
      let jsonStr: string
      if (assembled.startsWith('base64-')) {
        jsonStr = Buffer.from(assembled.slice(7), 'base64').toString('utf8')
      } else {
        jsonStr = assembled
      }

      const session = JSON.parse(jsonStr)
      const accessToken: string | undefined = session?.access_token

      if (accessToken) {
        // Decodifica o payload do JWT (base64url) sem verificar assinatura
        const payloadB64 = accessToken.split('.')[1]
          .replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'))
        userId = payload?.sub ?? null
      }
    } catch { /* continua e cai no erro abaixo */ }
  }

  if (!userId) throw new Error('Não autenticado')

  // Drizzle direto (sem RLS) para buscar o orgId
  const [profile] = await db
    .select({ orgId: profiles.orgId })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  if (!profile) throw new Error('Perfil não encontrado')
  return { userId, orgId: profile.orgId as string }
}

// ─── RESET TOTAL DO SISTEMA ───────────────────────────────────────────────────
// Deleta TODOS os registros da organização na ordem correta (FK-safe).
// Ordem: sd_card_usages → job_tasks → job_history → job_contracts
//        → payments → jobs → sd_cards → storage_locations → clients
export async function clearAllDataAction(): Promise<{ error?: string; counts?: Record<string, number> }> {
  try {
    const { orgId } = await getContext()

    // 1. SD Card Usages (depende de jobs, sd_cards, storage_locations)
    const deletedUsages = await db.delete(sdCardUsages)
      .where(eq(sdCardUsages.orgId, orgId))
      .returning({ id: sdCardUsages.id })

    // 2. Job Tasks (depende de jobs)
    const deletedTasks = await db.delete(jobTasks)
      .where(eq(jobTasks.orgId, orgId))
      .returning({ id: jobTasks.id })

    // 3. Job History (depende de jobs)
    const deletedHistory = await db.delete(jobHistory)
      .where(eq(jobHistory.orgId, orgId))
      .returning({ id: jobHistory.id })

    // 4. Job Contracts (depende de jobs)
    const deletedContracts = await db.delete(jobContracts)
      .where(eq(jobContracts.orgId, orgId))
      .returning({ id: jobContracts.id })

    // 5. Payments (depende de jobs)
    const deletedPayments = await db.delete(payments)
      .where(eq(payments.orgId, orgId))
      .returning({ id: payments.id })

    // 6. Jobs
    const deletedJobs = await db.delete(jobs)
      .where(eq(jobs.orgId, orgId))
      .returning({ id: jobs.id })

    // 7. SD Cards
    const deletedSdCards = await db.delete(sdCards)
      .where(eq(sdCards.orgId, orgId))
      .returning({ id: sdCards.id })

    // 8. Storage Locations (HDs)
    const deletedLocations = await db.delete(storageLocations)
      .where(eq(storageLocations.orgId, orgId))
      .returning({ id: storageLocations.id })

    // 9. Clients
    const deletedClients = await db.delete(clients)
      .where(eq(clients.orgId, orgId))
      .returning({ id: clients.id })

    revalidatePath('/', 'layout')

    return {
      counts: {
        jobs:            deletedJobs.length,
        clients:         deletedClients.length,
        payments:        deletedPayments.length,
        sdCards:         deletedSdCards.length,
        sdCardUsages:    deletedUsages.length,
        storageLocations: deletedLocations.length,
        jobTasks:        deletedTasks.length,
        jobContracts:    deletedContracts.length,
        jobHistory:      deletedHistory.length,
      }
    }
  } catch (e: any) {
    return { error: e?.message ?? 'Erro ao limpar dados.' }
  }
}
