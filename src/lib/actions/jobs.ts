'use server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { jobs, jobTasks, jobHistory, jobContracts, payments } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import {
  JOB_STATUS_TRANSITIONS,
  type JobStatus,
  type JobType,
} from '@/lib/db/schema/enums'

// ─── AUTH HELPER ──────────────────────────────────────────────────────────────
async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data } = await supabase
    .from('profiles')
    .select('org_id, full_name')
    .eq('id', user.id)
    .single()
  if (!data) throw new Error('Perfil não encontrado')
  return { userId: user.id, orgId: data.org_id as string, userName: data.full_name as string }
}

// ─── CRIAÇÃO DO JOB ───────────────────────────────────────────────────────────
export async function createJobAction(data: {
  title: string
  type: JobType
  clientId?: string
  contractedStudio?: string
  scheduledAt?: string
  totalValue?: string
  location?: string
  notes?: string
}) {
  const { orgId } = await getContext()

  const [job] = await db.insert(jobs).values({
    orgId,
    title:            data.title,
    type:             data.type,
    status:           'lead',
    clientId:         data.clientId   || null,
    contractedStudio: data.contractedStudio || null,
    scheduledAt:      data.scheduledAt ? new Date(data.scheduledAt) : null,
    totalValue:       data.totalValue || '0',
    notes:            data.notes || null,
  }).returning()

  // Registrar no histórico
  await db.insert(jobHistory).values({
    orgId,
    jobId:       job.id,
    action:      'job_created',
    toStatus:    'lead',
    description: `Job criado: ${job.title}`,
  })

  // Gerar tasks iniciais
  await generateTasksForStatus(orgId, job.id, 'lead')

  revalidatePath('/jobs')
  return job
}

// ─── TRANSIÇÃO DE STATUS — MÁQUINA DE ESTADOS ─────────────────────────────────
export async function transitionJobStatusAction(
  jobId: string,
  newStatus: JobStatus,
  options?: { cancelReason?: string }
) {
  const { orgId, userId, userName } = await getContext()

  // Buscar job atual
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.orgId, orgId)))
    .limit(1)

  if (!job) throw new Error('Job não encontrado')

  const currentStatus = job.status as JobStatus
  const allowedTransitions = JOB_STATUS_TRANSITIONS[currentStatus]

  // Validar transição
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Transição inválida: ${currentStatus} → ${newStatus}. ` +
      `Permitidas: ${allowedTransitions.join(', ')}`
    )
  }

  // Guards de negócio
  await assertTransitionGuards(orgId, jobId, currentStatus, newStatus)

  // Campos adicionais por status
  const extraFields: Record<string, unknown> = {}
  if (newStatus === 'confirmado')       extraFields.confirmedAt = new Date()
  if (newStatus === 'evento_realizado') extraFields.eventExecutedAt = new Date()
  if (newStatus === 'previa_enviada')   extraFields.previewSentAt = new Date()
  if (newStatus === 'entregue')         extraFields.deliveredAt = new Date()
  if (newStatus === 'finalizado')       extraFields.finalizedAt = new Date()
  if (newStatus === 'cancelado') {
    extraFields.canceledAt = new Date()
    if (options?.cancelReason) extraFields.cancelReason = options.cancelReason
  }

  // Atualizar status
  await db.update(jobs)
    .set({ status: newStatus, ...extraFields, updatedAt: new Date() })
    .where(and(eq(jobs.id, jobId), eq(jobs.orgId, orgId)))

  // Registrar histórico
  await db.insert(jobHistory).values({
    orgId,
    jobId,
    action:      'status_change',
    fromStatus:  currentStatus,
    toStatus:    newStatus,
    description: `Status alterado de "${currentStatus}" para "${newStatus}"`,
    actorId:     userId,
    actorName:   userName,
  })

  // Gerar tasks para o novo status
  await generateTasksForStatus(orgId, jobId, newStatus)

  // Se backup_realizado, liberar SDs para formatação
  if (newStatus === 'finalizado') {
    await liberateSdCards(orgId, jobId)
  }

  revalidatePath('/jobs')
  revalidatePath(`/jobs`)
}

// ─── GUARDS DE TRANSIÇÃO ─────────────────────────────────────────────────────
async function assertTransitionGuards(
  orgId: string,
  jobId: string,
  from: JobStatus,
  to: JobStatus
) {
  // Guard: sd_pendente → backup_realizado exige pelo menos 1 SD com backup
  if (from === 'sd_pendente' && to === 'backup_realizado') {
    const { sdCardUsages } = await import('@/lib/db/schema')
    const sds = await db
      .select()
      .from(sdCardUsages)
      .where(and(eq(sdCardUsages.jobId, jobId), eq(sdCardUsages.orgId, orgId)))
    const hasBackup = sds.some(sd => sd.backupPrimaryAt !== null)
    if (!hasBackup) {
      throw new Error('Confirme o backup de pelo menos um cartão SD antes de avançar.')
    }
  }

  // Guard: edicao_final → entregue exige link de entrega
  if (from === 'edicao_final' && to === 'entregue') {
    const [job] = await db.select({ driveLink: jobs.driveLink })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1)
    if (!job?.driveLink) {
      throw new Error('Informe o link do Google Drive antes de marcar como entregue.')
    }
  }
}

// ─── AUTO-GERAÇÃO DE TASKS ────────────────────────────────────────────────────
const AUTO_TASKS: Partial<Record<JobStatus, { title: string; priority: string }[]>> = {
  lead: [
    { title: 'Fazer primeiro contato / responder',       priority: 'urgente' },
    { title: 'Verificar disponibilidade na agenda',      priority: 'alta'    },
  ],
  orcamento: [
    { title: 'Enviar proposta de valores',               priority: 'alta'    },
    { title: 'Confirmar detalhes do evento',             priority: 'normal'  },
  ],
  contrato_pendente: [
    { title: 'Gerar contrato',                           priority: 'urgente' },
    { title: 'Enviar contrato via WhatsApp',             priority: 'urgente' },
  ],
  aguardando_sinal: [
    { title: 'Confirmar recebimento do sinal',           priority: 'urgente' },
  ],
  confirmado: [
    { title: 'Reservar data na agenda',                  priority: 'alta'    },
    { title: 'Confirmar local do evento',                priority: 'normal'  },
  ],
  aguardando_evento: [
    { title: 'Confirmar evento com cliente (3 dias antes)', priority: 'alta' },
    { title: 'Preparar equipamentos e baterias',         priority: 'alta'    },
    { title: 'Verificar previsão do tempo (ensaios externos)', priority: 'normal' },
  ],
  evento_realizado: [
    { title: 'Registrar cartões SD utilizados',          priority: 'urgente' },
    { title: 'Verificar integridade das imagens',        priority: 'urgente' },
  ],
  sd_pendente: [
    { title: 'Descarregar cartões SD',                   priority: 'urgente' },
    { title: 'Fazer backup primário (SSD/HD)',           priority: 'urgente' },
    { title: 'Fazer backup secundário (HD Arquivo)',     priority: 'alta'    },
  ],
  backup_realizado: [
    { title: 'Selecionar melhores imagens para prévia',  priority: 'alta'    },
  ],
  previa_pendente: [
    { title: 'Enviar prévia ao cliente via WhatsApp',    priority: 'urgente' },
  ],
  previa_enviada: [
    { title: 'Aguardar retorno do cliente',              priority: 'normal'  },
    { title: 'Iniciar edição completa',                  priority: 'alta'    },
  ],
  em_edicao: [
    { title: 'Exportar imagens finais',                  priority: 'alta'    },
    { title: 'Organizar álbum no Google Drive',          priority: 'alta'    },
  ],
  edicao_final: [
    { title: 'Criar link de entrega no Google Drive',    priority: 'urgente' },
    { title: 'Enviar link de entrega ao cliente',        priority: 'urgente' },
  ],
  entregue: [
    { title: 'Confirmar recebimento da entrega com cliente', priority: 'normal' },
    { title: 'Solicitar feedback / avaliação',           priority: 'normal'  },
    { title: 'Verificar pagamento final',                priority: 'alta'    },
  ],
  finalizado: [
    { title: 'Formatar cartões SD (backup confirmado)',  priority: 'normal'  },
    { title: 'Arquivar job no sistema',                  priority: 'baixa'   },
  ],
}

async function generateTasksForStatus(orgId: string, jobId: string, status: JobStatus) {
  const tasks = AUTO_TASKS[status]
  if (!tasks?.length) return

  await db.insert(jobTasks).values(
    tasks.map(t => ({
      orgId,
      jobId,
      title:         t.title,
      priority:      t.priority,
      autoGenerated: true,
      triggerStatus: status,
    }))
  )
}

// ─── LIBERAR SDs PARA FORMATAÇÃO ─────────────────────────────────────────────
async function liberateSdCards(orgId: string, jobId: string) {
  const { sdCardUsages } = await import('@/lib/db/schema')
  await db.update(sdCardUsages)
    .set({ safeToFormat: true, safeToFormatAt: new Date() })
    .where(and(eq(sdCardUsages.jobId, jobId), eq(sdCardUsages.orgId, orgId)))
}

// ─── ATUALIZAR CAMPOS DO JOB ──────────────────────────────────────────────────
export async function updateJobAction(jobId: string, data: {
  title?:        string
  clientId?:     string | null
  scheduledAt?:  string | null
  endsAt?:       string | null
  totalValue?:   string
  driveLink?:    string | null
  previewLink?:  string | null
  whatsappLink?: string | null
  notes?:        string | null
  tags?:         string[]
  editorId?:     string | null
  location?:     { name: string; address?: string; city?: string } | null
}) {
  const { orgId } = await getContext()

  const updateFields: Record<string, unknown> = { updatedAt: new Date() }
  if (data.title        !== undefined) updateFields.title        = data.title
  if (data.clientId     !== undefined) updateFields.clientId     = data.clientId
  if (data.totalValue   !== undefined) updateFields.totalValue   = data.totalValue
  if (data.driveLink    !== undefined) updateFields.driveLink    = data.driveLink
  if (data.previewLink  !== undefined) updateFields.previewLink  = data.previewLink
  if (data.whatsappLink !== undefined) updateFields.whatsappLink = data.whatsappLink
  if (data.notes        !== undefined) updateFields.notes        = data.notes
  if (data.tags         !== undefined) updateFields.tags         = data.tags
  if (data.editorId     !== undefined) updateFields.editorId     = data.editorId
  if (data.location     !== undefined) updateFields.location     = data.location
  if (data.scheduledAt  !== undefined) updateFields.scheduledAt  = data.scheduledAt ? new Date(data.scheduledAt) : null
  if (data.endsAt       !== undefined) updateFields.endsAt       = data.endsAt ? new Date(data.endsAt) : null

  await db.update(jobs)
    .set(updateFields)
    .where(and(eq(jobs.id, jobId), eq(jobs.orgId, orgId)))

  revalidatePath('/jobs')
}

// ─── TASKS ────────────────────────────────────────────────────────────────────
export async function toggleTaskAction(taskId: string) {
  const { orgId } = await getContext()
  const [task] = await db
    .select()
    .from(jobTasks)
    .where(and(eq(jobTasks.id, taskId), eq(jobTasks.orgId, orgId)))
    .limit(1)
  if (!task) throw new Error('Task não encontrada')

  await db.update(jobTasks)
    .set({
      completed:   !task.completed,
      completedAt: !task.completed ? new Date() : null,
    })
    .where(eq(jobTasks.id, taskId))

  revalidatePath('/jobs')
}

export async function addTaskAction(jobId: string, title: string, priority = 'normal') {
  const { orgId } = await getContext()
  await db.insert(jobTasks).values({
    orgId,
    jobId,
    title,
    priority,
    autoGenerated: false,
  })
  revalidatePath('/jobs')
}

// ─── CONTRATO ─────────────────────────────────────────────────────────────────
export async function saveContractDataAction(jobId: string, formData: Record<string, unknown>) {
  const { orgId } = await getContext()

  // Upsert do contrato
  const existing = await db
    .select({ id: jobContracts.id })
    .from(jobContracts)
    .where(and(eq(jobContracts.jobId, jobId), eq(jobContracts.orgId, orgId)))
    .limit(1)

  if (existing.length) {
    await db.update(jobContracts)
      .set({ formData: formData as any, updatedAt: new Date() })
      .where(eq(jobContracts.id, existing[0].id))
  } else {
    await db.insert(jobContracts).values({
      orgId,
      jobId,
      formData: formData as any,
      status: 'rascunho',
    })
  }

  revalidatePath('/jobs')
}

export async function markContractSentAction(jobId: string) {
  const { orgId } = await getContext()
  await db.update(jobContracts)
    .set({ status: 'enviado', sentAt: new Date(), updatedAt: new Date() })
    .where(and(eq(jobContracts.jobId, jobId), eq(jobContracts.orgId, orgId)))

  // Avançar status do job se ainda em contrato_pendente
  const [job] = await db.select({ status: jobs.status })
    .from(jobs).where(eq(jobs.id, jobId)).limit(1)
  if (job?.status === 'contrato_pendente') {
    await transitionJobStatusAction(jobId, 'aguardando_sinal')
  }

  revalidatePath('/jobs')
}

export async function markContractSignedAction(jobId: string, signedPdfUrl?: string) {
  const { orgId } = await getContext()
  await db.update(jobContracts)
    .set({ status: 'assinado', signedAt: new Date(), signedPdfUrl: signedPdfUrl || null, updatedAt: new Date() })
    .where(and(eq(jobContracts.jobId, jobId), eq(jobContracts.orgId, orgId)))
  revalidatePath('/jobs')
}

// ─── EXCLUSÃO DE JOB ─────────────────────────────────────────────────────────
export async function deleteJobAction(jobId: string): Promise<{ error?: string }> {
  try {
    const { orgId } = await getContext()

    // Guard: não excluir se tiver pagamentos confirmados
    const pms = await db.select({ status: payments.status })
      .from(payments)
      .where(and(eq(payments.jobId, jobId), eq(payments.orgId, orgId)))

    const hasPago = pms.some(p => p.status === 'pago')
    if (hasPago) {
      return { error: 'Este job possui pagamentos já confirmados. Cancele o job em vez de excluí-lo para manter o histórico financeiro.' }
    }

    // Guard: não excluir se tiver SDs em uso ou com backup pendente
    const { sdCardUsages } = await import('@/lib/db/schema')
    const sds = await db.select({ status: sdCardUsages.status })
      .from(sdCardUsages)
      .where(and(eq(sdCardUsages.jobId, jobId), eq(sdCardUsages.orgId, orgId)))

    const hasActiveSd = sds.some(s => s.status === 'pendente' || s.status === 'backup_realizado')
    if (hasActiveSd) {
      return { error: 'Este job possui cartões SD com backup pendente. Confirme o backup antes de excluir.' }
    }

    await db.delete(jobs).where(and(eq(jobs.id, jobId), eq(jobs.orgId, orgId)))
    revalidatePath('/jobs')
    revalidatePath('/')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Erro ao excluir job.' }
  }
}

// ─── EXCLUSÃO DE TASK ─────────────────────────────────────────────────────────
export async function deleteTaskAction(taskId: string): Promise<{ error?: string }> {
  try {
    const { orgId } = await getContext()
    await db.delete(jobTasks).where(and(eq(jobTasks.id, taskId), eq(jobTasks.orgId, orgId)))
    revalidatePath('/jobs')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Erro ao excluir task.' }
  }
}

// ─── SALVAR NOTAS DO JOB ──────────────────────────────────────────────────────
export async function saveJobNotesAction(jobId: string, notes: string): Promise<{ error?: string }> {
  try {
    const { orgId } = await getContext()
    await db.update(jobs)
      .set({ notes: notes || null, updatedAt: new Date() })
      .where(and(eq(jobs.id, jobId), eq(jobs.orgId, orgId)))
    revalidatePath(`/jobs/${jobId}`)
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Erro ao salvar notas.' }
  }
}

// ─── PAGAMENTOS ───────────────────────────────────────────────────────────────
export async function addPaymentAction(jobId: string, data: {
  type:   'sinal' | 'parcela' | 'saldo' | 'avulso'
  method: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'transferencia'
  amount: string
  dueDate: string
  notes?: string
}) {
  const { orgId } = await getContext()

  const [payment] = await db.insert(payments).values({
    orgId,
    jobId,
    type:    data.type,
    method:  data.method,
    status:  'pendente',
    amount:  data.amount,
    dueDate: data.dueDate,
    notes:   data.notes || null,
  }).returning()

  await recalcJobFinancials(orgId, jobId)
  revalidatePath('/jobs')
  return payment
}

export async function markPaymentPaidAction(paymentId: string) {
  const { orgId } = await getContext()
  const [p] = await db.update(payments)
    .set({ status: 'pago', paidAt: new Date(), updatedAt: new Date() })
    .where(and(eq(payments.id, paymentId), eq(payments.orgId, orgId)))
    .returning()

  if (p) await recalcJobFinancials(orgId, p.jobId)
  revalidatePath('/jobs')
}

export async function deletePaymentAction(paymentId: string): Promise<{ error?: string }> {
  try {
    const { orgId } = await getContext()
    const [p] = await db.select({ status: payments.status, jobId: payments.jobId })
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.orgId, orgId)))
      .limit(1)

    if (!p) return { error: 'Pagamento não encontrado.' }
    if (p.status === 'pago') {
      return { error: 'Não é possível excluir um pagamento já confirmado. Isso afetaria o histórico financeiro do job.' }
    }

    await db.delete(payments).where(and(eq(payments.id, paymentId), eq(payments.orgId, orgId)))
    await recalcJobFinancials(orgId, p.jobId)
    revalidatePath('/jobs')
    revalidatePath('/financeiro')
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Erro ao excluir pagamento.' }
  }
}

async function recalcJobFinancials(orgId: string, jobId: string) {
  const pms = await db.select({ status: payments.status, amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.jobId, jobId), eq(payments.orgId, orgId)))

  const total   = pms.reduce((s, p) => s + parseFloat(p.amount), 0)
  const paid    = pms.filter(p => p.status === 'pago').reduce((s, p) => s + parseFloat(p.amount), 0)
  const pending = total - paid

  await db.update(jobs)
    .set({ totalValue: String(total), paidValue: String(paid), pendingValue: String(pending) })
    .where(and(eq(jobs.id, jobId), eq(jobs.orgId, orgId)))
}
