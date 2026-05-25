import { pgTable, uuid, text, timestamp, numeric, date, integer } from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { organizations } from './organizations'
import { jobs } from './jobs'
import { clients } from './clients'
import { paymentTypeEnum, paymentMethodEnum, paymentStatusEnum } from './enums'

export const payments = pgTable('payments', {
  id:                uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  orgId:             uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  jobId:             uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  clientId:          uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  type:              paymentTypeEnum('type').notNull().default('parcela'),
  method:            paymentMethodEnum('method').notNull().default('pix'),
  status:            paymentStatusEnum('status').notNull().default('pendente'),
  amount:            numeric('amount', { precision: 10, scale: 2 }).notNull(),
  dueDate:           date('due_date').notNull(),
  paidAt:            timestamp('paid_at',   { withTimezone: true }),
  installmentNumber: integer('installment_number'),
  totalInstallments: integer('total_installments'),
  notes:             text('notes'),
  receiptUrl:        text('receipt_url'),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, { fields: [payments.orgId],      references: [organizations.id] }),
  job:          one(jobs,          { fields: [payments.jobId],       references: [jobs.id] }),
  client:       one(clients,       { fields: [payments.clientId],    references: [clients.id] }),
}))

export type Payment    = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
