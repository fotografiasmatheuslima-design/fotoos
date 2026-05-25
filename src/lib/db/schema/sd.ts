import { pgTable, uuid, text, boolean, timestamp, numeric, integer } from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { organizations } from './organizations'
import { jobs } from './jobs'
import { sdUsageStatusEnum, storageTypeEnum } from './enums'

// ─── SD CARDS — CATÁLOGO ──────────────────────────────────────────────────────
export const sdCards = pgTable('sd_cards', {
  id:         uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  orgId:      uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  label:      text('label').notNull(),
  brand:      text('brand'),
  capacityGb: numeric('capacity_gb', { precision: 6, scale: 1 }),
  camera:     text('camera'),
  notes:      text('notes'),
  isActive:   boolean('is_active').notNull().default(true),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── STORAGE LOCATIONS ────────────────────────────────────────────────────────
export const storageLocations = pgTable('storage_locations', {
  id:         uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  orgId:      uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name:       text('name').notNull(),
  type:       storageTypeEnum('type').notNull().default('hd_externo'),
  capacityGb: numeric('capacity_gb', { precision: 8, scale: 1 }),
  notes:      text('notes'),
  isActive:   boolean('is_active').notNull().default(true),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── SD CARD USAGES ───────────────────────────────────────────────────────────
export const sdCardUsages = pgTable('sd_card_usages', {
  id:       uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  orgId:    uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  jobId:    uuid('job_id').notNull().references(() => jobs.id,  { onDelete: 'cascade' }),
  sdCardId: uuid('sd_card_id').notNull().references(() => sdCards.id, { onDelete: 'restrict' }),

  status:   sdUsageStatusEnum('status').notNull().default('pendente'),

  backupPrimaryId:   uuid('backup_primary_id').references(() => storageLocations.id, { onDelete: 'set null' }),
  backupPrimaryAt:   timestamp('backup_primary_at',   { withTimezone: true }),
  backupSecondaryId: uuid('backup_secondary_id').references(() => storageLocations.id, { onDelete: 'set null' }),
  backupSecondaryAt: timestamp('backup_secondary_at', { withTimezone: true }),

  photosCount:  integer('photos_count'),
  rawSizeGb:    numeric('raw_size_gb', { precision: 8, scale: 2 }),

  safeToFormat:   boolean('safe_to_format').notNull().default(false),
  safeToFormatAt: timestamp('safe_to_format_at', { withTimezone: true }),
  formattedAt:    timestamp('formatted_at',       { withTimezone: true }),

  notes:     text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── RELATIONS ────────────────────────────────────────────────────────────────
export const sdCardsRelations = relations(sdCards, ({ one, many }) => ({
  organization: one(organizations, { fields: [sdCards.orgId], references: [organizations.id] }),
  usages:       many(sdCardUsages),
}))

export const storageLocationsRelations = relations(storageLocations, ({ one }) => ({
  organization: one(organizations, { fields: [storageLocations.orgId], references: [organizations.id] }),
}))

export const sdCardUsagesRelations = relations(sdCardUsages, ({ one }) => ({
  organization:    one(organizations,    { fields: [sdCardUsages.orgId],             references: [organizations.id] }),
  job:             one(jobs,             { fields: [sdCardUsages.jobId],             references: [jobs.id] }),
  sdCard:          one(sdCards,          { fields: [sdCardUsages.sdCardId],          references: [sdCards.id] }),
  backupPrimary:   one(storageLocations, { fields: [sdCardUsages.backupPrimaryId],   references: [storageLocations.id] }),
  backupSecondary: one(storageLocations, { fields: [sdCardUsages.backupSecondaryId], references: [storageLocations.id] }),
}))

export type SdCard            = typeof sdCards.$inferSelect
export type NewSdCard         = typeof sdCards.$inferInsert
export type StorageLocation   = typeof storageLocations.$inferSelect
export type NewStorageLocation = typeof storageLocations.$inferInsert
export type SdCardUsage       = typeof sdCardUsages.$inferSelect
export type NewSdCardUsage    = typeof sdCardUsages.$inferInsert
