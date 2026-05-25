import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const organizations = pgTable('organizations', {
  id:            uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  name:          text('name').notNull(),
  slug:          text('slug').unique().notNull(),
  ownerEmail:    text('owner_email').notNull(),
  plan:          text('plan').notNull().default('trial'),
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),
  settings:      jsonb('settings').notNull().default(sql`'{}'`),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
