import { pgTable, uuid, text, boolean, timestamp, date, jsonb } from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { organizations } from './organizations'
import { clientSourceEnum } from './enums'

export const clients = pgTable('clients', {
  id:        uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  orgId:     uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  fullName:  text('full_name').notNull(),
  email:     text('email'),
  phone:     text('phone'),
  cpf:       text('cpf'),
  birthDate: date('birth_date'),
  address:   jsonb('address'), // { street, number, complement, city, state, zip }
  source:    clientSourceEnum('source').default('outro'),
  notes:     text('notes'),
  tags:      text('tags').array().default(sql`'{}'`),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const clientsRelations = relations(clients, ({ one }) => ({
  organization: one(organizations, {
    fields: [clients.orgId],
    references: [organizations.id],
  }),
}))

export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
