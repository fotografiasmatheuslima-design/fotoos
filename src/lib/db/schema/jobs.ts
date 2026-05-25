import { pgTable, uuid, text, boolean, timestamp, numeric, jsonb, integer, date } from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { organizations } from './organizations'
import { clients } from './clients'
import { jobTypeEnum, jobStatusEnum } from './enums'

// ─── JOBS — ENTIDADE CENTRAL DO SISTEMA ──────────────────────────────────────
export const jobs = pgTable('jobs', {
  id:      uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  orgId:   uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // Identificação
  title:    text('title').notNull(),                              // Ex: "Casamento Ana Paula & Ricardo"
  type:     jobTypeEnum('type').notNull(),                        // ensaio | evento | diaria
  status:   jobStatusEnum('status').notNull().default('lead'),    // máquina de estados

  // Vínculo com cliente
  clientId:          uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  contractedStudio:  text('contracted_studio'),  // apenas para diárias: quem contratou

  // Agenda
  scheduledAt:    timestamp('scheduled_at',    { withTimezone: true }),
  endsAt:         timestamp('ends_at',         { withTimezone: true }),
  confirmedAt:    timestamp('confirmed_at',    { withTimezone: true }),
  eventExecutedAt: timestamp('event_executed_at', { withTimezone: true }),

  // Localização
  location: jsonb('location').$type<{
    name: string; address?: string; city?: string; lat?: number; lng?: number
  }>(),

  // Financeiro (resumo — detalhes em payments)
  totalValue:    numeric('total_value',    { precision: 10, scale: 2 }).notNull().default('0'),
  paidValue:     numeric('paid_value',     { precision: 10, scale: 2 }).notNull().default('0'),
  pendingValue:  numeric('pending_value',  { precision: 10, scale: 2 }).notNull().default('0'),

  // Equipe
  editorId:       uuid('editor_id'),           // responsável pela edição
  photographerId: uuid('photographer_id'),     // fotógrafo principal

  // Links operacionais
  driveLink:       text('drive_link'),         // link do Google Drive de entrega
  previewLink:     text('preview_link'),       // link da prévia enviada ao cliente
  contractPdfUrl:  text('contract_pdf_url'),   // URL do PDF do contrato
  whatsappLink:    text('whatsapp_link'),      // link direto WhatsApp do cliente

  // Controle de SD
  sdCount:  integer('sd_count').notNull().default(0),  // quantos SDs foram usados

  // Timestamps operacionais
  previewSentAt:    timestamp('preview_sent_at',    { withTimezone: true }),
  deliveredAt:      timestamp('delivered_at',       { withTimezone: true }),
  finalizedAt:      timestamp('finalized_at',       { withTimezone: true }),
  canceledAt:       timestamp('canceled_at',        { withTimezone: true }),

  // Cancelamento
  cancelReason: text('cancel_reason'),

  // Metadados
  tags:     text('tags').array().default(sql`'{}'`),
  notes:    text('notes'),
  metadata: jsonb('metadata').default(sql`'{}'`),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── CONTRATOS — 1:1 COM JOB ──────────────────────────────────────────────────
export const jobContracts = pgTable('job_contracts', {
  id:       uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  orgId:    uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  jobId:    uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }).unique(),

  status:   text('status').notNull().default('rascunho'), // rascunho | enviado | assinado | cancelado

  // Dados preenchidos no gerador de contrato
  formData: jsonb('form_data').$type<{
    clientName: string
    clientNationality?: string
    clientCpf?: string
    clientAddress?: string
    eventType: string
    eventDate: string
    startTime?: string
    endTime?: string
    ceremonyLocation?: string
    receptionLocation?: string
    totalValue: string
    signalPercent?: number
    signalValue?: string
    contractDate: string
  }>(),

  // HTML renderizado e PDF
  htmlContent:  text('html_content'),   // HTML do contrato preenchido (cache)
  pdfUrl:       text('pdf_url'),        // URL do PDF gerado e armazenado
  signedPdfUrl: text('signed_pdf_url'), // URL do PDF retornado assinado

  // Timestamps
  sentAt:    timestamp('sent_at',    { withTimezone: true }),
  signedAt:  timestamp('signed_at', { withTimezone: true }),

  notes:     text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── JOB TASKS — CHECKLIST OPERACIONAL AUTO-GERADO ───────────────────────────
export const jobTasks = pgTable('job_tasks', {
  id:      uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  orgId:   uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  jobId:   uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),

  title:       text('title').notNull(),
  completed:   boolean('completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  dueDate:   timestamp('due_date',    { withTimezone: true }),
  priority:  text('priority').notNull().default('normal'),  // urgente | alta | normal | baixa

  // Tasks auto-geradas pelo sistema vs manuais
  autoGenerated:  boolean('auto_generated').notNull().default(false),
  triggerStatus:  text('trigger_status'),  // status que gerou esta task

  notes:     text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── JOB HISTORY — AUDITORIA DE TODAS AS MUDANÇAS ─────────────────────────────
export const jobHistory = pgTable('job_history', {
  id:        uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  orgId:     uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  jobId:     uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),

  action:      text('action').notNull(),     // 'status_change' | 'payment_added' | 'sd_registered' | 'note_added' | etc.
  fromStatus:  text('from_status'),          // status anterior (para mudanças de status)
  toStatus:    text('to_status'),            // novo status
  description: text('description'),         // descrição legível da ação
  metadata:    jsonb('metadata'),            // dados adicionais da ação

  actorId:   uuid('actor_id'),              // quem fez a ação (profiles.id)
  actorName: text('actor_name'),            // nome cached para exibição

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── RELATIONS ────────────────────────────────────────────────────────────────
export const jobsRelations = relations(jobs, ({ one, many }) => ({
  organization: one(organizations, { fields: [jobs.orgId],      references: [organizations.id] }),
  client:       one(clients,       { fields: [jobs.clientId],   references: [clients.id] }),
  contract:     one(jobContracts,  { fields: [jobs.id],         references: [jobContracts.jobId] }),
  tasks:        many(jobTasks),
  history:      many(jobHistory),
}))

export const jobContractsRelations = relations(jobContracts, ({ one }) => ({
  job:          one(jobs,          { fields: [jobContracts.jobId],   references: [jobs.id] }),
  organization: one(organizations, { fields: [jobContracts.orgId],  references: [organizations.id] }),
}))

export const jobTasksRelations = relations(jobTasks, ({ one }) => ({
  job:          one(jobs,          { fields: [jobTasks.jobId],  references: [jobs.id] }),
  organization: one(organizations, { fields: [jobTasks.orgId], references: [organizations.id] }),
}))

export const jobHistoryRelations = relations(jobHistory, ({ one }) => ({
  job:          one(jobs,          { fields: [jobHistory.jobId],  references: [jobs.id] }),
  organization: one(organizations, { fields: [jobHistory.orgId], references: [organizations.id] }),
}))

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type Job           = typeof jobs.$inferSelect
export type NewJob        = typeof jobs.$inferInsert
export type JobContract   = typeof jobContracts.$inferSelect
export type NewJobContract = typeof jobContracts.$inferInsert
export type JobTask       = typeof jobTasks.$inferSelect
export type NewJobTask    = typeof jobTasks.$inferInsert
export type JobHistoryEntry = typeof jobHistory.$inferSelect
