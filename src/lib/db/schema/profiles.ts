import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { organizations } from './organizations'

export const profiles = pgTable('profiles', {
  id:        uuid('id').primaryKey(), // referencia auth.users(id)
  orgId:     uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  fullName:  text('full_name').notNull(),
  avatarUrl: text('avatar_url'),
  phone:     text('phone'),
  role:      text('role').notNull().default('owner'), // owner | admin | editor | viewer
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const profilesRelations = relations(profiles, ({ one }) => ({
  organization: one(organizations, {
    fields: [profiles.orgId],
    references: [organizations.id],
  }),
}))

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
