'use server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { clients, jobs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

async function getOrgId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autenticado')
  const { data } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  if (!data) throw new Error('Perfil nao encontrado')
  return data.org_id as string
}

export async function createClientAction(formData: FormData) {
  const orgId = await getOrgId()
  const [client] = await db.insert(clients).values({
    orgId,
    fullName: String(formData.get('fullName')),
    email:    formData.get('email') ? String(formData.get('email')) : null,
    phone:    formData.get('phone') ? String(formData.get('phone')) : null,
    cpf:      formData.get('cpf')   ? String(formData.get('cpf'))   : null,
    source:   (formData.get('source') as any) ?? 'outro',
    notes:    formData.get('notes') ? String(formData.get('notes')) : null,
  }).returning()
  revalidatePath('/clientes')
  return client
}

export async function updateClientAction(id: string, data: {
  fullName: string
  email: string
  phone: string
  source: string
  notes: string
}): Promise<{ error?: string }> {
  try {
    const orgId = await getOrgId()
    await db.update(clients)
      .set({
        fullName: data.fullName,
        email:    data.email  || null,
        phone:    data.phone  || null,
        source:   (data.source as any) ?? 'outro',
        notes:    data.notes  || null,
      })
      .where(and(eq(clients.id, id), eq(clients.orgId, orgId)))
    revalidatePath('/clientes')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Erro ao atualizar cliente.' }
  }
}

export async function deleteClientAction(id: string): Promise<{ error?: string }> {
  try {
    const orgId = await getOrgId()

    // Guard: não excluir cliente com jobs vinculados
    const linked = await db.select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.clientId, id), eq(jobs.orgId, orgId)))
      .limit(1)

    if (linked.length > 0) {
      return { error: 'Este cliente não pode ser excluído pois possui jobs vinculados. Finalize ou cancele os jobs antes de excluir o cliente.' }
    }

    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.orgId, orgId)))
    revalidatePath('/clientes')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Erro ao excluir cliente.' }
  }
}
